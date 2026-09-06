import test from 'node:test';
import assert from 'node:assert/strict';
import { Outbox, HIGH_WATER, MAX_QUEUED_BYTES, MAX_QUEUED_MESSAGES } from '../src/network/outbox.js';
function fixture(){const sent=[],errors=[],channel={readyState:'open',bufferedAmount:0,send:s=>sent.push(s)};return {sent,errors,channel,box:new Outbox(channel,e=>errors.push(e))};}
test('outbox preserves FIFO across high-water crossings',()=>{
 const {channel,box,sent}=fixture();channel.bufferedAmount=HIGH_WATER;
 assert.equal(box.enqueue('a'),true);box.enqueue('b');assert.equal(box.bytes,2);channel.bufferedAmount=0;channel.onbufferedamountlow();
 assert.deepEqual(sent,['a','b']);assert.equal(box.bytes,0);channel.onbufferedamountlow();assert.equal(sent.length,2);
});
test('outbox retries transient OperationError once, without dropping or duplicating',()=>{
 const {channel,box,sent,errors}=fixture();const send=channel.send;channel.send=()=>{const e=Error();e.name='OperationError';throw e;};
 assert.equal(box.enqueue('pending'),true);assert.equal(box.queue.length,1);channel.send=send;box.flush();box.flush();assert.deepEqual(sent,['pending']);assert.deepEqual(errors,[]);
});
test('outbox bounds bytes using UTF-8 rather than code unit length',()=>{
 const {channel,box,errors}=fixture();channel.bufferedAmount=HIGH_WATER;
 assert.equal(box.enqueue('é'.repeat(MAX_QUEUED_BYTES/2)),true);assert.equal(box.enqueue('x'),false);assert.equal(box.closed,true);assert.equal(errors.length,1);assert.equal(box.bytes,0);
});
test('outbox also bounds the number of queued messages',()=>{
 const {channel,box,errors}=fixture();channel.bufferedAmount=HIGH_WATER;
 for(let i=0;i<MAX_QUEUED_MESSAGES;i++)assert.equal(box.enqueue(''),true);
 assert.equal(box.enqueue(''),false);assert.equal(errors.length,1);
});
test('outbox reports a fatal send error and releases pending memory',()=>{
 const {channel,box,errors}=fixture();channel.send=()=>{throw Error('closed transport');};
 assert.equal(box.enqueue('a'),false);assert.equal(errors.length,1);assert.equal(box.bytes,0);assert.equal(box.enqueue('b'),false);
});
test('closed outbox cannot drain old data on a delayed event',()=>{
 const {channel,box,sent}=fixture();channel.bufferedAmount=HIGH_WATER;box.enqueue('old');const late=channel.onbufferedamountlow;box.close();channel.bufferedAmount=0;late();assert.deepEqual(sent,[]);assert.equal(box.enqueue('new'),false);
});
