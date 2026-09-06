import test from 'node:test';import assert from 'node:assert/strict';import { spawn } from 'node:child_process';
const port=4397,base=`http://127.0.0.1:${port}`;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function client(){
 const ws=new WebSocket(`ws://127.0.0.1:${port}/signal`),queue=[];
 ws.addEventListener('message',e=>queue.push(JSON.parse(e.data)));
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
 return {ws,send:m=>ws.send(JSON.stringify(m)),async get(type){for(let i=0;i<100;i++){const j=queue.findIndex(m=>m.type===type);if(j>=0)return queue.splice(j,1)[0];await wait(20);}throw Error(`Missing ${type}: ${JSON.stringify(queue)}`);}};
}
test('development HTTP and signaling: private rooms, identity, lock and host loss',async t=>{
 const server=spawn(process.execPath,['scripts/dev.mjs','--port',String(port)],{cwd:new URL('..',import.meta.url),stdio:'ignore'}),peers=[];
 t.after(()=>{for(const p of peers)p.ws.close();server.kill('SIGTERM');});
 let up=false;for(let i=0;i<100;i++){try{const r=await fetch(base);if(r.ok){up=true;break;}}catch{}await wait(30);}assert.ok(up);
 assert.equal((await fetch(`${base}/src/main.js`)).status,200);assert.equal((await fetch(`${base}/.env`)).status,404);assert.equal((await fetch(`${base}/package.json`)).status,404);assert.equal((await fetch(base,{method:'POST'})).status,405);
 const h=await client();peers.push(h);h.send({type:'create',name:'Host'});const host=await h.get('room');assert.match(host.code,/^[A-Z2-9]{8}$/);assert.equal(host.selfId,host.hostId);
 const g=await client();peers.push(g);g.send({type:'join',name:'Guest',code:host.code});const guest=await g.get('room');assert.notEqual(host.selfId,guest.selfId);
 g.send({type:'signal',to:host.selfId,from:'forged',signal:{candidate:{candidate:'test'}}});const signal=await h.get('signal');assert.equal(signal.from,guest.selfId);
 g.send({type:'lock',locked:true});assert.match((await g.get('error')).message,/hôte/);
 h.send({type:'lock',locked:true});await wait(40);const outsider=await client();peers.push(outsider);outsider.send({type:'join',name:'Late',code:host.code});assert.match((await outsider.get('error')).message,/commencé/);
 h.ws.close();assert.match((await g.get('error')).message,/hôte/);
});
