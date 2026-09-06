import test from 'node:test';
import assert from 'node:assert/strict';
import { App } from '../src/ui/app.js';
import { RoomSession } from '../src/network/rtc.js';
import { createGame, applyAction, assertState, fingerprint } from '../src/game/engine.js';
import { readPacket, packet } from '../src/network/protocol.js';
import { PlaytestRecorder } from '../src/game/playtest.js';
const game=(id='current')=>createGame([{id:'host',name:'Host'},{id:'guest',name:'Guest'}],42,{id});
function dom(t){
 const previous=globalThis.document,nodes=new Map();
 globalThis.document={hidden:false,querySelector:s=>{if(!nodes.has(s))nodes.set(s,{hidden:false,checked:false,close(){this.open=false;}});return nodes.get(s);}};
 t.after(()=>{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;});return nodes;
}
function app(t){
 dom(t);const a=Object.create(App.prototype);
 Object.assign(a,{state:game(),settings:{reduced:true},selected:1,session:{},room:null,render(){},scheduleBot(){},toast(){},closeModal(){this.dialogKind=null;},modal(kind,title,body){this.dialogKind=kind;this.markup=body;}});
 t.after(()=>{clearTimeout(a.resultsTimer);clearTimeout(a.busyTimer);clearTimeout(a.botTimer);});return a;
}
function session(host=true){
 const sent=[],errors=[],r=new RoomSession({onLobby(){},onState(){},onError:e=>errors.push(e),onClosed:e=>errors.push(e)});
 r.isHost=host;r.localId=host?'host':'guest';r.room={hostId:'host',members:[{id:'host',name:'Host'},{id:'guest',name:'Guest'}]};r.ready.add(r.localId);
 const id=host?'guest':'host',channel={readyState:'open',bufferedAmount:0,send(raw){sent.push(readPacket(raw));},close(){this.readyState='closed';this.onclose?.();}},peer={channel,ingress:()=>true,limit:()=>true,seen:new Set()};
 r.peers.set(id,peer);r.attach(id,channel);sent.length=0;return {r,id,peer,channel,sent,errors};
}
test('audit: local restart discards a recorder from another match',t=>{
 const a=app(t);a.playtest=new PlaytestRecorder(a.state);a.session=null;a.freshGame=()=>game('new-local');a.startSolo();assert.equal(a.playtest,null);
});
test('audit: network rematch discards an unarmed previous recorder',t=>{
 const a=app(t);a.playtest=new PlaytestRecorder(a.state);a.accept(game('new-network'));assert.equal(a.playtest,null);
});
test('audit: results never offer another match trace',t=>{
 const a=app(t);a.playtest=new PlaytestRecorder(game('old'));a.state.phase='finished';a.state.winners=['host'];a.showResults();assert.ok(!a.markup.includes('data-ui="export-playtest"'));
});
test('audit: duplicate final snapshot leaves the results dialog open',t=>{
 const a=app(t);a.state.phase='finished';a.state.winners=['host'];a.finishedId=a.state.id;a.dialogKind='results';a.accept(structuredClone(a.state));assert.equal(a.dialogKind,'results');
});
test('audit: congestion does not silently discard queued RTC commands',()=>{
 const {r,id,channel,sent}=session();channel.bufferedAmount=128000;
 r.send(id,'error',{message:'first'});r.send(id,'error',{message:'second'});assert.equal(sent.length,0);
 channel.bufferedAmount=0;channel.onbufferedamountlow?.();assert.deepEqual(sent.map(p=>p.message),['first','second']);
});
test('audit: guest responds to host handshake even when its first greeting was missed',()=>{
 const {r,id,peer,sent}=session(false);r.receive(id,readPacket(packet('ready')),peer);assert.equal(sent[0]?.type,'ready');
});
test('audit: start refuses a closed peer despite a stale ready flag',()=>{
 const {r,id,channel}=session();r.ready.add(id);channel.readyState='closed';r.ws={send(){}};
 assert.throws(()=>r.start(),/connect/i);assert.equal(r.state,null);
});
test('audit: terminal pause closes other links instead of leaving guests apparently playing',()=>{
 const {r,channel}=session();r.state=game();r.fail('Lost peer');assert.equal(r.paused,true);assert.equal(channel.readyState,'closed');
});
test('audit: old snapshots cannot roll a guest back within a match',()=>{
 const {r,id,peer}=session(false);const old=game();r.state=applyAction(old,'host',{type:'ROLL'});const expected=fingerprint(r.state);r.receive(id,readPacket(packet('snapshot',{state:old})),peer);assert.equal(fingerprint(r.state),expected);
});
test('audit: snapshot player IDs must be strings, not regex-coerced numbers',()=>{
 const s=game();s.players[0].id=123;assert.throws(()=>assertState(s));
});
test('audit: empty game IDs cannot pass snapshot validation but fail action protocol',()=>{
 const s=game();s.id='';assert.throws(()=>assertState(s));assert.throws(()=>createGame(s.players,42,{id:''}));
});
test('audit: heartbeat retries an unfinished handshake without extra timers',()=>{
 const {r,sent}=session();r.heartbeatTick();assert.deepEqual(sent.map(p=>p.type),['ready','lobby-rules','ping']);
});
test('audit: a rate-limited action has an explicit error instead of a dead click',()=>{
 const {r,id,peer,sent}=session();r.state=game();peer.limit=()=>false;
 r.receive(id,{type:'action',gameId:r.state.id,revision:0,requestId:'limited',action:{type:'ROLL'}},peer);
 assert.equal(sent[0]?.type,'error');assert.equal(r.state.revision,0);
});
test('audit: deferred channel callbacks cannot mutate a left session',()=>{
 const {r,channel}=session(false);r.closed=true;channel.onmessage({data:packet('snapshot',{state:game()})});assert.equal(r.state,null);
});
test('audit: a newly armed recording still starts at the correct match',t=>{
 const a=app(t);a.playtest=new PlaytestRecorder(a.state);a.playtestArmed=true;a.accept(game('armed'));
 assert.equal(a.playtest.gameId,'armed');assert.equal(a.playtestArmed,false);assert.equal(a.playtest.export().status,'partial');
});
