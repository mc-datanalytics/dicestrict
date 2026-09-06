import { readdir, readFile } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root=resolve(import.meta.dirname,'..');
async function walk(dir){const files=[];for(const e of await readdir(dir,{withFileTypes:true})){if(['dist','node_modules','.git','test-results','.bootstrap'].includes(e.name))continue;const p=join(dir,e.name);if(e.isDirectory())files.push(...await walk(p));else if(/\.(m?js)$/.test(p))files.push(p);}return files;}
const files=await walk(root);
for(const file of files){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(r.status){console.error(r.stderr);process.exit(1);}const source=await readFile(file,'utf8');if(file.startsWith(join(root,'src')+'/')&&/\brequire\s*\(/.test(source))throw Error(`CommonJS require in browser ESM: ${file}`);for(const m of source.matchAll(/(?:from\s*|import\s*\()(['"])(\.[^'"]+)\1/g)){try{await readFile(resolve(dirname(file),m[2]));}catch{throw Error(`Missing import ${m[2]} in ${file}`);}}}
console.log(`Syntax and local imports OK: ${files.length} JavaScript files.`);
