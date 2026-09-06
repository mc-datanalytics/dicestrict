/** Exact placed public ensemble -> GLB. Originals remain unchanged and reusable. */
import { mkdir,writeFile,readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { encodeGLB } from './glb.mjs';
import { Marina } from '../../src/scene/marina.js';
import { MeshBuilder } from '../../src/scene/marina/mesh-builder.js';
import { identity,transform } from '../../src/scene/math.js';
const out=new URL('../../assets/waterfront/',import.meta.url);await mkdir(out,{recursive:true});
const manifest={schema:1,scope:'Retained marina models, recomposed public placement. Owned lots are not baked into this public asset.',runtime:'Native cached geometry. Planar reflection and scoped material shader are runtime features, not baked GLB effects.',assets:[],sources:{}};
for(const lod of ['low','high']){
 const renderer={mesh:g=>({geometry:g,count:g.indices.length,bytes:g.data.byteLength+g.indices.byteLength}),drop:()=>{}},marina=new Marina(renderer);marina.configure({living:false});if(lod==='high')marina.selectDetail(100);
 const merged=new MeshBuilder();for(const o of marina.objects(0)){
  const geo=o.mesh.geometry,m=o.model??identity(),offset=merged.vertices.length/12;
  for(let i=0;i<geo.data.length;i+=12){const p=transform(m,[...geo.data.slice(i,i+3),1]),n=transform(m,[...geo.data.slice(i+3,i+6),0]),len=Math.hypot(...n.slice(0,3));merged.vertices.push(...p.slice(0,3),...n.slice(0,3).map(v=>v/len),...geo.data.slice(i+6,i+12));}
  for(const index of geo.indices)merged.indices.push(offset+index);
 }
 const g=merged.build('waterfront-ensemble-'+lod),{bytes,min,max}=encodeGLB(g),file='ensemble-'+lod+'.glb';await writeFile(new URL(file,out),bytes);
 manifest.assets.push({file,lod,triangles:g.indices.length/3,geometryBytes:g.data.byteLength+g.indices.byteLength,glbBytes:bytes.length,bounds:{min,max},sha256:createHash('sha256').update(bytes).digest('hex')});marina.destroy();
}
for(const path of ['src/scene/marina.js','src/scene/marina/kit.js','src/scene/marina/finish.js','src/scene/marina/reflection.js','src/scene/marina/surfaces.js'])manifest.sources[path]=createHash('sha256').update(await readFile(new URL('../../'+path,import.meta.url))).digest('hex');
await writeFile(new URL('manifest.json',out),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest.assets,null,2));
