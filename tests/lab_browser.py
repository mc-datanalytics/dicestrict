"""Real Worker, optional build, replay WebGL2 and cancellation validation. No mock simulator."""
import asyncio, json, pathlib, subprocess, time, os, traceback
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
URL='http://127.0.0.1:4399'
async def run(page,samples=3):
    await page.locator('#samples').fill(str(samples));await page.locator('#run').click()
    await page.wait_for_function("document.querySelector('#status').textContent.startsWith('Terminé') || document.querySelector('#status').textContent.startsWith('Échec')",timeout=90000)
    assert (await page.locator('#status').inner_text()).startswith('Terminé'),await page.locator('#status').inner_text()
async def download(page,button,name):
    async with page.expect_download() as event: await page.locator(button).click()
    item=await event.value;path=OUT/name;await item.save_as(path);return path
async def main():
    checks=[];errors=[];browser=None
    server=subprocess.Popen(['node','scripts/dev.mjs','--dist','--port','4399'],cwd=ROOT,stdout=subprocess.DEVNULL)
    try:
        import urllib.request
        for _ in range(80):
            try: urllib.request.urlopen(URL+'/lab.html',timeout=.5);break
            except Exception: time.sleep(.1)
        async with async_playwright() as pw:
            opts={'headless':True,'args':['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']}
            if os.getenv('CHROMIUM_PATH'): opts['executable_path']=os.environ['CHROMIUM_PATH']
            browser=await pw.chromium.launch(**opts)
            ctx=await browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True)
            page=await ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
            response=await page.goto(URL+'/lab.html');assert response.status==200,await page.content();await page.evaluate("localStorage.setItem('dicestrict:casual:v4','SENTINEL-LIVE-MATCH')")
            assert await page.locator('#planned-games').inner_text()=='800'
            await run(page)
            path=await download(page,'#export-json','lab-report.json');report=json.loads(path.read_text())
            assert report['gamesCompleted']==24 and report['method']['independentSeeds']==3 and not report['failures']
            assert len(report['source']['sha256'])==64
            assert await page.evaluate("localStorage.getItem('dicestrict:casual:v4')")=='SENTINEL-LIVE-MATCH'
            checks.append('Native module Worker completes paired games without reading or replacing live saves')
            config=OUT/'lab-config.json';config.write_text(json.dumps(report['config']))
            code="import {readFileSync} from 'node:fs';import {runExperiment} from './src/lab/core.js';process.stdout.write(JSON.stringify(runExperiment(JSON.parse(readFileSync(process.argv[1],'utf8')))));"
            expected=json.loads(subprocess.check_output(['node','--input-type=module','-e',code,str(config)],cwd=ROOT))
            actual={k:v for k,v in report.items() if k!='source'};assert actual==expected
            checks.append('Browser Worker report matches Node result exactly, including bootstrap intervals and per-game checksums')
            csv=await download(page,'#export-csv','lab-data.csv');assert len(csv.read_text().splitlines())==25
            await page.screenshot(path=str(OUT/'lab-desktop.png'),full_page=True)
            await page.locator('#load-replay').click();await page.wait_for_function("document.querySelector('#status').textContent.startsWith('Rejeu vérifié')",timeout=30000)
            assert await page.locator('#replay-fallback').is_hidden()
            await page.locator('#replay-step').evaluate("el=>{el.value=el.max;el.dispatchEvent(new Event('input',{bubbles:true}));}")
            replay=json.loads((await download(page,'#export-replay','lab-replay.json')).read_text())
            assert await page.locator('#replay-position').get_attribute('data-checksum')==replay['finalChecksum']
            gl=await page.evaluate("""async()=>{const {ui}=await import('/src/lab/app.js');ui.scene.dirty=true;ui.scene.render(performance.now()+100);const gl=ui.scene.renderer.gl,p=new Uint8Array(4),colors=new Set();for(let x=30;x<gl.drawingBufferWidth;x+=50)for(let y=30;y<gl.drawingBufferHeight;y+=50){gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);colors.add([...p].join(','));}return {colors:colors.size,error:gl.getError()};}""")
            assert gl['colors']>8 and gl['error']==0,gl
            await page.locator('#replay-panel').screenshot(path=str(OUT/'lab-replay-3d.png'))
            checks.append('Read-only replay validates all commands, draws actual WebGL2 and reaches the exact final checksum')
            await page.locator('#previous').click();assert await page.locator('#replay-position').get_attribute('data-checksum')==replay['trace'][-2]['checksum']
            await page.locator('#samples').fill('500');assert await page.locator('#changed').is_visible()
            await page.locator('#run').click();await page.locator('#stop').click();assert 'arrêté' in await page.locator('#status').inner_text()
            await page.wait_for_timeout(500);assert not await page.locator('#run').is_disabled()
            checks.append('Stop terminates the Worker; partial samples do not become a completed report')
            await page.set_viewport_size({'width':390,'height':844});await run(page,2)
            assert await page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'),await page.evaluate('document.documentElement.scrollWidth')
            await page.screenshot(path=str(OUT/'lab-mobile.png'),full_page=True)
            checks.append('390px lab layout and controls work without body overflow')
            # Separate offline build: the computation worker itself is embedded, not fetched.
            off=await ctx.new_page();off.on('pageerror',lambda e:errors.append(str(e)));external=[]
            off.on('request',lambda req:external.append(req.url) if req.url.startswith(('http:','https:')) else None)
            await off.goto((ROOT/'dist/dicestrict-lab-offline.html').as_uri());await run(off)
            offline=json.loads((await download(off,'#export-json','lab-offline-report.json')).read_text())
            assert offline==report;assert not external,external
            checks.append('Standalone file:// lab embeds its Worker and gives exactly the native report without external requests')
            await off.close()
            fallback=await browser.new_context(viewport={'width':390,'height':844})
            await fallback.add_init_script("const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type.startsWith('webgl'))return null;return original.call(this,type,...args);};")
            fp=await fallback.new_page();fp.on('pageerror',lambda e:errors.append(str(e)));await fp.goto(URL+'/lab.html');await run(fp,1)
            await fp.locator('#load-replay').click();await fp.wait_for_function("document.querySelector('#status').textContent.startsWith('Rejeu vérifié')")
            assert await fp.locator('#replay-fallback').is_visible();assert await fp.locator('#replay-players .policy').count()==4
            checks.append('Simulation and textual replay remain usable when WebGL is unavailable')
            assert not errors,errors
            (OUT/'lab-browser-report.json').write_text(json.dumps({'passed':checks,'pageErrors':errors},indent=2))
            print(json.dumps({'passed':checks,'pageErrors':errors},indent=2))
    except Exception:
        (OUT/'lab-browser-failure.txt').write_text(traceback.format_exc())
        (OUT/'lab-browser-report.json').write_text(json.dumps({'passed':checks,'pageErrors':errors,'failed':True},indent=2))
        raise
    finally:
        if browser: await browser.close()
        server.terminate();server.wait(timeout=10)
if __name__=='__main__':asyncio.run(main())
