"""Actual WebGL2 resource lifecycle. SwiftShader CI is not physical-device validation."""
import asyncio, json, pathlib, platform, subprocess, time, traceback, urllib.request
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results'/'shadow';OUT.mkdir(parents=True,exist_ok=True)
URL='http://127.0.0.1:4439'
DRAW="""async()=>{const {app}=await import('/src/main.js'),s=app.scene,r=s.renderer,gl=r.gl;cancelAnimationFrame(s.raf);s.dirty=true;s.render(performance.now()+100);const pixel=new Uint8Array(4),colors=new Set();for(let x=50;x<gl.drawingBufferWidth;x+=140)for(let y=50;y<gl.drawingBufferHeight;y+=140){gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);colors.add([...pixel].join(','));}return {stats:r.stats,error:gl.getError(),lost:gl.isContextLost(),colors:colors.size};}"""
async def main():
    report={'environment':{'platform':platform.platform(),'device':'Linux CI VM; software WebGL2, not a physical phone'},'checks':[],'switches':[],'restores':[],'pageErrors':[]}
    server=subprocess.Popen(['node','scripts/dev.mjs','--port','4439'],cwd=ROOT,stdout=subprocess.DEVNULL)
    try:
        for _ in range(80):
            try:urllib.request.urlopen(URL,timeout=.5);break
            except Exception:time.sleep(.1)
        async with async_playwright() as p:
            browser=await p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
            report['environment']['chromium']=browser.version
            page=await browser.new_page(viewport={'width':1200,'height':850},device_scale_factor=1)
            page.on('pageerror',lambda e:report['pageErrors'].append(str(e)))
            await page.add_init_script("localStorage.setItem('dicestrict:settings:v1',JSON.stringify({reduced:true,living:false,weather:false,quality:'low'}))")
            await page.goto(URL);await page.wait_for_function("!document.querySelector('.scene-loading')")
            assert await page.locator('.scene-error').count()==0
            await page.evaluate("async()=>{window.shadowApp=(await import('/src/main.js')).app;cancelAnimationFrame(shadowApp.scene.raf)}")
            first=await page.evaluate(DRAW);report['initialLow']=first
            assert first['error']==0 and first['colors']>8 and first['stats']['shadowDrawCalls']==0
            assert first['stats']['textureBytes']['shadowDepth24StorageUpperBound']==0
            assert await page.evaluate('!shadowApp.scene.renderer.shadow&&!shadowApp.scene.renderer.fb')
            report['checks'].append('Low startup: no shadow texture and no shadow framebuffer allocation, real non-uniform frame.')
            for _ in range(3):
                await page.evaluate("()=>shadowApp.scene.configure({quality:'high'})")
                r=await page.evaluate(DRAW);assert r['error']==0 and r['stats']['shadowDrawCalls']>0
                assert r['stats']['textureBytes']['shadowDepth24StorageUpperBound']==16777216
                await page.evaluate("()=>{const r=shadowApp.scene.renderer;window.oldDepth=r.shadow;window.oldFB=r.fb;shadowApp.scene.configure({quality:'low'});}")
                assert await page.evaluate('!shadowApp.scene.renderer.gl.isTexture(oldDepth)&&!shadowApp.scene.renderer.gl.isFramebuffer(oldFB)')
                low=await page.evaluate(DRAW);assert low['error']==0 and low['stats']['textureBytes']['shadowDepth24StorageUpperBound']==0 and low['stats']['shadowDrawCalls']==0
                report['switches'].append({'high':r['stats'],'low':low['stats']})
            report['checks'].append('Three low/high/low cycles: old depth texture and framebuffer are actually deleted; high reallocation is complete.')
            for i,quality in enumerate(['low','high']):
                await page.evaluate("async()=>{const {fingerprint}=await import('/src/game/engine.js');const r=shadowApp.scene.renderer;window.beforeLoss=fingerprint(shadowApp.state);window.beforeMeshCount=r.meshes.size;window.lossExtension=r.gl.getExtension('WEBGL_lose_context');if(!lossExtension)throw Error('WEBGL_lose_context is required');lossExtension.loseContext();}")
                await page.wait_for_function('shadowApp.scene.lost&&shadowApp.scene.renderer.lost')
                await page.evaluate("quality=>shadowApp.scene.configure({quality})",quality)
                assert await page.evaluate('shadowApp.scene.renderer.textureBytes.shadowDepth24StorageUpperBound===0')
                await page.evaluate('lossExtension.restoreContext()')
                await page.wait_for_function(f'shadowApp.scene.renderer.restoreCount==={i+1}&&!shadowApp.scene.lost&&!shadowApp.scene.renderer.lost',timeout=30000)
                r=await page.evaluate(DRAW);assert r['error']==0 and r['colors']>8 and not r['lost'],r
                assert await page.locator('.scene-error').count()==0
                invariant=await page.evaluate("async()=>{const {fingerprint}=await import('/src/game/engine.js'),r=shadowApp.scene.renderer;return {sameState:fingerprint(shadowApp.state)===beforeLoss,sameMeshCount:r.meshes.size===beforeMeshCount,allBuffersLive:[...r.meshes].every(m=>r.gl.isBuffer(m.buffer)&&r.gl.isVertexArray(m.vao)&&(!m.indexBuffer||r.gl.isBuffer(m.indexBuffer)))};}")
                assert all(invariant.values()),invariant
                assert r['stats']['textureBytes']['shadowDepth24StorageUpperBound']==(0 if quality=='low' else 16777216)
                report['restores'].append({'quality':quality,'frame':r,'invariants':invariant})
                await page.screenshot(path=str(OUT/f'restored-{quality}.png'),timeout=90000)
            report['checks'].append('Two real context losses/restores, changing quality while lost: meshes/atlas/programs/state restored; low still allocates no depth map.')
            assert not report['pageErrors'],report['pageErrors']
            await page.evaluate('shadowApp.scene.destroy()');assert await page.evaluate('shadowApp.scene.renderer.meshes.size===0')
            await browser.close()
    except Exception:
        report['failure']=traceback.format_exc();raise
    finally:
        (OUT/'report.json').write_text(json.dumps(report,indent=2));server.terminate();server.wait(timeout=5)
    print(json.dumps(report['checks'],indent=2))
if __name__=='__main__':asyncio.run(main())
