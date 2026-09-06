import { botProposeDeal } from '../game/negotiator.js';
import { validOpening } from '../game/opening.js';
import { BOARD, RULES, GROUPS } from '../game/board.js';
import { createGame, applyAction, currentPlayer, netWorth, ownsGroup, fingerprint, assertState } from '../game/engine.js';
import { botAction, botDealDecision, BOT_PROFILES } from '../game/bots.js';
import { casinoAvailability, CASINO_STAKES, CASINO_RESERVE } from '../game/casino.js';
import { mean, quantile, seedAt, estimate } from './statistics.js';
const LAB_VERSION=2, POLICY_VERSION=3, MAX_ACTIONS=4000;
const DEFAULT_CONFIG=Object.freeze({baseSeed:20260906,samples:100,rotateSeats:true,lineup:['balanced','prudent','builder','collector'],
  baseline:{rounds:12,mobility:2,finishOnBankruptcy:false,casino:false,casinoPolicy:'none',opening:'classic',negotiation:'none'},
  candidate:{rounds:12,mobility:2,finishOnBankruptcy:false,casino:true,casinoPolicy:'all-60',opening:'classic',negotiation:'none'}});
const METRICS=Object.freeze({rolls:'Tours joués',actions:'Commandes',rounds:'Manches',bankruptcyRate:'Part des joueurs éliminés',
  anyBankruptcy:'Parties avec faillite',levels:'Niveaux construits en fin',owned:'Terrains détenus en fin',
  topWealthShare:'Part du patrimoine du meneur',meanWealth:'Patrimoine moyen final',casinoNet:'Casino : résultat net total',casinoBets:'Mises au casino',dealsProposed:'Offres proposées',dealsAccepted:'Offres acceptées',dealsDeclined:'Offres refusées',tradedLots:'Terrains échangés'});
