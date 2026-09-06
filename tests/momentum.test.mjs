import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, applyAction, assertState, fingerprint } from '../src/game/engine.js';
import { App } from '../src/ui/app.js';
import { SessionStory, publicRace, reciprocalOpportunity, developmentOpportunity, districtStatus,
  soloOfferToReview, botThinkDelay } from '../src/ui/momentum.js';
import { storyMarkup, raceCopy } from '../src/ui/momentum-view.js';
import { DEFAULT_CONFIG, runGame } from '../src/lab/core.js';
const seats=[{id:'you',name:'Vous'},{id:'nova',name:'Nova',bot:true},{id:'sacha',name:'Sacha',bot:true},{id:'milo',name:'Milo',bot:true}];
const game=()=>createGame(seats,42,{id:'momentum',rounds:12,mobility:2});
function exchange(){const s=game();s.properties[1].owner='you';s.properties[4].owner='you';s.properties[2].owner='nova';s.properties[5].owner='nova';return assertState(s);}
function freeze(o){if(o&&typeof o==='object'){for(const v of Object.values(o))freeze(v);Object.freeze(o);}return o;}
function buy(s,id=1){s=structuredClone(s);s.players[s.turn].position=id;s.pending=id;s.phase='buy';return s;}
function offer(s=exchange()){
 s.turn=1;const d={type:'OFFER_DEAL',to:'you',giveTiles:[2],takeTiles:[4],giveCash:20,takeCash:0};
 return applyAction(s,'nova',d);
}
test('momentum: tied starting players are not falsely ranked by array order',()=>{
 const s=game();for(const p of s.players){const r=publicRace(s,p.id);assert.equal(r.rank,1);assert.equal(r.tied,true);assert.equal(r.gap,0);assert.match(raceCopy(r),/Égalité/);}
 s.players[1].cash+=100;assert.equal(publicRace(s,'you').rank,2);assert.equal(publicRace(s,'you').gap,100);assert.equal(publicRace(s,'nova').margin,100);
});
test('momentum: bankrupt players have no rank or imaginary comeback objective',()=>{
 const s=game();s.players[0].bankrupt=true;s.players[0].cash=0;const r=publicRace(s,'you');assert.equal(r.rank,null);assert.equal(r.bankrupt,true);assert.equal(r.gap,null);assert.equal(reciprocalOpportunity(s,'you'),null);
});
test('momentum: off-turn draft uses public properties and is legal without changing the state',()=>{
 const s=exchange();s.turn=2;freeze(s);const before=fingerprint(s);const o=reciprocalOpportunity(s,'you');
 assert.equal(o.other,'Nova');assert.equal(o.group,1);assert.deepEqual(o.draft.giveTiles,[1]);assert.deepEqual(o.draft.takeTiles,[5]);
 const next=applyAction(s,'you',o.draft);assert.equal(next.deals.length,1);assert.equal(next.turn,2);assert.equal(fingerprint(s),before);
});
test('momentum: no future dice or casino RNG are consulted by any recommendation',()=>{
 const s=exchange();Object.defineProperty(s,'rng',{get(){throw Error('Future randomness accessed');}});Object.defineProperty(s,'casino',{get(){throw Error('Casino accessed');}});
 assert.ok(reciprocalOpportunity(s,'you'));assert.ok(publicRace(s,'you'));assert.equal(districtStatus(s,'you')[0].owned,1);assert.equal(developmentOpportunity(s,'you'),null);
});
test('momentum: mortgaged, built, insolvent or quota-exhausted proposals are not advertised',()=>{
 for(const change of [s=>s.properties[4].mortgaged=true,s=>s.properties[4].level=1,s=>s.players[0].cash=159,s=>{s.players[0].dealBudgetTurn=0;s.players[0].dealsSent=3;}]){
  const s=exchange();change(s);assert.equal(reciprocalOpportunity(s,'you'),null);
 }
 const s=applyAction(exchange(),'you',reciprocalOpportunity(exchange(),'you').draft);assert.equal(reciprocalOpportunity(s,'you'),null);
});
test('momentum: unsafe transaction phases never offer a ready-to-submit draft',()=>{
 for(const phase of ['choose','buy','auction','finished']){const s=exchange();s.phase=phase;assert.equal(reciprocalOpportunity(s,'you'),null);}
});
test('momentum: investment hint respects the full group, turn, level and actual available cash',()=>{
 const s=game();s.properties[1].owner=s.properties[2].owner='you';
 let o=developmentOpportunity(s,'you');assert.equal(o.tile,1);assert.equal(o.cost,60);assert.equal(o.cashAfter,1740);assert.equal(applyAction(s,'you',{type:'UPGRADE',tile:o.tile}).properties[1].level,1);
 s.properties[1].level=1;o=developmentOpportunity(s,'you');assert.equal(o.tile,2);
 s.players[0].cash=69;assert.equal(developmentOpportunity(s,'you'),null);s.turn=1;assert.equal(developmentOpportunity(s,'you'),null);
});
test('momentum: an addressed off-turn offer holds solo until reviewed or explicitly deferred',()=>{
 const s=offer();assert.equal(soloOfferToReview(s,'you')?.id,1);assert.equal(soloOfferToReview(s,'you',[1]),null);
 const a=Object.create(App.prototype);Object.assign(a,{state:s,localId:'you',deferredOffers:[],session:null});assert.ok(a.offerHold());a.session={isHost:true};assert.equal(a.offerHold(),null);
});
test('momentum: dynamic solo tempo does not change multiplayer timing or motion preference',()=>{
 assert.equal(botThinkDelay({tempo:'quick',reduced:false}),280);assert.equal(botThinkDelay({tempo:'calm',reduced:false}),750);
 assert.equal(botThinkDelay({tempo:'quick',reduced:false},true),750);assert.equal(botThinkDelay({tempo:'calm',reduced:true},true),280);
});
test('momentum: scheduler really stops on a human offer without creating a timer',t=>{
 const previous=globalThis.document;globalThis.document={hidden:false,querySelector:()=>({open:false})};t.after(()=>{globalThis.document=previous;});
 const a=Object.create(App.prototype);Object.assign(a,{state:offer(),localId:'you',deferredOffers:[],settings:{tempo:'quick'},session:null});
 a.scheduleBot();assert.equal(a.botTimer,undefined);a.deferredOffers=[1];a.scheduleBot();assert.ok(a.botTimer);clearTimeout(a.botTimer);
});
test('momentum: observed acquisitions are counted once, despite duplicate final/snapshot updates',()=>{
 const before=buy(game()),story=new SessionStory(before,'you');const after=applyAction(before,'you',{type:'BUY'});
 story.observe(before,after,{actor:'you',action:{type:'BUY'}});story.observe(before,after,{actor:'you',action:{type:'BUY'}});
 assert.equal(story.stats.purchases,1);assert.equal(story.moments.length,1);assert.equal(story.achieved.address,true);
});
test('momentum: a reciprocal acceptance counts for both parties and unlocks the real district milestone',()=>{
 const s=offer(),next=applyAction(s,'you',{type:'ACCEPT_DEAL',dealId:1});
 for(const id of ['you','nova']){const story=new SessionStory(s,id);story.observe(s,next,{actor:'you',action:{type:'ACCEPT_DEAL',dealId:1}});assert.equal(story.stats.trades,1);assert.equal(story.achieved.district,true);}
});
test('momentum: resumed states, missing commands and revision gaps are explicitly partial',()=>{
 const s=buy(game());s.revision=5;const story=new SessionStory(s,'you');assert.equal(story.complete,false);
 const fromStart=new SessionStory(game(),'you'),jump=game();jump.revision=3;fromStart.observe(game(),jump,null);assert.equal(fromStart.complete,false);assert.equal(fromStart.stats.purchases,0);
 assert.match(storyMarkup({state:s,localId:'you',story}),/Bilan partiel/);
});
test('momentum: a rematch clears milestones, event history and session counters',()=>{
 const s=buy(game()),story=new SessionStory(s,'you');const next=applyAction(s,'you',{type:'BUY'});story.observe(s,next,{actor:'you',action:{type:'BUY'}});
 const fresh=game();fresh.id='new';story.observe(next,fresh,null);assert.equal(story.gameId,'new');assert.equal(story.stats.purchases,0);assert.equal(story.moments.length,0);assert.equal(story.achieved.address,false);
});
test('momentum: readonly observer and guidance leave 40 complete lab trajectories byte-identical',()=>{
 const config=structuredClone(DEFAULT_CONFIG);config.samples=5;config.candidate.negotiation='reciprocal';config.baseline.negotiation='reciprocal';
 let actions=0;
 for(let seed=0;seed<5;seed++)for(const side of ['baseline','candidate'])for(let rot=0;rot<4;rot++){
  const run=runGame(config,side,seed,rot,{capture:true});assert.equal(run.status,'completed');let state=run.replay.initial;const id=state.players[0].id,story=new SessionStory(state,id);
  for(const step of run.replay.trace){const previous=state;state=applyAction(previous,step.actor,step.action);freeze(state);story.observe(previous,state,step);publicRace(state,id);districtStatus(state,id);reciprocalOpportunity(state,id);developmentOpportunity(state,id);assert.equal(fingerprint(state),step.checksum);actions++;}
  assert.equal(fingerprint(state),run.checksum);assert.equal(story.complete,true);assert.ok(story.moments.length<=6);
 }
 assert.ok(actions>1000);
});
test('momentum: stale opportunity clicks do not send an action or overwrite the current draft',()=>{
 const a=Object.create(App.prototype),s=exchange(),proposal=reciprocalOpportunity(s,'you');let warned=false,sent=false;
 Object.assign(a,{state:s,localId:'you',session:null,render(){},toast(){warned=true;},act(){sent=true;}});
 a.momentumAction({dataset:{momentum:'trade',match:'a-different-game',key:proposal.key}});assert.ok(warned);assert.equal(sent,false);
});
