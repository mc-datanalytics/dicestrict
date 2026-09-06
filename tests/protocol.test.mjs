import test from 'node:test';import assert from 'node:assert/strict';
import { createGame, applyAction, fingerprint } from '../src/game/engine.js';
import { readPacket, packet, createLimiter, MAX_PACKET_BYTES } from '../src/network/protocol.js';
import { RoomSession } from '../src/network/rtc.js';
import { identity,multiply,inverse,model,transform,ortho,lookAt } from '../src/scene/math.js';
const initial=()=>createGame([{id:'host',name:'Host'},{id:'guest',name:'Guest'}],1,{id:'room-test'});
test('protocol validates snapshots and action scope',()=>{
 assert.equal(readPacket(packet('snapshot',{state:initial()})).state.id,'room-test');
 assert.equal(readPacket(packet('action',{requestId:'a',gameId:'room-test',revision:0,action:{type:'ROLL'}})).type,'action');
 for(const value of ['null','[]','{bad',JSON.stringify({v:1,type:'ping'}),packet('WIN'),packet('action',{requestId:'x',revision:0,action:{type:'ROLL'}}),packet('action',{requestId:'x',gameId:'r',revision:-1,action:{type:'ROLL'}}),'x'.repeat(MAX_PACKET_BYTES+1),packet('error',{message:'é'.repeat(18000)})])assert.throws(()=>readPacket(value));
});
test('rate limiter resets on the window boundary',()=>{const limit=createLimiter(2,100);assert.ok(limit(1000));assert.ok(limit(1001));assert.equal(limit(1002),false);assert.ok(limit(1100));});
test('host ignores a self-claimed actor and binds the action to its peer',()=>{
 const r=new RoomSession({onState:()=>{},onError:()=>{},onClosed:()=>{}});r.isHost=true;r.state=initial();r.broadcast=()=>{};const sent=[];r.send=(id,type,body)=>sent.push({id,type,body});const peer={limit:()=>true,seen:new Set()};
 r.receive('guest',{type:'action',actor:'host',requestId:'x',gameId:'room-test',revision:0,action:{type:'ROLL'}},peer);
 assert.equal(r.state.revision,0);assert.equal(sent[0].type,'error');
});
test('old-match packets cannot be applied to a new match with the same revision',()=>{
 const r=new RoomSession({onState:()=>{}});r.isHost=true;r.state=initial();r.broadcast=()=>{};let response;r.send=(id,type)=>response=type;
 r.receive('host',{type:'action',requestId:'old',gameId:'room-previous',revision:0,action:{type:'ROLL'}},{limit:()=>true,seen:new Set()});assert.equal(r.state.revision,0);assert.equal(response,'snapshot');
});
test('guests recompute commits and request resync on mismatched checksums',()=>{
 const r=new RoomSession({onState:()=>{},onError:()=>{}});r.isHost=false;r.room={hostId:'host'};r.state=initial();let response;r.send=(id,type)=>response=type;
 r.receive('host',{type:'commit',gameId:'room-test',actor:'host',action:{type:'ROLL'},baseRevision:0,checksum:'00000000'},{});assert.equal(response,'resync');assert.equal(r.state.revision,0);
 const next=applyAction(r.state,'host',{type:'ROLL'});r.receive('host',{type:'commit',gameId:'room-test',actor:'host',action:{type:'ROLL'},baseRevision:0,checksum:fingerprint(next)},{});assert.deepEqual(r.state,next);
});
test('matrix inverse and projection recover original coordinates',()=>{
 const m=multiply(ortho(-9,9,-9,9,.1,80),lookAt([10,18,10],[0,0,0])),inv=inverse(m),p=[3,.5,-2,1],restored=transform(inv,transform(m,p));for(let i=0;i<4;i++)assert.ok(Math.abs(restored[i]-p[i])<1e-4);
 const unit=multiply(model(1,2,3,.2,.3,.4,1),inverse(model(1,2,3,.2,.3,.4,1)));for(let i=0;i<16;i++)assert.ok(Math.abs(unit[i]-identity()[i])<1e-5);
});