const fail=(ok,msg)=>{if(!ok)throw Error(msg);};
const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
function exactKeys(obj,keys){return obj&&Object.getPrototypeOf(obj)===Object.prototype&&Object.keys(obj).length===keys.length&&keys.every(k=>Object.hasOwn(obj,k));}
function validateConfig(input){
  input = structuredClone(input);
  // Legacy configuration files get explicit defaults, not legacy game snapshots.
  for (const side of ['baseline','candidate']) if (input?.[side] && typeof input[side] === 'object') {
    input[side].opening ??= 'classic'; input[side].negotiation ??= 'none';
  }
  fail(exactKeys(input,['baseSeed','samples','rotateSeats','lineup','baseline','candidate']),'Configuration du lab invalide.');
  fail(integer(input.baseSeed,1,0xffffffff)&&integer(input.samples,1,2000),'Graine (1…2³²−1) ou nombre de graines (1…2000) invalide.');
  fail(typeof input.rotateSeats==='boolean'&&Array.isArray(input.lineup)&&input.lineup.length>=2&&input.lineup.length<=4&&input.lineup.every(p=>Object.hasOwn(BOT_PROFILES,p)),'Table de bots invalide.');
  for(const side of ['baseline','candidate']){
    const r=input[side];
    fail(exactKeys(r,['rounds','mobility','finishOnBankruptcy','casino','casinoPolicy','opening','negotiation']),'Règles expérimentales inconnues.');
    fail(validOpening(r.opening) && ['none','reciprocal'].includes(r.negotiation), 'Ouverture ou négociation inconnue.');
    fail(integer(r.rounds,4,30)&&integer(r.mobility,0,3)&&typeof r.finishOnBankruptcy==='boolean'&&typeof r.casino==='boolean','Règles hors limites.');
    fail(['none','all-20','all-60','focal-60'].includes(r.casinoPolicy),'Politique casino invalide.');
    fail(r.casino||r.casinoPolicy==='none','Un casino désactivé exige la politique « aucune mise ».');
  }
  return structuredClone(input);
}
function seating(lineup,rotation){return lineup.map((_,seat)=>{const identity=(seat+rotation)%lineup.length;return {id:`p${identity}`,name:`${BOT_PROFILES[lineup[identity]].label} ${identity+1}`,bot:true};});}
function runGame(config,side,seedIndex,rotation,{capture=false,actionLimit=MAX_ACTIONS}={}){
  const rules=config[side],seed=seedAt(config.baseSeed,seedIndex),seats=seating(config.lineup,rotation);
  const initial=createGame(seats,seed,{...rules,id:`lab-${seed}-${rotation}`});
  let s=initial,actions=0,rolls=0,firstDistrictRound=null,firstBankruptcyRound=null,maxLevels=0,dealsProposed=0,dealsAccepted=0,dealsDeclined=0,tradedLots=0;
  const visits=BOARD.map(()=>0),rents=BOARD.map(()=>0),invested=BOARD.map(()=>0),casinoNet=seats.map(()=>0),casinoBets=seats.map(()=>0),trace=[];
  const record={seedIndex,seed,rotation,side,seats:seats.map(p=>({id:p.id,profile:config.lineup[Number(p.id.slice(1))]}))};
  function perform(actor,action){
    if(actions>=actionLimit)throw Error('Plafond de commandes atteint.');
    const before=s,player=before.players.find(p=>p.id===actor);
    s=applyAction(before,actor,action);actions++;
    if(capture)trace.push({actor,action,checksum:fingerprint(s)});
    if(action.type==='ROLL')rolls++;
    if(action.type==='OFFER_DEAL')dealsProposed++;
    if(action.type==='DECLINE_DEAL')dealsDeclined++;
    if(action.type==='ACCEPT_DEAL'){dealsAccepted++;const d=before.deals.find(d=>d.id===action.dealId);tradedLots+=d.giveTiles.length+d.takeTiles.length;}
    if(action.type==='CASINO_BET'){
      const seat=seats.findIndex(p=>p.id===actor),result=s.casino.results.find(r=>r.actor===actor);
      casinoNet[seat]+=result.returned-result.stake;casinoBets[seat]++;
    }
    const landing=action.type==='MOVE'||(action.type==='ROLL'&&player.mobilityTokens===0);
    if(landing){
      const id=s.players.find(p=>p.id===actor).position;visits[id]++;
      const owner=before.properties[id].owner;
      if(owner&&owner!==actor)rents[id]+=s.players.find(p=>p.id===owner).cash-before.players.find(p=>p.id===owner).cash;
    }
    if(action.type==='BUY')invested[before.pending]+=BOARD[before.pending].price;
    if(action.type==='UPGRADE')invested[action.tile]+=player.cash-s.players.find(p=>p.id===actor).cash;
    if(before.auction&&!s.auction&&s.properties[before.auction.tile].owner){
      const owner=s.properties[before.auction.tile].owner;
      invested[before.auction.tile]+=before.players.find(p=>p.id===owner).cash-s.players.find(p=>p.id===owner).cash;
    }
    if(firstDistrictRound===null&&s.players.some(p=>GROUPS.some((_,g)=>ownsGroup(s,p.id,g))))firstDistrictRound=before.round;
    if(firstBankruptcyRound===null&&s.players.some(p=>p.bankrupt))firstBankruptcyRound=before.round;
    maxLevels=Math.max(maxLevels,s.properties.reduce((sum,p)=>sum+p.level,0));
  }
  try{
    while(s.phase!=='finished'){
      // One deterministic opportunity per eligible actor. This does not use the
      // casino RNG, predict a spin, or block the player whose turn it is.
      if(['roll','end'].includes(s.phase)&&rules.casinoPolicy!=='none'){
        for(const peer of s.players){
          if(rules.casinoPolicy==='focal-60'&&peer.id!=='p0')continue;
          const stake=rules.casinoPolicy==='all-20'?20:60;
          if(!casinoAvailability(s,peer.id,stake))perform(peer.id,{type:'CASINO_BET',round:s.round,stake,color:'red'});
        }
      }
      if(rules.negotiation==='reciprocal'){
        const response=botDealDecision(s);
        if(response){perform(response.actor,response.action);continue;}
        const proposer=currentPlayer(s).id,offer=botProposeDeal(s,proposer);
        if(offer){perform(proposer,offer);continue;}
      }
      const actor=currentPlayer(s).id,profile=config.lineup[Number(actor.slice(1))],action=botAction(s,profile);
      fail(action,'Bot sans action légale.');perform(actor,action);
    }
    assertState(s);
  }catch(e){return {...record,status:'failed',error:String(e.message),actions,checksum:fingerprint(s),replay:{initial,trace}};}
  const wealth=s.players.map(p=>netWorth(s,p.id)),total=wealth.reduce((a,b)=>a+b,0);
  const winShares=s.players.map(p=>s.winners.includes(p.id)?1/s.winners.length:0);
  return {...record,status:'completed',endReason:s.endReason,checksum:fingerprint(s),firstDistrictRound,firstBankruptcyRound,maxLevels,
    metrics:{dealsProposed,dealsAccepted,dealsDeclined,tradedLots,rolls,actions,rounds:s.round,bankruptcyRate:s.players.filter(p=>p.bankrupt).length/seats.length,anyBankruptcy:Number(s.players.some(p=>p.bankrupt)),
      levels:s.properties.reduce((n,p)=>n+p.level,0),owned:s.properties.filter(p=>p.owner).length,topWealthShare:total?Math.max(...wealth)/total:0,
      meanWealth:mean(wealth),casinoNet:casinoNet.reduce((a,b)=>a+b,0),casinoBets:casinoBets.reduce((a,b)=>a+b,0)},
    winShares,wealth,casinoNet,casinoBets,visits,rents,invested,
    ...(capture?{replay:{initial,trace}}:{})};
}
function pairedBlocks(pairs,config,getValue){
  const blocks=[];
  for(let seedIndex=0;seedIndex<config.samples;seedIndex++){
    const block=pairs.filter(p=>p.seedIndex===seedIndex);
    // Exclude a whole seed block if ANY rotation/condition failed; never hide it.
    if(block.length!==(config.rotateSeats?config.lineup.length:1)||block.some(p=>p.a.status!=='completed'||p.b.status!=='completed'))continue;
    const a=mean(block.map(p=>getValue(p.a))),b=mean(block.map(p=>getValue(p.b)));
    blocks.push({a,b,delta:b-a});
  }
  return blocks;
}
function compare(blocks){return {a:estimate(blocks.map(b=>b.a)),b:estimate(blocks.map(b=>b.b)),delta:estimate(blocks.map(b=>b.delta))};}
function summarize(config,pairs){
  const metrics=Object.fromEntries(Object.keys(METRICS).map(key=>[key,compare(pairedBlocks(pairs,config,r=>r.metrics[key]))]));
  const winsBySeat=config.lineup.map((_,i)=>({seat:i,...compare(pairedBlocks(pairs,config,r=>r.winShares[i]))}));
  const winsByIdentity=config.lineup.map((profile,i)=>({identity:`p${i}`,profile,...compare(pairedBlocks(pairs,config,r=>r.winShares[r.seats.findIndex(p=>p.id===`p${i}`)]))}));
  const completed=pairs.flatMap(p=>[p.a,p.b]).filter(r=>r.status==='completed');
  const sides={};
  for(const [side,key] of [['baseline','a'],['candidate','b']]){
    const records=pairs.map(p=>p[key]).filter(r=>r.status==='completed');
    const districts=records.filter(r=>r.firstDistrictRound!==null),bankruptcies=records.filter(r=>r.firstBankruptcyRound!==null);
    sides[side]={completed:records.length,
      rollPercentiles:[.1,.5,.9].map(q=>quantile(records.map(r=>r.metrics.rolls).sort((a,b)=>a-b),q)),
      endReasons:Object.fromEntries(['round-cap','first-bankruptcy','last-solvent'].map(x=>[x,records.filter(r=>r.endReason===x).length])),
      firstDistrict:{matches:districts.length,meanRound:mean(districts.map(r=>r.firstDistrictRound))},
      firstBankruptcy:{matches:bankruptcies.length,meanRound:mean(bankruptcies.map(r=>r.firstBankruptcyRound))},
      board:BOARD.map(t=>({id:t.id,name:t.name,kind:t.kind,group:t.group??null,visits:records.reduce((n,r)=>n+r.visits[t.id],0),rentPaid:records.reduce((n,r)=>n+r.rents[t.id],0),invested:records.reduce((n,r)=>n+r.invested[t.id],0)}))};
  }
  const failures=pairs.flatMap(p=>[p.a,p.b]).filter(r=>r.status==='failed');
  const warnings=[
    'Simulations de bots : ni durée humaine en minutes, ni rétention, ni sécurité anti-triche.',
    'Négociation selon la configuration : aucune ou échanges réciproques de paires. Cette politique bornée ne modélise pas des négociations humaines.',
    'Les intervalles sont des bootstraps approximatifs à 95 % par graine ; les rotations corrélées ne sont pas comptées comme indépendantes.',
    'Les tirages A/B commencent avec la même graine ; des trajectoires divergentes peuvent ensuite consommer le hasard différemment.',
  ];
  if(config.samples<100)warnings.push('Moins de 100 graines indépendantes : exploration uniquement.');
  if(!config.rotateSeats&&new Set(config.lineup).size>1)warnings.push('Sans rotation avec des profils différents, ordre de passage et stratégie sont confondus.');
  if(new Set(config.lineup).size===1&&config.rotateSeats)warnings.push('Profils identiques : les rotations répètent la même politique. Le nombre de graines, pas de parties, mesure l’échantillon.');
  if(failures.length)warnings.push(`${failures.length} parties en échec ; les blocs concernés sont exclus des comparaisons et conservés dans les données.`);
  return {schema:'dicestrict-balance-report',labVersion:LAB_VERSION,engineVersion:RULES.version,policyVersion:POLICY_VERSION,config,
    method:{seedGenerator:'mix32-v1',resamples:600,interval:'paired seed-block percentile bootstrap 95%',tieHandling:'1 / nombre de vainqueurs',independentSeeds:metrics.rolls.a.blocks,paired:true},
    rulesSnapshot:{rules:RULES,board:BOARD,policies:BOT_PROFILES,casino:{stakes:CASINO_STAKES,reserve:CASINO_RESERVE,expectedNetPerStake:-1/37}},
    gamesAttempted:pairs.length*2,gamesCompleted:completed.length,failures:failures.map(({replay,...r})=>r),metrics,winsBySeat,winsByIdentity,sides,warnings,pairs};
}
/** Yield after each pair: usable from a Worker or a Node CLI without a live match. */
function* experiment(input){
  const config=validateConfig(input),pairs=[],rotations=config.rotateSeats?config.lineup.length:1,total=config.samples*rotations;
  for(let seedIndex=0;seedIndex<config.samples;seedIndex++)for(let rotation=0;rotation<rotations;rotation++){
    const a=runGame(config,'baseline',seedIndex,rotation),b=runGame(config,'candidate',seedIndex,rotation);
    pairs.push({seedIndex,rotation,a,b});yield {completed:pairs.length,total,failures:pairs.reduce((n,p)=>n+Number(p.a.status==='failed')+Number(p.b.status==='failed'),0)};
  }
  return summarize(config,pairs);
}
function runExperiment(config){const run=experiment(config);let step;do{step=run.next();}while(!step.done);return step.value;}
function makeReplay(input,side,seedIndex=0,rotation=0){
  const config=validateConfig(input);
  fail(['baseline','candidate'].includes(side)&&integer(seedIndex,0,config.samples-1)&&integer(rotation,0,config.rotateSeats?config.lineup.length-1:0),'Sélection du rejeu invalide.');
  const result=runGame(config,side,seedIndex,rotation,{capture:true});
  fail(result.status==='completed',result.error??'Rejeu incomplet.');
  return {schema:'dicestrict-lab-replay',labVersion:LAB_VERSION,engineVersion:RULES.version,policyVersion:POLICY_VERSION,config,side,seedIndex,rotation,...result.replay,finalChecksum:result.checksum};
}
function verifyReplay(replay){
  fail(replay?.schema==='dicestrict-lab-replay'&&replay.labVersion===LAB_VERSION&&replay.engineVersion===RULES.version&&replay.policyVersion===POLICY_VERSION,'Version de rejeu incompatible.');
  const config=validateConfig(replay.config);
  fail(['baseline','candidate'].includes(replay.side)&&integer(replay.seedIndex,0,config.samples-1)&&integer(replay.rotation,0,config.rotateSeats?config.lineup.length-1:0),'En-tête de rejeu invalide.');
  const seats=seating(config.lineup,replay.rotation),seed=seedAt(config.baseSeed,replay.seedIndex);
  let s=createGame(seats,seed,{...config[replay.side],id:`lab-${seed}-${replay.rotation}`});
  fail(JSON.stringify(s)===JSON.stringify(replay.initial),'État initial altéré.');
  fail(Array.isArray(replay.trace)&&replay.trace.length>0&&replay.trace.length<=MAX_ACTIONS,'Longueur de rejeu invalide.');
  for(const command of replay.trace){s=applyAction(s,command.actor,command.action);fail(fingerprint(s)===command.checksum,'Divergence dans le rejeu.');}
  fail(s.phase==='finished'&&fingerprint(s)===replay.finalChecksum,'Rejeu non terminé ou empreinte altérée.');
  return s;
}
function toCSV(report){
  const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
  const keys=Object.keys(METRICS),lines=[['seedIndex','seed','rotation','condition','status','error','endReason',...keys,'checksum']];
  for(const pair of report.pairs)for(const r of [pair.a,pair.b])lines.push([r.seedIndex,r.seed,r.rotation,r.side,r.status,r.error??'',r.endReason??'',...keys.map(k=>r.metrics?.[k]??''),r.checksum]);
  return lines.map(row=>row.map(quote).join(',')).join('\n')+'\n';
}
export { LAB_VERSION, POLICY_VERSION, MAX_ACTIONS, DEFAULT_CONFIG, METRICS, validateConfig, seating, runGame, summarize, experiment, runExperiment, makeReplay, verifyReplay, toCSV };
