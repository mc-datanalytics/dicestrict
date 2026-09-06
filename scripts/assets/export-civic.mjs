/** Execute civic generators and export actual GLB meshes; no runtime asset download. */
import { mkdir,writeFile,readFile } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { encodeGLB,png } from './glb.mjs';
import { createCivicAsset,CIVIC_FACTORIES,CIVIC_BUDGETS } from '../../src/scene/civic/kit.js';
import { CIVIC_PLACEMENT } from '../../src/scene/civic.js';
import { surfaceAtlas } from '../../src/scene/marina/surfaces.js';
const root=resolve(import.meta.dirname,'../..'),out=join(root,'assets/civic'),sha=b=>createHash('sha256').update(b).digest('hex');
const manifest={schema:1,units:'Board units, Y-up. Casino/fountain origin at ground centre; promenade is an assembled world-space layout.',placement:CIVIC_PLACEMENT,budgets:CIVIC_BUDGETS,sourceHashes:{},assets:[]};
for(const f of ['src/scene/civic/kit.js','src/scene/civic.js','src/scene/marina/mesh-builder.js','src/scene/districts/kit.js','src/scene/marina/surfaces.js','scripts/assets/glb.mjs'])manifest.sourceHashes[f]=sha(await readFile(join(root,f)));
for(const lod of ['low','high']){
 await mkdir(join(out,lod),{recursive:true});
 for(const name of Object.keys(CIVIC_FACTORIES)){
  const mesh=createCivicAsset(name,lod),{bytes,min,max}=encodeGLB(mesh),file=`${lod}/${name}.glb`;
  await writeFile(join(out,file),bytes);
  manifest.assets.push({name,lod,file,triangles:mesh.indices.length/3,vertices:mesh.data.length/12,geometryBytes:mesh.data.byteLength+mesh.indices.byteLength,glbBytes:bytes.length,gzipBytes:gzipSync(bytes).length,bounds:{min,max},sha256:sha(bytes)});
 }
}
await writeFile(join(out,'surfaces.png'),png(surfaceAtlas()));
await writeFile(join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.table(manifest.assets.map(({name,lod,triangles,geometryBytes,glbBytes})=>({name,lod,triangles,geometryBytes,glbBytes})));
