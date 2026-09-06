/** Small ESM-subset bundler. No eval, network resolution, or npm dependency. */
import { readFile } from 'node:fs/promises';
import { resolve, relative, dirname } from 'node:path';
async function bundle(root,entry,overrides={}){
  const files=new Map();
  async function visit(path){
    const file=resolve(root,path),id='/'+relative(root,file).replaceAll('\\','/');
    if(!file.startsWith(root+'/'))throw Error('Module outside root.');
    if(files.has(id))return;
    const text=overrides[id]??await readFile(file,'utf8');files.set(id,text);
    for(const m of text.matchAll(/(?:from\s*|import\s*\()(['"])(\.[^'"]+)\1/g))await visit(relative(root,resolve(dirname(file),m[2])));
  }
  await visit(entry);const factories=[];
  for(const [id,text] of [...files].sort(([a],[b])=>a.localeCompare(b))){
    let source=text,exports=[];
    source=source.replace(/import\s+\{([^}]+)\}\s+from\s+(['"])([^'"]+)\2\s*;/g,(_,names,q,path)=>`const { ${names.replace(/\s+as\s+/g,': ')} } = require(${JSON.stringify(path)});`);
    source=source.replace(/import\((['"])([^'"]+)\1\)/g,(_,q,path)=>`Promise.resolve().then(()=>require(${JSON.stringify(path)}))`);
    source=source.replace(/export\s*\{([^}]+)\};?/g,(_,names)=>{exports.push(...names.split(',').map(x=>x.trim()));return '';});
    source=source.replace(/export\s+(const|let|function|class)\s+(\w+)/g,(_,kind,name)=>{exports.push(name);return `${kind} ${name}`;});
    if(/^\s*(import |export )/m.test(source)||/\bimport\.meta\b/.test(source))throw Error(`Unsupported ESM syntax in ${id}.`);
    factories.push(`${JSON.stringify(id)}:function(require,exports){\n${source}\nObject.assign(exports,{${exports.join(',')}});\n}`);
  }
  return `(()=>{'use strict';const factories={${factories.join(',\n')}};const cache={};function load(id){if(cache[id])return cache[id];if(!factories[id])throw Error('Module absent: '+id);const out=cache[id]={};function require(path){const parts=(path.startsWith('/')?path:id.slice(0,id.lastIndexOf('/')+1)+path).split('/'),result=[];for(const p of parts){if(p==='..')result.pop();else if(p&&p!=='.')result.push(p);}return load('/'+result.join('/'));}factories[id](require,out);return out;}load(${JSON.stringify('/'+entry)});})();`;
}
export { bundle };
