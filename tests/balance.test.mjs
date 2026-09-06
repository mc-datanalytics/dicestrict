import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { DEFAULT_CONFIG, validateConfig, seating, runGame, runExperiment, summarize, makeReplay, verifyReplay, toCSV } from '../src/lab/core.js';
import { estimate, seedAt } from '../src/lab/statistics.js';
import { createGame, applyAction, netWorth, fingerprint } from '../src/game/engine.js';
import { botAction, BOT_PROFILES } from '../src/game/bots.js';
import { motionProgress } from '../src/scene/board-scene.js';
const config=(samples=3)=>({...structuredClone(DEFAULT_CONFIG),samples});
test('lab rejects unknown config, non-integers, invalid rules, policies and unreasonable workloads',()=>{
  for(const mutate of [c=>c.samples=2001,c=>c.samples=.5,c=>c.baseSeed=0,c=>c.baseSeed=2**32,c=>c.lineup=['balanced'],c=>c.lineup[0]='hacker',c=>c.wallet=100,c=>c.baseline.rentMultiplier=10,c=>c.candidate.rounds=31,c=>c.baseline.casinoPolicy='all-60',c=>c.candidate.casinoPolicy='all-in']){
    const c=config();mutate(c);assert.throws(()=>validateConfig(c));
  }
  const c=config(),out=validateConfig(c);out.baseline.rounds=5;assert.equal(c.baseline.rounds,12);
});
test('seed schedule is deterministic, nonzero and independent of Math.random',()=>{
  const seeds=Array.from({length:2000},(_,i)=>seedAt(123,i));assert.equal(new Set(seeds).size,2000);assert.ok(seeds.every(s=>s>0&&s<2**32));assert.deepEqual(seeds,Array.from({length:2000},(_,i)=>seedAt(123,i)));
});
test('complete rotations expose every identity at every seat',()=>{
  for(let n=2;n<=4;n++){const lineup=config().lineup.slice(0,n);for(let seat=0;seat<n;seat++)assert.equal(new Set(Array.from({length:n},(_,r)=>seating(lineup,r)[seat].id)).size,n);}
});
test('full report is byte-for-byte reproducible; rotations do not inflate independent sample size',()=>{
  const c=config(3),a=runExperiment(c),b=runExperiment(c);
  assert.equal(JSON.stringify(a),JSON.stringify(b));assert.equal(a.gamesCompleted,24);assert.equal(a.method.independentSeeds,3);assert.equal(a.metrics.actions.delta.blocks,3);assert.equal(a.failures.length,0);
});
test('identical paired conditions have EXACTLY zero deltas including interval bounds',()=>{
  const c=config();c.candidate=structuredClone(c.baseline);const r=runExperiment(c);
  for(const m of Object.values(r.metrics))assert.deepEqual(m.delta,{mean:0,low:0,high:0,blocks:c.samples});
  for(const w of r.winsBySeat)assert.equal(w.delta.mean,0);
});
test('bootstrap constants, singleton uncertainty and empty samples are explicit',()=>{
  assert.deepEqual(estimate([]),{mean:null,low:null,high:null,blocks:0});assert.equal(estimate([1]).low,null);
  assert.equal(estimate([0,0,0]).high,0);assert.deepEqual(estimate([1,5,10,20]),estimate([1,5,10,20]));
  assert.throws(()=>estimate([NaN]));
});
test('all observed landings correspond to rolls; rent, spend, casino and final scores are measured from actions',()=>{
  const c=config(),r=runGame(c,'candidate',0,0,{capture:true});assert.equal(r.status,'completed');
  assert.equal(r.visits.reduce((a,b)=>a+b,0),r.metrics.rolls);assert.equal(r.winShares.reduce((a,b)=>a+b,0),1);
  assert.equal(r.casinoNet.reduce((a,b)=>a+b,0),r.metrics.casinoNet);assert.equal(r.casinoBets.reduce((a,b)=>a+b,0),r.metrics.casinoBets);
  let s=r.replay.initial;for(const {actor,action} of r.replay.trace)s=applyAction(s,actor,action);
  assert.deepEqual(r.wealth,s.players.map(p=>netWorth(s,p.id)));assert.equal(r.checksum,fingerprint(s));assert.ok(r.rents.every(x=>x>=0));assert.ok(r.invested.every(x=>x>=0));
});
test('failed games remain visible and exclude whole paired seed blocks, never silently become draws',()=>{
  const c=config(1),pairs=Array.from({length:4},(_,rotation)=>({seedIndex:0,rotation,a:runGame(c,'baseline',0,rotation),b:runGame(c,'candidate',0,rotation,{actionLimit:rotation===0?1:4000})}));
  const r=summarize(c,pairs);assert.equal(r.gamesAttempted,8);assert.equal(r.failures.length,1);assert.equal(r.gamesCompleted,7);assert.equal(r.method.independentSeeds,0);assert.equal(r.metrics.rolls.a.mean,null);assert.match(r.failures[0].error,/Plafond/);
});
test('turning casino on without betting does not magically simulate its usage',()=>{
  const c=config(2);c.candidate={...c.baseline,casino:true,casinoPolicy:'none'};const r=runExperiment(c);
  assert.equal(r.metrics.casinoBets.b.mean,0);for(const m of Object.values(r.metrics))assert.equal(m.delta.mean,0);
});
test('focal casino identity follows the profile through seat rotations',()=>{
  const c=config(1);c.candidate.casinoPolicy='focal-60';
  for(let rotation=0;rotation<4;rotation++){const r=runGame(c,'candidate',0,rotation);assert.equal(r.status,'completed');r.casinoBets.forEach((bets,i)=>assert.equal(bets>0,r.seats[i].id==='p0'));}
});
test('replays verify every checksum and reject forged start, actor, version and results',()=>{
  const replay=makeReplay(config(1),'candidate');assert.equal(verifyReplay(replay).phase,'finished');
  for(const mutate of [r=>r.initial.players[0].cash++,r=>r.trace[0].checksum='00000000',r=>r.trace[0].actor='outsider',r=>r.engineVersion=999,r=>r.finalChecksum='ffffffff',r=>r.rotation=99]){const r=structuredClone(replay);mutate(r);assert.throws(()=>verifyReplay(r));}
});
test('CSV has exactly one row per attempted game and names explicit conditions',()=>{
  const r=runExperiment(config(1)),csv=toCSV(r);assert.equal(csv.trimEnd().split('\n').length,r.gamesAttempted+1);assert.match(csv,/"baseline"/);assert.match(csv,/"candidate"/);
});
test('all strategies generate legal completed trajectories without reading future randomness',()=>{
  for(const profile of Object.keys(BOT_PROFILES)){
    const c=config(2);c.lineup=Array(4).fill(profile);
    for(let i=0;i<2;i++)assert.equal(runGame(c,'candidate',i,0).status,'completed');
    const s=createGame([{id:'a'},{id:'b'}],1);Object.defineProperty(s,'rng',{get(){throw Error('Hidden randomness read');}});Object.defineProperty(s.casino,'rng',{get(){throw Error('Hidden casino RNG read');}});
    assert.deepEqual(botAction(s,profile),{type:'ROLL'});
  }
});
test('game bots reopen mortgaged lots when sufficient reserves have returned',()=>{
  const s=createGame([{id:'a',bot:true},{id:'b',bot:true}],42);s.phase='end';s.properties[1]={owner:'a',level:0,mortgaged:true};
  assert.deepEqual(botAction(s),{type:'REDEEM',tile:1});const n=applyAction(s,'a',botAction(s));assert.equal(n.properties[1].mortgaged,false);assert.equal(n.players[0].cash,1734);
  s.players[0].cash=250;assert.deepEqual(botAction(s),{type:'END'});
});
test('reduced-motion changes snap a pawn instead of freezing it midway',()=>{
  const path={start:100,duration:1000};assert.equal(motionProgress(path,600,false),.5);assert.equal(motionProgress(path,600,true),1);assert.equal(motionProgress(path,99,false),0);assert.equal(motionProgress(path,4000,false),1);
});
test('CLI invalid arguments fail quickly without starting simulations',()=>{
  const r=spawnSync(process.execPath,['scripts/balance.mjs','--samples','-5'],{encoding:'utf8',timeout:5000});assert.equal(r.status,2);assert.match(r.stderr,/invalide/);
});
