import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createAsset, FACTORIES } from '../src/scene/marina/kit.js';
import { surfaceAtlas } from '../src/scene/marina/surfaces.js';
import { Marina, environment } from '../src/scene/marina.js';
const hash=x=>createHash('sha256').update(new Uint8Array(x.buffer??x)).digest('hex');
const budgets={yacht:[1800,3700],launch:[650,900],'harbor-house':[3900,5100],dock:[400,700],quay:[120,250],lantern:[300,380],bench:[360,540],bollard:[80,140],cafe:[380,420],parasol:[60,220],palm:[200,850],planter:[150,180],'waterfront-level-0':[2100,2600],'waterfront-level-1':[3800,5000],'waterfront-level-2':[5500,7400],'waterfront-level-3':[7100,9700]};
for(const name of Object.keys(FACTORIES))test(`marina ${name}: actual 3D, both LODs finite/indexed/within budget`,()=>{
  let previous=0;
  for(const [i,lod] of ['low','high'].entries()){
    const g=createAsset(name,lod);assert.equal(g.data.length%12,0);assert.equal(g.indices.length%3,0);
    assert.ok(g.indices.length/3<=budgets[name][i]);assert.ok(g.indices.length>=previous);previous=g.indices.length;
    const min=[Infinity,Infinity,Infinity],max=min.map(x=>-x);
    for(let j=0;j<g.data.length;j+=12){for(let k=0;k<12;k++)assert.ok(Number.isFinite(g.data[j+k]));for(let k=0;k<3;k++){min[k]=Math.min(min[k],g.data[j+k]);max[k]=Math.max(max[k],g.data[j+k]);}assert.ok(Math.abs(Math.hypot(...g.data.slice(j+3,j+6))-1)<.001);}
    assert.ok(max.every((v,k)=>v-min[k]>.01),'Must not be a billboard');
    for(let j=0;j<g.indices.length;j+=3){const p=[0,1,2].map(k=>{assert.ok(g.indices[j+k]<g.data.length/12);return g.data.slice(g.indices[j+k]*12,g.indices[j+k]*12+3);});const a=p[1].map((v,k)=>v-p[0][k]),b=p[2].map((v,k)=>v-p[0][k]);assert.ok(Math.hypot(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])>1e-10,'No degenerate faces');}
    assert.equal(hash(g.data),hash(createAsset(name,lod).data));
  }
});
function renderer(){return {uploads:0,drops:0,mesh(g){this.uploads++;return {name:g.name,count:g.indices.length,bytes:g.data.byteLength+g.indices.byteLength};},drop(){this.drops++;}};}
function city(level=0,mortgaged=false){return {parcels:[{id:8,owner:'p1',level,mortgaged,color:'#c24838',x:-3.64,z:2.6},{id:9,owner:null,level:0,mortgaged:false,color:'#445544',x:-3.64,z:1.56}]};}
test('marina textures: deterministic 256² shared atlas under 350 KiB including mipmaps',()=>{const a=surfaceAtlas();assert.equal(a.width,256);assert.equal(a.height,256);assert.ok(a.data.byteLength*4/3<350*1024);assert.equal(hash(a.data),hash(surfaceAtlas().data));assert.ok(new Set(a.data).size>40);});
test('marina environment: bounded merged static geometry',()=>{assert.ok(environment('low').indices.length/3<=6200);assert.ok(environment('high').indices.length/3<=11400);});
test('marina ownership: levels, tint, mortgage, no mutation or irrelevant snapshot rebuild',()=>{
  const r=renderer(),m=new Marina(r);let s=city();const frozen=JSON.stringify(s);m.setCity(s);assert.equal(JSON.stringify(s),frozen);let n=r.uploads;
  for(let i=0;i<100;i++){m.setCity({...structuredClone(s),revision:i,cash:10000-i});m.objects(i/30);}assert.equal(r.uploads,n);assert.equal(m.stateUpdates,1);
  for(let level=0;level<4;level++){s=city(level);m.setCity(s);assert.equal(m.parcels[0].level,level);assert.ok(m.parcels[0].mesh.name.includes(`level-${level}`));}
  n=r.uploads;m.setCity(city(3,true));assert.equal(m.parcels[0].closed,1);assert.equal(r.uploads,n);
  s=city(3);s.parcels[0].owner='p2';s.parcels[0].color='#2088cc';m.setCity(s);assert.equal(r.uploads,n);assert.equal(m.parcels[0].owner,'p2');assert.ok(m.parcels[0].tint[2]>m.parcels[0].tint[0]);
  const acquired=r.uploads;m.destroy();assert.equal(r.drops,acquired);
});
test('marina LOD: hysteresis, reuse cache, force low on low quality',()=>{const r=renderer(),m=new Marina(r);m.setCity(city(2));m.selectDetail(70);assert.equal(m.detail,'high');const n=r.uploads;m.selectDetail(60);assert.equal(m.detail,'high');m.selectDetail(40);assert.equal(m.detail,'low');m.selectDetail(80);assert.equal(r.uploads,n);m.configure({quality:'low'});m.selectDetail(300);assert.equal(m.detail,'low');});
test('marina no-motion: identical poses when reduced or city frozen',()=>{const m=new Marina(renderer());m.configure({reduced:true});assert.deepEqual(m.objects(10).map(o=>o.model),m.objects(20).map(o=>o.model));m.configure({reduced:false,living:false});assert.deepEqual(m.objects(10).map(o=>o.model),m.objects(20).map(o=>o.model));});
