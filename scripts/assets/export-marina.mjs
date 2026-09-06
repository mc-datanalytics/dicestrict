import { encodeGLB, png } from './glb.mjs';
/** Executable exporter: the exact runtime modelling functions -> glTF 2.0 GLB + PNG.
 * Node 22 only. No Blender or unexecuted placeholders; no external asset download.
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { createAsset, FACTORIES } from '../../src/scene/marina/kit.js';
import { surfaceAtlas } from '../../src/scene/marina/surfaces.js';
const root=resolve(import.meta.dirname,'../..'),out=resolve(root,process.argv[2]??'assets/marina');
await mkdir(out,{recursive:true});
const hashes={};for(const path of ['src/scene/marina/mesh-builder.js','src/scene/marina/kit.js','src/scene/marina/surfaces.js'])hashes[path]=createHash('sha256').update(await readFile(join(root,path))).digest('hex');
const manifest={schema:1,coordinateSystem:'Y up; front/bow +Z; boats origin at waterline, buildings/props at ground; 1 board unit ~= 10 visual metres',runtime:'Native indexed WebGL2 meshes; GLB is an interchange export, not a hidden runtime download.',surfaceAtlas:{width:256,height:256,rgbaBytes:256*256*4,mipmappedBytes:349524},sourceHashes:hashes,assets:[]};
for(const lod of ['high','low']) {
  await mkdir(join(out,lod),{recursive:true});
  for(const name of Object.keys(FACTORIES)) {
    const mesh=createAsset(name,lod),{bytes,min,max}=encodeGLB(mesh),file=`${lod}/${name}.glb`;
    await writeFile(join(out,file),bytes);
    manifest.assets.push({name,lod,file,triangles:mesh.indices.length/3,vertices:mesh.data.length/12,gpuBytes:mesh.data.byteLength+mesh.indices.byteLength,glbBytes:bytes.length,gzipBytes:gzipSync(bytes,{level:9}).length,bounds:{min,max},sha256:createHash('sha256').update(bytes).digest('hex')});
  }
}
await writeFile(join(out,'surfaces.png'),png(surfaceAtlas()));
await writeFile(join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.table(manifest.assets.map(({name,lod,triangles,gpuBytes,glbBytes,gzipBytes})=>({name,lod,triangles,gpuBytes,glbBytes,gzipBytes})));
console.log(`Exported ${manifest.assets.length} GLB models and shared atlas to ${out}`);
