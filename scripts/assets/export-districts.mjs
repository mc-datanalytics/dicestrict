/** Execute the actual runtime generators; exports are optional interchange, never runtime downloads. */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { encodeGLB, png } from './glb.mjs';
import { createDistrictAsset, createDistrictProp, FAMILIES } from '../../src/scene/districts/kit.js';
import { surfaceAtlas } from '../../src/scene/marina/surfaces.js';
const root=resolve(import.meta.dirname,'../..'),out=resolve(root,'assets/districts');
const sourceHashes={};
for(const p of ['src/scene/districts/kit.js','src/scene/marina/mesh-builder.js','src/scene/marina/surfaces.js','scripts/assets/glb.mjs'])sourceHashes[p]=createHash('sha256').update(await readFile(join(root,p))).digest('hex');
const manifest={schema:1,sourceHashes,units:'Board units; Y up; +Z facade; centred at foundation Y=0; approximately 10 visual metres per board unit.',runtime:'Generated natively, indexed, batched per parcel; shared 256x256 atlas, no network asset loader.',assets:[]};
for(const lod of ['low','high']){
 await mkdir(join(out,lod),{recursive:true});
 const models=[];
 for(const family of FAMILIES)for(const level of [-1,0,1,2,3])for(const variant of level===-1?[0]:[0,1])models.push(createDistrictAsset(family,level,variant,lod));
 for(const name of ['linden','bench','cafe-table','heritage-lamp','office-lamp','container','delivery-truck','gantry'])models.push(createDistrictProp(name,lod));
 for(const mesh of models){
   const {bytes,min,max}=encodeGLB(mesh),file=`${lod}/${mesh.name}.glb`;
   await writeFile(join(out,file),bytes);
   manifest.assets.push({name:mesh.name,lod,file,triangles:mesh.indices.length/3,vertices:mesh.data.length/12,gpuBytes:mesh.data.byteLength+mesh.indices.byteLength,glbBytes:bytes.length,gzipBytes:gzipSync(bytes).length,bounds:{min,max},sha256:createHash('sha256').update(bytes).digest('hex')});
 }
}
await writeFile(join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
await writeFile(join(out,'surfaces.png'),png(surfaceAtlas()));
console.table(manifest.assets.map(({name,triangles,gpuBytes,glbBytes})=>({name,triangles,gpuBytes,glbBytes})));
console.log(`Executed export: ${manifest.assets.length} new district GLBs in ${out}`);
