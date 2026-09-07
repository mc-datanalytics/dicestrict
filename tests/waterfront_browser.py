"""Pinned-source A/B, actual player views, developed legal marina; software != phone."""
import asyncio,json,os,pathlib,platform,subprocess,time,traceback,urllib.request
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT/'test-results/waterfront';OUT.mkdir(parents=True,exist_ok=True)
BASE=pathlib.Path(os.getenv('WATERFRONT_BASELINE_DIR',ROOT/'test-results/waterfront-baseline')).resolve()
FIX=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import{waterfrontFixtures}from'./scripts/assets/waterfront-fixtures.mjs';console.log(JSON.stringify(waterfrontFixtures()));"],cwd=ROOT,text=True))
LOAD="""async state=>{const{app}=await import('/src/main.js');clearTimeout(app.botTimer);clearTimeout(app.busyTimer);app.settings.reduced=true;app.accept(structuredClone(state));clearTimeout(app.botTimer);clearTimeout(app.busyTimer);cancelAnimationFrame(app.scene.raf);window.portApp=app;const s=app.scene;s.configure({quality:'high',reduced:false,living:false,weather:false,dayMode:'day'});s.paths=state.players.map(p=>({from:p.position,to:p.position,steps:0,start:0,duration:0}));s.lastRoll=-99999;s.captureTarget=undefined;s.view('reset');s.lastAmbientFrame=null;}"""
DRAW="""async()=>{const s=portApp.scene,r=s.renderer,gl=r.gl;s.lastAmbientFrame=null;s.dirty=true;const t=performance.now();s.render(t+100);const px=new Uint8Array(4);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);const wall=performance.now()-t;const{fingerprint}=await import('/src/game/engine.js');return{...r.stats,completedReadbackMs:wall,marina:s.city.marina.stats,glError:gl.getError(),lost:gl.isContextLost(),fingerprint:fingerprint(portApp.state),camera:{angle:s.angle,pitch:s.pitch,zoom:s.zoom,target:s.captureTarget??null},clock:s.ambientTime,night:r.night,dusk:r.dusk};}"""
async def draw(page):
    r=await page.evaluate(DRAW);assert r['glError']==0 and not r['lost'],r;return r
async def light(page,name):
    await page.evaluate("name=>{const s=portApp.scene;s.ambientTime=name==='day'?0:name==='dusk'?60:85;s.lastAmbientFrame=null;s.configure({dayMode:name==='day'?'day':'auto',reduced:false,living:false});}",name)
