import test from 'node:test';
import assert from 'node:assert/strict';
import { BOARD, GROUPS, RULES, tilePosition } from '../src/game/board.js';
import { createGame, applyAction, currentPlayer, assertState, fingerprint, ownsGroup, rentFor, netWorth, upgradeCost, cleanName, validateAction } from '../src/game/engine.js';
import { botAction } from '../src/game/bots.js';
const seats=n=>Array.from({length:n},(_,i)=>({id:`p${i}`,name:`Player ${i}`,bot:true}));
const game=(n=4,seed=7)=>createGame(seats(n),seed);
const act=(s,type,tile)=>applyAction(s,currentPlayer(s).id,{type,...(tile===undefined?{}:{tile})});
function buying(n=4){const s=game(n);s.phase='buy';s.pending=1;s.players[0].position=1;return assertState(s);}
function own(s,tiles,id='p0'){for(const i of tiles)s.properties[i].owner=id;return s;}

test('original board: 28 unique positions, eight groups of two lots',()=>{
 assert.equal(BOARD.length,28);assert.equal(GROUPS.length,8);
 assert.equal(new Set(BOARD.map(t=>tilePosition(t.id).join(','))).size,28);
 for(let g=0;g<8;g++)assert.equal(BOARD.filter(t=>t.group===g).length,2);
});
test('initial state, sanitized names and valid settings',()=>{
 const s=game();assert.equal(assertState(s),s);assert.equal(s.auction,null);assert.equal(s.players[0].cash,1800);
 assert.equal(cleanName('<Nova>\u0000'),'Nova');assert.equal(cleanName('  '),'Joueur');
 for(const n of [0,1,5])assert.throws(()=>game(n));
 for(const seed of [0,-1,NaN,2**32,1.2])assert.throws(()=>game(2,seed));
 assert.throws(()=>createGame([{id:'a'},{id:'a'}],1));assert.throws(()=>createGame(seats(2),1,{rounds:99}));
});
test('reducer is immutable and checks the authenticated actor',()=>{
 const s=game(),before=structuredClone(s),next=act(s,'ROLL');assert.deepEqual(s,before);assert.notEqual(next,s);assert.equal(next.revision,1);
 assert.throws(()=>applyAction(s,'p1',{type:'ROLL'}));assert.throws(()=>act(next,'ROLL'));
});
test('rejects arbitrary payload fields, unknown actions and invalid tile indices',()=>{
 for(const a of [null,[],{type:'WIN'},{type:'ROLL',cash:9000},{type:'BID',amount:500},{type:'UPGRADE',tile:0},{type:'REDEEM',tile:-1},{type:'ROLL',tile:1}])assert.throws(()=>validateAction(a));
 for(const type of ['ROLL','BUY','SKIP','BID','PASS','END'])assert.equal(validateAction({type}).type,type);
});
test('dice remain valid over 1,000 seeds',()=>{
 const sums=new Set();for(let i=1;i<=1000;i++){const s=act(game(2,i),'ROLL');for(const d of s.dice)assert.ok(d>=1&&d<=6);sums.add(s.dice[0]+s.dice[1]);}
 assert.equal(sums.size,11);
});
test('crossing start pays exactly one lap income on a property landing',()=>{
 let checked=false;for(let seed=1;seed<100&&!checked;seed++){const s=game(2,seed);s.players[0].position=27;const next=act(s,'ROLL');if(BOARD[next.players[0].position].kind==='lot'){assert.equal(next.players[0].cash,1800+RULES.lapIncome);checked=true;}}
 assert.ok(checked);
});
test('purchase transfers cash to the city and attributes ownership',()=>{
 const s=act(buying(),'BUY');assert.equal(s.properties[1].owner,'p0');assert.equal(s.players[0].cash,1800-BOARD[1].price);assert.equal(netWorth(s,'p0'),1800);assert.equal(s.phase,'end');assert.throws(()=>act(s,'BUY'));
});
test('insufficient purchase cannot mutate the state',()=>{
 const s=buying();s.players[0].cash=10;const before=structuredClone(s);assert.throws(()=>act(s,'BUY'));assert.deepEqual(s,before);
});
test('complete group doubles rent and development is even',()=>{
 let s=own(game(),[1,2]);assert.ok(ownsGroup(s,'p0',0));assert.equal(ownsGroup(s,'p0',999),false);
 assert.equal(rentFor(s,1),BOARD[1].rent*2);s=act(s,'UPGRADE',1);assert.equal(rentFor(s,1),BOARD[1].rent*6);
 assert.throws(()=>act(s,'UPGRADE',1));s=act(s,'UPGRADE',2);s=act(s,'UPGRADE',1);
 assert.throws(()=>act(s,'SELL_LEVEL',2));s=act(s,'SELL_LEVEL',1);assert.equal(s.properties[1].level,1);
});
test('mortgage and redemption charge the documented amounts',()=>{
 let s=own(game(),[1,2]);s=act(s,'MORTGAGE',1);assert.equal(s.players[0].cash,1860);assert.equal(rentFor(s,1),0);assert.equal(rentFor(s,2),BOARD[2].rent);assert.equal(netWorth(s,'p0'),2060);
 assert.throws(()=>act(s,'UPGRADE',2));s=act(s,'REDEEM',1);assert.equal(s.players[0].cash,1794);assert.equal(rentFor(s,1),BOARD[1].rent*2);
});
test('a built group cannot be mortgaged, maximum level is enforced',()=>{
 let s=own(game(),[1,2]);for(let i=0;i<3;i++){s=act(s,'UPGRADE',1);s=act(s,'UPGRADE',2);}
 assert.throws(()=>act(s,'UPGRADE',1));assert.throws(()=>act(s,'MORTGAGE',2));assert.throws(()=>act(s,'UPGRADE',4));
});
test('declining purchase starts an auction without moving the original turn',()=>{
 const s=act(buying(),'SKIP');assert.equal(s.phase,'auction');assert.equal(s.turn,0);assert.equal(currentPlayer(s).id,'p0');assert.equal(s.auction.highBid,0);assert.throws(()=>act(s,'END'));assert.throws(()=>act(s,'BUY'));
});
test('all passing leaves the lot unsold and resumes the original turn',()=>{
 let s=act(buying(),'SKIP');for(let i=0;i<4;i++)s=act(s,'PASS');assert.equal(s.phase,'end');assert.equal(s.auction,null);assert.equal(s.properties[1].owner,null);assert.equal(s.players[0].cash,1800);assert.equal(s.turn,0);
});
test('only the winning bidder pays; passed bidders cannot re-enter',()=>{
 let s=act(buying(),'SKIP');s=act(s,'PASS');s=act(s,'BID');s=act(s,'BID');s=act(s,'PASS');
 assert.equal(currentPlayer(s).id,'p1');assert.throws(()=>applyAction(s,'p0',{type:'BID'}));s=act(s,'PASS');
 assert.equal(s.phase,'end');assert.equal(s.properties[1].owner,'p2');assert.equal(s.players[2].cash,1760);assert.equal(s.players[1].cash,1800);assert.equal(s.turn,0);
});
test('an auction rejects insolvent bids and management actions',()=>{
 let s=buying();s.players[0].cash=0;own(s,[2]);s=act(s,'SKIP');assert.throws(()=>act(s,'BID'));assert.throws(()=>act(s,'MORTGAGE',2));assert.throws(()=>act(s,'ROLL'));
});
test('auction skips bankrupt players',()=>{
 let s=buying();s.players[1].bankrupt=true;s.players[1].cash=0;s=act(s,'SKIP');s=act(s,'BID');assert.equal(currentPlayer(s).id,'p2');s=act(s,'PASS');s=act(s,'PASS');assert.equal(s.properties[1].owner,'p0');
});
test('debt liquidates assets and resolves insolvency without negative balances',()=>{
 let s=game(2,42);const roll=act(s,'ROLL'),steps=roll.dice.reduce((a,b)=>a+b);s.players[0].position=25-steps;s.players[0].cash=0;own(s,[1,2]);own(s,[25,26],'p1');s.properties[25].level=3;s.properties[26].level=3;
 const bill=rentFor(s,25),liquidation=BOARD[1].price/2+BOARD[2].price/2;s=act(s,'ROLL');
 assert.ok(bill>liquidation);assert.equal(s.players[0].bankrupt,true);assert.equal(s.players[0].cash,0);assert.equal(s.players[1].cash,1800+liquidation);assert.equal(s.properties[1].owner,null);assert.equal(s.phase,'finished');assert.deepEqual(s.winners,['p1']);
});
test('round cap shares a tied victory and prohibits additional actions',()=>{
 const s=game();s.round=s.maxRounds=4;s.turn=3;s.phase='end';const done=act(s,'END');assert.equal(done.phase,'finished');assert.deepEqual(done.winners,['p0','p1','p2','p3']);assert.throws(()=>act(done,'ROLL'));
});
test('malformed saved states and snapshots fail validation',()=>{
 for(const mutate of [s=>s.rng=0,s=>s.players[0].cash=-1,s=>s.players[0].name='<bad>',s=>s.properties[0].owner='p0',s=>s.dice=[7,1],s=>s.phase='auction',s=>s.auction={},s=>s.winners=['p0'],s=>s.players[1].id='p0']){const s=game();mutate(s);assert.throws(()=>assertState(s));}
 const s=act(buying(),'SKIP');s.auction.highBid=20;s.auction.highBidder='missing';assert.throws(()=>assertState(s));
});
test('500 complete seeded bot games terminate and replay byte-for-byte',()=>{
 let actions=0;
 for(let seed=1;seed<=500;seed++){
  const initial=game(2+seed%3,seed),history=[];let s=initial;
  while(s.phase!=='finished'){
   assert.ok(history.length<5000,`Game ${seed} stalled`);const actor=currentPlayer(s).id,a=botAction(s);assert.ok(a);history.push([actor,a]);s=applyAction(s,actor,a);actions++;
  }
  const replay=history.reduce((state,[actor,a])=>applyAction(state,actor,a),initial);
  assert.equal(fingerprint(s),fingerprint(replay));assert.deepEqual(s,replay);assert.ok(s.winners.length);assertState(s);
 }
 console.log(`Simulated 500 games and replayed ${actions} legal actions.`);
});
