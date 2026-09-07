/** Three legal checkpoints from ONE real reducer history. No free cash/property injection. */
import { createGame,applyAction,currentPlayer,assertState,fingerprint } from '../../src/game/engine.js';
import { botAction } from '../../src/game/bots.js';
function civicFixtures(){
 const seed=16,settings={id:'civic-phase3-history-16',rounds:18,casino:true};
 let s=createGame([{id:'you',name:'Vous'},{id:'friend',name:'Ami'}],seed,settings);
 const initial=structuredClone(s),commands=[],checkpoints={start:{commandCount:0,state:initial}},episodes={};
 while(s.phase!=='finished'){
  if(commands.length>2000)throw Error('Civic history failed to terminate');
  if(s.round>=9&&!checkpoints.middle)checkpoints.middle={commandCount:commands.length,state:structuredClone(s)};
  if(s.phase==='roll')checkpoints.late={commandCount:commands.length,state:structuredClone(s)};
  const actor=currentPlayer(s).id,action=botAction(s,'builder');
  if(!episodes.mortgage&&['roll','end'].includes(s.phase))for(let tile=0;tile<s.properties.length;tile++){
    try {const after=applyAction(s,actor,{type:'MORTGAGE',tile});episodes.mortgage={actor,action:{type:'MORTGAGE',tile},before:structuredClone(s),after};break;}catch{/* Try only reducer-legal candidates. */}
  }
  const before=s;s=applyAction(s,actor,action);assertState(s);
  if(!episodes.upgrade&&action.type==='UPGRADE')episodes.upgrade={actor,action,before,after:s};
  commands.push({actor,action,fingerprint:fingerprint(s)});
 }
 for(const c of Object.values(checkpoints)){assertState(c.state);c.fingerprint=fingerprint(c.state);c.owned=c.state.properties.filter(p=>p.owner).length;c.levels=c.state.properties.reduce((n,p)=>n+p.level,0);}
 return {schema:1,seed,settings,policy:'builder',description:'Existing Grand District (18 rounds), two simulated seats. Late checkpoint is the last roll phase before the match finishes. Performance/art fixture, not a balance study.',initial,commands,checkpoints,episodes,finalFingerprint:fingerprint(s)};
}
export { civicFixtures };
