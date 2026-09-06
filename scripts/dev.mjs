#!/usr/bin/env node
/** Zero-dependency local static server + bounded development-only WebSocket signaling. */
import http from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { cleanName } from '../src/game/engine.js';
const root=resolve(import.meta.dirname,'..',process.argv.includes('--dist')?'dist':'.');
const argIndex=process.argv.indexOf('--port');const port=Number(process.env.PORT||(argIndex>=0?process.argv[argIndex+1]:4173));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'};
const rooms=new Map(),clients=new Set(),MAX_BYTES=80000;
function frame(op,payload=Buffer.alloc(0)){
  if(!Buffer.isBuffer(payload))payload=Buffer.from(payload);let head;
  if(payload.length<126)head=Buffer.from([0x80|op,payload.length]);
  else if(payload.length<65536){head=Buffer.alloc(4);head[0]=0x80|op;head[1]=126;head.writeUInt16BE(payload.length,2);}
  else{head=Buffer.alloc(10);head[0]=0x80|op;head[1]=127;head.writeBigUInt64BE(BigInt(payload.length),2);}return Buffer.concat([head,payload]);
}
function send(c,body){if(!c.socket.destroyed&&c.socket.writableLength<300000)c.socket.write(frame(1,JSON.stringify(body)));}
const memberList=r=>[...r.members.values()].map(c=>({id:c.id,name:c.name}));
function broadcast(r,body){for(const c of r.members.values())send(c,body);}
function detach(c){
  if(c.removed)return;c.removed=true;clients.delete(c);const room=rooms.get(c.code);if(!room)return;room.members.delete(c.id);
  if(room.hostId===c.id){rooms.delete(room.code);for(const peer of room.members.values()){peer.code=null;send(peer,{type:'error',message:'L’hôte a quitté le salon.'});peer.socket.end(frame(8));}}
  else{broadcast(room,{type:'left',id:c.id});broadcast(room,{type:'members',members:memberList(room)});}
}
function handle(c,raw){try{
  if(raw.length>MAX_BYTES)throw Error('Signal trop volumineux.');const now=Date.now();if(now-c.window>10000){c.window=now;c.count=0;}if(++c.count>100){c.socket.destroy();return;}c.lastSeen=now;
  const m=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));if(!m||typeof m.type!=='string')throw Error('Message invalide.');
  if(m.type==='create'||m.type==='join'){
    if(c.code)throw Error('Déjà dans un salon.');if(m.type==='create'&&rooms.size>=200)throw Error('Serveur de développement occupé.');let room;
    if(m.type==='create'){
      const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let code;do{code=[...randomBytes(8)].map(b=>alphabet[b%32]).join('');}while(rooms.has(code));
      room={code,hostId:c.id,members:new Map(),locked:false,created:now};rooms.set(code,room);
    }else{room=rooms.get(String(m.code));if(!room)throw Error('Salon introuvable ou expiré.');if(room.locked)throw Error('La partie a déjà commencé.');if(room.members.size>=4)throw Error('Le salon est complet.');}
    c.name=cleanName(m.name);c.code=room.code;room.members.set(c.id,c);send(c,{type:'room',code:room.code,hostId:room.hostId,selfId:c.id,members:memberList(room)});broadcast(room,{type:'members',members:memberList(room)});return;
  }
  const room=rooms.get(c.code);if(!room)throw Error('Aucun salon actif.');
  if(m.type==='signal'){
    const target=room.members.get(m.to);if(!target)throw Error('Destinataire absent.');if(c.id!==room.hostId&&target.id!==room.hostId)throw Error('Connexion non autorisée.');
    if(!m.signal||typeof m.signal!=='object')throw Error('Signal invalide.');send(target,{type:'signal',from:c.id,signal:m.signal});
  }else if(m.type==='lock'){if(c.id!==room.hostId)throw Error('Action réservée à l’hôte.');room.locked=Boolean(m.locked);}
  else throw Error('Message inconnu.');
}catch(e){send(c,{type:'error',message:e.message});}}
const server=http.createServer(async(req,res)=>{try{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  if(!['/','/index.html','/lab.html','/config.js'].includes(path)&&!['/src/','/public/'].some(p=>path.startsWith(p))){res.writeHead(404);res.end('Not found');return;}
  const file=resolve(root,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(root+'/')){res.writeHead(403);res.end();return;}
  if(!(await stat(file)).isFile())throw Error('Not a file');const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(req.method==='HEAD'?undefined:data);
}catch{res.writeHead(404);res.end('Not found');}});
server.on('upgrade',(req,socket,head)=>{
  if(req.url!=='/signal'||req.headers.upgrade?.toLowerCase()!=='websocket'||!req.headers['sec-websocket-key']||clients.size>=400){socket.destroy();return;}
  try{if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host){socket.destroy();return;}}catch{socket.destroy();return;}
  const key=createHash('sha1').update(req.headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${key}\r\n\r\n`);
  const c={socket,id:'p-'+randomBytes(12).toString('hex'),code:null,name:'Joueur',buffer:Buffer.alloc(0),fragments:[],fragmentBytes:0,window:Date.now(),count:0,removed:false,lastSeen:Date.now()};clients.add(c);
  const parse=data=>{
    c.buffer=Buffer.concat([c.buffer,data]);if(c.buffer.length>MAX_BYTES+14){socket.destroy();return;}
    while(c.buffer.length>=2){
      const b=c.buffer,fin=!!(b[0]&128),op=b[0]&15,masked=!!(b[1]&128);let length=b[1]&127,offset=2;if((b[0]&0x70)||!masked){socket.destroy();return;}
      if(length===126){if(b.length<4)return;length=b.readUInt16BE(2);offset=4;}
      else if(length===127){if(b.length<10)return;const long=b.readBigUInt64BE(2);if(long>BigInt(MAX_BYTES)){socket.destroy();return;}length=Number(long);offset=10;}
      if(length>MAX_BYTES||(op>=8&&(!fin||length>125))){socket.destroy();return;}if(b.length<offset+4+length)return;
      const mask=b.subarray(offset,offset+4),payload=Buffer.from(b.subarray(offset+4,offset+4+length));for(let i=0;i<length;i++)payload[i]^=mask[i%4];c.buffer=b.subarray(offset+4+length);
      if(op===8){socket.end(frame(8));return;}if(op===9){socket.write(frame(10,payload));continue;}if(op===10)continue;
      if(op===1){if(c.fragments.length){socket.destroy();return;}if(fin)handle(c,payload);else{c.fragments.push(payload);c.fragmentBytes=payload.length;}}
      else if(op===0&&c.fragments.length){c.fragments.push(payload);c.fragmentBytes+=payload.length;if(c.fragmentBytes>MAX_BYTES){socket.destroy();return;}if(fin){handle(c,Buffer.concat(c.fragments));c.fragments=[];c.fragmentBytes=0;}}
      else{socket.destroy();return;}
    }
  };
  socket.on('data',parse);socket.on('error',()=>detach(c));socket.on('close',()=>detach(c));if(head.length)parse(head);
});
const cleanup=setInterval(()=>{for(const c of clients)if(!c.code&&Date.now()-c.lastSeen>60000)c.socket.destroy();for(const room of rooms.values())if(Date.now()-room.created>7200000)for(const c of room.members.values()){send(c,{type:'error',message:'Le salon a expiré.'});c.socket.end(frame(8));}},30000);cleanup.unref();
server.listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`DICESTRICT → http://localhost:${port}\nSignaling: ws://localhost:${port}/signal\nDevelopment only. No XP or wallet API exposed.`));
function close(){for(const c of clients)c.socket.destroy();server.close(()=>process.exit(0));}process.on('SIGTERM',close);process.on('SIGINT',close);