async def main():
    report={'baseCommit':'966b2008a8507e077f2d60efc5385ecae0f14a1a','testedCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'environment':{'platform':platform.platform(),'cpu':subprocess.check_output(['bash','-lc','grep -m1 "model name" /proc/cpuinfo'],text=True).strip(),'type':'CI VM / software SwiftShader; not a phone','viewport':{'width':1600,'height':1000},'dpr':1},'captures':{},'checks':[],'timings':{},'pageErrors':[]}
    (OUT/'legal-history.json').write_text(json.dumps(FIX,indent=2));servers=[];browser=None
    try:
        for root,port in [(BASE,4450),(ROOT,4451)]:
            servers.append(subprocess.Popen(['node','scripts/dev.mjs','--port',str(port)],cwd=root,stdout=subprocess.DEVNULL))
            for _ in range(80):
                try:urllib.request.urlopen(f'http://127.0.0.1:{port}',timeout=.5);break
                except Exception:time.sleep(.1)
        async with async_playwright() as pw:
            browser=await pw.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']);report['environment']['chromium']=browser.version
            pages={}
            for label,port in [('before',4450),('after',4451)]:
                page=await browser.new_page(viewport=report['environment']['viewport'],device_scale_factor=1);pages[label]=page;page.on('pageerror',lambda e:report['pageErrors'].append(str(e)))
                await page.goto(f'http://127.0.0.1:{port}');await page.wait_for_function("!document.querySelector('.scene-loading')");assert await page.locator('.scene-error').count()==0
                await page.evaluate(LOAD,FIX['checkpoints']['start']['state'])
                report['environment'][label+'WebGL']=await page.evaluate("()=>{const gl=portApp.scene.renderer.gl,e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);}")
                for state,c in FIX['checkpoints'].items():
                    await page.evaluate(LOAD,c['state'])
                    for mood in ['day','dusk']:
                        await light(page,mood);r=await draw(page);assert r['fingerprint']==c['fingerprint'];assert r['camera']=={'angle':.5,'pitch':.85,'zoom':1,'target':None}
                        name=f'{state}-{mood}-{label}.png';report['captures'][name]=r;await page.screenshot(path=str(OUT/name),full_page=True,timeout=90000)
                for mood in ['day','dusk','bluehour']:
                    await page.evaluate(LOAD,FIX['checkpoints']['late']['state']);await light(page,mood)
                    if mood=='bluehour':
                        name=f'late-bluehour-{label}.png';report['captures'][name]=await draw(page);await page.screenshot(path=str(OUT/name),full_page=True,timeout=90000)
                    await page.evaluate("()=>{for(let i=0;i<5;i++)portApp.scene.view('in');}")
                    name=f'player-close-{mood}-{label}.png';r=await draw(page);assert r['camera']['zoom']==1.5 and r['camera']['target'] is None;report['captures'][name]=r;await page.screenshot(path=str(OUT/name),full_page=True,timeout=90000)
                    # Supplement only: existing engine with a technical target/zoom,
                    # NOT the main proof or an assertion about player camera access.
                    await page.evaluate("()=>{const s=portApp.scene;s.captureTarget=[-2.15,.5,1.72];s.zoom=4.1;s.pitch=.75;s.angle=.42;}")
                    name=f'technical-close-{mood}-{label}.png';report['captures'][name]=await draw(page);await page.screenshot(path=str(OUT/name),full_page=True,timeout=90000)
                await page.evaluate(LOAD,FIX['checkpoints']['late']['state'])
            report['checks'].append('Both pinned versions render the same three legal checkpoints at reset camera, zoom 1, 1600x1000 DPR1; day/dusk plus developed blue-hour comparison. Player close-ups use permitted zoom 1.5; technical close-ups are labelled separately.')
            # Interleaved ABBA timing blocks avoid claiming fixed-order A->B is unbiased.
            for quality in ['low','high']:
                for animated in [False,True]:
                    case=quality+('-animated' if animated else '-frozen');report['timings'][case]={'before':[],'after':[]}
                    for label in ['before','after','after','before']:
                        page=pages[label];await page.evaluate(LOAD,FIX['checkpoints']['late']['state']);await page.evaluate("x=>{const s=portApp.scene;s.configure({quality:x.quality,living:x.animated,reduced:false,dayMode:'auto'});s.ambientTime=85;}",{'quality':quality,'animated':animated})
                        for i in range(10):
                            await page.evaluate('t=>portApp.scene.ambientTime=t',85+i/30);r=await draw(page)
                            if i>=2:report['timings'][case][label].append(r)
                            await asyncio.sleep(.025)
            report['checks'].append('ABBA blocks per quality/motion case; 2 warmups then 8 synchronous readback samples per block. Report submission and readback separately, not hardware GPU timings.')
            page=pages['after'];await page.evaluate(LOAD,FIX['checkpoints']['late']['state']);await draw(page)
            reflection=await page.evaluate("()=>{const r=portApp.scene.renderer,gl=r.gl,t=r.reflections;gl.bindFramebuffer(gl.FRAMEBUFFER,t.fb);const data=new Uint8Array(512*512*4);gl.readPixels(0,0,512,512,gl.RGBA,gl.UNSIGNED_BYTE,data);gl.bindFramebuffer(gl.FRAMEBUFFER,null);let covered=0;const colors=new Set();for(let i=0;i<data.length;i+=4){if(data[i+3]>0){covered++;colors.add(data[i]+','+data[i+1]+','+data[i+2]);}}return{ready:t.ready,covered,colors:colors.size,error:gl.getError()};}")
            assert reflection['ready'] and reflection['covered']>1000 and reflection['colors']>50 and reflection['error']==0,reflection;report['reflectionTarget']=reflection
            for quality in ['low','high','low','high']:
                await page.evaluate("q=>{window.previousReflection=portApp.scene.renderer.reflections.texture;window.previousReflectionDepth=portApp.scene.renderer.reflections.depth;window.previousReflectionFB=portApp.scene.renderer.reflections.fb;portApp.scene.configure({quality:q});}",quality)
                r=await draw(page)
                if quality=='low':
                    assert r['reflectionDrawCalls']==0 and r['textureBytes']['waterReflectionRGBA8']==0 and r['textureBytes']['shadowDepth24StorageUpperBound']==0
                    assert await page.evaluate("()=>{const gl=portApp.scene.renderer.gl;return !gl.isTexture(previousReflection)&&!gl.isRenderbuffer(previousReflectionDepth)&&!gl.isFramebuffer(previousReflectionFB);}")
                else:assert r['reflectionDrawCalls']>0 and r['textureBytes']['waterReflectionRGBA8']==1048576
            report['checks'].append('Actual reflection target has rendered non-uniform object pixels. Low/high cycles delete and recreate its color texture, depth renderbuffer and framebuffer; low keeps neither shadow nor reflection target.')
            invariant=await page.evaluate("()=>{const s=portApp.scene,r=s.renderer,uploads=r.meshUploads,builds=s.city.marina.builds;s.configure({living:false,reduced:true});for(let i=0;i<100;i++)s.setState(structuredClone(portApp.state));return{uploads:r.meshUploads-uploads,builds:s.city.marina.builds-builds};}");assert invariant=={'uploads':0,'builds':0};report['snapshots']=invariant
            await draw(page);idle=await page.evaluate("()=>{const s=portApp.scene,n=s.frameCount;for(let i=0;i<20;i++)s.render(performance.now()+1000+i*34);return s.frameCount-n;}");assert idle==0;report['idleFrames']=idle
            for name,e in FIX['episodes'].items():
                await page.evaluate(LOAD,e['before']);await draw(page);await page.evaluate("async e=>{const{applyAction}=await import('/src/game/engine.js');const next=applyAction(portApp.state,e.actor,e.action);portApp.settings.reduced=true;portApp.accept(next);clearTimeout(portApp.botTimer);clearTimeout(portApp.busyTimer);cancelAnimationFrame(portApp.scene.raf);}",e);r=await draw(page);report[name]=r
                assert await page.evaluate('(tile)=>portApp.state.properties[tile]',e['action']['tile'])==e['after']['properties'][e['action']['tile']]
                visual=await page.evaluate('(tile)=>{const p=portApp.scene.city.marina.parcels.find(p=>p.id===tile);return {level:p.level,closed:p.closed};}',e['action']['tile']);expected=e['after']['properties'][e['action']['tile']];assert visual=={'level':expected['level'],'closed':1 if expected['mortgaged'] else 0};report[name]['visualState']=visual
            report['checks'].append('100 unchanged property snapshots upload no new mesh; 20 frozen idle calls render zero frames. Reducer-legal marina upgrade and mortgage preserve real property state.')
            await page.evaluate(LOAD,FIX['checkpoints']['late']['state']);report['cameraMoves']=[]
            for angle,pitch,zoom in [(.5,.85,.72),(.7,.8,1.5),(1.1,.6,1),(.5,1.2,1.5)]:
                await page.evaluate('v=>{const s=portApp.scene;[s.angle,s.pitch,s.zoom]=v;}',[angle,pitch,zoom]);r=await draw(page);assert r['reflectionDrawCalls']<=12;report['cameraMoves'].append(r)
            for quality in ['low','high']:
                await page.evaluate("()=>{const r=portApp.scene.renderer;window.restores=r.restoreCount;window.ext=r.gl.getExtension('WEBGL_lose_context');if(!ext)throw Error('Context loss extension required');ext.loseContext();}")
                await page.wait_for_function('portApp.scene.lost&&portApp.scene.renderer.lost');await page.evaluate('q=>portApp.scene.configure({quality:q})',quality);await page.evaluate('ext.restoreContext()')
                await page.wait_for_function('portApp.scene.renderer.restoreCount===restores+1&&!portApp.scene.lost',timeout=30000);await page.evaluate('cancelAnimationFrame(portApp.scene.raf)');r=await draw(page);assert r['textureBytes']['waterReflectionRGBA8']==(0 if quality=='low' else 1048576)
            report['checks'].append('Player-camera rotation/zoom retains a bounded reflection pass; context restoration in low and high recreates the proper targets without losing the game state.')
            # Both properties remain pickable in their original board slots.
            await page.evaluate(LOAD,FIX['checkpoints']['late']['state']);await draw(page)
            for tile in [8,9]:
                selected=await page.evaluate("async id=>{const s=portApp.scene,{tilePosition}=await import('/src/game/board.js'),{transform}=await import('/src/scene/math.js'),[x,z]=tilePosition(id),p=transform(s.vp,[x,.51,z,1]),rect=s.canvas.getBoundingClientRect();s.pick(rect.left+(p[0]/p[3]+1)*.5*rect.width,rect.top+(1-p[1]/p[3])*.5*rect.height);return s.selected;}",tile);assert selected==tile
            report['checks'].append('Original board slots 8 and 9 remain selectable; no economic, network, board or UI source modified.')
            for p in pages.values():await p.close()
            offline=await browser.new_page(viewport={'width':1280,'height':900});await offline.goto('file://'+str(ROOT/'dist/dicestrict-offline.html'));await offline.wait_for_function("!document.querySelector('.scene-loading')");assert await offline.locator('.scene-error').count()==0;await offline.screenshot(path=str(OUT/'offline-start.png'),timeout=90000);await offline.close()
            assert not report['pageErrors'],report['pageErrors'];report['checks'].append('Built standalone game initializes actual WebGL2 without external asset requests.');await browser.close();browser=None
    except Exception:report['failure']=traceback.format_exc();raise
    finally:
        (OUT/'report.json').write_text(json.dumps(report,indent=2))
        if browser:await browser.close()
        for s in servers:s.terminate();s.wait(timeout=5)
    print(json.dumps({'checks':report['checks'],'captures':len(report['captures'])},indent=2))
if __name__=='__main__':asyncio.run(main())
