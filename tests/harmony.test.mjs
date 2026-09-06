import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createHarmonyAsset,HARMONY_FAMILIES,HARMONY_BUDGETS} from '../src/scene/harmony/kit.js';
import {encodeGLB} from '../scripts/assets/glb.mjs';
const hash=a=>createHash('sha256').update(new Uint8Array(a.buffer,a.byteOffset,a.byteLength)).digest('hex');
function positions(m){return new Float32Array(Array.from({length:m.data.length/12},(_,i)=>Array.from(m.data.slice(i*12,i*12+3))).flat());}
for(const family of HARMONY_FAMILIES)for(let level=-1;level<=3;level++)for(const variant of [0,1])test(`${family} ${level}/${variant}: bounded real mesh, both LODs, deterministic export`,()=>{
 const lo=createHarmonyAsset(family,level,variant,'low'),hi=createHarmonyAsset(family,level,variant,'high');
 assert.ok(lo.indices.length<=hi.indices.length);
 for(const [i,m] of [lo,hi].entries()){
  assert.ok(m.indices.length/3<=HARMONY_BUDGETS[family][i]);
  let height=0;
  for(let j=0;j<m.data.length;j+=12){
   assert.ok(m.data.slice(j,j+12).every(Number.isFinite));assert.ok(Math.abs(Math.hypot(...m.data.slice(j+3,j+6))-1)<.001);
   assert.ok(Math.abs(m.data[j])<=.51&&Math.abs(m.data[j+2])<=.51,`${m.name}: footprint`);assert.ok(m.data[j+1]>=-.001);
   height=Math.max(height,m.data[j+1]);
  }
  assert.ok(height>(level<0?.1:.40));
  for(let j=0;j<m.indices.length;j+=3){
   const p=Array.from({length:3},(_,k)=>{const id=m.indices[j+k];assert.ok(id<m.data.length/12);return m.data.slice(id*12,id*12+3);});
   const a=p[1].map((v,k)=>v-p[0][k]),b=p[2].map((v,k)=>v-p[0][k]);assert.ok(Math.hypot(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])>1e-10,m.name+' degenerate triangle');
  }
  const again=createHarmonyAsset(family,level,variant,i?'high':'low');assert.equal(hash(m.data),hash(again.data));assert.equal(hash(m.indices),hash(again.indices));
  const glb=encodeGLB(m).bytes;assert.equal(glb.readUInt32LE(0),0x46546c67);assert.equal(glb.readUInt32LE(8),glb.length);
 }
});
for(const family of HARMONY_FAMILIES)test(`${family}: variants differ in geometry not only colour; each economic stage changes shape`,()=>{
 for(let l=0;l<4;l++)assert.notEqual(hash(positions(createHarmonyAsset(family,l,0))),hash(positions(createHarmonyAsset(family,l,1))));
 for(const v of [0,1]){const stages=Array.from({length:5},(_,i)=>hash(positions(createHarmonyAsset(family,i-1,v))));assert.equal(new Set(stages).size,5);}
});
test('unknown families/levels/variants/LOD are rejected, not silently rendered as placeholders',()=>{
 for(const args of [['unknown'],['roseraie',4],['roseraie',0,3],['roseraie',0,0,'ultra']])assert.throws(()=>createHarmonyAsset(...args));
});
