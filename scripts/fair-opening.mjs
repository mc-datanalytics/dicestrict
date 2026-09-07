#!/usr/bin/env node
/** Preregistered experiment. No tuning on the confirmation corpus. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { DEFAULT_CONFIG, validateConfig, runGame, runExperiment, makeReplay } from '../src/lab/core.js';
import { mean, estimate, quantile, seedAt, randomSequence } from '../src/lab/statistics.js';
import { sourceMeta } from './source-meta.mjs';
import { RULES } from '../src/game/board.js';
if (RULES.version !== 5) throw Error('Étude historique v5 avec Mobilité. Reproduisez-la au commit b5f547c97ce8387f1c31b25bef3a29952d0a94a7. Pour les nouvelles règles : npm run balance:automatic.');
const args=process.argv.slice(2),stage=args[0],out=resolve(args[1]??'lab-results/fair-opening');
if(!['development','confirmation'].includes(stage)||args.length>2)throw Error('Usage: node scripts/fair-opening.mjs development|confirmation [output-directory]');
await mkdir(out,{recursive:true});
const root=new URL('../',import.meta.url),source=await sourceMeta(root);
const base={...DEFAULT_CONFIG.baseline,opening:'classic',negotiation:'none'};
function config(baseSeed,samples,n=4,opening='classic',negotiation='none',mixed=false,casino=false){
  return validateConfig({baseSeed,samples,rotateSeats:mixed,lineup:mixed?['balanced','prudent','builder','collector']:Array(n).fill('balanced'),
    baseline:{...base,negotiation,casino,casinoPolicy:casino?'all-60':'none'},candidate:{...base,negotiation,opening,casino,casinoPolicy:casino?'all-60':'none'}});
}
const development=config(0x31415926,800);
const candidates=['classic','snake','comp-20','comp-40','comp-60','comp-80'];
async function save(name,data){await writeFile(join(out,name+'.json'),JSON.stringify(data,null,2)+'\n');}
function seatSummary(records,n){
 const wins=Array.from({length:n},(_,i)=>estimate(records.map(r=>r.winShares[i])));
 return {wins,spread:Math.max(...wins.map(w=>w.mean))-Math.min(...wins.map(w=>w.mean)),
  levels:mean(records.map(r=>r.metrics.levels)),meanWealth:mean(records.map(r=>r.metrics.meanWealth)),anyBankruptcy:mean(records.map(r=>r.metrics.anyBankruptcy))};
}
if(stage==='development'){
 const conditions=[];
 for(const opening of candidates){
  const c=config(development.baseSeed,development.samples,4,opening),records=[];
  for(let i=0;i<c.samples;i++)records.push(runGame(c,'candidate',i,0));
  if(records.some(r=>r.status!=='completed'))throw Error('Development trajectory failed; inspect output before proceeding.');
  const result={opening,config:c,summary:seatSummary(records,4)};
  conditions.push(result);await save('development-'+opening,{source,...result,records});console.log(JSON.stringify(result.summary));
 }
 // Lowest spread, then no monetary intervention, then smallest cash step.
 const order=['snake','comp-20','comp-40','comp-60','comp-80'];
 const choice=conditions.filter(c=>c.opening!=='classic').sort((a,b)=>a.summary.spread-b.summary.spread||order.indexOf(a.opening)-order.indexOf(b.opening))[0].opening;
 await save('selection',{schema:'dicestrict-opening-selection-v1',source,choice,conditions,confirmationOpened:false});
 console.log('Selected on development ONLY:',choice);
}else{
 const selection=JSON.parse(await readFile(join(out,'selection.json'),'utf8'));
 if(selection.source.sha256!==source.sha256||!candidates.includes(selection.choice))throw Error('Selection source mismatch. Freeze sources before confirmation.');
 const choice=selection.choice;
 const campaigns=[
  ['primary',config(0x27182818,2000,4,choice)],
  ['two-players',config(0x16180339,1000,2,choice)],
  ['three-players',config(0x14142135,1000,3,choice)],
  ['negotiation',config(0x17320508,1000,4,choice,'reciprocal')],
  ['mixed',config(0x22360679,250,4,choice,'none',true)],
  ['mixed-negotiation',config(0x24494897,250,4,choice,'reciprocal',true)],
  ['casino',config(0x26457513,500,4,choice,'none',false,true)],
 ];
 const seen=new Set(Array.from({length:development.samples},(_,i)=>seedAt(development.baseSeed,i)));
 for(const [name,c] of campaigns)for(let i=0;i<c.samples;i++){const seed=seedAt(c.baseSeed,i);if(seen.has(seed))throw Error('Corpus overlap: '+name);seen.add(seed);}
 const summaries=[];
 for(const [name,c] of campaigns){
  const report=runExperiment(c);if(report.failures.length)throw Error('Confirmation trajectory failed: '+name);
  const spread=spreadInterval(report),{pairs,...summary}=report;
  const gate={spreadReducedByHalf:spread.candidate<=spread.baseline*.5,reductionCIPositive:spread.reduction.low>0,
   bankruptcyGuardrail:report.metrics.anyBankruptcy.delta.mean<=.05,constructionGuardrail:report.metrics.levels.b.mean>=report.metrics.levels.a.mean*.75};
  const data={source,name,spread,gate,...summary};summaries.push(data);await save(name,{...report,source,spread,gate});await save(name+'-summary',data);
  await save(name+'-replay',makeReplay(c,'candidate',0,0));console.log(name,JSON.stringify({spread,gate,deals:report.metrics.dealsAccepted,levels:report.metrics.levels}));
 }
 await save('confirmation-summary',{source,choice,selectionSHA256:createHash('sha256').update(await readFile(join(out,'selection.json'))).digest('hex'),overlappingSeeds:0,summaries});
}
if((await sourceMeta(root)).sha256!==source.sha256)throw Error('Sources changed during the experiment: discard these outputs and rerun.');
/** Bootstrap the maximum-minus-minimum statistic itself, resampling A/B
 * together by independent seed; correlated rotations are averaged first. */
function spreadInterval(report){
 const n=report.config.lineup.length,blocks=[];
 for(let i=0;i<report.config.samples;i++){
  const rows=report.pairs.filter(p=>p.seedIndex===i);
  blocks.push({a:Array.from({length:n},(_,j)=>mean(rows.map(p=>p.a.winShares[j]))),b:Array.from({length:n},(_,j)=>mean(rows.map(p=>p.b.winShares[j])))});
 }
 const spread=v=>Math.max(...v)-Math.min(...v);
 const means=side=>Array.from({length:n},(_,j)=>mean(blocks.map(b=>b[side][j]))),a=means('a'),b=means('b');
 const rng=randomSequence(93409),samples=[];
 for(let r=0;r<600;r++){
  const av=Array(n).fill(0),bv=Array(n).fill(0);
  for(let i=0;i<blocks.length;i++){const block=blocks[Math.floor(rng()*blocks.length)];for(let j=0;j<n;j++){av[j]+=block.a[j]/blocks.length;bv[j]+=block.b[j]/blocks.length;}}
  samples.push(spread(av)-spread(bv));
 }
 samples.sort((a,b)=>a-b);
 return {baseline:spread(a),candidate:spread(b),winsA:a,winsB:b,reduction:{mean:spread(a)-spread(b),low:quantile(samples,.025),high:quantile(samples,.975)},blocks:blocks.length,resamples:600};
}
