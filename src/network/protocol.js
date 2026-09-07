import { validOpening } from '../game/opening.js';
import { validateAction, assertState } from "../game/engine.js";
const PROTOCOL = 6;
const MAX_PACKET_BYTES = 32768;
function readPacket(raw) {
  if (typeof raw !== 'string' || raw.length > MAX_PACKET_BYTES || new TextEncoder().encode(raw).byteLength > MAX_PACKET_BYTES) throw Error('Paquet réseau invalide.');
  const p = JSON.parse(raw);
  if (!p || Array.isArray(p) || p.v !== PROTOCOL || typeof p.type !== 'string') throw Error('Version réseau incompatible.');
  if (['action','commit'].includes(p.type) && (typeof p.gameId !== 'string' || p.gameId.length < 1 || p.gameId.length > 100)) throw Error('Partie invalide.');
  if (p.type === 'action') {
    validateAction(p.action);
    if ((!Number.isSafeInteger(p.revision) || p.revision < 0) || typeof p.requestId !== 'string' || !/^[\w-]{1,80}$/.test(p.requestId)) throw Error('Commande invalide.');
  } else if (p.type === 'commit') {
    validateAction(p.action);
    if (typeof p.actor !== 'string' || (!Number.isSafeInteger(p.baseRevision) || p.baseRevision < 0) || !/^[a-f0-9]{8}$/.test(p.checksum)) throw Error('Commit invalide.');
  } else if (p.type === 'lobby-rules') {
    const r=p.rules;if(!r||Object.keys(r).length!==4||!validOpening(r.opening)||!Number.isInteger(r.rounds)||r.rounds<4||r.rounds>30||typeof r.finishOnBankruptcy!=='boolean'||typeof r.casino!=='boolean')throw Error('Règles de salon invalides.');
  } else if (p.type === 'snapshot') assertState(p.state);
  else if (!['ready','resync','ping','pong','error','roster'].includes(p.type)) throw Error('Message inconnu.');
  return p;
}
function packet(type,body={}) { return JSON.stringify({v:PROTOCOL,type,...body}); }
function createLimiter(limit=12,windowMs=10000) {
  let start=0,count=0;
  return (now=Date.now())=>{if(now-start>=windowMs){start=now;count=0;}return ++count<=limit;};
}

export { PROTOCOL,MAX_PACKET_BYTES,readPacket,packet,createLimiter };
