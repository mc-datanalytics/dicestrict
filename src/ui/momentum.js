/** Presentation only: goals, public rivalries and session highlights.
 * Never reads RNG, changes rules, sends actions, or grants persistent rewards. */
import { BOARD, GROUPS, RULES } from '../game/board.js';
import { netWorth, ownsGroup, upgradeCost } from '../game/engine.js';
import { tradeable, tradingOpen } from '../game/deals.js';

const lots = BOARD.filter(t => t.kind === 'lot');
const siblings = group => lots.filter(t => t.group === group);
const alivePlayer = (s, id) => s.players.find(p => p.id === id && !p.bankrupt);
const hasMate = (s, owner, tile) => siblings(tile.group).some(t => t.id !== tile.id &&
  s.properties[t.id].owner === owner && !s.properties[t.id].mortgaged);
const owns = (s, id) => lots.filter(t => s.properties[t.id].owner === id);
function districtStatus(s, id) {
  return GROUPS.map((g, group) => ({ group, name:g.name,
    owned:siblings(group).filter(t => s.properties[t.id].owner === id).length,
    total:siblings(group).length, active:ownsGroup(s,id,group) }));
}
function publicRace(s, id) {
  const p=s.players.find(p=>p.id===id);
  if(!p)return null;
  const active=s.players.filter(p=>!p.bankrupt),score=netWorth(s,id);
  const best=Math.max(0,...active.map(q=>netWorth(s,q.id)));
  const leaders=active.filter(q=>netWorth(s,q.id)===best);
  const ahead=active.filter(q=>netWorth(s,q.id)>score).length;
  const tied=active.filter(q=>netWorth(s,q.id)===score).length;
  const rival=active.filter(q=>q.id!==id).sort((a,b)=>netWorth(s,b.id)-netWorth(s,a.id))[0];
  return {score,rank:p.bankrupt?null:ahead+1,tied:!p.bankrupt&&tied>1,
    leader:!p.bankrupt&&score===best,sharedLead:!p.bankrupt&&score===best&&leaders.length>1,
    gap:p.bankrupt?null:best-score,margin:rival?score-netWorth(s,rival.id):0,
    rivalName:rival?.name??null,roundsLeft:Math.max(0,s.maxRounds-s.round+1),
    final:s.phase==='finished',bankrupt:p.bankrupt};
}
/** A draft, never a sent offer. Same reciprocal-completion idea as the bot policy,
 * but available off-turn to humans. Nominal prices are not a promise of fairness. */
function reciprocalOpportunity(s, actor) {
  const p=alivePlayer(s,actor);
  if(!p||!tradingOpen(s)||s.deals.some(d=>d.from===actor)||
    (p.dealBudgetTurn===s.turnSerial&&p.dealsSent>=3))return null;
  const seat=s.players.findIndex(q=>q.id===actor);
  const others=s.players.slice(seat+1).concat(s.players.slice(0,seat));
  for(const other of others){
    if(other.bankrupt)continue;
    for(const give of lots){
      if(!tradeable(s,give.id,actor)||hasMate(s,actor,give)||!hasMate(s,other.id,give))continue;
      for(const take of lots){
        if(take.group===give.group||!tradeable(s,take.id,other.id)||
          hasMate(s,other.id,take)||!hasMate(s,actor,take))continue;
        const difference=take.price-give.price,giveCash=Math.max(0,difference),takeCash=Math.max(0,-difference);
        if(p.cash<giveCash+160||other.cash<takeCash+160)continue;
        const draft={type:'OFFER_DEAL',to:other.id,giveCash,takeCash,giveTiles:[give.id],takeTiles:[take.id]};
        return {key:JSON.stringify(draft),draft,other:other.name,group:take.group,
          otherGroup:give.group,give:give.id,take:take.id};
      }
    }
  }
  return null;
}
function developmentOpportunity(s,id){
  const p=alivePlayer(s,id);
  if(!p||!tradingOpen(s)||s.players[s.turn].id!==id)return null;
  const target=owns(s,id).filter(t=>ownsGroup(s,id,t.group)&&s.properties[t.id].level<RULES.maxLevel&&
    p.cash>=upgradeCost(t.id)&&s.properties[t.id].level===Math.min(...siblings(t.group).map(t=>s.properties[t.id].level)))
    .sort((a,b)=>s.properties[a.id].level-s.properties[b.id].level||upgradeCost(a.id)-upgradeCost(b.id))[0];
  return target?{tile:target.id,cost:upgradeCost(target.id),cashAfter:p.cash-upgradeCost(target.id)}:null;
}
function incomingOffers(s,id){return s.phase==='finished'||!alivePlayer(s,id)?[]:s.deals.filter(d=>d.to===id);}
function soloOfferToReview(s,id,deferred=[]){
  if(!tradingOpen(s)||s.players[s.turn].id===id)return null;
  return incomingOffers(s,id).find(d=>!deferred.includes(d.id))??null;
}
function botThinkDelay(settings,networked=false){
  // Do not speed up other humans' negotiations or change the network protocol.
  return settings.reduced?280:(!networked&&settings.tempo==='quick'?280:750);
}
function currentMilestones(s,id){
  const owned=owns(s,id);
  return {address:owned.length>0,district:GROUPS.some((_,g)=>ownsGroup(s,id,g)),
    develop:owned.some(t=>s.properties[t.id].level>0)};
}
/** Bounded in-memory observation; a resumed game or a revision gap is partial.
 * Old snapshots/duplicate commits cannot produce a second medal or reward. */
