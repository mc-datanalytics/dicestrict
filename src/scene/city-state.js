import { BOARD, GROUPS, COLORS, tilePosition } from '../game/board.js';
/** Read-only projection of the economy; no state writes, game RNG or network entities. */
function deriveCity(s) {
  const districts = GROUPS.map((group,id) => {
    const tiles=BOARD.filter(t=>t.group===id && t.kind==='lot');
    const owner=s.properties[tiles[0].id].owner;
    const complete=Boolean(owner)&&tiles.every(t=>s.properties[t.id].owner===owner&&!s.properties[t.id].mortgaged);
    return {id, name:group.name, owner:complete?owner:null, complete};
  });
  const parcels = BOARD.filter(t=>t.kind==='lot').map(t => {
    const p=s.properties[t.id], district=districts[t.group];
    const active=Boolean(p.owner)&&!p.mortgaged;
    const tier=p.owner?p.level+1:0;
    const activity=active ? 1+p.level*2+(district.complete?1:0) : 0;
    const [x,z]=tilePosition(t.id).map(v=>v*.65);
    return {id:t.id, group:t.group, owner:p.owner, level:p.level, tier, active, mortgaged:p.mortgaged, activity, complete:district.complete, x,z,
      color:p.owner?COLORS[s.players.findIndex(q=>q.id===p.owner)]:t.color, districtColor:t.color};
  });
  const development=parcels.reduce((n,p)=>n+p.level,0), owned=parcels.filter(p=>p.owner).length;
  const activity=parcels.reduce((n,p)=>n+p.activity,0);
  return {parcels,districts,development,owned,activity,signature:JSON.stringify(parcels.map(p=>[p.id,p.owner,p.level,p.mortgaged]))};
}
function cityTransitions(previous,next) {
  if (!previous) return {construction:[],celebrations:[]};
  return {
    construction:next.parcels.filter(p=>p.owner&&(p.tier>previous.parcels.find(q=>q.id===p.id).tier)),
    celebrations:next.districts.filter(d=>d.complete&&previous.districts[d.id].owner!==d.owner),
  };
}
function squareRoute(t, radius) {
  const k=((t%4)+4)%4, side=Math.floor(k), u=k-side;
  return side===0?{x:radius-u*2*radius,z:radius,yaw:-Math.PI/2}:
    side===1?{x:-radius,z:radius-u*2*radius,yaw:Math.PI}:
    side===2?{x:-radius+u*2*radius,z:-radius,yaw:Math.PI/2}:
    {x:radius,z:-radius+u*2*radius,yaw:0};
}
/** Cars move more slowly through busy blocks: greater visual density, not a gameplay tax. */
function trafficPosition(phase,city,radius=4.48) {
  const weights=BOARD.map(t=>1+(city.parcels.find(p=>p.id===t.id)?.activity??0)*.35);
  const total=weights.reduce((a,b)=>a+b,0);let distance=(((phase%1)+1)%1)*total;
  for(let i=0;i<weights.length;i++) {
    if(distance<=weights[i]||i===weights.length-1)return squareRoute((i+distance/weights[i])/7,radius);
    distance-=weights[i];
  }
}
function cityBudget(city,quality='high',reduced=false,living=true) {
  if(reduced||!living)return {cars:0,pedestrians:0,rain:0};
  return {cars:Math.min(quality==='low'?6:18,3+Math.floor(city.activity/5)),pedestrians:Math.min(quality==='low'?12:48,city.activity*2),rain:quality==='low'?0:24};
}
export { deriveCity, cityTransitions, squareRoute, trafficPosition, cityBudget };
