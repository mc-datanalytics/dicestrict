"""Real Chromium UI + WebRTC smoke tests. Run after installing Playwright's Chromium."""
import asyncio, json, os, pathlib, subprocess, time, traceback
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
URL='http://127.0.0.1:4398'
async def state(page):
    return await page.evaluate("async()=>JSON.stringify((await import('/src/main.js')).app.state)")
async def setup(page):
    await page.goto(URL)
    await page.wait_for_function("!document.querySelector('.scene-loading')")
    if await page.locator('.scene-error').count():
        await page.screenshot(path=str(OUT/'renderer-failure.png'),full_page=True)
        raise AssertionError(await page.locator('.scene-error').inner_text())
async def equal_states(host, guest):
    for _ in range(100):
        if await state(host) == await state(guest): return
        await asyncio.sleep(.05)
    raise AssertionError('WebRTC states did not converge')

async def trade_fixture(host, guest):
    await host.evaluate("""async()=>{const {app}=await import('/src/main.js');const {createGame,assertState}=await import('/src/game/engine.js');clearTimeout(app.botTimer);clearTimeout(app.busyTimer);app.settings.reduced=true;const s=createGame(app.state.players,42,{id:app.state.id,rounds:6,mobility:2,finishOnBankruptcy:true});s.round=3;s.properties[1].owner=s.players[0].id;s.properties[5].owner=s.players[0].id;s.properties[2].owner=s.players[1].id;s.properties[4].owner=s.players[1].id;assertState(s);app.session.state=s;app.session.broadcast('snapshot',{state:s});app.accept(s);}""")
    await equal_states(host,guest)

