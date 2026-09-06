"""Real native engine proof, fixed v5 integration baseline, no fabricated economic assets."""
import asyncio,json,os,pathlib,platform,subprocess,time,traceback,urllib.request
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results/harmony';OUT.mkdir(parents=True,exist_ok=True)
BASE=pathlib.Path(os.getenv('HARMONY_BASELINE_DIR',str(ROOT/'test-results/harmony-baseline'))).resolve()
FIXTURE=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {civicFixtures} from './scripts/assets/civic-fixtures.mjs';console.log(JSON.stringify(civicFixtures()));"],cwd=ROOT,text=True))
LOAD="""async state=>{const {app}=await import('/src/main.js');clearTimeout(app.botTimer);clearTimeout(app.busyTimer);app.settings.reduced=true;app.accept(structuredClone(state));clearTimeout(app.botTimer);clearTimeout(app.busyTimer);cancelAnimationFrame(app.scene.raf);const s=app.scene;s.configure({quality:'high',reduced:false,living:false,weather:false,dayMode:'day'});s.paths=state.players.map(p=>({from:p.position,to:p.position,steps:0,start:0,duration:0}));s.lastRoll=-99999;s.view('reset');globalThis.harmonyApp=app;}"""
DRAW="""async()=>{const s=harmonyApp.scene;s.dirty=true;s.render(performance.now()+100);const r=s.renderer,gl=r.gl,pixel=new Uint8Array(4);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);const {fingerprint}=await import('/src/game/engine.js');return {...r.stats,harmony:s.city.harmony?.stats??null,civic:s.city.civic.stats,glError:gl.getError(),contextLost:gl.isContextLost(),fingerprint:fingerprint(harmonyApp.state),camera:{angle:s.angle,pitch:s.pitch,zoom:s.zoom,target:s.captureTarget??null},clock:s.ambientTime,night:r.night,dusk:r.dusk};}"""
async def draw(page):
    r=await page.evaluate(DRAW);assert r['glError']==0 and not r['contextLost'],r
    assert r['camera']['target'] is None and .72<=r['camera']['zoom']<=1.5,r
    return r
async def main():
    assert (BASE/'src/main.js').exists(),'Provide the pinned v5 integrated baseline'
    report={'baseCommit':'b75d7853457e12cac6e903da6cba4f62af3de0c0','testedCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'environment':{'platform':platform.platform(),'cpu':subprocess.check_output(['bash','-lc','grep -m1 "model name" /proc/cpuinfo'],text=True).strip(),'device':'CI VM, software SwiftShader, no physical phone','viewport':{'width':1600,'height':1000},'dpr':1},'captures':{},'pageErrors':[],'checks':[]}
    (OUT/'legal-history.json').write_text(json.dumps(FIXTURE,indent=2))
    servers=[];browser=None
    try:
        for root,port in [(BASE,4436),(ROOT,4437)]:
            servers.append(subprocess.Popen(['node','scripts/dev.mjs','--port',str(port)],cwd=root,stdout=subprocess.DEVNULL))
            for _ in range(80):
                try:urllib.request.urlopen(f'http://127.0.0.1:{port}',timeout=.5);break
                except Exception:time.sleep(.1)
        async with async_playwright() as pw:
            browser=await pw.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']);report['environment']['chromium']=browser.version
            for label,port in [('before',4436),('after',4437)]:
                page=await browser.new_page(viewport=report['environment']['viewport'],device_scale_factor=1)
                page.on('pageerror',lambda e:report['pageErrors'].append(str(e)))
                await page.goto(f'http://127.0.0.1:{port}');await page.wait_for_function("!document.querySelector('.scene-loading')")
                assert await page.locator('.scene-error').count()==0,'Native WebGL2 required'
                await page.evaluate(LOAD,FIXTURE['checkpoints']['start']['state'])
                report['environment'][label+'WebGL']=await page.evaluate("()=>{const gl=harmonyApp.scene.renderer.gl,e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);}")
                for state,c in FIXTURE['checkpoints'].items():
                    await page.evaluate(LOAD,c['state'])
                    for light in ['day','dusk']:
                        await page.evaluate("light=>{const s=harmonyApp.scene;s.ambientTime=light==='dusk'?60:0;s.lastAmbientFrame=null;s.configure({dayMode:light==='dusk'?'auto':'day',living:false,reduced:false});}",light)
                        name=f'{state}-{light}-{label}.png';r=await draw(page)
                        assert r['fingerprint']==c['fingerprint'];assert r['triangles']<140000 and r['drawCalls']<160,r
                        report['captures'][name]=r;await page.screenshot(path=str(OUT/name),full_page=True,timeout=90000)
                await page.evaluate(LOAD,FIXTURE['checkpoints']['late']['state']);await page.evaluate("()=>{for(let i=0;i<5;i++)harmonyApp.scene.view('in');}")
                name=f'late-player-zoom-{label}.png';report['captures'][name]=await draw(page);await page.screenshot(path=str(OUT/name),full_page=True,timeout=90000)
                await page.close()
            page=await browser.new_page(viewport={'width':1100,'height':850})
            page.on('pageerror',lambda e:report['pageErrors'].append(str(e)))
            await page.goto('file://'+str(ROOT/'assets/districts/review.html'));await page.wait_for_function('!!globalThis.assetReview')
            names=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {HARMONY_FAMILIES} from './src/scene/harmony/kit.js';console.log(JSON.stringify(HARMONY_FAMILIES.flatMap(f=>[f+'-0-level-3',f+'-1-level-3']))));"],cwd=ROOT,text=True))
            for name in names:
                for angle,label in [(.60,'front'),(3.7,'rear')]:
                    r=await page.evaluate("arg=>{assetReview.select(arg.name,'high');assetReview.setLight('studio');assetReview.setView(arg.angle,.44);const r=assetReview.renderer;return {...r.stats,error:r.gl.getError()};}",{'name':name,'angle':angle})
                    assert r['error']==0
                    filename=f'studio-{name}-{label}.png';report['captures'][filename]=r;await page.screenshot(path=str(OUT/filename),timeout=90000)
            await page.close();assert not report['pageErrors'],report['pageErrors']
            report['checks']=['Three legal economic checkpoints, actual pinned v5 before/after, unchanged normal player camera and state checksums.','Day and dusk; maximum permitted player zoom; no capture-only target offset.','Both architectural variants under simple light from two angles in the same native engine.']
            await browser.close();browser=None
    except Exception:report['failure']=traceback.format_exc();raise
    finally:
        (OUT/'report.json').write_text(json.dumps(report,indent=2))
        if browser:await browser.close()
        for s in servers:s.terminate();s.wait(timeout=5)
    print(json.dumps({'checks':report['checks'],'captures':len(report['captures'])},indent=2))
if __name__=='__main__':asyncio.run(main())
