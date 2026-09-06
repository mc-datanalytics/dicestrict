import { DEAL_TYPES } from '../game/deals.js';
import { CONFIG } from "../../config.js";
import { createGame, applyAction, fingerprint, randomSeed } from "../game/engine.js";
import { readPacket, packet, createLimiter } from "./protocol.js";
/** Host-authoritative CASUAL rooms. WebRTC data channels carry play, never reward proofs. */
class RoomSession {
  constructor({onLobby,onState,onError,onClosed}){
    Object.assign(this,{onLobby,onState,onError,onClosed});this.peers=new Map();this.room=null;this.state=null;this.closed=false;this.paused=false;this.ready=new Set();this.rules={rounds:12,mobility:2,finishOnBankruptcy:false,casino:true};
  }
  async connect(kind,name,code=''){
    if(!globalThis.RTCPeerConnection)throw Error('Ce navigateur ne prend pas en charge WebRTC.');
    if(this.ws && !this.closed)throw Error('Une connexion est déjà ouverte.');
    this.closed=false;this.paused=false;this.ready.clear();
    const configured=CONFIG.signalUrl;
    if(location.protocol==='file:'&&!configured)throw Error('Lancez npm run dev pour jouer entre amis, ou configurez un service de signalisation.');
    const url=configured??`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/signal`;
    this.ice={iceServers:CONFIG.iceServers};
    // Relay credentials are short-lived and supplied by a controlled service, never hardcoded.
    if(CONFIG.turnCredentialsUrl){const r=await fetch(CONFIG.turnCredentialsUrl,{credentials:'omit',signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Le relais de connexion est indisponible.');const body=await r.json();if(!Array.isArray(body.iceServers))throw Error('Configuration du relais invalide.');this.ice={iceServers:body.iceServers};}
    return new Promise((resolve,reject)=>{
      let settled=false;this.ws=new WebSocket(url);const timer=setTimeout(()=>{if(!settled){settled=true;this.leave();reject(Error('Signalisation inaccessible. Lancez npm run dev ou configurez votre service réseau.'));}},12000);
      this.ws.onopen=()=>this.ws.send(JSON.stringify({type:kind,name,code}));
      this.ws.onmessage=async event=>{
        try{
          if(typeof event.data!=='string'||event.data.length>80000)throw Error('Signal trop volumineux.');
          const msg=JSON.parse(event.data);
          if(msg.type==='room'){
            this.room=msg;this.isHost=msg.selfId===msg.hostId;this.localId=msg.selfId;this.ready.add(this.localId);
            this.emitLobby();if(!settled){settled=true;clearTimeout(timer);resolve(this.room);}this.armHeartbeat();
          }else if(msg.type==='members'){
            if(!this.room)return;this.room.members=msg.members;this.emitLobby();
            if(this.isHost)for(const member of msg.members)if(member.id!==this.localId&&!this.peers.has(member.id))await this.offer(member.id);
          }else if(msg.type==='signal')await this.receiveSignal(msg.from,msg.signal);
          else if(msg.type==='left'){
            this.peers.get(msg.id)?.pc.close();this.peers.delete(msg.id);this.ready.delete(msg.id);
            if(this.room)this.room.members=this.room.members.filter(m=>m.id!==msg.id);
            if(this.state)this.fail('Un joueur a quitté la partie. Cette version ne migre pas encore les hôtes.');else this.emitLobby();
          }else if(msg.type==='error'){
            const error=Error(String(msg.message??'Erreur réseau.').slice(0,180));
            if(!settled){settled=true;clearTimeout(timer);this.leave();reject(error);}else this.fail(error.message);
          }
        }catch(error){if(!settled){settled=true;clearTimeout(timer);this.leave();reject(error);}else this.onError(error.message);}
      };
      this.ws.onerror=()=>{if(!settled){settled=true;clearTimeout(timer);this.leave();reject(Error('Impossible de joindre la signalisation. Vérifiez l’URL du service et votre connexion.'));}};
      this.ws.onclose=()=>{if(!this.closed){if(!settled){settled=true;clearTimeout(timer);reject(Error('Connexion au salon interrompue.'));}this.fail('La connexion au salon a été interrompue.');}};
    });
  }
  signal(to,signal){if(this.ws?.readyState===WebSocket.OPEN)this.ws.send(JSON.stringify({type:'signal',to,signal}));}
  createPeer(id){
    if(this.peers.has(id))return this.peers.get(id);
    const pc=new RTCPeerConnection(this.ice),peer={pc,channel:null,candidates:[],lastSeen:Date.now(),limit:createLimiter(),ingress:createLimiter(120),seen:new Set()};this.peers.set(id,peer);
    pc.onicecandidate=e=>{if(e.candidate)this.signal(id,{candidate:e.candidate.toJSON()});};
    pc.ondatachannel=e=>this.attach(id,e.channel);
    pc.onconnectionstatechange=()=>{if(['failed','closed'].includes(pc.connectionState)&&!this.closed){this.ready.delete(id);if(this.state)this.fail('La liaison directe avec un joueur est perdue.');else this.emitLobby();}};
    return peer;
  }
  async offer(id){const peer=this.createPeer(id);this.attach(id,peer.pc.createDataChannel('dicestrict',{ordered:true}));await peer.pc.setLocalDescription(await peer.pc.createOffer());this.signal(id,{description:peer.pc.localDescription.toJSON()});}
  async receiveSignal(id,signal){
    if(!this.room||!this.room.members.some(m=>m.id===id)||(!this.isHost&&id!==this.room.hostId))return;
    const p=this.createPeer(id);
    if(signal.description){await p.pc.setRemoteDescription(signal.description);for(const c of p.candidates.splice(0))await p.pc.addIceCandidate(c);
      if(signal.description.type==='offer'){await p.pc.setLocalDescription(await p.pc.createAnswer());this.signal(id,{description:p.pc.localDescription.toJSON()});}}
    else if(signal.candidate){if(p.pc.remoteDescription)await p.pc.addIceCandidate(signal.candidate);else if(p.candidates.length<50)p.candidates.push(signal.candidate);}
  }
  attach(id,channel){
    const p=this.peers.get(id);p.channel=channel;
    channel.onopen=()=>{p.lastSeen=Date.now();this.ready.add(id);this.send(id,'ready');this.emitLobby();if(this.isHost)this.broadcast('roster',{ready:[...this.ready]});};
    channel.onmessage=e=>{try{if(!p.ingress())throw Error('Trop de paquets réseau.');p.lastSeen=Date.now();const msg=readPacket(e.data);this.receive(id,msg,p);}catch(error){this.onError(error.message);}};
    channel.onclose=()=>{if(!this.closed){this.ready.delete(id);if(this.state)this.fail('Un joueur s’est déconnecté. La partie est suspendue.');else this.emitLobby();}};
    channel.onerror=()=>this.onError('Le canal multijoueur a rencontré une erreur.');
  }
  send(id,type,body={}){const ch=this.peers.get(id)?.channel;if(ch?.readyState==='open'&&ch.bufferedAmount<128000)ch.send(packet(type,body));}
  broadcast(type,body={}){for(const id of this.peers.keys())this.send(id,type,body);}
  receive(id,msg,peer){
    if(msg.type==='ping'){this.send(id,'pong');return;}if(msg.type==='pong')return;
    if(this.isHost){
      if(msg.type==='ready'){this.ready.add(id);this.send(id,'lobby-rules',{rules:this.rules});this.broadcast('roster',{ready:[...this.ready]});this.emitLobby();return;}
      if(msg.type==='resync'){if(this.state&&peer.limit())this.send(id,'snapshot',{state:this.state});return;}
      if(msg.type!=='action'||!this.state||this.paused||!peer.limit())return;
      if(peer.seen.has(msg.requestId))return;peer.seen.add(msg.requestId);if(peer.seen.size>256)peer.seen.delete(peer.seen.values().next().value);
      // Public offers are immutable and revalidated atomically, so a concurrent turn must not silently discard a valid response.
      const safeConcurrentDeal=(DEAL_TYPES.includes(msg.action.type)||msg.action.type==='CASINO_BET')&&Number.isInteger(msg.revision)&&msg.revision>=0&&msg.revision<=this.state.revision;
      if(msg.gameId!==this.state.id||(msg.revision!==this.state.revision&&!safeConcurrentDeal)){this.send(id,'snapshot',{state:this.state});return;}
      try{this.commit(id,msg.action);}catch(e){this.send(id,'error',{message:e.message});}
    }else{
      if(id!==this.room.hostId)return;
      if(msg.type==='roster'&&Array.isArray(msg.ready)){this.ready=new Set(msg.ready.filter(x=>typeof x==='string'));this.emitLobby();}
      if(msg.type==='lobby-rules'&&!this.state){this.rules=msg.rules;this.emitLobby();}
      if(msg.type==='snapshot'){this.state=msg.state;this.onState(this.state);}
      if(msg.type==='commit'){
        if(!this.state||msg.gameId!==this.state.id||msg.baseRevision!==this.state.revision){this.send(id,'resync');return;}
        const next=applyAction(this.state,msg.actor,msg.action);
        if(fingerprint(next)!==msg.checksum){this.send(id,'resync');this.onError('Écart de synchronisation détecté. Resynchronisation…');return;}
        this.state=next;this.onState(this.state);
      }
      if(msg.type==='error')this.onError(String(msg.message??'Action refusée.').slice(0,180));
    }
  }
  setRules(rules){
    if(!this.isHost||this.state)throw Error('Les règles sont fixées avant le début de la partie.');
    readPacket(packet('lobby-rules',{rules}));this.rules={...rules};this.broadcast('lobby-rules',{rules:this.rules});this.emitLobby();
  }
  start(rounds=this.rules.rounds, options=this.rules){
    if(this.state&&this.state.phase!=='finished')throw Error('Terminez la partie actuelle avant la revanche.');
    if(!this.isHost||this.paused)throw Error('Seul l’hôte peut lancer la partie.');
    if(this.room.members.some(m=>!this.ready.has(m.id)))throw Error('Attendez que tous les joueurs soient connectés.');
    const seats=this.room.members.map(m=>({id:m.id,name:m.name,bot:false}));
    const botNames=['Nova','Sacha','Milo'];while(seats.length<4)seats.push({id:`bot-${seats.length}`,name:botNames[seats.length-1]??'Nova',bot:true});
    this.state=createGame(seats,randomSeed(),{...options,rounds,id:`room-${crypto.randomUUID()}`});
    this.ws.send(JSON.stringify({type:'lock',locked:true}));this.broadcast('snapshot',{state:this.state});this.onState(this.state);
  }
  act(action){
    if(this.paused||!this.state)throw Error('La partie n’est pas disponible.');
    if(this.isHost)this.commit(this.localId,action);
    else this.send(this.room.hostId,'action',{requestId:crypto.randomUUID(),gameId:this.state.id,revision:this.state.revision,action});
  }
  commit(actor,action){if(!this.isHost||this.paused||!this.state)throw Error('Hôte indisponible.');const baseRevision=this.state.revision;this.state=applyAction(this.state,actor,action);this.broadcast('commit',{gameId:this.state.id,actor,action,baseRevision,checksum:fingerprint(this.state)});this.onState(this.state);}
  rematch(rounds=this.rules.rounds){this.start(rounds);}
  emitLobby(){if(this.room)this.onLobby({...this.room,rules:this.rules,isHost:this.isHost,members:this.room.members.map(m=>({...m,ready:this.ready.has(m.id)}))});}
  armHeartbeat(){clearInterval(this.heartbeat);this.heartbeat=setInterval(()=>{if(this.closed)return;this.broadcast('ping');for(const p of this.peers.values())if(p.channel?.readyState==='open'&&Date.now()-p.lastSeen>25000)this.fail('Un joueur ne répond plus. La partie est suspendue.');},5000);}
  fail(message){if(this.closed||this.paused)return;this.paused=true;this.onClosed(message);}
  leave(){this.closed=true;clearInterval(this.heartbeat);for(const p of this.peers.values())p.pc.close();this.peers.clear();this.ready.clear();this.ws?.close();this.room=null;this.state=null;}
}

export { RoomSession };
