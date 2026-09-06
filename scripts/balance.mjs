#!/usr/bin/env node
/** Headless, dependency-free experiments using the exact client reducer. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { DEFAULT_CONFIG, experiment, makeReplay, verifyReplay, toCSV, METRICS } from '../src/lab/core.js';
import { sourceMeta } from './source-meta.mjs';
async function main(){
  const args=process.argv.slice(2),flags={};
  for(let i=0;i<args.length;i++){
    const key=args[i];if(key==='--help'){console.log('npm run balance -- [--experiment casino|mobility|formats|seats] [--config file.json] [--samples 1..2000] [--seed 1..4294967295] [--out lab-results/name] [--replay-out replay.json]\nVerification: npm run balance -- --verify-replay replay.json');return;}
    if(!['--experiment','--config','--samples','--seed','--out','--replay-out','--verify-replay'].includes(key)||flags[key]||!args[i+1]||args[i+1].startsWith('--'))throw Error(`Argument invalide : ${key}`);
    flags[key]=args[++i];
  }
  async function jsonFile(path){const text=await readFile(resolve(path),'utf8');if(text.length>8_000_000)throw Error('Fichier trop volumineux.');return JSON.parse(text);}
  if(flags['--verify-replay']){
    if(Object.keys(flags).length!==1)throw Error('La vérification ne prend aucun autre argument.');
    const state=verifyReplay(await jsonFile(flags['--verify-replay']));console.log(`Rejeu vérifié : ${state.revision} commandes, gagnant(s) ${state.winners.join(', ')}.`);return;
  }
  if(flags['--config']&&flags['--experiment'])throw Error('Choisir --config ou --experiment, pas les deux.');
  const c=flags['--config']?await jsonFile(flags['--config']):structuredClone(DEFAULT_CONFIG),name=flags['--experiment']??'casino';
  if(!['casino','mobility','formats','seats'].includes(name))throw Error('Expérience inconnue.');
  if(!flags['--config']){
    if(name==='mobility'){c.baseline.mobility=0;c.candidate={...c.baseline,mobility:2};}
    if(name==='formats')c.candidate={...c.baseline,rounds:18};
    if(name==='seats'){c.lineup=Array(4).fill('balanced');c.rotateSeats=false;c.candidate={...c.baseline};}
  }
  if(flags['--samples'])c.samples=Number(flags['--samples']);if(flags['--seed'])c.baseSeed=Number(flags['--seed']);
  const run=experiment(c);let step;
  do{step=run.next();if(!step.done&&step.value.completed%100===0)console.error(`${step.value.completed} / ${step.value.total} paires`);}while(!step.done);
  const report={...step.value,source:await sourceMeta(new URL('../',import.meta.url))};
  const out=resolve(flags['--out']??`lab-results/${name}`);await mkdir(dirname(out),{recursive:true});
  await writeFile(out+'.json',JSON.stringify(report,null,2)+'\n');await writeFile(out+'.csv',toCSV(report));
  const {pairs,...summary}=report;await writeFile(out+'-summary.json',JSON.stringify(summary,null,2)+'\n');
  if(flags['--replay-out']){const path=resolve(flags['--replay-out']);await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(makeReplay(c,'candidate'),null,2)+'\n');}
  console.log(JSON.stringify({games:report.gamesAttempted,completed:report.gamesCompleted,independentSeeds:report.method.independentSeeds,failures:report.failures.length,source:report.source.sha256,
    comparisons:Object.fromEntries(Object.keys(METRICS).map(k=>[k,{a:report.metrics[k].a.mean,b:report.metrics[k].b.mean,delta:report.metrics[k].delta}]))},null,2));
  if(report.failures.length)process.exitCode=1;
}
main().catch(e=>{console.error(`Lab : ${e.message}`);process.exitCode=2;});
