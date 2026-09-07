import test from 'node:test';
import assert from 'node:assert/strict';
import { Renderer } from '../src/scene/webgl.js';
function fake(){
 const textures=new Set(),frames=new Set();let next=0;
 const gl={FRAMEBUFFER_COMPLETE:1,createTexture(){const o={id:next++};textures.add(o);return o;},deleteTexture(o){textures.delete(o);},createFramebuffer(){const o={id:next++};frames.add(o);return o;},deleteFramebuffer(o){frames.delete(o);},checkFramebufferStatus(){return 1;}};
 for(const k of ['bindTexture','texImage2D','texParameteri','bindFramebuffer','framebufferTexture2D','drawBuffers','readBuffer'])gl[k]=()=>{};
 const r=Object.assign(Object.create(Renderer.prototype),{gl,_shadows:false,lost:false,shadow:null,fb:null,shadowOK:false,textureBytes:{shadowDepth24StorageUpperBound:0}});
 return {r,gl,textures,frames};
}
test('low mode has no depth texture/framebuffer, high is lazy, repeated switches do not leak',()=>{
 const {r,textures,frames}=fake();r.ensureShadow();assert.equal(textures.size,0);
 for(let i=0;i<30;i++){
  r.shadows=true;assert.equal(textures.size,0);r.ensureShadow();const shadow=r.shadow;r.ensureShadow();assert.equal(r.shadow,shadow);assert.equal(textures.size,1);assert.equal(frames.size,1);assert.equal(r.textureBytes.shadowDepth24StorageUpperBound,16777216);
  r.shadows=false;assert.equal(textures.size,0);assert.equal(frames.size,0);assert.equal(r.shadow,null);assert.equal(r.textureBytes.shadowDepth24StorageUpperBound,0);
 }
});
test('incomplete shadow framebuffer is released and not retried each frame',()=>{
 const {r,gl,textures}=fake();gl.checkFramebufferStatus=()=>0;r.shadows=true;r.ensureShadow();assert.equal(r.shadowFailed,true);assert.equal(textures.size,0);r.ensureShadow();assert.equal(textures.size,0);r.shadows=false;r.shadows=true;gl.checkFramebufferStatus=()=>1;r.ensureShadow();assert.equal(textures.size,1);
});
test('loss-time quality changes allocate nothing; low mode remains allocation-free on restore',()=>{
 const {r,textures}=fake();r.lost=true;r.shadows=true;r.ensureShadow();assert.equal(textures.size,0);r.shadows=false;r.lost=false;r.ensureShadow();assert.equal(textures.size,0);
});
