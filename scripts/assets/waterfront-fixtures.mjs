/** Art fixture selected for a developed marina, NOT an economic inference corpus.
 * One complete legal history; both waterfront properties reach level 3 with seed 1.
 */
import { createGame, applyAction, currentPlayer, fingerprint, assertState } from '../../src/game/engine.js';
import { botAction } from '../../src/game/bots.js';
function waterfrontFixtures(){
 let s=createGame([{id:'you',name:'Vous'},{id:'friend',name:'Ami'}],1,{id:'waterfront-review-1',rounds:18,casino:true});
 const initial=structuredClone(s),commands=[],checkpoints={start:{state:initial,commandCount:0}},episodes={};
 while(s.phase!=='finished'){
  if(commands.length>2000)throw Error('History bound exceeded');
  if(s.round>=9&&!checkpoints.middle)checkpoints.middle={state:structuredClone(s),commandCount:commands.length};
  if(s.phase==='roll')checkpoints.late={state:structuredClone(s),commandCount:commands.length};
  const actor=currentPlayer(s).id,action=botAction(s,'builder'),before=s;s=applyAction(s,actor,action);assertState(s);
  if(action.type==='UPGRADE'&&[8,9].includes(action.tile)&&!episodes.upgrade)episodes.upgrade={actor,action,before,after:s};
  if(!episodes.mortgage)for(const tile of [8,9]){try{const after=applyAction(before,actor,{type:'MORTGAGE',tile});episodes.mortgage={actor,action:{type:'MORTGAGE',tile},before,after};break;}catch{/* Only reducer-legal actions. */}}
  commands.push({actor,action,fingerprint:fingerprint(s)});
 }
 for(const c of Object.values(checkpoints)){c.fingerprint=fingerprint(c.state);c.owned=c.state.properties.filter(p=>p.owner).length;c.levels=c.state.properties.reduce((n,p)=>n+p.level,0);}
 if(!episodes.upgrade||!episodes.mortgage)throw Error('Missing legal waterfront transitions');
 return {schema:1,seed:1,description:'Two simulated seats, builder policy, eighteen rounds. Seed selected to expose both marina level-3 silhouettes; not a balance study or a normal starting city.',initial,commands,checkpoints,episodes,finalFingerprint:fingerprint(s)};
}
export { waterfrontFixtures };
