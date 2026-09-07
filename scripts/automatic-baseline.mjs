#!/usr/bin/env node
/** New diagnostic corpus after removing Mobility. No search for a new bonus,
 * no reuse of the v5 selection or claims about human enjoyment. */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { DEFAULT_CONFIG, runExperiment, makeReplay, toCSV } from '../src/lab/core.js';
import { seedAt, mean, quantile, randomSequence } from '../src/lab/statistics.js';
import { sourceMeta } from './source-meta.mjs';
const args=process.argv.slice(2);
if(args.length>1)throw Error('Usage: npm run balance:automatic -- [output-directory]');
const out=resolve(args[0]??'lab-results/automatic-v6'),root=new URL('../',import.meta.url),source=await sourceMeta(root);
const cases=[['standard',0x6a09e667,'none'],['negotiation',0xbb67ae85,'reciprocal']];
// Previously used opening campaigns. Do not call historical seeds a new corpus.
const old=[[0x31415926,800],[0x27182818,2000],[0x16180339,1000],[0x14142135,1000],[0x17320508,1000],[0x22360679,250],[0x24494897,250],[0x26457513,500]];
const used=new Set(old.flatMap(([base,count])=>Array.from({length:count},(_,i)=>seedAt(base,i))));
await mkdir(out,{recursive:true});const summaries=[];
for(const [name,baseSeed,negotiation] of cases){
  const rules={...DEFAULT_CONFIG.baseline,casino:false,casinoPolicy:'none',opening:'classic',negotiation};
  const config={baseSeed,samples:1000,rotateSeats:false,lineup:Array(4).fill('balanced'),baseline:rules,candidate:{...rules,opening:'comp-60'}};
  for(let i=0;i<config.samples;i++){const seed=seedAt(baseSeed,i);if(used.has(seed))throw Error('Seed overlap');used.add(seed);}
  const report={...runExperiment(config),source};
  const json=JSON.stringify(report,null,2)+'\n';await writeFile(join(out,name+'.json'),json);
  if(report.failures.length)throw Error('Failed trajectories retained in '+name+'.json');
  const {pairs,...summary}=report;
  const result={name,...summary,seatSpread:spread(report),reportSHA256:createHash('sha256').update(json).digest('hex')};
  summaries.push(result);await writeFile(join(out,name+'-summary.json'),JSON.stringify(result,null,2)+'\n');
  await writeFile(join(out,name+'.csv'),toCSV(report));
  await writeFile(join(out,name+'-replay.json'),JSON.stringify(makeReplay(config,'baseline',0,0),null,2)+'\n');
  console.log(name,JSON.stringify({games:report.gamesCompleted,spread:result.seatSpread,levels:report.metrics.levels,deals:report.metrics.dealsAccepted}));
}
if((await sourceMeta(root)).sha256!==source.sha256)throw Error('Sources changed during the diagnostic. Rerun.');
await writeFile(join(out,'summary.json'),JSON.stringify({schema:'dicestrict-automatic-baseline-v1',source,overlappingSeeds:0,humanParticipants:0,warning:'Diagnostic only, not a new tuning or human-equity validation. Classic remains the default.',summaries},null,2)+'\n');
function spread(report){
 const n=report.config.lineup.length,rows=report.pairs;
 const gap=values=>Math.max(...values)-Math.min(...values);
 const a=Array.from({length:n},(_,j)=>mean(rows.map(p=>p.a.winShares[j]))),b=Array.from({length:n},(_,j)=>mean(rows.map(p=>p.b.winShares[j])));
 const rng=randomSequence(512099),delta=[];
 for(let k=0;k<600;k++){
   const av=Array(n).fill(0),bv=Array(n).fill(0);
   for(let i=0;i<rows.length;i++){const row=rows[Math.floor(rng()*rows.length)];for(let j=0;j<n;j++){av[j]+=row.a.winShares[j]/rows.length;bv[j]+=row.b.winShares[j]/rows.length;}}
   delta.push(gap(av)-gap(bv));
 }
 delta.sort((x,y)=>x-y);
 return {winsA:a,winsB:b,classic:gap(a),comp60:gap(b),reduction:{mean:gap(a)-gap(b),low:quantile(delta,.025),high:quantile(delta,.975)},independentSeeds:rows.length,resamples:600};
}
