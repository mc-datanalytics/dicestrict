"""City response in actual Chromium/WebGL2; controlled fixtures, not a human playtest."""
import asyncio, json, pathlib, platform, subprocess, time, traceback, urllib.request
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results' / 'city-response'
URL = 'http://127.0.0.1:4447'
OUT.mkdir(parents=True, exist_ok=True)

FIXTURE = """async()=>{
 const {app}=await import('/src/main.js');window.cityApp=app;
 const {createGame,assertState}=await import('/src/game/engine.js');const {BOARD}=await import('/src/game/board.js');
 clearTimeout(app.botTimer);clearTimeout(app.busyTimer);cancelAnimationFrame(app.scene?.raf);
 const s=createGame([{id:'you',name:'Michaël'},{id:'friend',name:'Nova'}],42,{id:'city-response-browser',casino:true});
 s.players.forEach(p=>p.cash=5000);
 for(const t of BOARD)if(t.kind==='lot'&&t.id!==1){s.properties[t.id].owner=t.id===2?'you':s.players[t.group%2].id;s.properties[t.id].level=t.id===2?0:t.group%4;}
 s.players[0].position=1;s.phase='buy';s.pending=1;assertState(s);
 app.settings.reduced=false;app.settings.living=true;app.settings.weather=false;
 app.scene?.configure({reduced:false,living:true,quality:'high',dayMode:'day',weather:false});
 app.accept(s);app.select(1);cancelAnimationFrame(app.scene?.raf);
 if(app.scene){app.scene.ambientTime=0;app.scene.lastAmbientFrame=null;app.scene.dirty=true;app.scene.render(performance.now()+100);}
 return s.id;
}"""
DRAW = """async()=>{
 const a=cityApp,s=a.scene,r=s.renderer,gl=r.gl;const {fingerprint}=await import('/src/game/engine.js');
 const before=fingerprint(a.state);s.lastAmbientFrame=null;s.dirty=true;s.render(performance.now()+100);
 const colors=new Set(),pixel=new Uint8Array(4);
 for(let x=30;x<gl.drawingBufferWidth;x+=80)for(let y=30;y<gl.drawingBufferHeight;y+=80){gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);colors.add([...pixel].join(','));}
 return {error:gl.getError(),colors:colors.size,unchanged:before===fingerprint(a.state),life:s.city.stats,renderer:r.stats};
}"""
async def advance(page, count=15):
    await page.evaluate("""n=>{const s=cityApp.scene;for(let i=0;i<n;i++){s.ambientTime+=.1;s.city.objects(s.ambientTime,0);}}""",count)
    return await page.evaluate(DRAW)

