import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createDistrictAsset, createDistrictProp, FAMILIES } from '../src/scene/districts/kit.js';
import { Districts, DISTRICT_LOTS, CACHE_LIMIT } from '../src/scene/districts.js';
import { deriveCity } from '../src/scene/city-state.js';
import { createGame, fingerprint, assertState } from '../src/game/engine.js';
import { BOARD } from '../src/game/board.js';
import { encodeGLB } from '../scripts/assets/glb.mjs';
const digest=a=>createHash('sha256').update(new Uint8Array(a.buffer)).digest('hex');
function checkMesh(g,limit){
 assert.equal(g.data.length%12,0);assert.equal(g.indices.length%3,0);assert.ok(g.indices.length/3<=limit);
 const lo=[Infinity,Infinity,Infinity],hi=lo.map(v=>-v);
 for(let i=0;i<g.data.length;i+=12){assert.ok(g.data.subarray(i,i+12).every(Number.isFinite));assert.ok(Math.abs(Math.hypot(...g.data.subarray(i+3,i+6))-1)<1e-4);for(let j=0;j<3;j++){lo[j]=Math.min(lo[j],g.data[i+j]);hi[j]=Math.max(hi[j],g.data[i+j]);}}
 assert.ok(hi.every((v,i)=>v-lo[i]>.01),'Volumetric, not a billboard');
 for(let i=0;i<g.indices.length;i+=3){const a=[0,1,2].map(k=>{const id=g.indices[i+k];assert.ok(id<g.data.length/12);return g.data.subarray(id*12,id*12+3);}),u=a[1].map((v,k)=>v-a[0][k]),v=a[2].map((v,k)=>v-a[0][k]);assert.ok(Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])>1e-10,'Degenerate triangle');}
 return {lo,hi};
}
for(const family of FAMILIES)for(const level of [-1,0,1,2,3])for(const variant of [0,1])test(`${family} L${level} V${variant}: real bounded geometry / LOD / deterministic / export`,()=>{
 const low=createDistrictAsset(family,level,variant,'low'),high=createDistrictAsset(family,level,variant,'high');
 const limits={oldtown:[3200,5000],financial:[1550,2650],industrial:[1450,2000]}[family];
 const a=checkMesh(low,limits[0]);checkMesh(high,limits[1]);assert.ok(high.indices.length>=low.indices.length);assert.ok(a.lo[0]>=-.55&&a.hi[0]<=.55&&a.lo[2]>=-.51&&a.hi[2]<=.51,'Inside parcel and pedestrian clearance');
 assert.equal(digest(low.data),digest(createDistrictAsset(family,level,variant,'low').data));
 const {bytes}=encodeGLB(low);assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(8),bytes.length);
 const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());assert.equal(doc.asset.version,'2.0');assert.equal(doc.meshes[0].primitives.reduce((n,p)=>n+doc.accessors[p.indices].count,0),low.indices.length);
});
for(const name of ['linden','bench','cafe-table','heritage-lamp','office-lamp','container','delivery-truck','gantry'])test(`${name}: exported reusable 3D prop`,()=>{for(const lod of ['low','high'])checkMesh(createDistrictProp(name,lod),700);});
function renderer(){return {meshes:new Set(),uploads:0,mesh(g){const m={name:g.name,count:g.indices.length,bytes:g.data.byteLength+g.indices.byteLength};this.meshes.add(m);this.uploads++;return m;},drop(m){this.meshes.delete(m);}};}
function game(){const s=createGame([{id:'a',name:'A'},{id:'b',name:'B'}],42,{id:'assets-fixture'});for(const t of BOARD)if(t.kind==='lot'){s.properties[t.id].owner=s.players[t.group%2].id;s.properties[t.id].level=0;}return s;}
test('Six parcels map to original Rivage, Horizon and Ateliers; no board/economy change',()=>{assert.deepEqual(DISTRICT_LOTS.map(i=>BOARD[i].group),[0,0,3,3,4,4]);const s=game();assertState(s);const hash=fingerprint(s),r=renderer(),d=new Districts(r);d.setCity(deriveCity(s));d.objects();assert.equal(fingerprint(s),hash);assert.equal(d.entries.length,6);});
test('No regeneration for dice, revision, money, ownership color or mortgage changes',()=>{
 const s=game(),r=renderer(),d=new Districts(r);d.setCity(deriveCity(s));const n=r.uploads;
 for(let i=0;i<200;i++){s.revision++;s.players[0].cash++;d.setCity(deriveCity(s));d.objects();}assert.equal(r.uploads,n);
 s.properties[1].owner='b';d.setCity(deriveCity(s));assert.equal(r.uploads,n);assert.equal(d.entries[0].owner,'b');
 s.properties[1].mortgaged=true;d.setCity(deriveCity(s));assert.equal(r.uploads,n);assert.equal(d.entries[0].closed,1);assert.equal(deriveCity(s).parcels[0].activity,0);
});
test('Changing a single property builds one model; LRU never evicts visible assets; destroy frees all',()=>{
 const s=game(),r=renderer(),d=new Districts(r);d.setCity(deriveCity(s));const n=r.uploads;s.properties[1].level=1;d.setCity(deriveCity(s));assert.equal(r.uploads,n+1);
 for(let cycle=0;cycle<15;cycle++){for(const id of DISTRICT_LOTS)s.properties[id].level=cycle%4;d.setCity(deriveCity(s));d.selectDetail(cycle%2?80:40);assert.ok(d.cache.size<=CACHE_LIMIT);assert.ok(d.entries.every(e=>r.meshes.has(e.mesh)));}
 d.destroy();assert.equal(r.meshes.size,0);
});
test('Quality forcing and LOD hysteresis; no-time visuals identical in frozen/reduced mode',()=>{
 const r=renderer(),d=new Districts(r);d.setCity(deriveCity(game()));d.selectDetail(70);assert.equal(d.detail,'high');const n=r.uploads;d.selectDetail(60);assert.equal(d.detail,'high');d.selectDetail(40);d.selectDetail(70);assert.equal(r.uploads,n);d.configure({quality:'low',reduced:true});d.selectDetail(300);assert.equal(d.detail,'low');assert.deepEqual(d.objects(10),d.objects(20));
});
test('Invalid asset inputs are rejected',()=>{assert.throws(()=>createDistrictAsset('other'));assert.throws(()=>createDistrictAsset('oldtown',4));assert.throws(()=>createDistrictAsset('oldtown',0,2));assert.throws(()=>createDistrictProp('unknown'));});
