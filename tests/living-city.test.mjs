import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, applyAction, assertState, fingerprint } from '../src/game/engine.js';
import { CASINO_STAKES, casinoAvailability, rouletteColor } from '../src/game/casino.js';
import { deriveCity, cityTransitions, squareRoute, trafficPosition, cityBudget } from '../src/scene/city-state.js';
import { Geometry } from '../src/scene/geometry.js';
import { LivingCity } from '../src/scene/living-city.js';
import { RoomSession } from '../src/network/rtc.js';
import { readPacket, packet } from '../src/network/protocol.js';
import { botAction } from '../src/game/bots.js';
const seats=[{id:'host',name:'Hôte'},{id:'guest',name:'Invité'},{id:'third',name:'Troisième'}];
const fresh=(seed=42,options={})=>createGame(seats,seed,{casino:true,id:'city-test',...options});
const bet=(round=1,stake=20,color='red')=>({type:'CASINO_BET',round,stake,color});
test('casino settles only match cash, is pure and leaves board RNG/phase/dice/property state unchanged',()=>{
 const s=fresh(),before=structuredClone(s),n=applyAction(s,'guest',bet());
 assert.deepEqual(s,before);assert.equal(n.rng,s.rng);assert.deepEqual(n.dice,s.dice);assert.equal(n.turn,s.turn);assert.equal(n.phase,s.phase);assert.deepEqual(n.properties,s.properties);assert.equal(n.turnSerial,s.turnSerial);
 const r=n.casino.results[0];assert.equal(n.players[1].cash,s.players[1].cash+r.returned-r.stake);assert.equal(n.players[0].cash,s.players[0].cash);assert.equal(n.revision,1);
 assert.deepEqual(applyAction(n,'host',{type:'ROLL'}).dice,applyAction(s,'host',{type:'ROLL'}).dice);
});
test('all 37 roulette numbers settle correctly, including zero losing for both colors',()=>{
 const seen=new Set();for(let seed=1;seed<2000&&seen.size<37;seed++)for(const color of ['red','black']) {
  const n=applyAction(fresh(seed),'guest',bet(1,60,color)),r=n.casino.results[0];seen.add(r.number);
  assert.equal(r.returned,rouletteColor(r.number)===color?120:0);assert.equal(n.players[1].cash,1800-60+r.returned);
  if(r.number===0)assert.equal(r.returned,0);
 }
 assert.equal(seen.size,37);
});
test('casino enforces enabled flag, identity, safe phases, own-turn exclusion and reserve',()=>{
 assert.throws(()=>applyAction(fresh(1,{casino:false}),'guest',bet()));
 assert.throws(()=>applyAction(fresh(),'host',bet()));assert.throws(()=>applyAction(fresh(),'unknown',bet()));
 for(const phase of ['buy','choose','auction','finished']) {const s=fresh();s.phase=phase;assert.ok(casinoAvailability(s,'guest'));}
 const s=fresh();s.players[1].bankrupt=true;assert.throws(()=>applyAction(s,'guest',bet()));
 for(const stake of CASINO_STAKES) {
  const s=fresh();s.players[1].cash=200+stake-1;assert.throws(()=>applyAction(s,'guest',bet(1,stake)));
  s.players[1].cash++;assert.ok(applyAction(s,'guest',bet(1,stake)).players[1].cash>=200);
 }
});
test('one bet per round survives reloads; no repeat on a different table turn',()=>{
 const n=applyAction(fresh(),'guest',bet());assert.throws(()=>applyAction(n,'guest',bet()));
 const restored=assertState(JSON.parse(JSON.stringify(n)));restored.turnSerial=2;restored.turn=2;assert.throws(()=>applyAction(restored,'guest',bet()));
 restored.round=2;assert.ok(applyAction(restored,'guest',bet(2)));assert.throws(()=>applyAction(restored,'guest',bet(1)));
 assert.equal(applyAction(n,'third',bet()).casino.results.length,2);
});
test('casino rejects malformed amounts, injected rewards, stale rounds and forged outcomes',()=>{
 for(const stake of [-1,0,19,21,20.1,100,Infinity,NaN,'20'])assert.throws(()=>applyAction(fresh(),'guest',bet(1,stake)));
 for(const action of [{...bet(),actor:'host'},{...bet(),returned:999},{...bet(),currency:'wallet'},bet(0),bet(2),{...bet(),color:'green'},{type:'CASINO_BET'}])assert.throws(()=>applyAction(fresh(),'guest',action));
 const n=applyAction(fresh(),'guest',bet());
 for(const mutate of [s=>s.casino.results.push(s.casino.results[0]),s=>s.casino.results[0].returned=999,s=>s.casino.rng=0,s=>s.casino.enabled=false,s=>s.casino.results[0].round=2,s=>s.casino.results[0].stake=100,s=>s.casino.results[0].actor='outsider']) {const s=structuredClone(n);mutate(s);assert.throws(()=>assertState(s));}
});
test('new matches reset the casino history and do not carry a balance or reward',()=>{
 const old=applyAction(fresh(),'guest',bet()),next=fresh(123,{id:'new'});assert.equal(next.casino.results.length,0);assert.equal(next.players[1].cash,1800);assert.equal(next.casino.enabled,true);assert.notEqual(old.id,next.id);
 assert.equal(createGame(seats,1).casino.enabled,false);
});
test('WebRTC host revalidates concurrent scoped casino requests and binds identity to the peer',()=>{
 const r=new RoomSession({onState:()=>{}});r.isHost=true;r.state=fresh();r.state.revision=5;r.broadcast=()=>{};const sent=[];r.send=(id,type)=>sent.push(type);const peer={seen:new Set(),limit:()=>true};
 const msg={type:'action',gameId:'city-test',revision:4,requestId:'bet-one',action:bet(),actor:'host'};
 r.receive('guest',msg,peer);assert.equal(r.state.revision,6);assert.equal(r.state.casino.results[0].actor,'guest');
 r.receive('guest',msg,peer);assert.equal(r.state.revision,6);
 r.receive('guest',{...msg,requestId:'second'},peer);assert.equal(r.state.revision,6);assert.equal(sent.at(-1),'error');
 r.receive('third',{...msg,requestId:'future',revision:90},peer);assert.equal(r.state.revision,6);assert.equal(sent.at(-1),'snapshot');
 r.receive('third',{...msg,requestId:'old-match',gameId:'old'},peer);assert.equal(r.state.revision,6);
});
test('v6 network and lobby rules explicitly validate casino and opening; v5 is incompatible',()=>{
 assert.equal(readPacket(packet('lobby-rules',{rules:{opening:'classic',rounds:12,finishOnBankruptcy:false,casino:true}})).rules.casino,true);
 assert.throws(()=>readPacket(JSON.stringify({v:3,type:'snapshot',state:fresh()})));
 assert.throws(()=>readPacket(packet('lobby-rules',{rules:{opening:'classic',rounds:12,finishOnBankruptcy:false}})));
 assert.equal(readPacket(packet('snapshot',{state:fresh()})).state.casino.enabled,true);
});
test('100 complete casino-enabled bot trajectories replay identically; no persistent rewards',()=>{
 let actions=0;for(let seed=1;seed<=100;seed++) {
  let s=fresh(seed,{rounds:6}),r=fresh(seed,{rounds:6});let guard=0;
  while(s.phase!=='finished'&&guard++<2500) {
   for(const p of s.players)if(!casinoAvailability(s,p.id,20)) {const a=bet(s.round);s=applyAction(s,p.id,a);r=applyAction(r,p.id,a);actions++;}
   if(s.phase==='finished')break;
   const actor=s.players[s.phase==='auction'?s.auction.bidder:s.turn].id,a=botAction(s);assert.ok(a);s=applyAction(s,actor,a);r=applyAction(r,actor,a);actions++;
  }
  assert.equal(s.phase,'finished');assert.deepEqual(s,r);assert.equal(s.casino.results.length<=3,true);assert.equal('wallet' in s,false);assert.equal('xp' in s,false);
 }
 console.log(`Casino corpus: 100 complete games, ${actions} actions, identical replays.`);
});
test('city projects owners, upgrades and mortgages without mutating economic state',()=>{
 const s=fresh(),before=fingerprint(s),empty=deriveCity(s);assert.equal(empty.owned,0);assert.equal(empty.activity,0);assert.equal(fingerprint(s),before);
 s.properties[1].owner='host';const bought=deriveCity(s);assert.equal(bought.parcels.find(p=>p.id===1).tier,1);assert.ok(bought.activity>empty.activity);
 s.properties[2].owner='host';const complete=deriveCity(s);assert.equal(complete.districts[0].owner,'host');assert.equal(cityTransitions(bought,complete).celebrations.length,1);
 s.properties[1].level=1;const upgrade=deriveCity(s);assert.equal(upgrade.development,1);assert.equal(cityTransitions(complete,upgrade).construction[0].id,1);assert.ok(upgrade.activity>complete.activity);
 s.properties[1].level=0;s.properties[1].mortgaged=true;const closed=deriveCity(s);assert.equal(closed.parcels.find(p=>p.id===1).activity,0);assert.equal(closed.districts[0].complete,false);
 assert.deepEqual(cityTransitions(null,upgrade),{construction:[],celebrations:[]});
});
test('traffic routes stay finite and on roads; animation budgets are bounded',()=>{
 const s=fresh();s.properties.forEach((p,i)=>{if([1,2].includes(i)){p.owner='host';p.level=3;}});const city=deriveCity(s);
 for(let i=-100;i<1000;i++){const p=trafficPosition(i/100,city);assert.ok(Number.isFinite(p.x+p.z+p.yaw));assert.ok(Math.abs(p.x)<=4.481&&Math.abs(p.z)<=4.481);assert.ok(Math.max(Math.abs(p.x),Math.abs(p.z))>=4.479);}
 assert.deepEqual(squareRoute(0,4),squareRoute(4,4));
 assert.ok(cityBudget(city).cars<=18);assert.ok(cityBudget(city).pedestrians<=48);assert.ok(cityBudget(city,'low').pedestrians<=12);assert.equal(cityBudget(city,'high',true).cars,0);assert.equal(cityBudget(city,'high',false,false).pedestrians,0);
});
test('city meshes only rebuild for economy changes; bounded effects and no renderer-state leaks',()=>{
 const meshes=new Set(),renderer={mesh(g){const data=g.typed();assert.ok(data.every(Number.isFinite));const mesh={count:g.indices?.length??data.length/12,bytes:data.byteLength+(g.indices?.byteLength??0)};meshes.add(mesh);return mesh;},drop(m){meshes.delete(m);}};
 const city=new LivingCity(renderer),s=fresh();city.setState(s);const n=meshes.size,base=city.parcelMesh;
 city.setState({...s,revision:1});assert.equal(city.parcelMesh,base);assert.equal(meshes.size,n);
 for(let i=0;i<15;i++){s.properties[1].owner='host';s.properties[1].level=i%4;city.setState(s);assert.equal(meshes.size,n+Math.min(i+1,4));}
 // Four authored level meshes are cached, not leaked or regenerated on a dice snapshot.
 const builds=city.districts.builds;city.setState({...s,revision:500});assert.equal(city.districts.builds,builds);
 const before=fingerprint(s);city.objects(20,.5);assert.equal(fingerprint(s),before);assert.ok(city.cranes.length<=16);
 city.configure({reduced:true});assert.equal(city.cranes.length,0);city.objects(22,.5);assert.equal(city.stats.cars,0);
 const g=new Geometry();g.block([0,0,0],[1,1,1],'#ffffff');assert.equal(g.typed().length/12,36);
});