class SessionStory{
  constructor(s,id){this.reset(s,id);}
  reset(s,id){
    this.gameId=s.id;this.actor=id;this.revision=s.revision;this.complete=s.revision===0;
    this.stats={purchases:0,developments:0,trades:0,rent:0};
    this.achieved=currentMilestones(s,id);this.moments=[];
  }
  observe(before,after,command){
    if(this.gameId!==after.id){this.reset(after,this.actor);return;}
    if(after.revision<=this.revision)return;
    const continuous=before.id===after.id&&before.revision===this.revision&&after.revision===this.revision+1&&command;
    this.revision=after.revision;
    const now=currentMilestones(after,this.actor),was={...this.achieved};
    for(const k of Object.keys(now))this.achieved[k]||=now[k];
    if(!continuous){this.complete=false;return;}
    const {action,actor}=command,id=this.actor;
    const deal=action.type==='ACCEPT_DEAL'?before.deals.find(d=>d.id===action.dealId):null;
    const myTrade=deal&&(deal.from===id||deal.to===id);
    const myPurchase=(action.type==='BUY'&&actor===id)||(before.auction&&!after.auction&&after.properties[before.auction.tile].owner===id);
    if(myPurchase)this.stats.purchases++;
    if(action.type==='UPGRADE'&&actor===id)this.stats.developments++;
    if(myTrade)this.stats.trades++;
    const playerBefore=before.players.find(p=>p.id===actor);
    const landing=action.type==='MOVE'||(action.type==='ROLL'&&playerBefore?.mobilityTokens===0);
    let rent=0;
    if(landing){
      const tile=after.players.find(p=>p.id===actor)?.position;
      if(before.properties[tile]?.owner===id&&actor!==id){
        rent=Math.max(0,after.players.find(p=>p.id===id).cash-before.players.find(p=>p.id===id).cash);
        this.stats.rent+=rent;
      }
    }
    const priorRace=publicRace(before,id),race=publicRace(after,id);
    let title=null,detail='';
    if(!was.district&&now.district){title='Votre premier quartier !';detail='Deux adresses réunies : développez-les pendant votre tour.';}
    else if(myTrade){title='Accord conclu.';detail='Les terrains et les crédits ont été échangés ensemble.';}
    else if(!was.develop&&now.develop){title='Aurora prend de la hauteur.';detail='Votre premier niveau est construit. Les loyers de ce terrain augmentent.';}
    else if(!priorRace?.leader&&race?.leader){title=race.sharedLead?'Vous rejoignez la tête.':'Vous prenez la tête !';detail='Le classement suit le patrimoine, pas uniquement les crédits disponibles.';}
    else if(myPurchase){title=was.address?'Une nouvelle adresse.':'Votre première adresse !';detail='Réunissez les deux terrains d’un quartier pour pouvoir construire.';}
    else if(action.type==='UPGRADE'&&actor===id){title='Un niveau de plus.';detail='Bâtir augmente les loyers, mais ne crée pas de patrimoine à lui seul.';}
    else if(rent>0){title=`${rent} crédits de loyers encaissés.`;detail='Ces crédits proviennent du passage d’un adversaire sur votre terrain.';}
    if(title)this.moments.unshift({revision:after.revision,title,detail});
    this.moments=this.moments.slice(0,6);
  }
}
export {districtStatus,publicRace,reciprocalOpportunity,developmentOpportunity,incomingOffers,
  soloOfferToReview,botThinkDelay,currentMilestones,SessionStory};