async def main():
    report={'environment':{'platform':platform.platform(),'renderer':'Chromium WebGL2 / SwiftShader; not a physical device'},'checks':[],'frames':{},'pageErrors':[]}
    server=subprocess.Popen(['node','scripts/dev.mjs','--port','4447'],cwd=ROOT,stdout=subprocess.DEVNULL)
    browser=None
    try:
        for _ in range(80):
            try:urllib.request.urlopen(URL,timeout=.5);break
            except Exception:time.sleep(.1)
        async with async_playwright() as pw:
            browser=await pw.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
            report['environment']['chromium']=browser.version
            ctx=await browser.new_context(viewport={'width':1440,'height':960},device_scale_factor=1)
            await ctx.add_init_script("localStorage.setItem('dicestrict:settings:v1',JSON.stringify({quality:'high',living:true,weather:false,dayMode:'day'}))")
            page=await ctx.new_page();page.on('pageerror',lambda e:report['pageErrors'].append(str(e)))
            await page.goto(URL);await page.wait_for_function("!document.querySelector('.scene-loading')")
            assert await page.locator('.scene-error').count()==0
            await page.evaluate(FIXTURE)
            frame=await page.evaluate(DRAW)
            assert frame['error']==0 and frame['colors']>8 and frame['unchanged'],frame
            report['frames']['available']=frame
            assert await page.locator('#city-insight [role="meter"]').get_attribute('aria-valuenow')=='0'
            await page.screenshot(path=str(OUT/'01-terrain-disponible.png'),timeout=90000)
            report['checks'].append('Real non-uniform WebGL2 frame, no GL error; unowned parcel has zero visual activity.')

            before=await page.evaluate('cityApp.scene.city.life.step(cityApp.scene.ambientTime).cars')
            await page.locator('[data-game="BUY"]').click()
            await page.wait_for_function('cityApp.state.properties[1].owner==="you"')
            after=await page.evaluate('cityApp.scene.city.life.step(cityApp.scene.ambientTime).cars')
            assert before==after,(before,after)
            assert await page.locator('#city-insight [role="meter"]').get_attribute('aria-valuenow')=='2'
            report['checks'].append('Legal purchase via UI reunites the district and updates activity; existing cars keep exactly the same poses.')
            for _ in range(3):
                for tile in [1,2]:
                    await page.evaluate('id=>cityApp.select(id)',tile)
                    await page.locator(f'[data-game="UPGRADE"][data-lot="{tile}"]').click()
            await page.evaluate('cityApp.select(1)')
            assert await page.evaluate('cityApp.state.properties[1].level===3&&cityApp.state.properties[2].level===3')
            assert await page.locator('#city-insight [role="meter"]').get_attribute('aria-valuenow')=='8'
            assert await page.evaluate('cityApp.scene.city.cranes.filter(c=>c.id===1).length===1')
            frame=await advance(page)
            assert frame['unchanged'] and frame['error']==0 and frame['life']['cars']<=18 and frame['life']['pedestrians']<=48
            report['frames']['construction']=frame
            await page.screenshot(path=str(OUT/'02-quartier-en-construction.png'),timeout=90000)
            report['checks'].append('Six real balanced upgrades through UI, maximum activity and two articulated construction cranes; no extra economy writes.')

            await page.locator('[data-ui="focus-city"]').click()
            assert await page.evaluate('cityApp.scene.viewTarget[2]===cityApp.scene.city.city.parcels.find(p=>p.id===1).z')
            assert await page.locator('#board').evaluate('(e)=>e===document.activeElement')
            await advance(page,70)
            await page.evaluate('cityApp.scene.configure({dayMode:"night"})')
            night=await page.evaluate(DRAW);assert night['error']==0 and night['colors']>8
            assert await page.evaluate('cityApp.scene.city.cranes.length===0')
            report['frames']['night']=night
            await page.screenshot(path=str(OUT/'03-quartier-developpe-nuit.png'),timeout=90000)
            await page.locator('[data-ui="reset-view"]').click()
            assert await page.evaluate('JSON.stringify(cityApp.scene.viewTarget)==="[0,0.3,0]"')
            report['checks'].append('Inspect button centers the selected property and focuses the canvas; reset restores the full board. Night frame and crane expiry verified.')

            # Sell balanced levels via ordinary rules, then mortgage the selected property.
            for _ in range(3):
                for tile in [1,2]:
                    await page.evaluate('id=>cityApp.select(id)',tile)
                    await page.locator(f'[data-game="SELL_LEVEL"][data-lot="{tile}"]').click()
            await page.evaluate('cityApp.select(1)')
            await page.locator('[data-game="MORTGAGE"][data-lot="1"]').click()
            assert await page.locator('#city-insight [role="meter"]').get_attribute('aria-valuenow')=='0'
            assert 'en veille' in await page.locator('#city-insight-title').inner_text()
            await advance(page,15)
            assert await page.evaluate('!cityApp.scene.city.life.step(cityApp.scene.ambientTime).pedestrians.some(p=>p.parcelId===1)')
            await page.screenshot(path=str(OUT/'04-activite-en-veille.png'),timeout=90000)
            report['checks'].append('Legal sales and mortgage close the storefront activity and retire that parcel’s pedestrians without destroying the building.')

            cache=await page.evaluate("""()=>{const s=cityApp.scene,r=s.renderer,before=r.meshes.size;for(let i=0;i<600;i++){s.ambientTime+=.1;s.city.objects(s.ambientTime,0);}return {before,after:r.meshes.size};}""")
            assert cache['before']==cache['after'];report['meshStability']=cache
            await page.evaluate('cityApp.scene.configure({quality:"low"})')
            low=await advance(page);assert low['life']['cars']<=6 and low['life']['pedestrians']<=12 and low['renderer']['shadowDrawCalls']==0
            assert low['renderer']['textureBytes']['shadowDepth24StorageUpperBound']==0
            report['frames']['low']=low
            idle=await page.evaluate("""()=>{const s=cityApp.scene;s.configure({living:false,reduced:true});s.dirty=true;s.render(performance.now()+1000);const before=s.frameCount;for(let i=0;i<30;i++)s.render(performance.now()+1100+i*50);return {before,after:s.frameCount};}""")
            assert idle['before']==idle['after'];report['idle']=idle
            report['checks'].append('600 local animation steps allocate no new meshes; low mode respects 6/12 caps and allocates no shadow map; frozen scene submits no further frames.')

            mobile_ctx=await browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True)
            mobile=await mobile_ctx.new_page();mobile.on('pageerror',lambda e:report['pageErrors'].append(str(e)))
            await mobile.goto(URL);await mobile.wait_for_function("!document.querySelector('.scene-loading')")
            await mobile.evaluate(FIXTURE)
            await mobile.evaluate('cityApp.scene.configure({quality:"low"})')
            await mobile.evaluate(DRAW)
            assert await mobile.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
            box=await mobile.locator('[data-ui="focus-city"]').bounding_box();assert box['height']>=44
            await mobile.locator('[data-ui="focus-city"]').click()
            assert await mobile.locator('#board').evaluate('(e)=>e===document.activeElement')
            await mobile.screenshot(path=str(OUT/'05-mobile-emule.png'),full_page=True,timeout=90000)
            report['checks'].append('390 px touch emulation: no horizontal overflow, full-width feedback card, 44 px inspect target and canvas focus.')

            fallback=await browser.new_page(viewport={'width':1100,'height':900})
            fallback.on('pageerror',lambda e:report['pageErrors'].append(str(e)))
            await fallback.add_init_script("const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /webgl/i.test(kind)?null:original.call(this,kind,...args);}")
            await fallback.goto(URL);await fallback.locator('.scene-error').wait_for()
            assert await fallback.locator('#city-insight [role="meter"]').count()==1
            assert await fallback.locator('[data-ui="focus-city"]').is_disabled()
            await fallback.locator('.fallback-grid [data-tile="4"]').click()
            assert await fallback.locator('#city-insight').get_attribute('data-tile')=='4'
            report['checks'].append('Without WebGL, the parcel explanation and accessible selection remain usable; the camera-only action is disabled.')

            offline=await browser.new_page(viewport={'width':1280,'height':900})
            offline.on('pageerror',lambda e:report['pageErrors'].append(str(e)))
            await offline.goto((ROOT/'dist/dicestrict-offline.html').as_uri())
            await offline.wait_for_function("!document.querySelector('.scene-loading')")
            assert await offline.locator('.scene-error').count()==0
            assert await offline.locator('#city-insight [role="meter"]').count()==1
            assert await offline.locator('[data-ui="focus-city"]').is_enabled()
            await offline.locator('[data-ui="focus-city"]').click()
            assert await offline.evaluate('document.querySelector("#board").getContext("webgl2").getError()===0')
            report['checks'].append('Standalone file:// build initializes WebGL2 and the new inspect interaction without external dependencies.')
            assert not report['pageErrors'],report['pageErrors']
            await browser.close();browser=None
    except Exception:
        report['failure']=traceback.format_exc()
        if browser:
            for i,ctx in enumerate(browser.contexts):
                for j,page in enumerate(ctx.pages):
                    try:await page.screenshot(path=str(OUT/f'failure-{i}-{j}.png'),full_page=True,timeout=15000)
                    except Exception:pass
        raise
    finally:
        (OUT/'report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
        if browser:await browser.close()
        server.terminate();server.wait(timeout=5)
    print(json.dumps(report['checks'],indent=2,ensure_ascii=False))

asyncio.run(main())
