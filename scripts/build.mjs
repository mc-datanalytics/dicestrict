/** Native ESM, standalone game, and optional isolated balancing lab. */
import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { bundle } from './bundle.mjs';
import { sourceMeta } from './source-meta.mjs';
const root=resolve(import.meta.dirname,'..'),dist=join(root,'dist');
const crazy=process.argv.includes('--crazygames'),lab=process.argv.includes('--lab');
if(crazy&&lab)throw Error('The balance lab is a developer tool, not part of the CrazyGames release.');
const signal=process.env.SIGNAL_URL||null,turn=process.env.TURN_CREDENTIALS_URL||null;
if(signal&&!/^wss:\/\//.test(signal))throw Error('SIGNAL_URL must be an encrypted wss:// endpoint.');
if(turn&&!/^https:\/\//.test(turn))throw Error('TURN_CREDENTIALS_URL must use https://.');
if(crazy&&!signal)throw Error('CrazyGames multiplayer build requires SIGNAL_URL. Deploy signaling first.');
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
await cp(join(root,'src'),join(dist,'src'),{recursive:true});
if(!lab)await rm(join(dist,'src/lab'),{recursive:true,force:true});
const config=(await readFile(join(root,'config.js'),'utf8')).replace('signalUrl: null',`signalUrl: ${JSON.stringify(signal)}`).replace('turnCredentialsUrl: null',`turnCredentialsUrl: ${JSON.stringify(turn)}`);
await writeFile(join(dist,'config.js'),config.replace('crazyGames: false',`crazyGames: ${crazy}`));
const safeScript=s=>s.replaceAll('</script','<\\/script');
let html=await readFile(join(root,'index.html'),'utf8');await writeFile(join(dist,'index.html'),html);
const script=await bundle(root,'src/main.js',{'/config.js':config});
html=html.replace('<link rel="stylesheet" href="./src/ui/styles.css">',`<style>${await readFile(join(root,'src/ui/styles.css'),'utf8')}</style>`).replace('<script type="module" src="./src/main.js"></script>',`<script>${safeScript(script)}</script>`);
await writeFile(join(dist,'dicestrict-offline.html'),html);
if(lab){
  const metadata=await sourceMeta(new URL('../',import.meta.url)),meta=`const SOURCE_META=${JSON.stringify(metadata)}; export { SOURCE_META };`,overrides={'/src/lab/source-meta.js':meta};
  await writeFile(join(dist,'src/lab/source-meta.js'),meta+'\n');
  let page=await readFile(join(root,'lab.html'),'utf8');await writeFile(join(dist,'lab.html'),page);
  const worker=await bundle(root,'src/lab/worker.js',overrides),app=await bundle(root,'src/lab/app.js',overrides);
  page=page.replace('<link rel="stylesheet" href="./src/lab/styles.css">',`<style>${await readFile(join(root,'src/lab/styles.css'),'utf8')}</style>`).replace('<script type="module" src="./src/lab/app.js"></script>',`<script>${safeScript('globalThis.DICESTRICT_LAB_WORKER='+JSON.stringify(worker)+';\n'+app)}</script>`);
  await writeFile(join(dist,'dicestrict-lab-offline.html'),page);
}
const pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
await writeFile(join(dist,'build-info.json'),JSON.stringify({version:pkg.version,target:crazy?'crazygames':'web',lab,persistentRewards:false,signalingConfigured:Boolean(signal)},null,2)+'\n');
console.log(`Static build complete. Offline game: ${Buffer.byteLength(html)} bytes. Lab: ${lab}. Target: ${crazy?'CrazyGames (not deployed)':'web'}.`);
