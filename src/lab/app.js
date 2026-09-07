import { verifyPlaytest } from '../game/playtest.js';
import { OPENINGS } from '../game/opening.js';
import { DEFAULT_CONFIG, METRICS, validateConfig, toCSV, verifyReplay } from './core.js';
import { BOT_PROFILES } from '../game/bots.js';
import { BOARD } from '../game/board.js';
import { applyAction, netWorth, fingerprint } from '../game/engine.js';
import { BoardScene } from '../scene/board-scene.js';
const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(x,d=1)=>x===null||x===undefined?'—':new Intl.NumberFormat('fr-FR',{maximumFractionDigits:d}).format(x);
const percentKeys=['bankruptcyRate','anyBankruptcy','topWealthShare'];
const fmt=(x,key)=>percentKeys.includes(key)?`${num(x===null?null:x*100)} %`:num(x);
const interval=(e,pct=false)=>e.low===null?'Échantillon insuffisant':`[${num(e.low*(pct?100:1))} ; ${num(e.high*(pct?100:1))}]${pct?' points':''}`;
const ui={worker:null,workerURL:null,report:null,replay:null,scene:null,busy:false,config:null};
function options(selected){return Object.entries(BOT_PROFILES).map(([id,p])=>`<option value="${id}" ${id===selected?'selected':''}>${p.label}</option>`).join('');}
function lineups(list){$('lineup').innerHTML=list.map((p,i)=>`<label class="lineup-label"><span>Identité ${i+1}</span><select id="policy-${i}">${options(p)}</select></label>`).join('');}
function controls(side,r){$(side+'-controls').innerHTML=`<fieldset id="${side}-fields"><div class="rule-grid"><label class="wide">Ouverture<select id="${side}-opening">${Object.entries(OPENINGS).map(([id,o])=>`<option value="${id}" ${id===(r.opening??'classic')?'selected':''}>${o.label}</option>`).join('')}</select></label><label class="wide">Négociations des bots<select id="${side}-negotiation"><option value="none">Aucune proposition</option><option value="reciprocal" ${r.negotiation==='reciprocal'?'selected':''}>Échanges réciproques de paires</option></select></label><label>Manches maximum<input id="${side}-rounds" type="number" min="4" max="30" step="1" value="${r.rounds}" required></label><label class="wide check"><input id="${side}-bankruptcy" type="checkbox" ${r.finishOnBankruptcy?'checked':''}>Fin commune à la première faillite</label><label class="wide">Casino · crédits de partie<select id="${side}-casino"><option value="off">Désactivé</option><option value="none">Activé · personne ne mise</option><option value="all-20">Tous les bots · 20 crédits / manche</option><option value="all-60">Tous les bots · 60 crédits / manche</option><option value="focal-60">Identité 1 seule · 60 crédits / manche</option></select></label></div></fieldset>`;$(side+'-casino').value=r.casino?r.casinoPolicy:'off';}
function readConfig(){
  const rule=side=>({opening:$(side+'-opening').value,negotiation:$(side+'-negotiation').value,rounds:Number($(side+'-rounds').value),finishOnBankruptcy:$(side+'-bankruptcy').checked,casino:$(side+'-casino').value!=='off',casinoPolicy:$(side+'-casino').value==='off'?'none':$(side+'-casino').value});
  return validateConfig({baseSeed:Number($('seed').value),samples:Number($('samples').value),rotateSeats:$('rotate').checked,lineup:Array.from({length:Number($('player-count').value)},(_,i)=>$('policy-'+i).value),baseline:rule('baseline'),candidate:rule('candidate')});
}
function changed(){
  try{const c=readConfig();$('planned-games').textContent=num(c.samples*(c.rotateSeats?c.lineup.length:1)*2,0);$('changed').hidden=!ui.report||JSON.stringify(c)===JSON.stringify(ui.report.config);}catch{$('planned-games').textContent='—';}
}
function preset(name){
  const c=structuredClone(DEFAULT_CONFIG);
  if(name==='formats')c.candidate={...c.baseline,rounds:18};
  if(name==='opening'){c.lineup=Array(4).fill('balanced');c.rotateSeats=false;c.candidate={...c.baseline,opening:'comp-60'};}
  if(name==='seats'){c.lineup=['balanced','balanced','balanced','balanced'];c.rotateSeats=false;c.candidate={...c.baseline};}
  $('player-count').value=c.lineup.length;$('rotate').checked=c.rotateSeats;lineups(c.lineup);controls('baseline',c.baseline);controls('candidate',c.candidate);changed();
}
function setBusy(busy){ui.busy=busy;$('import-playtest').disabled=busy;for(const id of ['run-fields','baseline-fields','candidate-fields'])$(id).disabled=busy;$('run').disabled=busy;$('stop').hidden=!busy;$('load-replay').disabled=busy||!ui.report;$('export-config').disabled=busy;}
function stopWorker(){ui.worker?.terminate();ui.worker=null;if(ui.workerURL)URL.revokeObjectURL(ui.workerURL);ui.workerURL=null;}
function worker(){
  stopWorker();
  if(globalThis.DICESTRICT_LAB_WORKER){ui.workerURL=URL.createObjectURL(new Blob([globalThis.DICESTRICT_LAB_WORKER],{type:'text/javascript'}));ui.worker=new Worker(ui.workerURL);}
  else ui.worker=new Worker('./src/lab/worker.js',{type:'module'});
  ui.worker.onerror=e=>{e.preventDefault();$('status').textContent='Échec du Worker : '+(e.message||'calcul interrompu');stopWorker();setBusy(false);};
  ui.worker.onmessage=({data})=>{
    if(data.type==='progress'){$('progress').value=data.completed/data.total;$('status').textContent=`${num(data.completed*2,0)} / ${num(data.total*2,0)} parties calculées · ${data.failures} échec(s).`;}
    if(data.type==='error'){$('status').textContent='Échec : '+data.message;stopWorker();setBusy(false);}
    if(data.type==='done'){ui.report=data.report;stopWorker();setBusy(false);renderReport();}
    if(data.type==='replay'){stopWorker();setBusy(false);try{showReplay(data.replay);}catch(e){$('status').textContent='Rejeu refusé : '+e.message;}}
  };
  return ui.worker;
}
function renderReport(){
  const r=ui.report;$('progress').value=1;$('changed').hidden=true;
  $('status').textContent=`Terminé : ${num(r.gamesCompleted,0)} / ${num(r.gamesAttempted,0)} parties · ${r.method.independentSeeds} graines comparables · ${r.failures.length} échec(s).`;
  $('overview').innerHTML=[['PARTIES TERMINÉES',num(r.gamesCompleted,0),`${r.method.independentSeeds} graines indépendantes`],['TOURS JOUÉS · B',num(r.metrics.rolls.b.mean),'Moyenne · pas des minutes'],['JOUEURS ÉLIMINÉS · B',fmt(r.metrics.bankruptcyRate.b.mean,'bankruptcyRate'),'Part moyenne des joueurs'],['NIVEAUX CONSTRUITS · B',num(r.metrics.levels.b.mean),'Moyenne en fin de partie']].map(([title,value,sub])=>`<article><span>${title}</span><strong>${value}</strong><small>${sub}</small></article>`).join('');
  $('seat-chart').style.gridTemplateColumns=`repeat(${r.config.lineup.length},minmax(0,1fr))`;
  if(innerWidth<1080)$('seat-chart').style.gridTemplateColumns='repeat(2,minmax(0,1fr))';
  $('seat-chart').innerHTML=r.winsBySeat.map(w=>`<div class="seat"><div class="seat-title">${w.seat+1}${w.seat===0?'er':'e'} siège</div>${['a','b'].map(k=>`<div class="bar-row"><span>${k.toUpperCase()}</span><div class="bar-track" style="--fair:${100/r.config.lineup.length}%"><i class="${k}" style="width:${(w[k].mean??0)*100}%"></i></div><b>${num(w[k].mean===null?null:w[k].mean*100)} %</b></div>`).join('')}<small>B − A : ${num(w.delta.mean===null?null:w.delta.mean*100)} pts<br>${interval(w.delta,true)}</small></div>`).join('');
  $('metrics').querySelector('tbody').innerHTML=Object.entries(METRICS).map(([key,label])=>{const m=r.metrics[key];return `<tr><td>${label}</td><td>${fmt(m.a.mean,key)}</td><td>${fmt(m.b.mean,key)}</td><td>${percentKeys.includes(key)?num(m.delta.mean===null?null:m.delta.mean*100)+' pts':num(m.delta.mean)}<small>${interval(m.delta,percentKeys.includes(key))}</small></td></tr>`;}).join('');
  $('policies').innerHTML=r.winsByIdentity.map(w=>`<div class="policy"><strong>${esc(BOT_PROFILES[w.profile].label)}</strong><small>Identité ${Number(w.identity.slice(1))+1} · part de victoire</small><b>${num(w.b.mean===null?null:w.b.mean*100)} %</b><span>A : ${num(w.a.mean===null?null:w.a.mean*100)} %</span><small><br>Δ : ${interval(w.delta,true)}</small></div>`).join('');
  const tiles=r.sides.candidate.board,max=Math.max(1,...tiles.map(t=>t.rentPaid));
  $('heatmap').innerHTML=tiles.map(t=>`<div class="tile" style="--tile:${BOARD[t.id].color};--heat:${.04+.35*t.rentPaid/max}"><span>${String(t.id+1).padStart(2,'0')}</span><strong>${esc(t.name)}</strong><small>${num(t.visits,0)} arrivées</small><small>${num(t.rentPaid,0)} C de loyers</small></div>`).join('');
  $('warnings').innerHTML=r.warnings.map(w=>`<li>${esc(w)}</li>`).join('');
  $('source-info').textContent=`Moteur v${r.engineVersion} · politiques v${r.policyVersion} · lab v${r.labVersion}. Source SHA-256 : ${r.source?.sha256??'développement non empreinté — utiliser npm run build:lab pour figer les sources'}.`;
  $('replay-seed').max=r.config.samples-1;$('replay-rotation').max=r.config.rotateSeats?r.config.lineup.length-1:0;$('replay-seed').value=0;$('replay-rotation').value=0;
  for(const id of ['export-json','export-csv','load-replay'])$(id).disabled=false;
}
function showReplay(replay){
  if(replay.schema==='dicestrict-playtest')verifyPlaytest(replay);else verifyReplay(replay);ui.replay=replay;$('export-replay').disabled=false;
  document.querySelector('.replay-stage').hidden=false;$('replay-controls').hidden=false;$('replay-step').max=replay.trace.length;$('replay-step').value=0;
  if(!ui.scene){try{ui.scene=new BoardScene($('replay-canvas'),id=>{$('replay-log').textContent=`Case ${id+1} · ${BOARD[id].name}. Rejeu en lecture seule.`;},message=>{$('replay-fallback').hidden=false;$('replay-fallback').textContent=message;});ui.scene.configure({reduced:true,living:false,dayMode:'day',quality:'low',weather:false});}catch(e){$('replay-fallback').hidden=false;$('replay-fallback').textContent='3D indisponible. Le journal et les capitaux restent consultables : '+e.message;}}
  renderReplay();$('status').textContent=replay.schema==='dicestrict-playtest'?'Trace locale vérifiée · provenance humaine NON certifiée · exclue des statistiques A/B.':'Rejeu vérifié : chaque commande et son empreinte correspondent au moteur.';
}
function renderReplay(){
  const r=ui.replay;if(!r)return;const step=Number($('replay-step').value);let s=r.initial;
  for(let i=0;i<step;i++)s=applyAction(s,r.trace[i].actor,r.trace[i].action);
  ui.scene?.setState(s);$('replay-position').textContent=`${step} / ${r.trace.length}`;$('replay-position').dataset.checksum=fingerprint(s);
  $('replay-log').textContent=`${r.schema==='dicestrict-playtest'?'Essai local · provenance non certifiée':`${r.side==='candidate'?'B':'A'} · graine ${r.seedIndex}, rotation ${r.rotation}`} · manche ${s.round} · ${step?s.log[0]?.text:'Ouverture de la partie.'}`;
  $('replay-players').innerHTML=s.players.map(p=>`<div class="policy"><strong>${esc(p.name)}</strong><b>${num(p.cash,0)} C</b><small>${p.bankrupt?'Éliminé':`Patrimoine : ${num(netWorth(s,p.id),0)} C`}</small></div>`).join('');
  $('previous').disabled=step===0;$('next').disabled=step===r.trace.length;
}
function download(name,text,type='application/json'){
  const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('experiment-form').addEventListener('submit',e=>{e.preventDefault();try{
  const c=readConfig();if(c.samples>500)throw Error('Le navigateur est limité à 500 graines ; utilisez la CLI au-delà.');
  ui.config=c;ui.scene?.destroy();ui.scene=null;ui.replay=null;document.querySelector('.replay-stage').hidden=true;$('replay-controls').hidden=true;$('export-replay').disabled=true;
  setBusy(true);$('progress').value=0;$('status').textContent='Simulation en cours…';worker().postMessage({type:'run',config:c});
}catch(error){$('status').textContent=error.message;setBusy(false);}});
$('stop').addEventListener('click',()=>{stopWorker();setBusy(false);$('status').textContent='Calcul arrêté. Aucun résultat partiel n’est présenté comme un rapport terminé.';changed();});
$('player-count').addEventListener('change',()=>lineups(DEFAULT_CONFIG.lineup.slice(0,Number($('player-count').value))));
$('experiment-preset').addEventListener('change',()=>preset($('experiment-preset').value));
document.addEventListener('input',e=>{if(e.target.closest('#experiment-form,.conditions'))changed();});
document.addEventListener('change',e=>{if(e.target.closest('#experiment-form,.conditions'))changed();});
$('export-config').addEventListener('click',()=>{try{download('dicestrict-experiment.json',JSON.stringify(readConfig(),null,2));}catch(e){$('status').textContent=e.message;}});
$('export-json').addEventListener('click',()=>download('dicestrict-balance-report.json',JSON.stringify(ui.report,null,2)));
$('export-csv').addEventListener('click',()=>download('dicestrict-balance-data.csv',toCSV(ui.report),'text/csv;charset=utf-8'));
$('export-replay').addEventListener('click',()=>download('dicestrict-lab-replay.json',JSON.stringify(ui.replay,null,2)));
$('load-replay').addEventListener('click',()=>{if(!ui.report)return;setBusy(true);$('status').textContent='Vérification du rejeu…';worker().postMessage({type:'replay',config:ui.report.config,side:$('replay-side').value,seedIndex:Number($('replay-seed').value),rotation:Number($('replay-rotation').value)});});
$('replay-step').addEventListener('input',renderReplay);
for(const [id,delta] of [['previous',-1],['next',1]])$(id).addEventListener('click',()=>{$('replay-step').value=Number($('replay-step').value)+delta;renderReplay();});
$('import-playtest').addEventListener('change',async e=>{try{const file=e.target.files?.[0];if(!file)return;if(file.size>8_000_000)throw Error('Trace trop volumineuse.');const trace=JSON.parse(await file.text());verifyPlaytest(trace);showReplay(trace);}catch(error){$('status').textContent='Trace refusée : '+error.message;}finally{e.target.value='';}});
window.addEventListener('pagehide',()=>{stopWorker();ui.scene?.destroy();});
preset('casino');
export { ui, readConfig };
