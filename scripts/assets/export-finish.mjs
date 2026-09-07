/** Exchange files for the implemented public models and generated shared textures. */
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createPublicAsset,PUBLIC_FACTORIES,PUBLIC_BUDGETS} from '../../src/scene/finish/public.js';
import {detailAtlas} from '../../src/scene/finish/materials.js';
import {cityField} from '../../src/scene/finish/field.js';
import {encodeGLB,png} from './glb.mjs';
const out=new URL('../../assets/finish/',import.meta.url);await mkdir(out,{recursive:true});const rows=[];
for(const name of Object.keys(PUBLIC_FACTORIES))for(const lod of ['low','high']){const mesh=createPublicAsset(name,lod),{bytes,min,max}=encodeGLB(mesh);await writeFile(new URL(mesh.name+'.glb',out),bytes);rows.push({name,lod,triangles:mesh.indices.length/3,bytes:bytes.length,bounds:{min,max},sha256:createHash('sha256').update(bytes).digest('hex')});}
await writeFile(new URL('normal-roughness.png',out),png(detailAtlas()));await writeFile(new URL('public-contact-light.png',out),png(cityField()));
const sources={};for(const p of ['public.js','field.js','materials.js','shader.js','effects.js'])sources[p]=createHash('sha256').update(await readFile(new URL('../../src/scene/finish/'+p,import.meta.url))).digest('hex');
await writeFile(new URL('manifest.json',out),JSON.stringify({schema:1,budgets:PUBLIC_BUDGETS,sources,models:rows,notes:'Native runtime meshes and shaders; GLB exchange roughness descriptors are supported. Packed normal/roughness PNG is for the native shader, not a glTF normal texture. Ground field is world-space contact/lighting, not real-time GI.'},null,2));
console.table(rows);
