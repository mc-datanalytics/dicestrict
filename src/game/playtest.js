import { createGame, applyAction, assertState, fingerprint } from './engine.js';
import { RULES } from './board.js';
const MAX_COMMANDS = 4000, MAX_TIME = 172800000;
const requireOK = (ok, message) => { if (!ok) throw Error(message); };
/** In-memory, opt-in recorder. No localStorage, network or account access.
 * A valid file proves deterministic replay, NOT that people played or that its
 * author/host was honest. Never use it to award money, XP or leaderboard points. */
class PlaytestRecorder {
  constructor(initial) {
    assertState(initial);
    requireOK(initial.revision === 0, 'Enregistrez dès le début de la partie.');
    this.ids = Object.fromEntries(initial.players.map((p,i) => [p.id,`seat-${i+1}`]));
    this.gameId = initial.id; this.trace = []; this.problem = null; this.elapsed = 0;
    this.initial = createGame(initial.players.map((p,i) => ({id:`seat-${i+1}`,name:`Joueur ${i+1}`,bot:p.bot})),initial.rng,
      {id:'playtest',rounds:initial.maxRounds,mobility:initial.mobility,finishOnBankruptcy:initial.finishOnBankruptcy,casino:initial.casino.enabled,opening:initial.opening});
    this.state = this.initial;
    requireOK(this.equivalent(initial), 'État initial différent des règles annoncées.');
  }
  rename(id) { return Object.hasOwn(this.ids,id) ? this.ids[id] : id; }
  canonical(source, remap = true) {
    const s=structuredClone(source), rename=id=>remap?this.rename(id):id;
    s.id='playtest'; s.log=[];
    s.players.forEach((p,i)=>{p.id=rename(p.id);p.name=`Joueur ${i+1}`;});
    s.properties.forEach(p=>{if(p.owner!==null)p.owner=rename(p.owner);});
    s.winners=s.winners.map(rename);
    s.deals.forEach(d=>{d.from=rename(d.from);d.to=rename(d.to);});
    s.casino.results.forEach(r=>{r.actor=rename(r.actor);});
    if(s.auction){s.auction.highBidder=rename(s.auction.highBidder);s.auction.passed=s.auction.passed.map(rename);}
    return s;
  }
  equivalent(source) { return JSON.stringify(this.canonical(source))===JSON.stringify(this.canonical(this.state,false)); }
  observe(source, command, elapsedMs) {
    if (source.id !== this.gameId || this.problem || this.state.phase === 'finished') return;
    if (source.revision === this.state.revision && this.equivalent(source)) return;
    try {
      requireOK(command && this.trace.length < MAX_COMMANDS, 'Commandes manquantes ou limite atteinte.');
      requireOK(Number.isSafeInteger(elapsedMs) && elapsedMs >= this.elapsed && elapsedMs <= MAX_TIME, 'Horodatage invalide.');
      const actor=Object.hasOwn(this.ids,command.actor)?this.ids[command.actor]:null, action=structuredClone(command.action);
      if(action?.to!==undefined)action.to=this.rename(action.to);
      requireOK(actor, 'Acteur inconnu.');
      const previous=this.state;
      this.state=applyAction(this.state,actor,action);
      if (!this.equivalent(source)) {this.state=previous;throw Error('Resynchronisation ou divergence : trace incomplète.');}
      this.elapsed=elapsedMs;this.trace.push({actor,action,elapsedMs,checksum:fingerprint(this.state)});
    } catch (e) { this.problem=String(e.message); }
  }
  export() {
    return {schema:'dicestrict-playtest',version:1,engineVersion:RULES.version,
      provenance:'unverified-local-session',humanParticipationVerified:false,
      status:this.problem?'discontinuous':this.state.phase==='finished'?'complete':'partial',
      initial:structuredClone(this.initial),trace:structuredClone(this.trace),finalChecksum:fingerprint(this.state),
      problem:this.problem};
  }
}
function verifyPlaytest(record) {
  requireOK(record?.schema==='dicestrict-playtest' && record.version===1 && record.engineVersion===RULES.version, 'Version de trace incompatible.');
  requireOK(record.provenance==='unverified-local-session' && record.humanParticipationVerified===false, 'La trace ne certifie pas une participation humaine.');
  requireOK(['complete','partial','discontinuous'].includes(record.status), 'Statut invalide.');
  const initial=record.initial; assertState(initial);
  requireOK(initial.id==='playtest' && initial.revision===0 && initial.players.every((p,i)=>p.id===`seat-${i+1}`&&p.name===`Joueur ${i+1}`), 'La trace doit être pseudonymisée.');
  const expected=new PlaytestRecorder(initial).initial;
  requireOK(JSON.stringify(initial)===JSON.stringify(expected), 'État initial altéré.');
  requireOK(Array.isArray(record.trace)&&record.trace.length<=MAX_COMMANDS, 'Trop de commandes.');
  let state=initial,previousTime=0,offers=0,accepted=0,counters=0;
  for(const c of record.trace){
    requireOK(c&&Number.isSafeInteger(c.elapsedMs)&&c.elapsedMs>=previousTime&&c.elapsedMs<=MAX_TIME, 'Horodatage invalide.');
    state=applyAction(state,c.actor,c.action);requireOK(fingerprint(state)===c.checksum,'Rejeu divergent.');previousTime=c.elapsedMs;
    if(c.action.type==='OFFER_DEAL'){offers++;if(c.action.counterOf!==undefined)counters++;}
    if(c.action.type==='ACCEPT_DEAL')accepted++;
  }
  requireOK(fingerprint(state)===record.finalChecksum, 'Empreinte finale divergente.');
  requireOK(record.status!=='complete'||state.phase==='finished', 'Partie faussement déclarée terminée.');
  return {state,summary:{opening:state.opening,status:record.status,commands:record.trace.length,offers,accepted,counters,
    declaredHumanSeats:initial.players.filter(p=>!p.bot).length,humanParticipationVerified:false,elapsedMs:previousTime}};
}
export { PlaytestRecorder, verifyPlaytest, MAX_COMMANDS };
