"""Phase 3: actual phase2 code vs phase3, legal histories, ordinary cameras, software diagnostics."""
import asyncio,json,os,pathlib,platform,subprocess,time,traceback,urllib.request
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results/civic';OUT.mkdir(parents=True,exist_ok=True)
BASE=pathlib.Path(os.getenv('CIVIC_BASELINE_DIR',str(ROOT/'test-results/civic-baseline'))).resolve()
FIXTURE=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {civicFixtures} from './scripts/assets/civic-fixtures.mjs';console.log(JSON.stringify(civicFixtures()));"],cwd=ROOT,text=True))
LOAD="""async state=>{const {app}=await import('/src/main.js');clearTimeout(app.botTimer);clearTimeout(app.busyTimer);app.settings.reduced=true;app.accept(structuredClone(state));clearTimeout(app.botTimer);clearTimeout(app.busyTimer);cancelAnimationFrame(app.scene.raf);const s=app.scene;s.configure({quality:'high',reduced:false,living:false,weather:false,dayMode:'day'});s.paths=state.players.map(p=>({from:p.position,to:p.position,steps:0,start:0,duration:0}));s.lastRoll=-99999;s.view('reset');globalThis.civicApp=app;}"""
DRAW="""()=>{const s=civicApp.scene;s.dirty=true;s.render(performance.now()+100);const r=s.renderer,gl=r.gl,pixel=new Uint8Array(4);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);return {...r.stats,civic:s.city.civic?.stats??null,marina:s.city.marina.stats,districts:s.city.districts.stats,glError:gl.getError(),contextLost:gl.isContextLost(),camera:{angle:s.angle,pitch:s.pitch,zoom:s.zoom,captureTarget:s.captureTarget??null},clock:s.ambientTime,night:r.night,dusk:r.dusk??0};}"""
async def draw(page):
    r=await page.evaluate(DRAW)
    assert r['glError']==0 and not r['contextLost'],r
    assert r['camera']['captureTarget'] is None and .72<=r['camera']['zoom']<=1.5,r
    return r
async def capture(page,name):
    r=await draw(page);await page.screenshot(path=str(OUT/name),full_page=True,timeout=90000);return r
async def samples(page,quality,animated):
    return await page.evaluate("""async cfg=>{const s=civicApp.scene,gl=s.renderer.gl;s.configure({quality:cfg.quality,reduced:!cfg.animated,living:cfg.animated,dayMode:'day',weather:false});const times=[],cpu=[],pixel=new Uint8Array(4);for(let i=0;i<8;i++){s.ambientTime=12+i/30;s.lastAmbientFrame=null;s.dirty=true;const t=performance.now();s.render(t+100);const submit=s.renderer.stats.cpuSubmitMs;gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);const dt=performance.now()-t;if(gl.getError()||gl.isContextLost())throw Error('GL failure in timed frame');if(i>1){times.push(dt);cpu.push(submit);}await new Promise(r=>setTimeout(r,30));}const summary=a=>{const b=[...a].sort((x,y)=>x-y);return {samples:a,median:b[Math.floor(b.length/2)],max:Math.max(...a)};};return {softwareFrameReadbackMs:summary(times),cpuSubmitMs:summary(cpu),stats:s.renderer.stats,civic:s.city.civic?.stats,activity:s.city.stats};}""",{'quality':quality,'animated':animated})
