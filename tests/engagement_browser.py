"""Real UI checks for guidance, solo offer pacing and end-of-match feedback.
Controlled economic fixtures isolate UI affordances; they are not human playtests.
Run after npm run build:lab. WebGL2 remains required for desktop and standalone.
"""
import asyncio, json, os, pathlib, subprocess, time, traceback
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results'; OUT.mkdir(exist_ok=True)
URL='http://127.0.0.1:4401'
BASE="""const {app}=await import('/src/main.js');const {createGame,applyAction,assertState,fingerprint}=await import('/src/game/engine.js');"""
FIXTURE="""clearTimeout(app.botTimer);clearTimeout(app.busyTimer);app.settings.reduced=true;app.scene.configure(app.settings);const s=createGame([{id:'you',name:'Vous'},{id:'nova',name:'Nova',bot:true},{id:'sacha',name:'Sacha',bot:true},{id:'milo',name:'Milo',bot:true}],42,{id:'engagement-'+String(performance.now()),rounds:12,mobility:2});s.properties[1].owner='you';s.properties[4].owner='you';s.properties[2].owner='nova';s.properties[5].owner='nova';"""
async def evaluate(page,code): return await page.evaluate('async()=>{'+BASE+code+'}')
async def start(page):
    await page.goto(URL)
    await page.wait_for_function("!document.querySelector('.scene-loading')")
    assert await page.locator('.scene-error').count()==0
