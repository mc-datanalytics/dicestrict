import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {BOARD} from '../src/game/board.js';
import {deriveCity} from '../src/scene/city-state.js';
import {civicFixtures} from '../scripts/assets/civic-fixtures.mjs';
import {HARMONY_SPEC,HARMONY_LOTS,HARMONY_CACHE_LIMIT,Harmony} from '../src/scene/harmony.js';
import {createPublicAsset,PUBLIC_FACTORIES,PUBLIC_BUDGETS,PublicRealm} from '../src/scene/finish/public.js';
import {cityField,FIELD_SIZE} from '../src/scene/finish/field.js';
import {detailAtlas} from '../src/scene/finish/materials.js';
import {effectMesh} from '../src/scene/finish/effects.js';
const hash=d=>createHash('sha256').update(d).digest('hex');
const fixture=civicFixtures();
function fake(){const live=new Set();return {live,mesh(g){const m={count:g.indices.length,bytes:g.data.byteLength+g.indices.byteLength};live.add(m);return m;},drop(m){live.delete(m);}};}
test('all eight remaining property IDs map to their original families, no new economic lot',()=>{
 assert.deepEqual(HARMONY_LOTS,[4,5,18,19,22,23,25,26]);assert.equal(BOARD.length,28);
 for(const id of HARMONY_LOTS){assert.equal(BOARD[id].kind,'lot');assert.equal(HARMONY_SPEC[id][0],['rivage','jardins','marina','ateliers','horizon','nova','roseraie','solstice'][BOARD[id].group]);}
});
for(const name of Object.keys(PUBLIC_FACTORIES))for(const [k,lod] of ['low','high'].entries())test(`public ${name}/${lod}: bounded triangles, finite unit normals, reproducible`,()=>{
 const g=createPublicAsset(name,lod);assert.ok(g.indices.length/3<=PUBLIC_BUDGETS[name][k]);assert.equal(hash(new Uint8Array(g.data.buffer)),hash(new Uint8Array(createPublicAsset(name,lod).data.buffer)));
 for(let i=0;i<g.data.length;i+=12){assert.ok(g.data.slice(i,i+12).every(Number.isFinite));assert.ok(Math.abs(Math.hypot(...g.data.slice(i+3,i+6))-1)<.001);if(name==='landscape'){assert.ok(Math.abs(g.data[i])<3.31);assert.ok(Math.abs(g.data[i+2])<3.5);}}
 for(let i=0;i<g.indices.length;i+=3){const p=[0,1,2].map(k=>g.data.slice(g.indices[i+k]*12,g.indices[i+k]*12+3)),a=p[1].map((x,k)=>x-p[0][k]),b=p[2].map((x,k)=>x-p[0][k]);assert.ok(Math.hypot(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])>1e-10);}
});
test('public equipment two-LOD batch, no reconstruction on time/settings, releases resources',()=>{
 const r=fake(),p=new PublicRealm(r);p.selectDetail(80);assert.equal(p.builds,2);for(let i=0;i<100;i++){p.configure({reduced:true,living:false});p.selectDetail(60);assert.equal(p.objects().length,1);}assert.equal(p.builds,2);p.configure({quality:'low'});p.selectDetail(200);assert.equal(p.detail,'low');p.destroy();assert.equal(r.live.size,0);
});
test('harmony bounds its cache and updates mortgage/owner without changing gameplay',()=>{
 const r=fake(),h=new Harmony(r),s=structuredClone(fixture.checkpoints.late.state),initial=JSON.stringify(s);h.setCity(deriveCity(s));const n=h.builds;
 for(let i=0;i<100;i++)h.setCity(deriveCity(structuredClone(s)));assert.equal(h.builds,n);assert.equal(JSON.stringify(s),initial);
 for(let l=0;l<4;l++)for(const id of HARMONY_LOTS){s.properties[id].owner=s.players[0].id;s.properties[id].level=l;h.setCity(deriveCity(s));h.selectDetail(80);h.selectDetail(40);assert.ok(h.cache.size<=HARMONY_CACHE_LIMIT);}
 s.properties[22].mortgaged=true;h.setCity(deriveCity(s));assert.equal(h.entries.find(p=>p.id===22).closed,1);h.destroy();assert.equal(r.live.size,0);
});
test('contact/light field is deterministic, small, reads actual vacant and mortgaged states',()=>{
 const start=deriveCity(fixture.checkpoints.start.state),late=deriveCity(fixture.checkpoints.late.state),before=JSON.stringify(late);
 const a=cityField(start),b=cityField(late);assert.equal(a.width,FIELD_SIZE);assert.equal(a.data.byteLength,262144);assert.notEqual(hash(a.data),hash(b.data));assert.equal(hash(b.data),hash(cityField(late).data));assert.equal(JSON.stringify(late),before);
 const closed=structuredClone(late);closed.parcels.forEach(p=>p.mortgaged=true);assert.notEqual(hash(b.data),hash(cityField(closed).data));
});
test('one shared normal/roughness atlas, bounded normal perturbations and deterministic mip source',()=>{
 const a=detailAtlas();assert.equal(a.width,256);assert.equal(a.data.byteLength,262144);assert.equal(hash(a.data),hash(detailAtlas().data));for(let i=0;i<128*256*4;i+=4){assert.ok(a.data[i]>=90&&a.data[i]<=166);assert.ok(a.data[i+1]>=90&&a.data[i+1]<=166);assert.ok(a.data[i+2]>=65);}
});
test('effects have bounded reusable geometry, no random/time source, and low detail reduces burst count',()=>{
 for(const name of ['burst','dust','scan']){const a=effectMesh(name,'low'),b=effectMesh(name,'high');assert.ok(a.indices.length<=b.indices.length);assert.ok(b.indices.length/3<=48);assert.equal(hash(new Uint8Array(b.data.buffer)),hash(new Uint8Array(effectMesh(name,'high').data.buffer)));for(let i=0;i<b.data.length;i+=12)assert.equal(b.data[i+11],23);}
 assert.throws(()=>effectMesh('missing'));
});

test('standalone game/gallery ESM subset bundles into valid JavaScript, not just source syntax',async()=>{
 const {bundle}=await import('../scripts/bundle.mjs');const {Script}=await import('node:vm');const {resolve}=await import('node:path');
 const root=resolve(import.meta.dirname,'..');for(const entry of ['src/main.js','src/scene/districts/review.js']){const source=await bundle(root,entry);assert.doesNotThrow(()=>new Script(source,{filename:entry}));}
});
