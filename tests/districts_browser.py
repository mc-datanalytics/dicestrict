"""Renderer evidence / A-B and bounded-cost checks. CI SwiftShader is NOT a phone GPU."""
import asyncio, json, os, pathlib, platform, subprocess, time, traceback
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results'/'districts';OUT.mkdir(parents=True,exist_ok=True)
URL='http://127.0.0.1:4408'
FIXTURE="""async()=>{const {app}=await import('/src/main.js');const {createGame,assertState}=await import('/src/game/engine.js');const {BOARD}=await import('/src/game/board.js');clearTimeout(app.botTimer);clearTimeout(app.busyTimer);const s=createGame([{id:'you',name:'Vous'},{id:'friend',name:'Ami'}],42,{id:'district-render-fixture',casino:true});s.players.forEach(p=>p.cash=20000);for(const t of BOARD)if(t.kind==='lot'){s.properties[t.id].owner=s.players[t.group%2].id;s.properties[t.id].level=[0,3,4].includes(t.group)?3:t.group===2?2:1;}assertState(s);app.settings.reduced=true;app.scene.configure({quality:'high',reduced:true,living:false,weather:false,dayMode:'day'});app.accept(s);cancelAnimationFrame(app.scene.raf);globalThis.assetApp=app;app.scene.dirty=true;app.scene.render(performance.now()+100);return app.scene.renderer.stats;}"""
async def render(page):
    return await page.evaluate("()=>{const s=assetApp.scene;s.dirty=true;s.render(performance.now()+100);return {...s.renderer.stats,glError:s.renderer.gl.getError(),contextLost:s.renderer.gl.isContextLost(),districts:s.city.districts.stats,marina:s.city.marina.stats};}")
async def legacy(page,enabled):
    await page.evaluate("""async enabled=>{const s=assetApp.scene;const {parcelGeometry}=await import('/src/scene/living-city.js');s.city.districts.enabled=!enabled;s.renderer.drop(s.city.parcelMesh);s.city.parcelMesh=s.renderer.mesh(parcelGeometry(s.city.city,enabled));s.dirty=true;}""",enabled)
async def view(page,config):
    await page.evaluate("""cfg=>{const s=assetApp.scene;s.angle=cfg.angle??.50;s.pitch=cfg.pitch??.85;s.zoom=cfg.zoom??1;s.captureTarget=cfg.target??[0,.3,0];s.dirty=true;}""",config)
    await render(page)
async def capture(page,name,full=True):
    await render(page)
    await page.screenshot(path=str(OUT/name),full_page=full,timeout=90000)
async def benchmark(page,quality):
    # gl.finish alone did not establish trustworthy completion timings in the first
    # CI attempt. Read back 1 pixel from every frame, with a real yield between
    # frames: includes readback / GPU-process synchronization, NOT pure GPU time.
    return await asyncio.wait_for(page.evaluate("""async quality=>{
      const s=assetApp.scene;s.configure({quality,reduced:true,living:false});
      const gl=s.renderer.gl,submit=[],blocking=[],pixel=new Uint8Array(4);
      for(let i=0;i<20;i++){
        if(gl.isContextLost())throw Error('Context lost during benchmark');
        const start=performance.now();s.dirty=true;s.render(performance.now()+100);
        const cpu=s.renderer.stats.cpuSubmitMs;
        gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
        const elapsed=performance.now()-start,error=gl.getError();
        if(error!==gl.NO_ERROR||pixel[3]!==255)throw Error(`Invalid frame readback: ${error} / ${pixel}`);
        if(i>=4){submit.push(cpu);blocking.push(elapsed);}
        await new Promise(r=>setTimeout(r,25));
      }
      const q=(a,p)=>[...a].sort((x,y)=>x-y)[Math.floor((a.length-1)*p)];
      return {samples:submit.length,warmup:4,cpuSubmitMs:{p50:q(submit,.5),p95:q(submit,.95)},
        softwareFrameAndReadbackMs:{p50:q(blocking,.5),p95:q(blocking,.95)},
        method:'Synchronous 1x1 RGBA readback after each forced frame; 25ms yield; includes IPC/readback; not physical GPU time or gameplay FPS.',
        finalPixel:Array.from(pixel),contextLost:gl.isContextLost(),stats:s.renderer.stats};
    }""",quality),timeout=240)
