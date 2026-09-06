import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomSession } from '../src/network/rtc.js';
import { packet, readPacket } from '../src/network/protocol.js';
function fixture(isHost=true,readyState='open'){
  const sent=[],errors=[],r=new RoomSession({onLobby:()=>{},onError:e=>errors.push(e)});
  r.isHost=isHost;r.localId=isHost?'host':'guest';
  const remote=isHost?'guest':'host';
  r.room={hostId:'host',members:[{id:'host',name:'Host'},{id:'guest',name:'Guest'}]};
  r.ready.add(r.localId);r.rules={opening:'classic',rounds:6,mobility:2,finishOnBankruptcy:true,casino:false};
  const peer={ingress:()=>true};r.peers.set(remote,peer);
  const channel={readyState,bufferedAmount:0,send:raw=>sent.push(readPacket(raw))};
  return {r,remote,channel,sent,errors};
}
test('already-open host channel sends rules once and waits for peer handshake before readiness',()=>{
  const {r,remote,channel,sent,errors}=fixture();r.attach(remote,channel);
  assert.deepEqual(sent.map(p=>p.type),['ready','lobby-rules']);
  assert.equal(sent[1].rules.rounds,6);assert.equal(r.ready.has(remote),false);
  channel.onopen();assert.equal(sent.length,2);
  channel.onmessage({data:packet('ready')});assert.equal(r.ready.has(remote),true);
  assert.deepEqual(sent.slice(2).map(p=>p.type),['lobby-rules','roster']);assert.deepEqual(errors,[]);
});
test('incoming already-open guest acknowledges the host even without a subsequent open event',()=>{
  const {r,remote,channel,sent}=fixture(false);r.attach(remote,channel);
  assert.deepEqual(sent.map(p=>p.type),['ready']);assert.equal(r.ready.has(remote),true);
  channel.onopen();assert.equal(sent.length,1);
});
test('connecting channels wait for open and a closed session never sends a late handshake',()=>{
  const {r,remote,channel,sent}=fixture(true,'connecting');r.attach(remote,channel);assert.equal(sent.length,0);
  channel.readyState='open';channel.onopen();channel.onopen();assert.equal(sent.length,2);
  const late=fixture(true,'connecting');late.r.attach(late.remote,late.channel);late.r.closed=true;
  late.channel.readyState='open';late.channel.onopen();assert.equal(late.sent.length,0);
});
