import test from 'node:test';
import assert from 'node:assert/strict';
import { reflectionProjection, WaterfrontReflection, REFLECTION_SIZE } from '../src/scene/marina/reflection.js';
import { multiply, ortho, lookAt, transform } from '../src/scene/math.js';
import { Marina, environment, WATERLINE } from '../src/scene/marina.js';

test('reflection projection fixes waterplane points, mirrors height and remains finite across player cameras',()=>{
 for(const a of [0,.5,2,4])for(const zoom of [.72,1,1.5]){
  const vp=multiply(ortho(-10/zoom,10/zoom,-8/zoom,8/zoom,.1,80),lookAt([Math.sin(a)*15,18,Math.cos(a)*15],[0,.3,0]));
  const {project,view}=reflectionProjection(vp);
  for(const p of [[-2,WATERLINE,2,1],[-1,WATERLINE,1,1]])assert.deepEqual(transform(project,p).map(v=>Math.round(v*1e5)),transform(view,p).map(v=>Math.round(v*1e5)));
  const p=[-2,1.8,2,1],mirrored=[p[0],2*WATERLINE-p[1],p[2],1];
  const x=transform(view,p),y=transform(project,mirrored);assert.ok(x.every((v,i)=>Math.abs(v-y[i])<1e-5));
  assert.ok([...view,...project].every(Number.isFinite));
 }
});
function fake(){
 const textures=new Set(),frames=new Set(),buffers=new Set();let n=0;
 const create=set=>()=>{const o={id:n++};set.add(o);return o;};
 const gl={FRAMEBUFFER_COMPLETE:1,createTexture:create(textures),deleteTexture:o=>textures.delete(o),createFramebuffer:create(frames),deleteFramebuffer:o=>frames.delete(o),createRenderbuffer:create(buffers),deleteRenderbuffer:o=>buffers.delete(o),checkFramebufferStatus:()=>1};
 for(const k of ['activeTexture','bindTexture','texImage2D','texParameteri','bindFramebuffer','framebufferTexture2D','framebufferRenderbuffer','drawBuffers','readBuffer','bindRenderbuffer','renderbufferStorage'])gl[k]=()=>{};
 const renderer={gl,lost:false,textureBytes:{}},reflection=new WaterfrontReflection(renderer);return {renderer,reflection,textures,frames,buffers};
}
test('bounded reflection target reuses one allocation, releases depth and color, and recovers after loss',()=>{
 const {reflection:r,renderer,textures,frames,buffers}=fake();assert.equal(REFLECTION_SIZE,512);
 for(let i=0;i<12;i++){r.ensure();const t=r.texture;r.ensure();assert.equal(r.texture,t);assert.equal(textures.size,1);assert.equal(frames.size,1);assert.equal(buffers.size,1);assert.equal(renderer.textureBytes.waterReflectionRGBA8,1048576);assert.equal(renderer.textureBytes.waterReflectionDepth16,524288);r.release();assert.equal(textures.size+frames.size+buffers.size,0);}
 renderer.lost=true;r.ensure();assert.equal(textures.size,0);r.forget();r.memory();assert.equal(renderer.textureBytes.waterReflectionRGBA8,0);renderer.lost=false;r.ensure();assert.equal(textures.size,1);r.release();
});
test('incomplete reflection target fails closed and does not retry every frame',()=>{
 const {reflection:r,renderer,textures,frames,buffers}=fake();renderer.gl.checkFramebufferStatus=()=>0;r.ensure();assert.equal(r.failed,true);assert.equal(textures.size+frames.size+buffers.size,0);r.ensure();assert.equal(textures.size,0);r.release();renderer.gl.checkFramebufferStatus=()=>1;r.ensure();assert.equal(r.ready,true);r.release();
});
test('composed waterfront preserves lots, bounds, no-motion poses and cached meshes',()=>{
 let uploads=0;const r={mesh:g=>({name:g.name,count:g.indices.length,bytes:g.data.byteLength+g.indices.byteLength}),drop:()=>{}};const m=new Marina(r);
 const scene={parcels:[{id:8,x:-3.64,z:2.6,owner:'a',level:2,mortgaged:false,color:'#2088cc'}]};m.setCity(scene);
 const g=m.objects();assert.equal(g.filter(o=>o.waterfrontWater).length,1);assert.ok(g.every(o=>o.waterfront));assert.equal(m.parcels[0].id,8);assert.equal(m.parcels[0].level,2);
 assert.ok(environment('low').indices.length/3<=6200);assert.ok(environment('high').indices.length/3<=11400);
 for(const lod of ['low','high']){const geo=environment(lod);for(let i=0;i<geo.data.length;i+=12){assert.ok(Math.abs(geo.data[i])<4.2&&Math.abs(geo.data[i+2])<4.2);}}
 m.configure({living:false});assert.deepEqual(m.objects(12).map(o=>o.model),m.objects(48).map(o=>o.model));const builds=m.builds;
 for(let i=0;i<100;i++)m.setCity(structuredClone(scene));assert.equal(m.builds,builds);
 scene.parcels[0].mortgaged=true;m.setCity(scene);assert.equal(m.parcels[0].closed,1);assert.equal(m.builds,builds);m.destroy();
});