async def main():
    report={'environment':{'os':platform.platform(),'machine':platform.machine(),'python':platform.python_version(),'cpu':subprocess.check_output(['sh','-c','grep -m1 "model name" /proc/cpuinfo || true'],text=True).strip(),'node':subprocess.check_output(['node','--version'],text=True).strip(),'device':'GitHub Actions Linux VM, Chromium ANGLE SwiftShader SOFTWARE WebGL2. No physical phone.'},'checks':[],'errors':[],'console':[],'comparisons':{},'captures':[]}
    server=subprocess.Popen(['node','scripts/dev.mjs','--port','4408'],cwd=ROOT,stdout=subprocess.DEVNULL)
    browser=None
    try:
        import urllib.request
        for _ in range(80):
            try:urllib.request.urlopen(URL,timeout=.5);break
            except Exception:time.sleep(.1)
        async with async_playwright() as pw:
            options={'headless':True,'args':['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']}
            if os.getenv('CHROMIUM_PATH'):options['executable_path']=os.environ['CHROMIUM_PATH']
            browser=await pw.chromium.launch(**options);report['environment']['chromium']=browser.version
            page=await browser.new_page(viewport={'width':1600,'height':1000},device_scale_factor=1)
            page.on('pageerror',lambda e:report['errors'].append(str(e)))
            page.on('console',lambda m:report['console'].append(m.text) if m.type in ['error','warning'] and len(report['console'])<30 else None)
            await page.goto(URL);await page.wait_for_function("!document.querySelector('.scene-loading')")
            assert await page.locator('.scene-error').count()==0,'WebGL2 did not initialize'
            await page.evaluate(FIXTURE)
            report['environment']['webgl']=await page.evaluate("()=>{const gl=assetApp.scene.renderer.gl,e=gl.getExtension('WEBGL_debug_renderer_info');return {renderer:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),version:gl.getParameter(gl.VERSION)};}")
            views={'normal':{},'oldtown':{'target':[2.15,1.05,3.38],'angle':.42,'pitch':.52,'zoom':3.5},'financial':{'target':[-2.08,1.28,-3.48],'angle':.48,'pitch':.50,'zoom':3.0},'industrial':{'target':[-3.5,.84,-1.02],'angle':1.04,'pitch':.60,'zoom':4}}
            for label,config in views.items():
                await view(page,config)
                for before in [True,False]:
                    await legacy(page,before);await capture(page,f'{label}-{"before" if before else "after"}.png')
                    report['captures'].append(f'{label}-{"before" if before else "after"}.png')
            report['checks'].append('8 real engine A/B screenshots: identical state, camera, viewport, light; only six district models/public furniture differ. Marina retained.')
            await view(page,{})
            await page.evaluate("()=>assetApp.scene.configure({quality:'high',reduced:true,living:false,dayMode:'night'})")
            await capture(page,'normal-night.png')
            await page.evaluate("()=>assetApp.scene.configure({dayMode:'day'})")
            invariants=await page.evaluate("""async()=>{const s=assetApp.scene;const {fingerprint}=await import('/src/game/engine.js');const before=fingerprint(assetApp.state),builds=s.city.districts.builds;for(let i=0;i<100;i++){s.city.setState({...assetApp.state,revision:100+i});s.city.objects(i);}const same=fingerprint(assetApp.state)===before;const r=s.renderer;s.dirty=true;s.render(performance.now()+100);const f=s.frameCount;for(let i=0;i<20;i++)s.render(performance.now()+i*100+200);return {same,buildsBefore:builds,buildsAfter:s.city.districts.builds,idleFrames:s.frameCount-f,glError:r.gl.getError()};}""")
            report['invariants']=invariants;assert invariants['same'] and invariants['buildsBefore']==invariants['buildsAfter'] and invariants['idleFrames']==0 and invariants['glError']==0,invariants
            report['checks'].append('100 unrelated snapshots do not regenerate district assets; economic fingerprint unchanged; no GPU submissions for 20 idle render attempts.')
            # Projection/picking still selects original board properties, independent of taller buildings.
            pick=await page.evaluate("""async()=>{const s=assetApp.scene;const {tilePosition}=await import('/src/game/board.js');const {transform}=await import('/src/scene/math.js');const a=tilePosition(1),v=transform(s.vp,[a[0],.51,a[1],1]),r=s.canvas.getBoundingClientRect();s.pick(r.left+(v[0]/v[3]+1)*r.width/2,r.top+(1-v[1]/v[3])*r.height/2);return assetApp.selected;}""")
            assert pick==1;report['checks'].append('Actual board ray-plane picking still selects original tile 1.')
            # Mortgage and investment changes, using valid economy state, not new rendering rules.
            await page.evaluate("""async()=>{const s=structuredClone(assetApp.state);for(const id of [1,2,11,12,15,16]){s.properties[id].level=0;s.properties[id].mortgaged=true;}s.revision++;assetApp.accept(s);cancelAnimationFrame(assetApp.scene.raf);}""")
            await capture(page,'normal-mortgaged.png')
            assert await page.evaluate("()=>assetApp.scene.city.districts.entries.every(e=>e.closed===1)")
            await page.evaluate(FIXTURE)
            await page.evaluate("()=>{assetApp.scene.configure({reduced:false,living:true});assetApp.scene.ambientTime=12;}")
            active=await render(page);report['activeScene']=active;assert active['districts']['objects']<=13;assert active['drawCalls']<200;assert active['glError']==0
            report['checks'].append('Active city retains bounded original traffic/crowds; all six mortgages close windows and suppress activity through deriveCity.')
            mobile=await browser.new_page(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
            await mobile.goto(URL);await mobile.wait_for_function("!document.querySelector('.scene-loading')");assert await mobile.locator('.scene-error').count()==0
            await mobile.evaluate(FIXTURE);await mobile.evaluate("()=>assetApp.scene.configure({quality:'low',reduced:true,living:false})")
            await capture(mobile,'mobile-emulated-low.png');report['mobileEmulation']=await render(mobile)
            assert report['mobileEmulation']['districts']['detail']=='low'
            assert await mobile.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            report['checks'].append('390x844 touch viewport emulation, DPR 2 capped by low mode; no horizontal overflow; NOT a real-phone performance test.')
            await mobile.close()
            gallery=await browser.new_page(viewport={'width':1200,'height':1000},device_scale_factor=1)
            gallery.on('pageerror',lambda e:report['errors'].append(str(e)))
            await gallery.goto((ROOT/'assets/districts/review.html').as_uri());await gallery.wait_for_function('!!globalThis.assetReview')
            galleryStats={}
            for name in ['oldtown-0-level-3','oldtown-1-level-2','financial-0-level-3','financial-1-level-3','industrial-0-level-3','industrial-1-level-2','yacht']:
                await gallery.evaluate("name=>{assetReview.select(name,'high');assetReview.setLight('studio');assetReview.setView(.62,.44);}",name)
                await gallery.screenshot(path=str(OUT/f'studio-{name}.png'),timeout=90000)
                await gallery.evaluate('assetReview.setView(3.6,.38)')
                await gallery.screenshot(path=str(OUT/f'studio-rear-{name}.png'),timeout=90000)
                galleryStats[name]=await gallery.evaluate('({stats:assetReview.renderer.stats,glError:assetReview.renderer.gl.getError()})')
                assert galleryStats[name]['glError']==0
            report['gallery']=galleryStats;report['checks'].append('14 studio screenshots with same WebGL2 renderer, no bloom/blur/shadows: 7 real models, front and rear views, GL error zero.')
            await gallery.close()
            await page.evaluate(FIXTURE)
            await view(page,{})
            for quality in ['high','low']:
                pair={}
                for before in [True,False]:
                    await legacy(page,before);pair['before' if before else 'after']=await benchmark(page,quality)
                report['comparisons'][quality]=pair
                a=pair['after']['stats'];assert a['triangles']<120000,a;assert a['drawCalls']<180,a;assert a['gpuBufferBytes']<18*1024*1024,a
            report['checks'].append('Normal-view geometry <120k triangles, <180 color draws, <18 MiB geometry buffers in both quality modes; per-frame synchronous readbacks verified. Software diagnostics, not hardware FPS claims.')
            await capture(page,'post-benchmark-verification.png')
            assert not report['errors'],report['errors']
            await browser.close();browser=None
    except Exception:
        report['failure']=traceback.format_exc()
        if browser:
            for i,ctx in enumerate(browser.contexts):
                for j,p in enumerate(ctx.pages):
                    try:await p.screenshot(path=str(OUT/f'failure-{i}-{j}.png'),full_page=True)
                    except Exception:pass
        raise
    finally:
        (OUT/'report.json').write_text(json.dumps(report,indent=2))
        if browser:await browser.close()
        server.terminate();server.wait(timeout=5)
    print(json.dumps(report,indent=2))
asyncio.run(main())
