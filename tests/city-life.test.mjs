import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, applyAction, fingerprint } from '../src/game/engine.js';
import { BOARD } from '../src/game/board.js';
import { deriveCity, trafficPosition } from '../src/scene/city-state.js';
import { CityLife, roundedRoute, routeLength, pedestrianAllocation } from '../src/scene/city-life.js';
import { LivingCity } from '../src/scene/living-city.js';
import { BoardScene } from '../src/scene/board-scene.js';
import { parcelInsight } from '../src/ui/city-view.js';

const fresh=()=>createGame([{id:'host',name:'Michaël'},{id:'guest',name:'Invité'}],42,{id:'city-response',casino:true});
function developed(s=fresh()) {for(const t of BOARD)if(t.kind==='lot'){s.properties[t.id].owner='host';s.properties[t.id].level=3;}return s;}
const start=s=>{const life=new CityLife();life.setCity(deriveCity(s),true);life.step(0);return life;};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const renderer=()=>{const meshes=new Set();return {meshes,mesh(g){const data=g.typed();assert.ok(data.every(Number.isFinite));const m={count:g.indices?.length??data.length/12,bytes:data.byteLength+(g.indices?.byteLength??0)};meshes.add(m);return m;},drop(m){meshes.delete(m);}};};

test('rounded routes are periodic, finite, on the road and have continuous corner tangents',()=>{
 for(const r of [4.48,6.98]){
  const length=routeLength(r);
  assert.ok(distance(roundedRoute(0,r),roundedRoute(length,r))<1e-12);
  for(let d=-2;d<length+2;d+=.019){
   const p=roundedRoute(d,r),q=roundedRoute(d+.0001,r);
   assert.ok(Number.isFinite(p.x+p.z+p.yaw));assert.ok(Math.max(Math.abs(p.x),Math.abs(p.z))<=r+1e-9);
   assert.ok(Math.max(Math.abs(p.x),Math.abs(p.z))>=r-.24);
   assert.ok(distance(p,q)<=.000101);assert.ok(Math.cos(p.yaw-q.yaw)>.99999);
  }
 }
 for(const n of [NaN,Infinity,-Infinity])assert.throws(()=>roundedRoute(n));
 assert.throws(()=>roundedRoute(0,0));assert.throws(()=>roundedRoute(0,2,3));
});
test('existing cars never teleport when activity weights or population targets change',()=>{
 const s=fresh(),old=deriveCity(s),life=start(s),before=life.step(.1);
 s.properties[1].owner='host';s.properties[2].owner='host';s.properties[1].level=s.properties[2].level=3;
 const next=deriveCity(s);
 // Characterize the old positional remapping: identical phase changed world position.
 assert.ok(distance(trafficPosition(.2,old),trafficPosition(.2,next))>.1);
 life.setCity(next);const now=life.step(.1);
 assert.deepEqual(now.cars,before.cars);
 for(let frame=2;frame<35;frame++){
  const previous=life.step((frame-1)*.1),current=life.step(frame*.1);
  for(const car of previous.cars){const after=current.cars.find(c=>c.id===car.id);assert.ok(distance(car,after)<=.086);}
 }
 assert.ok(life.step(3.5).cars.length>before.cars.length);
});
test('economic contraction retires slots; survivors keep identity and route position',()=>{
 const s=developed(),life=start(s);life.step(.1);const before=life.step(.2);
 for(const p of s.properties){p.owner=null;p.level=0;p.mortgaged=false;}
 life.setCity(deriveCity(s));assert.deepEqual(life.step(.2).cars,before.cars);
 let after;for(let i=3;i<=15;i++)after=life.step(i*.1);
 assert.equal(after.cars.length,3);assert.equal(after.pedestrians.length,0);
 assert.deepEqual(after.cars.map(c=>c.id),['car-0','car-1','car-2']);
});
test('weighted pedestrians favor active neighborhoods and never exceed allocation caps',()=>{
 const s=fresh();s.properties[1].owner='host';s.properties[4].owner='guest';s.properties[4].level=3;
 const city=deriveCity(s),counts=pedestrianAllocation(city,12);
 assert.ok(counts.get(4)>counts.get(1));assert.ok([...counts.values()].reduce((a,b)=>a+b,0)<=12);
 assert.ok([...counts.values()].every(n=>n<=8));assert.equal(counts.get(2),0);
 s.properties[4].level=0;s.properties[4].mortgaged=true;
 assert.equal(pedestrianAllocation(deriveCity(s),12).get(4),0);
});
test('pedestrian slots keep their position when a different parcel changes',()=>{
 const s=developed(),life=start(s);life.step(.1);const before=life.step(.2);
 s.properties[8].level=2;s.properties[9].level=2;life.setCity(deriveCity(s));const after=life.step(.2);
 for(const p of before.pedestrians){const q=after.pedestrians.find(x=>x.id===p.id);assert.ok(q);assert.equal(distance(p,q),0);}
});
test('high/low/pause/resume preserve hard budgets and never catch up an absent interval',()=>{
 const life=start(developed());life.step(.1);life.configure({quality:'low'});const low=life.step(.2);
 assert.ok(low.cars.length<=6);assert.ok(low.pedestrians.length<=12);
 life.configure({living:false});assert.deepEqual(life.step(500),{cars:[],pedestrians:[],buses:[]});
 life.configure({quality:'high'});assert.equal(life.running,false); // A partial setting must not resume.
 life.configure({living:true});const resumed=life.step(900);
 for(const c of low.cars){assert.equal(distance(c,resumed.cars.find(p=>p.id===c.id)),0);}
 const before=resumed.cars;const after=life.step(5000).cars;
 for(const c of before)assert.ok(distance(c,after.find(p=>p.id===c.id))<=.086);
 life.configure({reduced:true});assert.equal(life.step(6000).cars.length,0);
 life.configure({reduced:false});const snapshot=life.step(7000);assert.deepEqual(life.step(7000),snapshot);
 assert.throws(()=>life.step(NaN));
});
test('pedestrian reallocations and long visual sessions stay bounded with finite poses',()=>{
 const s=developed(),life=start(s);let maxCars=0,maxPeople=0,stops=0;
 for(let i=1;i<=2200;i++){
  if(i%50===0){s.properties[1].level=s.properties[2].level=(i/50)%4;life.setCity(deriveCity(s));}
  if(i%70===0)life.configure({quality:life.quality==='high'?'low':'high'});
  const frame=life.step(i*.1),low=life.quality==='low';
  assert.ok(frame.cars.length<=(low?6:18));assert.ok(frame.pedestrians.length<=(low?12:48));
  maxCars=Math.max(maxCars,frame.cars.length);maxPeople=Math.max(maxPeople,frame.pedestrians.length);
  assert.equal(new Set(frame.pedestrians.map(p=>p.id)).size,frame.pedestrians.length);
  for(const p of [...frame.cars,...frame.pedestrians,...frame.buses])assert.ok(Number.isFinite(p.x+p.z+p.yaw));
  stops+=frame.buses.filter(b=>b.waiting).length;
 }
 assert.equal(life.cars.length,18);assert.equal(life.walkers.length,128);assert.equal(maxCars,18);assert.equal(maxPeople,48);assert.ok(stops>30);
});
test('both buses stop alongside the actual shelter coordinates and leave again',()=>{
 const life=start(developed()),stopped=new Map();let previous=null;
 for(let i=1;i<1100;i++){
  const frame=life.step(i*.1);
  for(const b of frame.buses)if(b.waiting){assert.ok(Math.abs(Math.abs(b.x)-6.98)<1e-8);assert.ok(Math.abs(b.z-1.2)<1e-8);stopped.set(b.id,b);}
  if(previous)for(const b of frame.buses)assert.ok(distance(b,previous.buses.find(p=>p.id===b.id))<=.096);
  previous=frame;
 }
 assert.equal(stopped.size,2);
 for(const b of previous.buses)assert.ok(distance(b,stopped.get(b.id))>.1);
});
test('new matches reset local actors; visuals never consume dice RNG or mutate the game',()=>{
 const s=developed(),before=fingerprint(s),life=start(s);
 const random=Math.random;Math.random=()=>{throw Error('Visual code must not use a random source');};
 try{for(let i=1;i<200;i++)life.step(i*.1);life.setCity(deriveCity(s));}finally{Math.random=random;}
 assert.equal(fingerprint(s),before);
 life.setCity(deriveCity(fresh()),true);assert.equal(life.step(400).pedestrians.length,0);assert.equal(life.elapsed,0);
 assert.equal(life.step(400).cars.length,3);
});
test('cranes are deduplicated, animated without new buffers, and cancelled on closure',()=>{
 const r=renderer(),city=new LivingCity(r),s=fresh();city.setState(s);city.objects(0);
 s.properties[1].owner='host';city.setState(s);s.properties[1].level=1;city.setState(s);
 assert.equal(city.cranes.filter(c=>c.id===1).length,1);
 const count=r.meshes.size,first=city.objects(.1),second=city.objects(.2);
 assert.equal(r.meshes.size,count);assert.ok(first.some(o=>o.mesh===city.jib));
 assert.notDeepEqual(first.find(o=>o.mesh===city.cable).model,second.find(o=>o.mesh===city.cable).model);
 s.properties[1].level=0;s.properties[1].mortgaged=true;city.setState(s);assert.equal(city.cranes.length,0);
 city.setState({...s,id:'different'});assert.equal(city.cranes.length,0);assert.equal(city.celebrations.length,0);
});
test('district celebrations stop if the district is no longer complete',()=>{
 const city=new LivingCity(renderer()),s=fresh();city.setState(s);
 s.properties[1].owner=s.properties[2].owner='host';city.setState(s);assert.equal(city.celebrations.length,1);
 s.properties[1].mortgaged=true;city.setState(s);assert.equal(city.celebrations.length,0);
});
test('neighborhood feedback reflects real purchases, investments and mortgages, not cash rewards',()=>{
 let s=fresh();assert.equal(parcelInsight(s,1).activity,0);assert.equal(parcelInsight(s,0),null);
 s.properties[1].owner=s.properties[2].owner='host';
 const initial=parcelInsight(s,1);assert.equal(initial.activity,2);assert.match(initial.status,/Quartier réuni/);
 s=applyAction(s,'host',{type:'UPGRADE',tile:1});assert.equal(parcelInsight(s,1).activity,4);assert.equal(parcelInsight(s,1).level,1);
 s=applyAction(s,'host',{type:'SELL_LEVEL',tile:1});s=applyAction(s,'host',{type:'MORTGAGE',tile:1});
 const before=fingerprint(s),closed=parcelInsight(s,1);assert.equal(closed.activity,0);assert.equal(closed.title,'L’activité est en veille');assert.equal(fingerprint(s),before);
});
test('inspect camera is read-only and can be reset without affecting game or selection',()=>{
 const s=developed(),before=fingerprint(s),scene={city:{city:deriveCity(s)},selected:8};
 assert.equal(BoardScene.prototype.focusParcel.call(scene,8),true);assert.equal(scene.selected,8);assert.equal(scene.zoom,1.5);assert.equal(scene.dirty,true);
 assert.equal(BoardScene.prototype.focusParcel.call(scene,0),false);
 BoardScene.prototype.view.call(scene,'reset');assert.deepEqual(scene.viewTarget,[0,.3,0]);assert.equal(scene.zoom,1);assert.equal(fingerprint(s),before);
});
