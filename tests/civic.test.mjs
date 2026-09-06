import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createCivicAsset,CIVIC_FACTORIES,CIVIC_BUDGETS } from '../src/scene/civic/kit.js';
import { CivicCenter,civicCorridor,CIVIC_PLACEMENT,CIVIC_LIGHTS } from '../src/scene/civic.js';
import { civicFixtures } from '../scripts/assets/civic-fixtures.mjs';
import { applyAction,assertState,fingerprint } from '../src/game/engine.js';
import { BOARD } from '../src/game/board.js';
import { encodeGLB } from '../scripts/assets/glb.mjs';
const hash=x=>createHash('sha256').update(new Uint8Array(x.buffer??x)).digest('hex');
for(const name of Object.keys(CIVIC_FACTORIES))for(const [i,lod] of ['low','high'].entries())test(`civic ${name}/${lod}: volume, finite indexed triangles, normals, budget and deterministic GLB`,()=>{
 const g=createCivicAsset(name,lod);assert.ok(g.indices.length/3<=CIVIC_BUDGETS[name][i]);
 const lo=[Infinity,Infinity,Infinity],hi=lo.map(x=>-x);
 for(let j=0;j<g.data.length;j+=12){assert.ok(g.data.slice(j,j+12).every(Number.isFinite));assert.ok(Math.abs(Math.hypot(...g.data.slice(j+3,j+6))-1)<.001);for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],g.data[j+k]);hi[k]=Math.max(hi[k],g.data[j+k]);}}
 assert.ok(hi.every((v,k)=>v-lo[k]>.01));
 for(let j=0;j<g.indices.length;j+=3){const p=[0,1,2].map(k=>{assert.ok(g.indices[j+k]<g.data.length/12);return g.data.slice(g.indices[j+k]*12,g.indices[j+k]*12+3);}),a=p[1].map((v,k)=>v-p[0][k]),b=p[2].map((v,k)=>v-p[0][k]);assert.ok(Math.hypot(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])>1e-10);}
 assert.equal(hash(g.data),hash(createCivicAsset(name,lod).data));const glb=encodeGLB(g).bytes;assert.equal(glb.readUInt32LE(0),0x46546c67);assert.equal(glb.length,glb.readUInt32LE(8));
});
test('public corridor preserves tile and property exclusion zones, casino and fountain positions',()=>{
 assert.deepEqual(CIVIC_PLACEMENT.casino,[-1.25,.50,-.95]);assert.deepEqual(CIVIC_PLACEMENT.fountain,[1.65,.48,1.45]);
 const g=civicCorridor('high');for(let j=0;j<g.data.length;j+=12){assert.ok(Math.abs(g.data[j])<3.0);assert.ok(g.data[j+2]>-2.6&&g.data[j+2]<3.1);}
 assert.equal(BOARD.length,28);assert.equal(CIVIC_LIGHTS.length,12);
});
test('static civic batching has two cached LODs, no time/state rebuild and forced low quality',()=>{
 const live=new Set(),r={mesh(g){const m={count:g.indices.length,bytes:g.data.byteLength+g.indices.byteLength};live.add(m);return m;},drop(m){live.delete(m);}};
 const c=new CivicCenter(r);assert.equal(c.builds,1);assert.equal(c.objects().length,1);c.selectDetail(70);assert.equal(c.detail,'high');assert.equal(c.builds,2);
 for(let i=0;i<100;i++){c.selectDetail(60);c.objects(i);c.configure({reduced:true,living:false});}assert.equal(c.builds,2);
 c.selectDetail(40);c.selectDetail(80);assert.equal(c.builds,2);c.configure({quality:'low'});c.selectDetail(200);assert.equal(c.detail,'low');assert.equal(c.objects()[0].mesh.count/3,7816);c.destroy();assert.equal(live.size,0);
});
test('start/middle/late snapshots replay from real rules; no artificial startup wealth',()=>{
 const f=civicFixtures(),again=civicFixtures();assert.deepEqual(f,again);let s=f.initial;
 assert.ok(s.properties.every(p=>!p.owner&&p.level===0));assert.ok(s.players.every(p=>p.cash===1800));
 for(const c of Object.values(f.checkpoints)){let r=f.initial;for(const cmd of f.commands.slice(0,c.commandCount))r=applyAction(r,cmd.actor,cmd.action);assert.equal(fingerprint(r),c.fingerprint);assertState(c.state);}
 for(const cmd of f.commands){s=applyAction(s,cmd.actor,cmd.action);assert.equal(fingerprint(s),cmd.fingerprint);}assert.equal(fingerprint(s),f.finalFingerprint);
 for(const e of Object.values(f.episodes))assert.deepEqual(applyAction(e.before,e.actor,e.action),e.after);
 assert.ok(f.episodes.upgrade&&f.episodes.mortgage);assert.ok(f.checkpoints.middle.owned>0&&f.checkpoints.late.levels>f.checkpoints.middle.levels);
});