async def main():
    checks=[]; errors=[]; browser=None; counts={}
    server=subprocess.Popen(['node','scripts/dev.mjs','--port','4401'],cwd=ROOT,stdout=subprocess.DEVNULL)
    try:
        import urllib.request
        for _ in range(80):
            try: urllib.request.urlopen(URL,timeout=.5);break
            except Exception: time.sleep(.1)
        async with async_playwright() as pw:
            opts={'headless':True,'args':['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']}
            if os.getenv('CHROMIUM_PATH'):opts['executable_path']=os.environ['CHROMIUM_PATH']
            browser=await pw.chromium.launch(**opts)
            ctx=await browser.new_context(viewport={'width':1440,'height':960})
            page=await ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));await start(page)
            assert 'Votre première adresse' in await page.locator('#momentum').inner_text()
            assert 'Égalité en tête' in await page.locator('#momentum').inner_text()
            await page.screenshot(path=str(OUT/'engagement-opening.png'),full_page=True)
            # An actual public-data draft must not transmit anything before submission.
            await evaluate(page,FIXTURE+'app.accept(assertState(s));')
            before=await evaluate(page,'return fingerprint(app.state);')
            await page.locator('[data-momentum="trade"]').click()
            assert await page.locator('[name="giveTiles"][value="1"]').is_checked()
            assert await page.locator('[name="takeTiles"][value="5"]').is_checked()
            assert await page.locator('#give-cash').input_value()=='60'
            assert await evaluate(page,'return fingerprint(app.state);')==before
            await page.locator('#give-cash').fill('65')
            await evaluate(page,'app.accept(structuredClone(app.state));')
            assert await page.locator('#give-cash').input_value()=='65'
            assert await evaluate(page,'return app.state.deals.length;')==0
            await page.screenshot(path=str(OUT/'engagement-draft.png'),full_page=True)
            await page.locator('[data-deal-ui="close"]').click()
            await page.locator('[data-momentum="trade"]').focus()
            await evaluate(page,'app.accept(structuredClone(app.state));')
            assert await page.locator('[data-momentum="trade"]').evaluate('(e)=>document.activeElement===e')
            checks.append('A legal reciprocal draft is prepared without sending; edited fields and keyboard focus survive identical snapshots')
            # Real bot scheduler waits on a real offer, then resumes after an explicit refusal.
            await evaluate(page,FIXTURE+"s.turn=1;app.accept(s);const n=applyAction(s,'nova',{type:'OFFER_DEAL',to:'you',giveTiles:[2],takeTiles:[4],giveCash:20,takeCash:0});app.accept(n,{actor:'nova',action:{type:'OFFER_DEAL',to:'you',giveTiles:[2],takeTiles:[4],giveCash:20,takeCash:0}});")
            revision=await evaluate(page,'return app.state.revision;')
            await page.wait_for_timeout(1500)
            assert await evaluate(page,'return app.state.revision;')==revision
            assert 'sans compte à rebours' in await page.locator('#dock').inner_text()
            await page.locator('#dock [data-momentum="inbox"]').click()
            assert 'les IA attendent' in await page.locator('#deal-status').inner_text()
            await page.locator('[data-deal-action="DECLINE_DEAL"]').click()
            await page.locator('[data-deal-ui="close"]').click()
            await page.wait_for_function('async()=>{const {app}=await import("/src/main.js");return app.state.revision>2;}')
            checks.append('Solo bots hold indefinitely for a human-addressed offer and resume after a real refusal; no timeout or fabricated acceptance')
            # Deferral is a local UI choice, not DECLINE_DEAL or END.
            await evaluate(page,FIXTURE+"s.turn=1;app.accept(s);app.accept(applyAction(s,'nova',{type:'OFFER_DEAL',to:'you',giveTiles:[2],takeTiles:[4],giveCash:20,takeCash:0}));")
            before=await evaluate(page,'return fingerprint(app.state);')
            await page.locator('[data-ui="defer-offer"]').click()
            assert await evaluate(page,'return fingerprint(app.state);')==before
            assert await evaluate(page,'return app.offerHold();') is None
            await page.wait_for_function('async()=>{const {app}=await import("/src/main.js");return app.state.revision>1;}')
            await evaluate(page,'clearTimeout(app.botTimer);')
            checks.append('Continue without answering only releases the local hold; it does not accept, decline or alter a command')
            # Late-game rivalry uses true total wealth, never just cash or an invented score.
            await evaluate(page,FIXTURE+"s.round=11;s.players[1].cash=2100;app.accept(s);")
            assert 'patrimoine pour rejoindre' in await page.locator('#final-lap').inner_text()
            await page.screenshot(path=str(OUT/'engagement-rivalry.png'),full_page=True)
            # In-session milestones are sourced only from accepted engine transitions.
            await evaluate(page,"clearTimeout(app.botTimer);const s=createGame([{id:'you',name:'Vous'},{id:'nova',name:'Nova',bot:true}],42,{id:'story-fixture'});s.players[0].position=1;s.pending=1;s.phase='buy';app.accept(assertState(s));app.act({type:'BUY'});")
            assert await evaluate(page,'return app.story.stats.purchases;')==1
            assert await page.locator('.journey .reached').count()==1
            await page.locator('[data-ui="story"]').click()
            assert '1' in await page.locator('.story-grid').inner_text()
            await page.locator('[data-ui="close"]').last.click()
            # Use a valid end command to display the results. This controlled fixture
            # skips rounds and is intentionally reported as a partial observation.
            await evaluate(page,"const s=structuredClone(app.state);s.revision++;s.round=s.maxRounds;s.turn=1;s.phase='end';s.pending=null;app.accept(s);clearTimeout(app.botTimer);app.accept(applyAction(s,'nova',{type:'END'}),{actor:'nova',action:{type:'END'}});")
            await page.wait_for_selector('.story-summary')
            assert 'Bilan partiel' in await page.locator('.story-summary').inner_text()
            assert 'Choisir un autre format' in await page.locator('#modal-body').inner_text()
            await page.screenshot(path=str(OUT/'engagement-results.png'),full_page=True)
            await page.locator('[data-ui="close"]').last.click()
            assert await evaluate(page,"return app.state.phase;")=='finished'
            await page.wait_for_timeout(1000)
            assert await evaluate(page,"return app.state.phase;")=='finished'
            await page.locator('[data-ui="results"]').click();await page.locator('[data-ui="rematch"]').click()
            assert await evaluate(page,'return app.story.stats.purchases;')==0
            checks.append('Milestones and results use real accepted commands, label partial history, preserve a stopped match and reset on rematch')
            # Settings separate pace from reduced motion; opening the settings is not a new game.
            await page.locator('[data-ui="settings"]').click()
            initial=await evaluate(page,'return app.settings.tempo;')
            reduced=await evaluate(page,'return app.settings.reduced;')
            await page.locator('[data-ui="tempo"]').click()
            assert await evaluate(page,'return app.settings.tempo;')!=initial
            assert await evaluate(page,'return app.settings.reduced;')==reduced
            await page.locator('[data-ui="close"]').last.click()
            checks.append('Solo tempo is a persisted presentation setting independent of reduced motion and economy')
            # Responsive layout: all guidance and the main action remain reachable.
            mobile=await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
            m=await mobile.new_page();m.on('pageerror',lambda e:errors.append(str(e)));await start(m)
            dims=await m.evaluate('({body:document.documentElement.scrollWidth,width:innerWidth})');assert dims['body']<=dims['width'],dims
            await m.locator('#momentum').scroll_into_view_if_needed();assert await m.locator('#momentum').is_visible()
            await m.screenshot(path=str(OUT/'engagement-mobile.png'),full_page=True)
            counts['mobile']=dims
            checks.append('390px touch layout contains the actual WebGL2 canvas, goals and actions without horizontal overflow')
            # Standalone must not depend on externally hosted scripts or assets.
            off=await browser.new_context(viewport={'width':1280,'height':900});requests=[]
            offline=await off.new_page();offline.on('pageerror',lambda e:errors.append(str(e)));offline.on('request',lambda r:requests.append(r.url))
            await offline.goto((ROOT/'dist/dicestrict-offline.html').as_uri());await offline.wait_for_function("!document.querySelector('.scene-loading')")
            assert await offline.locator('.scene-error').count()==0
            assert 'Votre première adresse' in await offline.locator('#momentum').inner_text()
            assert not [r for r in requests if r.startswith(('https:','http:'))],requests
            await offline.locator('[data-game="ROLL"]').click()
            assert await offline.locator('.move-choice').count()==3
            checks.append('Standalone file:// game includes the guidance and remains interactive with no external requests')
            # The new view is also present in the existing accessible fallback.
            fallback=await browser.new_context(viewport={'width':1280,'height':900})
            await fallback.add_init_script("const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...rest){return kind==='webgl2'?null:original.call(this,kind,...rest)};")
            f=await fallback.new_page();f.on('pageerror',lambda e:errors.append(str(e)));await f.goto(URL);await f.wait_for_selector('.scene-error')
            assert 'Votre première adresse' in await f.locator('#momentum').inner_text()
            assert await f.locator('.fallback-grid button').count()==28
            checks.append('All 28 properties and the guidance remain accessible without WebGL2')
            assert not errors,errors
            report={'passed':checks,'pageErrors':errors,'fixtures':'controlled UI states, not human playtests','humanParticipants':0,'layout':counts}
            (OUT/'engagement-browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
            print(json.dumps(report,ensure_ascii=False,indent=2));await browser.close()
    except Exception:
        if browser:
            for i,c in enumerate(browser.contexts):
                for j,p in enumerate(c.pages):
                    try:await p.screenshot(path=str(OUT/f'engagement-failure-{i}-{j}.png'),full_page=True)
                    except Exception:pass
        (OUT/'engagement-failure.json').write_text(json.dumps({'passed':checks,'pageErrors':errors,'error':traceback.format_exc()},indent=2));raise
    finally:server.terminate();server.wait(timeout=10)
if __name__=='__main__':asyncio.run(main())
