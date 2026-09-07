import test from 'node:test';
import assert from 'node:assert/strict';
import { BOARD } from '../src/game/board.js';
import { createGame, applyAction, currentPlayer, assertState, fingerprint } from '../src/game/engine.js';
import { botAction, botDealDecision } from '../src/game/bots.js';
import { tradeable } from '../src/game/deals.js';
import { PRESETS, matchOptions } from '../src/game/presets.js';
import { RoomSession } from '../src/network/rtc.js';
import { readPacket, packet } from '../src/network/protocol.js';
const seats=[{id:'a',name:'Alice'},{id:'b',name:'Bob'},{id:'c',name:'Camille'}];
const game=(options={})=>createGame(seats,42,{id:'test-feedback',...options});
const owned=()=>{const s=game();s.properties[1].owner='a';s.properties[4].owner='b';return s;};
const offer=(extra={})=>({type:'OFFER_DEAL',to:'b',giveCash:30,takeCash:0,giveTiles:[1],takeTiles:[4],...extra});
const totalCash=s=>s.players.reduce((sum,p)=>sum+p.cash,0);
const change=(s,id,action)=>applyAction(s,id,action);

test('movement: a single roll resolves the exact dice total immediately',()=>{
 const s=game(), before=JSON.stringify(s), next=change(s,'a',{type:'ROLL'});
 assert.deepEqual(next.dice,[6,4]);assert.equal(next.players[0].position,10);
 assert.equal(next.phase,'end');assert.notEqual(next.event,null);
 assert.equal(next.revision,1);assert.equal(JSON.stringify(s),before);
});
test('movement: no route choice or token exists in any preset',()=>{
 for(const preset of PRESETS){const s=game(matchOptions(preset.id));
  assert.equal(Object.hasOwn(s,'mobility'),false);
  assert.ok(s.players.every(p=>!Object.hasOwn(p,'mobilityTokens')));
  const next=change(s,'a',{type:'ROLL'});
  assert.equal(next.players[0].position,next.dice[0]+next.dice[1]);assert.notEqual(next.phase,'choose');
 }
});
test('movement: crossing start pays exactly once, with no extra click',()=>{
 const s=game();s.players[0].position=27;
 const next=change(s,'a',{type:'ROLL'});
 assert.equal(next.players[0].position,9);assert.equal(next.phase,'buy');
 assert.equal(next.players[0].cash,2020);assert.equal(next.log.filter(x=>x.text.includes('passe le départ')).length,1);
 assert.throws(()=>change(next,'a',{type:'ROLL'}));
});
test('movement: removed commands, offsets, other actors and supplied dice are rejected',()=>{
 const s=game();assert.throws(()=>change(s,'b',{type:'ROLL'}));
 for(const action of [{type:'MOVE',offset:0},{type:'MOVE',offset:1},{type:'ROLL',offset:-1},{type:'ROLL',dice:[6,6]}])assert.throws(()=>change(s,'a',action));
});
test('movement: legacy config, state fields and pending choice cannot be smuggled into v6',()=>{
 for(const tokens of [0,2,null,undefined])assert.throws(()=>game({mobility:tokens}));
 for(const mutate of [s=>s.mobility=0,s=>s.players[0].mobilityTokens=0,s=>s.phase='choose',s=>s.version=5]){
  const s=game();mutate(s);assert.throws(()=>assertState(s));
 }
});
test('deals: can be proposed and accepted off-turn, preserving cash and immutability',()=>{
 const s=owned();s.turn=2;const offered=change(s,'a',offer());
 assert.equal(offered.players[0].cash,1800);assert.equal(offered.properties[1].owner,'a');assert.equal(offered.phase,'roll');
 const next=change(offered,'b',{type:'ACCEPT_DEAL',dealId:1});
 assert.equal(next.properties[1].owner,'b');assert.equal(next.properties[4].owner,'a');assert.equal(next.players[0].cash,1770);assert.equal(next.players[1].cash,1830);
 assert.equal(totalCash(next),totalCash(s));assert.equal(next.turn,2);assert.equal(offered.deals.length,1);assert.equal(next.deals.length,0);
});
test('deals: only addressee can accept/decline, only author can cancel, never twice',()=>{
 const s=change(owned(),'a',offer());
 for(const [who,type] of [['a','ACCEPT_DEAL'],['c','DECLINE_DEAL'],['b','CANCEL_DEAL']])assert.throws(()=>change(s,who,{type,dealId:1}));
 const next=change(s,'b',{type:'ACCEPT_DEAL',dealId:1});assert.throws(()=>change(next,'b',{type:'ACCEPT_DEAL',dealId:1}));
});
test('deals: strict payload rejects duplications, gifts, self-trades, forged fields',()=>{
 for(const a of [offer({giveTiles:[1,1]}),offer({takeTiles:[1]}),offer({giveCash:-1}),offer({giveCash:.5}),offer({to:'a'}),offer({from:'b'}),offer({giveCash:NaN}),offer({takeCash:0,takeTiles:[]}),offer({giveTiles:[],takeTiles:[]}),offer({takeTiles:[0]})])assert.throws(()=>change(owned(),'a',a));
});
test('deals: blocked during auctions/landing decisions to prevent moving target prices',()=>{
 const s=owned();s.phase='buy';s.pending=2;s.players[0].position=2;
 assert.throws(()=>change(s,'b',offer({to:'a',giveTiles:[4],takeTiles:[1]})));
 const auction=change(s,'a',{type:'SKIP'});assert.throws(()=>change(auction,'a',offer()));
 const finished=owned();finished.phase='finished';finished.endReason='round-cap';finished.winners=['a'];
 assert.throws(()=>change(finished,'a',offer()));
});
test('deals: mortgages and any buildings in the offered group prevent trading',()=>{
 const s=owned();s.properties[1].mortgaged=true;assert.equal(tradeable(s,1,'a'),false);assert.throws(()=>change(s,'a',offer()));
 s.properties[1].mortgaged=false;s.properties[2].owner='a';s.properties[2].level=1;
 assert.equal(tradeable(s,1,'a'),false);assert.throws(()=>change(s,'a',offer()));
});
test('deals: an offer becomes invalid after development or mortgaging, without transfers',()=>{
 let s=owned();s.properties[2].owner='a';s=change(s,'a',offer());
 const next=change(s,'a',{type:'UPGRADE',tile:1});assert.equal(next.deals.length,0);assert.equal(next.properties[4].owner,'b');
 assert.throws(()=>change(next,'b',{type:'ACCEPT_DEAL',dealId:1}));
});
test('deals: no escrow; insolvency at acceptance rejects the entire operation',()=>{
 const s=change(owned(),'a',offer({giveCash:500}));s.players[0].cash=10;
 const before=JSON.stringify(s);assert.throws(()=>change(s,'b',{type:'ACCEPT_DEAL',dealId:1}));assert.equal(JSON.stringify(s),before);
});
test('deals: matching offers cannot sell an asset twice',()=>{
 let s=owned();s.properties[8].owner='c';s=change(s,'a',offer());
 s=change(s,'c',offer({to:'a',giveCash:0,giveTiles:[8],takeCash:0,takeTiles:[1]}));
 const next=change(s,'b',{type:'ACCEPT_DEAL',dealId:1});assert.equal(next.properties[1].owner,'b');assert.equal(next.deals.length,0);
 assert.throws(()=>change(next,'a',{type:'ACCEPT_DEAL',dealId:2}));
});
test('deals: explicit counteroffer replaces its parent without mutating assets',()=>{
 const s=change(owned(),'a',offer());
 const next=change(s,'b',offer({to:'a',giveCash:0,takeCash:50,giveTiles:[4],takeTiles:[1],counterOf:1}));
 assert.equal(next.deals.length,1);assert.equal(next.deals[0].id,2);assert.equal(next.properties[1].owner,'a');
 assert.throws(()=>change(next,'b',{type:'ACCEPT_DEAL',dealId:1}));
});
test('deals: failed counteroffer leaves the old offer intact',()=>{
 const s=change(owned(),'a',offer());assert.throws(()=>change(s,'b',offer({to:'a',giveCash:999999,takeCash:30,giveTiles:[4],takeTiles:[1],counterOf:1})));
 assert.equal(s.deals.length,1);assert.equal(s.deals[0].id,1);
});
test('deals: one open offer per author and at most three proposals per active turn',()=>{
 let s=owned();
 for(let i=0;i<3;i++){s=change(s,'a',offer());assert.throws(()=>change(s,'a',offer()));s=change(s,'a',{type:'CANCEL_DEAL',dealId:i+1});}
 assert.throws(()=>change(s,'a',offer()));s.phase='end';s=change(s,'a',{type:'END'});assert.equal(change(s,'a',offer()).deals.length,1);
});
test('deals: expire by completed turns, unaffected by unrelated negotiations',()=>{
 let s=change(owned(),'a',offer());const expires=s.deals[0].expiresAtTurn;
 for(let i=0;i<seats.length;i++){s.phase='end';s=change(s,currentPlayer(s).id,{type:'END'});}
 assert.equal(s.turnSerial,expires);assert.equal(s.deals.length,0);
});
test('deals: pending offers survive valid snapshot/replay and strict shape checks',()=>{
 const s=change(owned(),'a',offer());assert.deepEqual(readPacket(packet('snapshot',{state:s})).state,s);
 for(const mutate of [s=>s.deals.push({...s.deals[0]}),s=>s.deals[0].expiresAtTurn=0,s=>s.deals[0].hiddenCash=1,s=>s.nextDealId=1,s=>s.players[0].dealsSent=4]){const v=structuredClone(s);mutate(v);assert.throws(()=>assertState(v));}
});
test('bots: respond to offers while another player owns the turn; preserve a cash reserve',()=>{
 let s=owned();s.players[1].bot=true;s=change(s,'a',offer({giveCash:60}));
 const response=botDealDecision(s);assert.equal(response.actor,'b');assert.equal(response.action.type,'ACCEPT_DEAL');
 s=change(owned(),'a',offer({giveCash:0,takeCash:1000}));s.players[1].bot=true;assert.equal(botDealDecision(s).action.type,'DECLINE_DEAL');
});
test('network: stale-revision deal response applies safely to the latest state',()=>{
 const r=new RoomSession({onState:()=>{}});r.isHost=true;r.state=change(owned(),'a',offer());r.broadcast=()=>{};let response;r.send=(id,type)=>response=type;
 r.receive('b',{type:'action',requestId:'accept-1',gameId:r.state.id,revision:0,action:{type:'ACCEPT_DEAL',dealId:1}},{limit:()=>true,seen:new Set()});
 assert.equal(r.state.properties[1].owner,'b');assert.equal(response,undefined);
});
test('network: stale deals still cannot cross game IDs or forge actor identity',()=>{
 for(const [who,id] of [['c','test-feedback'],['b','old-match']]){
 const r=new RoomSession({onState:()=>{}});r.isHost=true;r.state=change(owned(),'a',offer());r.broadcast=()=>{};r.send=()=>{};
 r.receive(who,{type:'action',actor:'b',requestId:'forged',gameId:id,revision:0,action:{type:'ACCEPT_DEAL',dealId:1}},{limit:()=>true,seen:new Set()});assert.equal(r.state.properties[1].owner,'a');}
});
test('presets: Blitz ends for everybody on insolvency instead of keeping spectators',()=>{
 const s=game(matchOptions('blitz'));s.players[0].cash=0;s.players[0].position=10;
 const next=change(s,'a',{type:'ROLL'});assert.equal(next.phase,'finished');assert.equal(next.endReason,'first-bankruptcy');assert.equal(next.winners.length,2);
 assert.throws(()=>change(next,'b',{type:'ROLL'}));
});
test('presets: same insolvency in Standard does not silently change the win rule',()=>{
 const s=game(matchOptions('standard'));s.players[0].cash=0;s.players[0].position=10;
 const next=change(s,'a',{type:'ROLL'});assert.equal(next.phase,'roll');assert.equal(next.players[0].bankrupt,true);assert.equal(next.turn,1);assert.equal(next.endReason,null);
});
test('lobby rules: bounded settings and no unknown fields in announcements',()=>{
 for(const rules of [matchOptions('blitz'),matchOptions('standard'),matchOptions('grand')])assert.deepEqual(readPacket(packet('lobby-rules',{rules})).rules,rules);
 for(const rules of [{rounds:12,mobility:2,finishOnBankruptcy:1},{rounds:0,mobility:2,finishOnBankruptcy:false},{rounds:12,mobility:8,finishOnBankruptcy:false},{...matchOptions('blitz'),extra:true}])assert.throws(()=>readPacket(packet('lobby-rules',{rules})));
});
test('300 complete mixed-rules games with automatic movement and negotiation replay identically',()=>{
 let actions=0,offers=0;
 for(let seed=1;seed<=300;seed++){
  const preset=PRESETS[seed%PRESETS.length];const initial=createGame(seats.map(p=>({...p,bot:true})),seed,{...matchOptions(preset.id),id:`replay-${seed}`});
  let s=initial;const journal=[];
  while(s.phase!=='finished'){
   assert.ok(journal.length<2000,'Game must terminate');let who=currentPlayer(s).id,action;
   const response=botDealDecision(s);
   if(response){who=response.actor;action=response.action;}
   else if(['roll','end'].includes(s.phase)&&journal.length%9===0){
    const t=BOARD.find(t=>s.properties[t.id].owner&&tradeable(s,t.id,s.properties[t.id].owner));
    const owner=t&&s.players.find(p=>p.id===s.properties[t.id].owner),to=owner&&s.players.find(p=>p.id!==owner.id&&!p.bankrupt&&p.cash>=t.price+180);
    if(owner&&to&&!s.deals.some(d=>d.from===owner.id)&&(owner.dealBudgetTurn!==s.turnSerial||owner.dealsSent<3)) {who=owner.id;action={type:'OFFER_DEAL',to:to.id,giveCash:0,takeCash:Math.floor(t.price*.9),giveTiles:[t.id],takeTiles:[]};offers++;}
   }
   action??=botAction(s);assert.ok(action);s=change(s,who,action);journal.push([who,action]);assertState(s);
  }
  const replay=journal.reduce((state,[who,action])=>change(state,who,action),initial);assert.equal(fingerprint(replay),fingerprint(s));assert.deepEqual(replay,s);actions+=journal.length;
 }
 assert.ok(offers>100);console.log(`Feedback simulations: 300 games, ${actions} actions, ${offers} offers; identical replays.`);
});