async def main():
    checks=[];errors=[];browser=None
    server=subprocess.Popen(['node','scripts/dev.mjs','--port','4398'],cwd=ROOT,stdout=subprocess.DEVNULL)
    try:
        import urllib.request
        for _ in range(80):
            try:
                urllib.request.urlopen(URL,timeout=.5);break
            except Exception: time.sleep(.1)
        async with async_playwright() as pw:
            options={'headless':True,'args':['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']}
            if os.getenv('CHROMIUM_PATH'):options['executable_path']=os.environ['CHROMIUM_PATH']
            browser=await pw.chromium.launch(**options)
            host_ctx=await browser.new_context(viewport={'width':1440,'height':960},device_scale_factor=1)
            guest_ctx=await browser.new_context(viewport={'width':1280,'height':900},device_scale_factor=1)
            # Test direct local ICE without relying on a public STUN service.
            for ctx in (host_ctx,guest_ctx):
                async def config_route(route):
                    text=(ROOT/'config.js').read_text().replace("[{ urls: 'stun:stun.l.google.com:19302' }]",'[]')
                    await route.fulfill(body=text,content_type='text/javascript')
                await ctx.route('**/config.js',config_route)
            host=await host_ctx.new_page();host.on('pageerror',lambda e: errors.append(str(e)))
            await setup(host)
            await host.screenshot(path=str(OUT/'desktop.png'),full_page=True)
            # Read a freshly rendered frame, not a cleared preserveDrawingBuffer=false surface.
            colors=await host.evaluate("""async()=>{const {app}=await import('/src/main.js');const scene=app.scene;scene.dirty=true;scene.render(performance.now()+50);const gl=scene.renderer.gl,p=new Uint8Array(4),colors=new Set();for(let x=50;x<gl.drawingBufferWidth;x+=100)for(let y=50;y<gl.drawingBufferHeight;y+=100){gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);colors.add([...p].join(','));}return {count:colors.size,error:gl.getError()};}""")
            assert colors['count']>8 and colors['error']==0, colors
            checks.append('Desktop WebGL2 initializes and draws a non-uniform frame with no GL errors')
            await host.evaluate("""async()=>{const {app}=await import('/src/main.js');const {createGame}=await import('/src/game/engine.js');app.settings.reduced=true;app.scene.configure(app.settings);const s=createGame([{id:'you',name:'Vous'},{id:'friend',name:'Ami'}],42);s.phase='buy';s.pending=1;s.players[0].position=1;app.accept(s);}""")
            await host.locator('[data-game="BUY"]').click()
            assert json.loads(await state(host))['properties'][1]['owner']=='you'
            await host.reload();await host.wait_for_function("!document.querySelector('.scene-loading')")
            assert json.loads(await state(host))['properties'][1]['owner']=='you'
            checks.append('Purchase and local save survive reload')
            await host.evaluate("""async()=>{const {app}=await import('/src/main.js');app.settings.reduced=true;let s=structuredClone(app.state);s.phase='buy';s.pending=2;s.players[0].position=2;app.accept(s);}""")
            await host.locator('[data-game="SKIP"]').click();await host.locator('[data-game="BID"]').click()
            assert json.loads(await state(host))['auction']['highBid']==20
            checks.append('Auction controls submit a legal bid')
            # Presets are explicit rule changes, not unmeasured promises about minutes.
            await host.locator('[data-ui="settings"]').click()
            await host.locator('[data-ui="new-game"]').click()
            await host.locator('[name="match-preset"][value="blitz"]').check()
            await host.locator('[data-ui="confirm-new"]').click()
            ss=json.loads(await state(host))
            assert ss['maxRounds']==6 and ss['finishOnBankruptcy'] and all(p['mobilityTokens']==2 for p in ss['players'])
            await host.locator('[data-game="ROLL"]').click()
            await host.locator('[data-game="MOVE"][data-offset="-1"]').wait_for()
            await host.screenshot(path=str(OUT/'feedback-mobility.png'),full_page=True)
            assert json.loads(await state(host))['players'][0]['position']==0
            await host.locator('[data-game="MOVE"][data-offset="-1"]').click()
            assert json.loads(await state(host))['players'][0]['mobilityTokens']==1
            await host.reload();await host.wait_for_function("!document.querySelector('.scene-loading')")
            assert json.loads(await state(host))['players'][0]['mobilityTokens']==1
            checks.append('Blitz preset and an explicit post-roll mobility choice persist after reload')
            await host.locator('[data-ui="help"]').first.click();assert await host.locator('#modal').evaluate('(el)=>el.open')
            await host.locator('[data-ui="resume"]').click()
            # A room starts with two actual peers; the host fills the remaining seats with bots.
            await host.locator('[data-ui="multiplayer"]').click();await host.locator('#nickname').fill('Host')
            await host.locator('[data-ui="create-room"]').click();await host.locator('[data-testid="room-code"]').wait_for()
            code=await host.locator('[data-testid="room-code"]').inner_text()
            guest=await guest_ctx.new_page();guest.on('pageerror',lambda e: errors.append(str(e)))
            await setup(guest);await guest.locator('[data-ui="multiplayer"]').click();await guest.locator('#nickname').fill('Guest');await guest.locator('#room-input').fill(code);await guest.locator('[data-ui="join-room"]').click()
            await host.wait_for_function("document.querySelectorAll('.lobby-member').length===2 && !document.querySelector('[data-ui=start-room]').disabled",timeout=30000)
            await host.locator('[name="match-preset"][value="blitz"]').check()
            await guest.wait_for_function("document.querySelector('#modal-body').textContent.includes('6 manches')")
            assert await guest.locator('[data-ui="start-room"]').count()==0
            await host.locator('[data-ui="start-room"]').click()
            await guest.wait_for_function("!document.querySelector('#modal').open")
            assert await state(host)==await state(guest)
            await host.locator('[data-game="ROLL"]').click()
            await guest.wait_for_function("document.querySelector('#activity').textContent.includes('lance')")
            assert await state(host)==await state(guest)
            checks.append('Two isolated browser contexts connect via WebRTC and agree after rolling')
            await host.screenshot(path=str(OUT/'multiplayer.png'),full_page=True)
            ss=json.loads(await state(host));assert ss['mobility']==2 and ss['finishOnBankruptcy'] and ss['maxRounds']==6
            await host.locator('[data-game="MOVE"][data-offset="0"]').click()
            await equal_states(host,guest)
            checks.append('Host-selected rules are visible to the guest and locked into the synchronized match')
            await trade_fixture(host,guest)
            # A non-modal composer keeps the typed draft when another peer acts.
            await guest.locator('[data-ui="deals"]').click()
            await guest.locator('#give-cash').fill('37')
            assert not await guest.locator('#modal').evaluate('(el)=>el.open')
            await host.locator('[data-game="ROLL"]').click();await equal_states(host,guest)
            assert await guest.locator('#give-cash').input_value()=='37'
            assert await guest.locator('#deal-form [type="submit"]').is_disabled()
            await host.locator('[data-game="MOVE"][data-offset="0"]').click();await equal_states(host,guest)
            await guest.locator('[data-deal-ui="close"]').click()
            checks.append('Negotiation drawer does not pause the table or discard the draft on peer updates')
            await trade_fixture(host,guest)
            guest_id=json.loads(await state(guest))['players'][1]['id']
            await host.locator('[data-ui="deals"]').click()
            await host.locator('#deal-to').select_option(guest_id)
            await host.locator('[name="giveTiles"][value="5"]').check()
            await host.locator('[name="takeTiles"][value="2"]').check()
            await host.locator('#give-cash').fill('120')
            await host.locator('#deal-form [type="submit"]').click()
            await guest.locator('[data-ui="deals"]').click()
            await guest.locator('[data-deal-action="ACCEPT_DEAL"]').wait_for()
            await host.screenshot(path=str(OUT/'feedback-deals.png'),full_page=True)
            await guest.locator('[data-deal-action="ACCEPT_DEAL"]').click()
            await host.wait_for_function("document.querySelector('#activity').textContent.includes('accepte')")
            await equal_states(host,guest)
            ss=json.loads(await state(host));assert ss['properties'][2]['owner']==ss['players'][0]['id'] and ss['properties'][5]['owner']==guest_id
            assert ss['players'][0]['cash']==1680 and ss['players'][1]['cash']==1920 and not ss['deals'] and ss['turn']==0
            checks.append('Off-turn UI deal atomically swaps properties and cash over actual WebRTC')
            await trade_fixture(host,guest)
            await host.locator('[data-deal-ui="reset"]').click()
            await host.locator('#deal-to').select_option(guest_id)
            await host.locator('[name="giveTiles"][value="5"]').check();await host.locator('[name="takeTiles"][value="2"]').check()
            await host.locator('#give-cash').fill('120');await host.locator('#deal-form [type="submit"]').click()
            await guest.locator('[data-deal-ui="counter"]').click()
            assert await guest.locator('#take-cash').input_value()=='120'
            assert await guest.locator('[name="giveTiles"][value="2"]').is_checked()
            await guest.locator('#take-cash').fill('160');await guest.locator('#deal-form [type="submit"]').click()
            await host.locator('[data-deal-action="ACCEPT_DEAL"]').click();await equal_states(host,guest)
            ss=json.loads(await state(host));assert ss['players'][0]['cash']==1640 and ss['players'][1]['cash']==1960 and not ss['deals']
            checks.append('Counter-offer UI reverses the bundles and commits only the accepted revised terms')
            await host.locator('[data-deal-ui="close"]').click();await guest.locator('[data-deal-ui="close"]').click()
            # End the test match deterministically at its round cap, then test the same-room rematch.
            await host.evaluate("""async()=>{const {app}=await import('/src/main.js');clearTimeout(app.botTimer);clearTimeout(app.busyTimer);const s=structuredClone(app.state);s.phase='end';s.auction=null;s.turn=3;s.round=s.maxRounds;app.session.state=s;app.state=s;app.session.broadcast('snapshot',{state:s});app.session.commit(s.players[3].id,{type:'END'});}""")
            await host.wait_for_function("document.querySelector('[data-ui=rematch]')!==null")
            await guest.wait_for_function("document.querySelector('[data-ui=rematch]')!==null")
            await host.locator('[data-ui="rematch"]').click();await guest.wait_for_function("!document.querySelector('#modal').open")
            assert await state(host)==await state(guest)
            checks.append('Same-room rematch dismisses results and starts a synchronized game')
            await host_ctx.close()
            await guest.wait_for_function("document.querySelector('.connection-error')!==null",timeout=30000)
            checks.append('Host departure suspends the remaining client instead of fabricating a win')
            mobile=await browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True)
            await setup(mobile);assert await mobile.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            await mobile.screenshot(path=str(OUT/'mobile.png'),full_page=True)
            await mobile.locator('[data-ui="board-list"]').click();await mobile.locator('#modal [data-tile="25"]').click()
            assert 'Palais Solaire' in await mobile.locator('#property').inner_text()
            checks.append('390px mobile layout does not overflow and exposes every property')
            await mobile.locator('[data-game="ROLL"]').click()
            await mobile.locator('[data-game="MOVE"][data-offset="1"]').wait_for()
            assert await mobile.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            await mobile.locator('[data-game="MOVE"][data-offset="0"]').click()
            await mobile.locator('[data-ui="deals"]').click()
            assert await mobile.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            assert await mobile.locator('#deal-form').is_visible()
            await mobile.screenshot(path=str(OUT/'feedback-mobile.png'),full_page=True)
            checks.append('390px touch viewport exposes mobility controls and a usable non-overflowing deal composer')
            # Also execute the generated standalone artifact, not only native source modules.
            offline=await browser.new_page(viewport={'width':1440,'height':960})
            offline.on('pageerror',lambda e: errors.append(str(e)))
            await offline.goto((ROOT/'dist'/'dicestrict-offline.html').as_uri())
            await offline.wait_for_function("!document.querySelector('.scene-loading')")
            assert await offline.locator('.scene-error').count()==0
            await offline.locator('[data-game="ROLL"]').click()
            await offline.locator('[data-game="MOVE"][data-offset="0"]').click()
            await offline.locator('[data-ui="deals"]').click()
            assert await offline.locator('#deal-form').is_visible()
            checks.append('Generated offline HTML initializes real WebGL2 and supports mobility and negotiation UI')
            fallback=await browser.new_page()
            await fallback.add_init_script("const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:original.call(this,type,...args)}")
            await fallback.goto(URL);await fallback.locator('.fallback-grid').wait_for()
            await fallback.locator('[data-game="ROLL"]').click();checks.append('Accessible fallback remains playable without WebGL')
            assert not errors,errors
            checks.append('No uncaught JavaScript exceptions in desktop/multiplayer flows')
            await browser.close();browser=None
    except Exception:
        failure=traceback.format_exc()
        if browser:
            for i,ctx in enumerate(browser.contexts):
                for j,page in enumerate(ctx.pages):
                    try:
                        await page.screenshot(path=str(OUT/f'failure-{i}-{j}.png'),full_page=True)
                        (OUT/f'failure-{i}-{j}.html').write_text(await page.content())
                    except Exception: pass
        (OUT/'failure.txt').write_text(failure);raise
    finally:
        (OUT/'browser-report.json').write_text(json.dumps({'passed':checks,'pageErrors':errors},indent=2))
        if browser:await browser.close()
        server.terminate();server.wait(timeout=5)
    print(json.dumps({'passed':checks},indent=2))
asyncio.run(main())