async def main():
    assert (BASE/'src/main.js').exists(),'Provide the exact phase2 baseline via CIVIC_BASELINE_DIR'
    report={'environment':{'platform':platform.platform(),'cpu':subprocess.check_output(['bash','-lc','grep -m1 "model name" /proc/cpuinfo || true'],text=True).strip(),'node':subprocess.check_output(['node','--version'],text=True).strip(),'device':'Linux CI VM / ANGLE SwiftShader software. No physical phone.','viewport':{'width':1600,'height':1000},'dpr':1},'baseCommit':'6b020530ac8ab46d0dd882ffcdfd67d00215b989','testedCommit':os.getenv('GITHUB_SHA','local'),'checks':[],'errors':[],'captures':{},'benchmarks':{}}
    (OUT/'legal-history.json').write_text(json.dumps(FIXTURE,indent=2))
    servers=[];browser=None
    try:
        for root,port in [(BASE,4420),(ROOT,4421)]:
            servers.append(subprocess.Popen(['node','scripts/dev.mjs','--port',str(port)],cwd=root,stdout=subprocess.DEVNULL))
            for _ in range(80):
                try:urllib.request.urlopen(f'http://127.0.0.1:{port}',timeout=.5);break
                except Exception:time.sleep(.1)
        async with async_playwright() as p:
            options={'headless':True,'args':['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']}
            if os.getenv('CHROMIUM_PATH'):options['executable_path']=os.environ['CHROMIUM_PATH']
            browser=await p.chromium.launch(**options);report['environment']['chromium']=browser.version
            for label,port in [('before',4420),('after',4421)]:
                page=await browser.new_page(viewport=report['environment']['viewport'],device_scale_factor=1)
                page.on('pageerror',lambda e:report['errors'].append(str(e)))
                await page.goto(f'http://127.0.0.1:{port}');await page.wait_for_function("!document.querySelector('.scene-loading')")
                assert await page.locator('.scene-error').count()==0,'Real WebGL2 required, not fallback'
                await page.evaluate(LOAD,FIXTURE['checkpoints']['start']['state'])
                report['environment'][label+'WebGL']=await page.evaluate("()=>{const gl=civicApp.scene.renderer.gl,e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);}")
                for state,c in FIXTURE['checkpoints'].items():
                    await page.evaluate(LOAD,c['state'])
                    for light in ['day','dusk']:
                        await page.evaluate("light=>{const s=civicApp.scene;s.ambientTime=light==='dusk'?60:0;s.lastAmbientFrame=null;s.configure({dayMode:light==='dusk'?'auto':'day',living:false,reduced:false});}",light)
                        name=f'{state}-{light}-{label}.png';r=await capture(page,name)
                        r['fingerprint']=await page.evaluate("async()=>{const {fingerprint}=await import('/src/game/engine.js');return fingerprint(civicApp.state);}")
                        assert r['fingerprint']==c['fingerprint'];report['captures'][name]=r
                        assert r['triangles']<120000 and r['drawCalls']<180 and r['gpuBufferBytes']<18*1024*1024,r
                await page.evaluate(LOAD,FIXTURE['checkpoints']['late']['state'])
                await page.evaluate("()=>{for(let i=0;i<5;i++)civicApp.scene.view('in');}")
                report['captures'][f'late-max-player-zoom-{label}.png']=await capture(page,f'late-max-player-zoom-{label}.png')
                await page.evaluate(LOAD,FIXTURE['checkpoints']['late']['state'])
                report['benchmarks'][label]={}
                for quality in ['low','high']:
                    for animated in [False,True]:report['benchmarks'][label][quality+('-animated' if animated else '-frozen-forced')]=await samples(page,quality,animated)
                if label=='after':
                    await page.evaluate(LOAD,FIXTURE['checkpoints']['late']['state']);await draw(page)
                    inv=await page.evaluate("""async()=>{const a=civicApp,s=a.scene,{fingerprint}=await import('/src/game/engine.js');const before=fingerprint(a.state),uploads=s.renderer.meshUploads,builds=s.city.civic.builds;for(let i=0;i<100;i++)s.setState({...a.state,revision:1000+i});s.setState(a.state);s.configure({reduced:true,living:false});s.dirty=true;s.render(performance.now()+100);let frames=s.frameCount;for(let i=0;i<20;i++)s.render(performance.now()+200+i*100);return {before,after:fingerprint(a.state),civicBuildsDelta:s.city.civic.builds-builds,meshUploadsDelta:s.renderer.meshUploads-uploads,idleFrameDelta:s.frameCount-frames};}""")
                    assert inv['before']==inv['after'] and inv['civicBuildsDelta']==0 and inv['meshUploadsDelta']==0 and inv['idleFrameDelta']==0,inv;report['invariants']=inv
                    report['transitions']={}
                    for name,e in FIXTURE['episodes'].items():
                        await page.evaluate(LOAD,e['before']);await draw(page)
                        r=await page.evaluate("""async e=>{const a=civicApp,s=a.scene,{applyAction,fingerprint}=await import('/src/game/engine.js'),builds=s.city.civic.builds,uploads=s.renderer.meshUploads,t=performance.now();a.settings.reduced=true;a.accept(applyAction(a.state,e.actor,e.action));clearTimeout(a.botTimer);clearTimeout(a.busyTimer);cancelAnimationFrame(s.raf);const elapsed=performance.now()-t;return {acceptMs:elapsed,fingerprint:fingerprint(a.state),civicBuildDelta:s.city.civic.builds-builds,uploadDelta:s.renderer.meshUploads-uploads};}""",e)
                        assert r['civicBuildDelta']==0
                        expected=await page.evaluate("async s=>{const {fingerprint}=await import('/src/game/engine.js');return fingerprint(s);}",e['after'])
                        assert r['fingerprint']==expected,r
                        report['transitions'][name]=r;report['captures'][f'{name}-after.png']=await capture(page,f'{name}-after.png')
                    await page.evaluate(LOAD,FIXTURE['checkpoints']['late']['state']);await draw(page)
                    camera=await page.evaluate("""async()=>{const s=civicApp.scene,gl=s.renderer.gl,pixel=new Uint8Array(4),durations=[],builds=s.city.civic.builds;for(let i=0;i<12;i++){s.angle=.50+i*.05;if(i<5)s.view('in');else s.view('out');const t=performance.now();s.dirty=true;s.render(t+100);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);durations.push(performance.now()-t);await new Promise(r=>setTimeout(r,30));}return {softwareFrameReadbackMs:durations,civicBuildDelta:s.city.civic.builds-builds,cachedCivicMeshes:s.city.civic.cache.size,glError:gl.getError()};}""")
                    assert camera['civicBuildDelta']<=1 and camera['cachedCivicMeshes']<=2 and camera['glError']==0;report['cameraMotion']=camera
                    await page.evaluate(LOAD,FIXTURE['checkpoints']['start']['state'])
                    pick=await page.evaluate("""async()=>{const s=civicApp.scene,{tilePosition}=await import('/src/game/board.js'),{transform}=await import('/src/scene/math.js');s.dirty=true;s.render(performance.now()+100);const a=tilePosition(1),v=transform(s.vp,[a[0],.51,a[1],1]),r=s.canvas.getBoundingClientRect();s.pick(r.left+(v[0]/v[3]+1)*r.width/2,r.top+(1-v[1]/v[3])*r.height/2);return civicApp.selected;}""")
                    assert pick==1
                await page.close()
            mobile=await browser.new_page(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
            await mobile.goto('http://127.0.0.1:4421');await mobile.wait_for_function("!document.querySelector('.scene-loading')");assert await mobile.locator('.scene-error').count()==0
            await mobile.evaluate(LOAD,FIXTURE['checkpoints']['start']['state']);await mobile.evaluate("()=>civicApp.scene.configure({quality:'low',reduced:true,living:false})")
            report['mobileEmulation']=await capture(mobile,'mobile-start-emulated.png');assert await mobile.evaluate('document.documentElement.scrollWidth<=innerWidth+1');await mobile.close()
            gallery=await browser.new_page(viewport={'width':1200,'height':1000})
            await gallery.goto((ROOT/'assets/districts/review.html').as_uri());await gallery.wait_for_function('!!globalThis.assetReview')
            for angle,name in [(.6,'casino-studio-front.png'),(3.7,'casino-studio-rear.png')]:
                await gallery.evaluate("angle=>{assetReview.select('casino','high');assetReview.setLight('studio');assetReview.setView(angle,.42);}",angle)
                await gallery.screenshot(path=str(OUT/name),timeout=90000);assert await gallery.evaluate('assetReview.renderer.gl.getError()')==0
            await gallery.close()
            report['checks']=['Actual phase2 source vs phase3; identical legal economic checkpoints and normal reset camera, no capture target override.','12 normal-camera A/B frames in start/middle/late and day/dusk; 2 maximum-player-zoom frames.','Initial state has no properties and standard 1800 credits per player. Every checkpoint is replayed by the real reducer.','Frozen and animated render costs measured separately, color/shadows/buffers recorded. SwiftShader readback timings are NOT mobile FPS.','100 irrelevant full scene snapshots allocate zero new meshes; 20 idle render attempts submit zero frames.','Legal upgrade and mortgage branches preserve economic reducer results and do not rebuild civic geometry.','Ordinary zoom/rotation crosses LOD thresholds without more than two cached civic meshes; property picking preserved.','390x844 is layout emulation only; front/rear studio renders use the real renderer, no bloom.']
            assert not report['errors'],report['errors'];await browser.close();browser=None
    except Exception:
        report['failure']=traceback.format_exc();raise
    finally:
        (OUT/'report.json').write_text(json.dumps(report,indent=2))
        if browser:await browser.close()
        for s in servers:s.terminate();s.wait(timeout=5)
    print(json.dumps({'checks':report['checks'],'errors':report['errors'],'captureCount':len(report['captures'])},indent=2))
asyncio.run(main())
