/** Dependency-free static build and a single-file offline demo. Supports this project's ESM subset. */
import { readFile, writeFile, readdir, mkdir, rm, cp } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
const root=resolve(import.meta.dirname,'..'),dist=join(root,'dist');
const crazy=process.argv.includes('--crazygames');
const signal=process.env.SIGNAL_URL||null,turn=process.env.TURN_CREDENTIALS_URL||null;
if(signal&&!/^wss:\/\//.test(signal))throw Error('SIGNAL_URL must be an encrypted wss:// endpoint.');
if(turn&&!/^https:\/\//.test(turn))throw Error('TURN_CREDENTIALS_URL must use https://.');
if(crazy&&!signal)throw Error('CrazyGames multiplayer build requires SIGNAL_URL. Deploy signaling first.');
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
await cp(join(root,'src'),join(dist,'src'),{recursive:true});
const config=(await readFile(join(root,'config.js'),'utf8')).replace('signalUrl: null',`signalUrl: ${JSON.stringify(signal)}`).replace('turnCredentialsUrl: null',`turnCredentialsUrl: ${JSON.stringify(turn)}`);
await writeFile(join(dist,'config.js'),config.replace('crazyGames: false',`crazyGames: ${crazy}`));
let html=await readFile(join(root,'index.html'),'utf8');await writeFile(join(dist,'index.html'),html);
async function walk(dir){const out=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())out.push(...await walk(p));else if(p.endsWith('.js'))out.push(p);}return out;}
const factories=[];
for(const file of [...await walk(join(root,'src')),join(root,'config.js')].sort()){
 let source=file===join(root,'config.js')?config:await readFile(file,'utf8'),exports=[];
 source=source.replace(/import\s+\{([^}]+)\}\s+from\s+(['"])([^'"]+)\2\s*;/g,(_,names,q,path)=>`const { ${names.replace(/\s+as\s+/g,': ')} } = require(${JSON.stringify(path)});`);
 source=source.replace(/import\((['"])([^'"]+)\1\)/g,(_,q,path)=>`Promise.resolve().then(()=>require(${JSON.stringify(path)}))`);
 source=source.replace(/export\s*\{([^}]+)\};?/g,(_,names)=>{exports.push(...names.split(',').map(x=>x.trim()));return '';});
 source=source.replace(/export\s+(const|let|function|class)\s+(\w+)/g,(_,kind,name)=>{exports.push(name);return `${kind} ${name}`;});
 if(/^\s*(import |export )/m.test(source))throw Error(`Unsupported ESM syntax in ${file}. Update the bundler or adopt a standard bundler.`);
 factories.push(`${JSON.stringify('/'+relative(root,file).replaceAll('\\','/'))}:function(require,exports){\n${source}\nObject.assign(exports,{${exports.join(',')}});\n}`);
}
const script=`(()=>{'use strict';const factories={${factories.join(',\n')}};const cache={};function load(id){if(cache[id])return cache[id];if(!factories[id])throw Error('Module absent: '+id);const out=cache[id]={};function require(path){const parts=(path.startsWith('/')?path:id.slice(0,id.lastIndexOf('/')+1)+path).split('/'),result=[];for(const p of parts){if(p==='..')result.pop();else if(p&&p!=='.')result.push(p);}return load('/'+result.join('/'));}factories[id](require,out);return out;}load('/src/main.js');})();`;
html=html.replace('<link rel="stylesheet" href="./src/ui/styles.css">',`<style>${await readFile(join(root,'src/ui/styles.css'),'utf8')}</style>`).replace('<script type="module" src="./src/main.js"></script>',`<script>${script.replaceAll('</script','<\\/script')}</script>`);
await writeFile(join(dist,'dicestrict-offline.html'),html);
await writeFile(join(dist,'build-info.json'),JSON.stringify({version:'0.3.0',target:crazy?'crazygames':'web',persistentRewards:false,signalingConfigured:Boolean(signal)},null,2)+'\n');
console.log(`Static build complete. Offline demo: ${Buffer.byteLength(html)} bytes. Target: ${crazy?'CrazyGames (not deployed)':'web'}.`);
