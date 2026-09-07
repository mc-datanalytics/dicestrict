import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { BOARD, RULES } from '../src/game/board.js';
import { createGame, applyAction, assertState, fingerprint, rentFor } from '../src/game/engine.js';
import { PRESETS, matchOptions } from '../src/game/presets.js';
import { RoomSession } from '../src/network/rtc.js';
import { PROTOCOL, packet, readPacket } from '../src/network/protocol.js';
import { DEFAULT_CONFIG, validateConfig, runGame, makeReplay, verifyReplay, LAB_VERSION, POLICY_VERSION } from '../src/lab/core.js';
import { PlaytestRecorder, verifyPlaytest } from '../src/game/playtest.js';
const seats=Array.from({length:4},(_,i)=>({id:`p${i}`,name:`Joueur ${i+1}`,bot:true}));
const game=(seed=42)=>createGame(seats,seed);

test('automatic: every format and the default network room have no mobility rule',()=>{
  assert.equal(RULES.version,6);assert.equal(PROTOCOL,6);assert.equal(LAB_VERSION,3);assert.equal(POLICY_VERSION,4);
  for(const preset of PRESETS){assert.ok(!Object.hasOwn(preset,'mobility'));assert.ok(!Object.hasOwn(matchOptions(preset.id),'mobility'));}
  assert.ok(!Object.hasOwn(new RoomSession({}).rules,'mobility'));
});
test('automatic: 1000 seeds move exactly once to the dice total without a decision state',()=>{
  for(let seed=1;seed<=1000;seed++){
    const s=game(seed),before=fingerprint(s),next=applyAction(s,'p0',{type:'ROLL'});
    assert.equal(next.players[0].position,next.dice[0]+next.dice[1]);
    assert.equal(next.revision,s.revision+1);assert.ok(['buy','end'].includes(next.phase));
    assert.equal(next.log.filter(l=>l.text.includes('avance de')).length,1);assert.equal(fingerprint(s),before);
    assert.throws(()=>applyAction(next,'p0',{type:'ROLL'}));
  }
});
test('automatic: passing start and paying a developed rent each happen exactly once',()=>{
  const s=game();s.players[0].position=27;
  for(const t of BOARD.filter(t=>t.kind==='lot'&&t.group===2))s.properties[t.id]={owner:'p1',level:1,mortgaged:false};
  const rent=rentFor(s,9),next=applyAction(s,'p0',{type:'ROLL'});
  assert.equal(next.players[0].position,9);assert.equal(next.players[0].cash,1800+220-rent);
  assert.equal(next.players[1].cash,1800+rent);assert.equal(next.phase,'end');
  assert.throws(()=>applyAction(next,'p0',{type:'MOVE',offset:0}));
});
test('automatic: special rewards, tax and event settlement require no confirmation',()=>{
  for(const [tile,change] of [[6,-90],[7,70],[13,60],[14,100],[21,-80],[24,60]]){
    const s=game();s.players[0].position=(tile-10+28)%28;
    const next=applyAction(s,'p0',{type:'ROLL'}),lap=s.players[0].position+10>=28?220:0;
    assert.equal(next.players[0].position,tile);assert.equal(next.phase,'end');assert.equal(next.players[0].cash,1800+lap+change);
  }
  const event=applyAction(game(),'p0',{type:'ROLL'});assert.notEqual(event.event,null);assert.equal(event.phase,'end');
});
test('automatic: old clients and offset commands are rejected at the network boundary',()=>{
  assert.throws(()=>readPacket(JSON.stringify({v:5,type:'ready'})),/incompatible/);
  for(const action of [{type:'MOVE',offset:0},{type:'MOVE',offset:-1},{type:'MOVE',offset:1},{type:'ROLL',offset:1}]){
    assert.throws(()=>readPacket(packet('action',{gameId:'new',requestId:'request',revision:0,action})));
    assert.throws(()=>readPacket(packet('commit',{gameId:'new',actor:'p0',baseRevision:0,checksum:'abcd1234',action})));
  }
  const rules=matchOptions('standard');assert.deepEqual(readPacket(packet('lobby-rules',{rules})).rules,rules);
  assert.throws(()=>readPacket(packet('lobby-rules',{rules:{...rules,mobility:0}})));
  assert.throws(()=>readPacket(packet('lobby-rules',{rules:{...rules,mobility:2}})));
});
test('automatic: current snapshots cannot contain hidden legacy tokens or the pending route state',()=>{
  for(const mutate of [s=>s.version=5,s=>s.mobility=0,s=>s.players[2].mobilityTokens=0,s=>s.phase='choose']){
    const s=game();mutate(s);assert.throws(()=>assertState(s));assert.throws(()=>readPacket(packet('snapshot',{state:s})));
  }
});
test('automatic: historic lab config is rejected even with zero tokens, without modifying the input',()=>{
  for(const side of ['baseline','candidate'])for(const mobility of [0,2,undefined]){
    const c=structuredClone(DEFAULT_CONFIG);c[side].mobility=mobility;const before=structuredClone(c);
    assert.throws(()=>validateConfig(c),/historique/);assert.deepEqual(c,before);
  }
});
test('automatic: archived replay and playtest versions cannot be silently relabeled',()=>{
  const c={...structuredClone(DEFAULT_CONFIG),samples:1,rotateSeats:false},replay=makeReplay(c,'baseline');
  assert.equal(verifyReplay(replay).phase,'finished');
  for(const key of ['engineVersion','labVersion','policyVersion']){const old=structuredClone(replay);old[key]--;assert.throws(()=>verifyReplay(old));}
  const recorder=new PlaytestRecorder(game());const record=recorder.export();record.engineVersion=5;
  assert.throws(()=>verifyPlaytest(record),/incompatible/);
});
test('automatic: 2–4 players and negotiating/casino tables complete and replay without any MOVE',()=>{
  for(const n of [2,3,4])for(const negotiation of ['none','reciprocal']){
    const c={...structuredClone(DEFAULT_CONFIG),samples:3,rotateSeats:false,lineup:Array(n).fill('balanced')};
    c.candidate.negotiation=negotiation;
    for(let i=0;i<3;i++){
      const r=runGame(validateConfig(c),'candidate',i,0,{capture:true});assert.equal(r.status,'completed');
      let s=r.replay.initial;
      for(const {actor,action,checksum} of r.replay.trace){assert.notEqual(action.type,'MOVE');s=applyAction(s,actor,action);assert.equal(fingerprint(s),checksum);assert.notEqual(s.phase,'choose');}
      assert.equal(s.phase,'finished');assert.equal(r.visits.reduce((a,b)=>a+b,0),r.metrics.rolls);
    }
  }
});
test('automatic: removed CLI experiment and historic study cannot run against the new reducer',()=>{
  const removed=spawnSync(process.execPath,['scripts/balance.mjs','--experiment','mobility'],{encoding:'utf8',timeout:5000});
  assert.equal(removed.status,2);assert.match(removed.stderr,/inconnue/);
  const historical=spawnSync(process.execPath,['scripts/fair-opening.mjs','confirmation'],{encoding:'utf8',timeout:5000});
  assert.notEqual(historical.status,0);assert.match(historical.stderr,/historique v5/);
});
