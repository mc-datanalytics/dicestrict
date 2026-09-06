"""Two full four-peer games. Seeded AUTOMATED UI input, NOT human playtests.
No ownership/balance fixtures: start empty and use legal game controls throughout.
"""
import asyncio, json, os, pathlib, subprocess, time, traceback
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
URL='http://127.0.0.1:4400'
SEED=4207593371  # Functional test selected for reciprocal trade opportunity, not an inference corpus.
async def app_state(page):
    return await page.evaluate("async()=>JSON.stringify((await import('/src/main.js')).app.state)")
async def converge(pages, revision=None):
    for _ in range(150):
        states=await asyncio.gather(*(app_state(p) for p in pages))
        if len(set(states))==1 and (revision is None or json.loads(states[0])['revision']==revision):return json.loads(states[0])
        await asyncio.sleep(.05)
    raise AssertionError('Four-peer convergence failed')
async def main():
    checks=[];errors=[];browser=None;pages=[];state=None;decision=None;lobby=None
    server=subprocess.Popen(['node','scripts/dev.mjs','--port','4400'],cwd=ROOT,stdout=subprocess.DEVNULL)
    try:
        import urllib.request
        for _ in range(80):
            try: urllib.request.urlopen(URL,timeout=.5);break
            except Exception: time.sleep(.1)
        async with async_playwright() as pw:
            opts={'headless':True,'args':['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']}
            if os.getenv('CHROMIUM_PATH'):opts['executable_path']=os.environ['CHROMIUM_PATH']
            browser=await pw.chromium.launch(**opts)
            for opening in ['classic','comp-60']:
                contexts=[];pages=[]
                for i in range(4):
                    ctx=await browser.new_context(viewport={'width':1360,'height':1000},accept_downloads=True);contexts.append(ctx)
                    await ctx.add_init_script("""localStorage.setItem('dicestrict:settings:v1',JSON.stringify({reduced:true,living:false,weather:false,quality:'low',casino:false,preset:'standard'}));""")
                    if i==0:
                        await ctx.add_init_script(f"const original=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{{if(a instanceof Uint32Array&&a.length===1){{a[0]={SEED};return a;}}return original(a);}};")
                    async def config_route(route):
                        await route.fulfill(body=(ROOT/'config.js').read_text().replace("[{ urls: 'stun:stun.l.google.com:19302' }]",'[]'),content_type='text/javascript')
                    await ctx.route('**/config.js',config_route)
                    p=await ctx.new_page();pages.append(p);p.on('pageerror',lambda e:errors.append(str(e)))
                    await p.goto(URL);await p.wait_for_function("!document.querySelector('.scene-loading')")
                    assert await p.locator('.scene-error').count()==0
                    await p.locator('[data-ui="multiplayer"]').click();await p.locator('#nickname').fill(f'Private Player {i+1}')
                    if i==0:
                        await p.locator('[data-ui="create-room"]').click();await p.locator('[data-testid="room-code"]').wait_for()
                        code=await p.locator('[data-testid="room-code"]').inner_text()
                    else:
                        await p.locator('#room-input').fill(code);await p.locator('[data-ui="join-room"]').click()
                        try:
                            await pages[0].wait_for_function(f"document.querySelectorAll('.lobby-member').length==={i+1}&&!document.querySelector('[data-ui=start-room]').disabled",timeout=30000)
                        except Exception:
                            # Capture while the browser scope is still alive; the old
                            # failure report only contained the previous finished game.
                            lobby=[]
                            for page in pages:
                                lobby.append(await page.evaluate("""async()=>{const {app}=await import('/src/main.js');const r=app.session;return {room:r?.room,ready:[...(r?.ready??[])],paused:r?.paused,closed:r?.closed,toast:document.querySelector('#toast')?.textContent,peers:[...(r?.peers??[])].map(([id,p])=>({id,connection:p.pc.connectionState,ice:p.pc.iceConnectionState,channel:p.channel?.readyState,queued:p.outbox?.bytes}))};}"""))
                            raise
                host=pages[0]
                await host.locator('#match-opening').select_option(opening)
                await pages[-1].wait_for_function("async o=>(await import('/src/main.js')).app.room.rules.opening===o",arg=opening)
                await host.locator('[data-ui="playtest"]').click();await host.locator('#playtest-consent').check();await host.locator('[data-ui="close"]').last.click()
                await host.locator('[data-ui="multiplayer"]').click();await host.locator('[data-ui="start-room"]').click()
                state=await converge(pages,0)
                assert not any(p['bot'] for p in state['players'])
                assert [p['cash'] for p in state['players']]==[1800+(60*i if opening=='comp-60' else 0) for i in range(4)]
                await host.screenshot(path=str(OUT/f'opening-{opening}.png'),full_page=True)
                ids={p['id']:pages[i] for i,p in enumerate(state['players'])};trades=0;sent={actor:[] for actor in ids}
                for _ in range(1200):
                    if state['phase']=='finished':break
                    decision=await host.evaluate("""async()=>{const {app}=await import('/src/main.js');const {currentPlayer}=await import('/src/game/engine.js');const {botAction,botDealDecision}=await import('/src/game/bots.js');const {botProposeDeal}=await import('/src/game/negotiator.js');const s=app.state,policyCopy=structuredClone(s);policyCopy.players.forEach(p=>p.bot=true);const reply=botDealDecision(policyCopy);if(reply)return reply;const actor=currentPlayer(s).id;return {actor,action:botProposeDeal(s,actor)??botAction(s)};}""")
                    p=ids[decision['actor']];a=decision['action'];kind=a['type']
                    window=sent[decision['actor']]
                    while len([t for t in window if time.monotonic()-t<10])>=9:await asyncio.sleep(.2)
                    window[:]=[t for t in window if time.monotonic()-t<10];window.append(time.monotonic())
                    if kind=='OFFER_DEAL':
                        await p.locator('[data-ui="deals"]').click();await p.locator('#deal-to').select_option(a['to'])
                        await p.locator('#give-cash').fill(str(a['giveCash']));await p.locator('#take-cash').fill(str(a['takeCash']))
                        for key in ['giveTiles','takeTiles']:
                            for tile in a[key]:await p.locator(f'[name="{key}"][value="{tile}"]').check()
                        await p.locator('#deal-form [type="submit"]').click();await p.locator('[data-deal-ui="close"]').click()
                    elif kind in ['ACCEPT_DEAL','DECLINE_DEAL']:
                        await p.locator('[data-ui="deals"]').click()
                        if kind=='ACCEPT_DEAL':
                            await p.screenshot(path=str(OUT/f'negotiation-{opening}.png'),full_page=True);trades+=1
                        await p.locator(f'[data-deal-action="{kind}"][data-id="{a["dealId"]}"]').click();await p.locator('[data-deal-ui="close"]').click()
                    elif 'tile' in a:
                        await p.locator('[data-ui="board-list"]').first.click();await p.locator(f'#modal [data-tile="{a["tile"]}"]').click()
                        await p.locator(f'[data-game="{kind}"][data-lot="{a["tile"]}"]').click()
                    else:
                        selector=f'[data-game="{kind}"]'
                        if kind=='MOVE':selector+=f'[data-offset="{a["offset"]}"]'
                        await p.locator(selector).click()
                    state=await converge(pages,state['revision']+1)
                    # Respect the real guest action budget, rather than disabling it.
                    await asyncio.sleep(.45)
                assert state['phase']=='finished' and trades>0
                await host.wait_for_timeout(800)
                async with host.expect_download() as event:await host.locator('[data-ui="export-playtest"]').click()
                record=OUT/f'automated-four-peer-{opening}.json';await (await event.value).save_as(record)
                data=json.loads(record.read_text());assert data['status']=='complete' and not data['humanParticipationVerified']
                assert 'Private Player' not in record.read_text() and code not in record.read_text()
                verified=subprocess.run(['node','scripts/verify-playtest.mjs',str(record)],cwd=ROOT,capture_output=True,text=True)
                assert verified.returncode==0,verified.stderr
                checks.append(f'{opening}: four real local WebRTC peers completed {state["revision"]} legal UI commands and {trades} negotiated trade(s); pseudonymized trace verified; AUTOMATED, not human')
                await host.screenshot(path=str(OUT/f'finished-{opening}.png'),full_page=True)
                for ctx in contexts:await ctx.close()
            # Imported local traces stay separate from A/B statistics in the lab.
            ctx=await browser.new_context(viewport={'width':1360,'height':1000});p=await ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)))
            await p.goto(URL+'/lab.html');await p.locator('#import-playtest').set_input_files(str(OUT/'automated-four-peer-comp-60.json'))
            await p.wait_for_function("document.querySelector('#status').textContent.includes('humaine NON certifiée')")
            assert await p.locator('#export-json').is_disabled()
            maximum=await p.locator('#replay-step').get_attribute('max')
            await p.locator('#replay-step').fill(maximum)
            expected=json.loads((OUT/'automated-four-peer-comp-60.json').read_text())['finalChecksum']
            assert await p.locator('#replay-position').get_attribute('data-checksum')==expected
            checks.append('A full local-session trace imports into the lab, replays to its checksum, and is never mixed into simulated A/B statistics')
            await p.screenshot(path=str(OUT/'imported-playtest.png'),full_page=True)
            assert not errors,errors
            (OUT/'playtest-report.json').write_text(json.dumps({'passed':checks,'pageErrors':errors,'humanParticipants':0,'input':'automated seeded policies'},indent=2))
            print(json.dumps({'passed':checks,'humanParticipants':0},indent=2));await browser.close()
    except Exception:
        for i,page in enumerate(pages):
            try:await page.screenshot(path=str(OUT/f'playtest-failure-{i}.png'),full_page=True)
            except Exception:pass
        (OUT/'playtest-failure.json').write_text(json.dumps({'passed':checks,'pageErrors':errors,'error':traceback.format_exc(),'state':state,'decision':decision,'lobby':lobby},indent=2));raise
    finally:server.terminate();server.wait(timeout=10)
if __name__=='__main__':asyncio.run(main())
