"""Actual WebGL2 proof and ABBA software diagnostics. No screenshot-only renderer."""
import argparse,asyncio,json,os,pathlib,platform,subprocess,time,traceback,urllib.request
from playwright.async_api import async_playwright
from waterfront_browser import LOAD,DRAW
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results/visual-finish';OUT.mkdir(parents=True,exist_ok=True)
BASE=pathlib.Path(os.getenv('VISUAL_BASELINE_DIR',ROOT/'test-results/visual-baseline')).resolve()
def node(expr):return json.loads(subprocess.check_output(['node','--input-type=module','-e',expr],cwd=ROOT,text=True))
FIX=node("import{civicFixtures}from'./scripts/assets/civic-fixtures.mjs';console.log(JSON.stringify(civicFixtures()));")
PORT=node("import{waterfrontFixtures}from'./scripts/assets/waterfront-fixtures.mjs';console.log(JSON.stringify(waterfrontFixtures()));")
EP=node("import{civicFixtures}from'./scripts/assets/civic-fixtures.mjs';import{applyAction}from'./src/game/engine.js';import{deriveCity,cityTransitions}from'./src/scene/city-state.js';let s=civicFixtures().initial,out={};for(const c of civicFixtures().commands){const n=applyAction(s,c.actor,c.action);if(cityTransitions(deriveCity(s),deriveCity(n)).celebrations.length){out={before:s,after:n};break;}s=n;}console.log(JSON.stringify(out));")
async def draw(page):
    r=await page.evaluate(DRAW)
    assert r['glError']==0 and not r['lost'],r
    return r
