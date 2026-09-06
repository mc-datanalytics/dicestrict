/** Executable exchange exports of the same native geometry used in-game. */
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {createHarmonyAsset,HARMONY_FAMILIES,HARMONY_BUDGETS} from '../../src/scene/harmony/kit.js';
import {encodeGLB} from './glb.mjs';
const root=resolve(import.meta.dirname,'../..'),out=resolve(root,'assets/harmony');await mkdir(out,{recursive:true});
const rows=[];
for(const family of HARMONY_FAMILIES)for(let level=-1;level<4;level++)for(const variant of level<0?[0]:[0,1])for(const lod of ['low','high']){
 const g=createHarmonyAsset(family,level,variant,lod),data=encodeGLB(g).bytes,name=g.name;
 await writeFile(resolve(out,name+'.glb'),data);
 const min=[Infinity,Infinity,Infinity],max=min.map(x=>-x);for(let j=0;j<g.data.length;j+=12)for(let k=0;k<3;k++){min[k]=Math.min(min[k],g.data[j+k]);max[k]=Math.max(max[k],g.data[j+k]);}
 rows.push({name,family,level,variant,lod,triangles:g.indices.length/3,gpuBytes:g.data.byteLength+g.indices.byteLength,glbBytes:data.length,gzipBytes:gzipSync(data).length,bounds:{min,max},sha256:createHash('sha256').update(data).digest('hex')});
}
const sources={};for(const p of ['src/scene/harmony/kit.js','src/scene/harmony/architecture.js','src/scene/marina/mesh-builder.js','src/scene/marina/surfaces.js'])sources[p]=createHash('sha256').update(await readFile(resolve(root,p))).digest('hex');
await writeFile(resolve(out,'manifest.json'),JSON.stringify({schema:1,coordinateSystem:'Y up, ground 0, +Z entrance, origin parcel centre, 1 unit = one board-world metre',runtime:'Deterministic native indexed geometry; exports are not loaded over the network',budgets:HARMONY_BUDGETS,sources,models:rows},null,2));
console.table(rows.map(({name,triangles,gpuBytes,glbBytes})=>({name,triangles,gpuBytes,glbBytes})));
console.log(`Executed ${rows.length} GLB exports to assets/harmony`);
