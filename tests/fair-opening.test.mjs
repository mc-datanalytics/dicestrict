import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../src/game/board.js';
import { OPENINGS } from '../src/game/opening.js';
import { createGame, applyAction, currentPlayer, assertState, fingerprint } from '../src/game/engine.js';
import { botAction, botDealDecision } from '../src/game/bots.js';
import { botProposeDeal } from '../src/game/negotiator.js';
import { PlaytestRecorder, verifyPlaytest } from '../src/game/playtest.js';
import { PROTOCOL, readPacket, packet } from '../src/network/protocol.js';
import { DEFAULT_CONFIG, validateConfig, makeReplay, verifyReplay, runGame } from '../src/lab/core.js';
const seats=n=>Array.from({length:n},(_,i)=>({id:`p${i}`,name:`Private Name ${i}`,bot:true}));
function traceGame(initial,record=false){
 let s=initial,rolls=Array(s.players.length).fill(0),trace=[],recorder=record?new PlaytestRecorder(s):null;
 for(let i=0;s.phase!=='finished'&&i<2000;i++){
  const actor=currentPlayer(s).id,action=botAction(s);
  if(action.type==='ROLL')rolls[s.turn]++;
  s=applyAction(s,actor,action);recorder?.observe(s,{actor,action},i*100);
  trace.push({actor,action});
 }
 assert.equal(s.phase,'finished');return {s,rolls,trace,recorder};
}
test('opening: initial compensation is explicit, finite and applied once for 2–4 seats',()=>{
 for(let n=2;n<=4;n++)for(const [opening,rule] of Object.entries(OPENINGS)){
  const s=createGame(seats(n),43,{opening});assertState(s);
  assert.deepEqual(s.players.map(p=>p.cash),seats(n).map((_,i)=>1800+rule.step*i));
  const end=structuredClone(s);end.phase='end';const next=applyAction(end,'p0',{type:'END'});
  assert.deepEqual(next.players.map(p=>p.cash),s.players.map(p=>p.cash));
 }
});
test('opening: classic default preserved; v5 snapshots and invalid variants are rejected',()=>{
 assert.equal(createGame(seats(4)).opening,'classic');assert.equal(RULES.version,6);assert.equal(PROTOCOL,6);
 for(const opening of [null,{},'arbitrary','__proto__',120]){
  if(opening===null)continue;
  assert.throws(()=>createGame(seats(2),1,{opening}));
 }
 const s=createGame(seats(2));delete s.opening;assert.throws(()=>assertState(s));
 const old=createGame(seats(2));old.version=5;assert.throws(()=>assertState(old));
});
test('opening: snake order reverses each round, including endpoint consecutive turns',()=>{
 let s=createGame(seats(4),1,{opening:'snake',rounds:4});const order=[];
 while(s.phase!=='finished'){order.push(s.turn);s.phase='end';s=applyAction(s,currentPlayer(s).id,{type:'END'});}
 assert.deepEqual(order,[0,1,2,3,3,2,1,0,0,1,2,3,3,2,1,0]);assert.equal(s.turnSerial,16);
});
test('opening: snake skips bankrupt seats without repeating or dropping a round',()=>{
 let s=createGame(seats(4),1,{opening:'snake',rounds:4});s.players[3].bankrupt=true;s.players[3].cash=0;s.players[1].bankrupt=true;s.players[1].cash=0;
 const order=[];while(s.phase!=='finished'){order.push(s.turn);s.phase='end';s=applyAction(s,currentPlayer(s).id,{type:'END'});}
 assert.deepEqual(order,[0,2,2,0,0,2,2,0]);
});
test('opening: all finite variants terminate and replay with 2, 3 and 4 players',()=>{
 for(const opening of Object.keys(OPENINGS))for(const n of [2,3,4]){
  const initial=createGame(seats(n),1493,{opening,rounds:6});const result=traceGame(initial);
  let replay=initial;for(const c of result.trace)replay=applyAction(replay,c.actor,c.action);
  assert.equal(fingerprint(replay),fingerprint(result.s));assert.ok(result.rolls.every(n=>n<=6));
 }
});
function trading(){const s=createGame(seats(4),99,{opening:'comp-60'});s.properties[1].owner='p0';s.properties[4].owner='p0';s.properties[2].owner='p1';s.properties[5].owner='p1';return s;}
test('negotiation: proposes a legal reciprocal completion without reading future randomness',()=>{
 const s=trading(),before=JSON.stringify(s);const a=botProposeDeal(s,'p0');assert.equal(a.type,'OFFER_DEAL');assert.equal(JSON.stringify(s),before);
 Object.defineProperty(s,'rng',{get(){throw Error('RNG must not be read');}});assert.deepEqual(botProposeDeal(s,'p0'),a);
});
test('negotiation: real proposal and acceptance transfer lots/cash atomically; no repeat after decline',()=>{
 let s=trading();const total=s.players.reduce((n,p)=>n+p.cash,0),offer=botProposeDeal(s,'p0');s=applyAction(s,'p0',offer);
 assert.equal(botProposeDeal(s,'p0'),null);const decision=botDealDecision(s);assert.equal(decision.action.type,'ACCEPT_DEAL');
 const done=applyAction(s,decision.actor,decision.action);assert.equal(done.players.reduce((n,p)=>n+p.cash,0),total);
 assert.equal(done.properties[offer.giveTiles[0]].owner,'p1');assert.equal(done.properties[offer.takeTiles[0]].owner,'p0');
 const declined=applyAction(s,'p1',{type:'DECLINE_DEAL',dealId:1});assert.equal(botProposeDeal(declined,'p0'),null);
});
test('negotiation: wrong turn, low reserves, mortgages or built groups do not trigger an offer',()=>{
 assert.equal(botProposeDeal(trading(),'p1'),null);
 for(const change of [s=>s.phase='end',s=>s.players[0].cash=0,s=>s.properties[1].mortgaged=true,s=>s.properties[4].level=1]){
  const s=trading();change(s);assert.equal(botProposeDeal(s,'p0'),null);
 }
});
test('playtest: full traces replay, remove names/room IDs and never certify human participation',()=>{
 const initial=createGame(seats(4),119,{id:'PRIVATE-ROOM-ID',opening:'comp-60',rounds:4,casino:true});
 const {recorder}=traceGame(initial,true),record=recorder.export();assert.equal(record.status,'complete');
 const text=JSON.stringify(record);assert.ok(!text.includes('Private Name'));assert.ok(!text.includes('PRIVATE-ROOM-ID'));
 const {summary}=verifyPlaytest(record);assert.equal(summary.humanParticipationVerified,false);assert.equal(summary.declaredHumanSeats,0);
});
test('playtest: pseudonym-like, prototype-like and rule-like original IDs cannot corrupt recording',()=>{
 const initial=createGame([{id:'seat-2',name:'a'},{id:'roll',name:'b'},{id:'constructor',name:'c'},{id:'__proto__',name:'d'}],31,{rounds:4,opening:'snake'});
 const {recorder}=traceGame(initial,true);assert.equal(recorder.export().status,'complete');verifyPlaytest(recorder.export());
});
test('playtest: missing commands mark trace discontinuous and never manufacture a complete result',()=>{
 const s=createGame(seats(2),5),r=new PlaytestRecorder(s),next=applyAction(s,'p0',{type:'ROLL'});
 r.observe(next,null,100);assert.equal(r.export().status,'discontinuous');verifyPlaytest(r.export());
 const forged=r.export();forged.status='complete';assert.throws(()=>verifyPlaytest(forged));
 assert.throws(()=>new PlaytestRecorder(next));
});
test('playtest: changed hashes, commands, initial balances and false human certification are rejected',()=>{
 const {recorder}=traceGame(createGame(seats(2),9,{rounds:4}),true),record=recorder.export();
 for(const change of [r=>r.initial.players[0].cash++,r=>r.trace[0].checksum='00000000',r=>r.humanParticipationVerified=true,r=>r.trace[1].elapsedMs=-1,r=>r.finalChecksum='00000000']){
  const r=structuredClone(record);change(r);assert.throws(()=>verifyPlaytest(r));
 }
});
test('protocol: opening is announced and required, old clients cannot join silently',()=>{
 const rules={opening:'comp-60',rounds:12,finishOnBankruptcy:false,casino:false};
 assert.equal(readPacket(packet('lobby-rules',{rules})).rules.opening,'comp-60');
 assert.throws(()=>readPacket(JSON.stringify({v:5,type:'lobby-rules',rules})));
 delete rules.opening;assert.throws(()=>readPacket(packet('lobby-rules',{rules})));
});
test('lab: old configuration defaults are explicit; unknown rules fail and reciprocal games replay',()=>{
 const c=structuredClone(DEFAULT_CONFIG);c.samples=12;c.lineup=Array(4).fill('balanced');c.rotateSeats=false;
 c.candidate={...c.baseline,opening:'comp-60',negotiation:'reciprocal'};
 const legacy=structuredClone(c);delete legacy.baseline.opening;delete legacy.baseline.negotiation;
 assert.equal(validateConfig(legacy).baseline.opening,'classic');
 const bad=structuredClone(c);bad.candidate.negotiation='mind-reader';assert.throws(()=>validateConfig(bad));
 let deals=0;for(let i=0;i<12;i++){const r=runGame(c,'candidate',i,0);assert.equal(r.status,'completed');deals+=r.metrics.dealsAccepted;verifyReplay(makeReplay(c,'candidate',i));}
 assert.ok(deals>0);
});