async def main(section):
    report={'baseCommit':'b5f547c97ce8387f1c31b25bef3a29952d0a94a7','testedCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'section':section,'environment':{'platform':platform.platform(),'cpu':subprocess.check_output(['bash','-lc','grep -m1 "model name" /proc/cpuinfo'],text=True).strip(),'device':'GitHub Actions Linux VM, Chromium/SwiftShader software. No physical phone.','viewport':{'width':1600,'height':1000},'dpr':1},'captures':{},'checks':[],'timings':{},'pageErrors':[]}
    servers=[];browser=None
    try:
        for root,port in [(BASE,4468),(ROOT,4469)]:
            assert (root/'src/main.js').exists(),root
            servers.append(subprocess.Popen(['node','scripts/dev.mjs','--port',str(port)],cwd=root,stdout=subprocess.DEVNULL))
            for _ in range(80):
                try:urllib.request.urlopen(f'http://127.0.0.1:{port}',timeout=.5);break
                except Exception:time.sleep(.1)
        async with async_playwright() as pw:
            browser=await pw.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
            report['environment']['chromium']=browser.version;pages={}
            for label,port in [('before',4468),('after',4469)]:
                page=await browser.new_page(viewport=report['environment']['viewport'],device_scale_factor=1);pages[label]=page
                page.on('pageerror',lambda e:report['pageErrors'].append(str(e)))
                await page.add_init_script("localStorage.setItem('dicestrict:settings:v1',JSON.stringify({reduced:true,living:false,weather:false,quality:'low'}))")
                await page.goto(f'http://127.0.0.1:{port}');await page.wait_for_function("!document.querySelector('.scene-loading')")
                assert await page.locator('.scene-error').count()==0,'Actual WebGL2 required'
                await page.evaluate(LOAD,FIX['checkpoints']['start']['state'])
                report['environment'][label+'Renderer']=await page.evaluate("()=>{const gl=portApp.scene.renderer.gl,e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);}")
                if section=='proof':
                    for state,c in FIX['checkpoints'].items():
                        for mood,clock in [('day',0),('dusk',65)]:
                            await page.evaluate(LOAD,c['state']);await page.evaluate("t=>{const s=portApp.scene;s.ambientTime=t;s.configure({dayMode:t?'auto':'day'});}",clock)
                            r=await draw(page);assert r['fingerprint']==c['fingerprint'];assert r['camera']=={'angle':.5,'pitch':.85,'zoom':1,'target':None}
                            name=f'{state}-{mood}-{label}.png';report['captures'][name]=r;await page.screenshot(path=str(OUT/name),full_page=True,timeout=90000)
                            print(name,flush=True)
                    for mood,clock in [('day',0),('dusk',65),('bluehour',85)]:
                        await page.evaluate(LOAD,PORT['checkpoints']['late']['state']);await page.evaluate("t=>{const s=portApp.scene;s.ambientTime=t;s.configure({dayMode:t?'auto':'day'});}",clock)
                        name=f'marina-developed-{mood}-{label}.png';report['captures'][name]=await draw(page);await page.screenshot(path=str(OUT/name),full_page=True,timeout=90000)
                        # Within the player's real pitch and zoom bounds, no recentered target.
                        await page.evaluate("()=>{const s=portApp.scene;s.pitch=.63;s.angle=.50;s.zoom=1.12;}")
                        name=f'player-oblique-{mood}-{label}.png';report['captures'][name]=await draw(page);await page.screenshot(path=str(OUT/name),full_page=True,timeout=90000)
                        print(name,flush=True)
                    await page.evaluate(LOAD,FIX['checkpoints']['late']['state']);await page.evaluate("()=>{const s=portApp.scene;for(let i=0;i<5;i++)s.view('in');s.ambientTime=65;s.configure({dayMode:'auto'});}")
                    name=f'player-close-dusk-{label}.png';report['captures'][name]=await draw(page);await page.screenshot(path=str(OUT/name),full_page=True,timeout=90000)
            if section=='proof':
                page=pages['after']
                for name,episode in [('construction',FIX['episodes']['upgrade']),('celebration',EP)]:
                    await page.evaluate(LOAD,episode['before'])
                    await page.evaluate("state=>{const a=portApp,s=a.scene;s.ambientTime=100;s.city.elapsed=100;s.configure({living:true,reduced:false});a.accept(structuredClone(state));clearTimeout(a.botTimer);clearTimeout(a.busyTimer);cancelAnimationFrame(s.raf);s.configure({living:true,reduced:false,dayMode:'auto'});s.ambientTime=100.85;s.lastAmbientFrame=null;}",episode['after'])
                    r=await draw(page);assert r['effectDrawCalls']>0,r
                    name=f'event-{name}.png';report['captures'][name]=r;await page.screenshot(path=str(OUT/name),full_page=True,timeout=90000)
                await page.close();pages.pop('after')
                page=await browser.new_page(viewport={'width':1100,'height':850});page.on('pageerror',lambda e:report['pageErrors'].append(str(e)))
                await page.goto('file://'+str(ROOT/'assets/districts/review.html'));await page.wait_for_function('!!globalThis.assetReview')
                for name in ['jardins-0-level-3','nova-1-level-3','solstice-1-level-3','pavilion','metro']:
                    for angle,label in [(.60,'front'),(3.70,'rear')]:
                        r=await page.evaluate("x=>{assetReview.select(x.name,'high');assetReview.setLight('studio');assetReview.setView(x.angle,.44);return assetReview.renderer.gl.getError();}",{'name':name,'angle':angle});assert r==0
                        await page.screenshot(path=str(OUT/f'studio-{name}-{label}.png'),timeout=90000)
                await page.close()
                report['checks'].append('Two real pinned source versions, identical legal checkpoints, default player camera plus bounded oblique/close views; day/dusk and developed marina at blue hour. New models examined under studio illumination, no bloom/blur.')
            else:
                for quality in ['low','high']:
                    for animated in [False,True]:
                        case=quality+('-animated' if animated else '-frozen');report['timings'][case]={'before':[],'after':[]}
                        for label in ['before','after','after','before']:
                            page=pages[label];await page.evaluate(LOAD,PORT['checkpoints']['late']['state'])
                            await page.evaluate("x=>portApp.scene.configure({quality:x.quality,living:x.animated,reduced:false,dayMode:'auto'})",{'quality':quality,'animated':animated})
                            for i in range(8):
                                await page.evaluate('t=>portApp.scene.ambientTime=t',65+i/30);r=await draw(page)
                                if i>=2:report['timings'][case][label].append(r)
                                await asyncio.sleep(.025)
                        print('timed',case,flush=True)
                page=pages['after'];await page.evaluate(LOAD,FIX['checkpoints']['late']['state']);await draw(page)
                stable=await page.evaluate("()=>{const s=portApp.scene,r=s.renderer,up=r.meshUploads,field=r.groundUploads;for(let i=0;i<100;i++)s.setState(structuredClone(portApp.state));s.dirty=true;s.render(performance.now()+100);return {meshes:r.meshUploads-up,field:r.groundUploads-field};}")
                assert stable=={'meshes':0,'field':0},stable;report['stableSnapshots']=stable
                await page.evaluate("()=>portApp.scene.configure({reduced:true,living:false})");await draw(page)
                idle=await page.evaluate("()=>{const s=portApp.scene,n=s.frameCount;for(let i=0;i<20;i++)s.render(performance.now()+1000+i*40);return s.frameCount-n;}");assert idle==0;report['idleFrames']=idle
                # Dedicated new-texture lifecycle; upstream shadow/reflection tests remain unchanged.
                await page.evaluate("()=>{const r=portApp.scene.renderer;window.loss=r.gl.getExtension('WEBGL_lose_context');if(!loss)throw Error('Context-loss extension required');window.oldDetail=r.detail;window.oldGround=r.ground;loss.loseContext();}")
                await page.wait_for_function('portApp.scene.lost&&portApp.scene.renderer.lost');await page.evaluate("()=>portApp.scene.configure({quality:'low'})");await page.evaluate('loss.restoreContext()')
                await page.wait_for_function('!portApp.scene.lost&&!portApp.scene.renderer.lost',timeout=30000)
                restored=await draw(page);assert restored['textureBytes']['shadowDepth24StorageUpperBound']==0 and restored['textureBytes']['waterReflectionRGBA8']==0
                assert await page.evaluate("()=>{const r=portApp.scene.renderer;return r.gl.isTexture(r.ground)&&r.gl.isTexture(r.detail)&&r.ground!==oldGround&&r.detail!==oldDetail;}")
                report['restoredLow']=restored
                # Shader/GL state is left usable after effects and all property transitions.
                for name,e in FIX['episodes'].items():
                    await page.evaluate(LOAD,e['before']);await page.evaluate("e=>{const a=portApp,s=a.scene;s.city.elapsed=20;s.configure({living:true,reduced:false});a.accept(e.after);clearTimeout(a.botTimer);clearTimeout(a.busyTimer);cancelAnimationFrame(s.raf);s.ambientTime=20.8;s.lastAmbientFrame=null;}",e)
                    r=await draw(page);assert r['glError']==0
                    assert await page.evaluate("()=>{const g=portApp.scene.renderer.gl;return !g.isEnabled(g.BLEND)&&g.getParameter(g.DEPTH_WRITEMASK);}")
                report['checks'].append('ABBA software timings: 2 warmup + 6 retained synchronous readback samples per block. Submission/readback, geometry, color/shadow/reflection calls and texture resources separate. No real phone validation.')
                report['checks'].append('100 stable snapshots: no mesh or contact-field uploads. Frozen scene: zero submitted idle frames. New textures restore after context loss in low quality, no shadow/reflection allocation. Legal property transitions and GL blending/depth state verified.')
            assert not report['pageErrors'],report['pageErrors']
            for page in pages.values():await page.close()
            await browser.close();browser=None
    except Exception:report['failure']=traceback.format_exc();raise
    finally:
        (OUT/f'{section}-report.json').write_text(json.dumps(report,indent=2))
        (OUT/'legal-history.json').write_text(json.dumps({'civic':FIX,'marina':PORT},indent=2))
        if browser:await browser.close()
        for s in servers:s.terminate();s.wait(timeout=5)
    print(json.dumps({'checks':report['checks'],'captures':len(report['captures'])},indent=2))
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--section',choices=['proof','measures'],required=True);asyncio.run(main(p.parse_args().section))
