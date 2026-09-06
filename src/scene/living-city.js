import { CivicCenter } from './civic.js';
import { Districts, DISTRICT_LOTS } from './districts.js';
import { Marina, MARINA_LOTS } from './marina.js';
import { Geometry } from './geometry.js';
import { model } from './math.js';
import { deriveCity, cityTransitions, squareRoute, trafficPosition, cityBudget } from './city-state.js';

const stone='#f3e7cc', ink='#315e55', gold='#e7be66', glass='#8bc4c3';
function tree(g,x,z,s=.8) {
  g.block([x,.55,z],[.055,.4,.055],'#aa8a63');
  g.sphere([x,.85,z],.24,'#7fac87',8,5,[s,1.2*s,s]);
}
function windows(g,x,z,w,d,h,active=true) {
  g.material=active?2:0;
  const color=active?'#ffe4a0':'#597c79';
  const floors=Math.max(1,Math.floor(h/.29));
  for(let j=0;j<floors;j++)for(let i=0;i<2;i++) {
    const y=.54+j*.28;if(y>.43+h-.07)continue;
    for(const sign of [-1,1]) {
      g.block([x+(i-.5)*w*.48,y,z+sign*(d/2+.008)],[w*.2,.13,.012],color);
      g.block([x+sign*(w/2+.008),y,z+(i-.5)*d*.5],[.012,.13,d*.22],color);
    }
  }
  g.material=0;
}
function tower(g,x,z,w,d,h,color,active) {
  g.box([x,.44+h/2,z],[w,h,d],color,.025);
  g.block([x,.46+h,z],[w+.07,.07,d+.07],stone);
  windows(g,x,z,w,d,h,active);
  g.block([x+.12,.55+h,z-.12],[.2,.14,.18],'#a5bdb5');
}
function terrace(g,x,z,color) {
  for(let i=0;i<2;i++) {
    const xx=x+(i-.5)*.32;
    g.cylinder([xx,.57,z],.10,.05,stone,8);
    g.block([xx,.51,z],[.028,.15,.028],ink);
    for(const zz of [-.14,.14])g.block([xx,.52,z+zz],[.10,.10,.08],color);
  }
  g.cylinder([x,.72,z],.014,.53,ink,6);
  g.cylinder([x,.97,z],.31,.07,color,10,.08);
}
function parcelGeometry(city,legacyDistricts=false) {
  const g=new Geometry();
  for(const p of city.parcels) {
    if(!legacyDistricts&&DISTRICT_LOTS.includes(p.id))continue;
    const {x,z}=p;
    g.box([x,.43,z],[.96,.09,.95],p.owner?'#d7dfcc':'#a8c8a8',.045);
    if(!p.owner) {
      tree(g,x-.22,z,.65);g.block([x+.16,.48,z+.18],[.32,.045,.09],'#c3ad82');
      // Empty but not abandoned: park and a small development marker.
      g.block([x+.24,.55,z-.22],[.025,.23,.025],ink);
      g.block([x+.24,.66,z-.22],[.21,.14,.018],p.districtColor);
      continue;
    }
    if(MARINA_LOTS.includes(p.id))continue; // Dedicated volumetric waterfront variants.
    const color=p.mortgaged?'#a8b6af':p.districtColor;
    const heights=[0,.38,.82,1.4,2.05];
    tower(g,x-.08,z-.06,p.tier===4?.66:.59,.59,heights[p.tier],color,p.active);
    // Owner's color is visible both at the board edge and on the actual block.
    g.block([x,.505,z+.43],[.85,.035,.06],p.color);
    g.material=p.active?3:0;
    g.block([x-.08,.69,z+.25],[.58,.08,.06],p.active?p.color:'#78887f');g.material=0;
    if(p.tier>=2) {
      terrace(g,x+.05,z+.57,color);
      g.block([x+.28,.50,z-.38],[.26,.08,.18],'#789a75');
    }
    if(p.tier>=3) {
      tower(g,x+.34,z-.22,.23,.34,heights[p.tier]*.61,p.color,p.active);
      g.block([x-.08,heights[p.tier]+.52,z+.01],[.35,.04,.29],glass);
    }
    if(p.tier===4) {
      g.cylinder([x-.08,2.75,z-.06],.024,.52,gold,8);
      g.material=3;g.sphere([x-.08,3.03,z-.06],.06,gold,8,5);g.material=0;
    }
  }
  return g;
}
function infrastructure() {
  const g=new Geometry();
  // Two closed roads. The outside bus lane never obscures the property labels.
  for(const radius of [4.48,6.98])for(const side of [-1,1]) {
    g.block([0,.378,side*radius],[radius*2+.5,.04,.48],'#748c84');
    g.block([side*radius,.379,0],[.48,.04,radius*2+.5],'#748c84');
    for(let x=-radius+.5;x<radius-.3;x+=.65) {
      g.block([x,.402,side*radius],[.25,.007,.025],stone);
      g.block([side*radius,.402,x],[.025,.007,.25],stone);
    }
  }
  // The park paths, fountain and casino now belong to the continuous civic corridor.
  // Small civic pavilion, intentionally not linked to ownership.
  tower(g,1.3,-1.65,.70,.78,.73,stone,true);
  g.cylinder([1.3,1.35,-1.65],.34,.20,'#89aa95',12,.07);
  // Metro portals and a surface segment: a modest tram/metro visual, not a transport rule.
  for(const x of [-2.25,2.3]) {
    g.block([x,.45,-2.55],[.58,.09,.42],ink);
    g.box([x,.69,-2.55],[.63,.43,.48],stone,.035);
    g.block([x,.67,-2.29],[.4,.3,.03],ink);
    g.material=3;g.block([x,.98,-2.55],[.16,.18,.03],'#70c6d1');g.material=0;
  }
  for(const z of [-2.51,-2.68])g.block([0,.42,z],[4.1,.02,.025],'#b7b2a3');
  // Zebra crossings and bus shelters.
  for(const z of [-4.48,4.48])for(let i=0;i<5;i++)g.block([.5+(i-2)*.10,.405,z],[.055,.009,.42],stone);
  for(const x of [-6.62,6.62]) {
    g.block([x,.57,1.2],[.035,.4,.62],glass);
    g.block([x,.82,1.2],[.45,.05,.80],stone);
    g.block([x,.54,1.2],[.18,.12,.55],ink);
  }
  return g;
}
function vehicle(color,kind='car') {
  const g=new Geometry(),length=kind==='bus'?.68:.34;
  g.block([0,.08,0],[.19,.13,length],color);
  g.block([0,.19,-.025],[.17,.11,length*.7],glass);
  g.block([0,.25,-.025],[.20,.025,length*.75],color);
  for(const x of [-.1,.1])for(const z of [-length*.30,length*.30])g.block([x,.035,z],[.035,.075,.07],ink);
  g.material=3;for(const x of [-.065,.065])g.block([x,.10,length/2+.004],[.037,.033,.012],stone);g.material=0;
  return g;
}
function person(color) {
  const g=new Geometry();g.block([0,.10,0],[.055,.13,.038],color);
  g.sphere([0,.20,0],.040,'#e2b993',7,4);
  g.block([-.019,.021,0],[.018,.05,.026],ink);g.block([.019,.021,0],[.018,.05,.026],ink);return g;
}
function crane() {
  const g=new Geometry();g.block([0,.60,0],[.07,1.2,.07],gold);
  for(let y=.1;y<1.2;y+=.18){g.block([0,y,0],[.13,.025,.13],stone);}
  g.block([.21,1.21,0],[.94,.065,.08],gold);
  g.block([.63,.93,0],[.012,.55,.012],ink);
  g.block([.63,.63,0],[.08,.025,.035],gold);
  g.block([-.24,1.16,0],[.16,.16,.16],ink);return g;
}
class LivingCity {
  constructor(renderer) {
    this.renderer=renderer;this.city=null;this.elapsed=0;this.cranes=[];this.celebrations=[];this.quality='high';this.reduced=false;this.living=true;
    this.staticMesh=renderer.mesh(infrastructure());this.marina=new Marina(renderer);this.districts=new Districts(renderer);this.civic=new CivicCenter(renderer);
    this.cars=['#db947e','#e0c477','#79b2bb','#e6e3d5'].map(c=>renderer.mesh(vehicle(c)));
    this.bus=renderer.mesh(vehicle('#dcb875','bus'));this.ambulance=renderer.mesh(vehicle('#f1f1df'));
    this.people=['#567d77','#de917b','#b5a2ce','#d9b16b'].map(c=>renderer.mesh(person(c)));
    this.crane=renderer.mesh(crane());
    const droplet=new Geometry();droplet.block([0,0,0],[.008,.11,.008],'#abced6');this.drop=renderer.mesh(droplet);
    const spark=new Geometry();spark.block([0,0,0],[.035,.035,.035],gold);spark.material=0;this.spark=renderer.mesh(spark);
    const water=new Geometry();water.sphere([0,0,0],.028,'#c2e6dc',6,4);this.water=renderer.mesh(water);
    const siren=new Geometry();siren.material=3;siren.block([0,0,0],[.12,.04,.06],'#88cfe5');this.siren=renderer.mesh(siren);
  }
  configure(settings) { this.civic.configure(settings);this.marina.configure(settings);this.districts.configure(settings);Object.assign(this,{quality:settings.quality??this.quality,reduced:settings.reduced??this.reduced,living:settings.living??this.living});if(this.reduced||!this.living){this.cranes=[];this.celebrations=[];} }
  setState(s) {
    const next=deriveCity(s),reset=this.gameId!==s.id;
    if(!reset&&this.city?.signature===next.signature)return;
    const changes=cityTransitions(reset?null:this.city,next);
    this.gameId=s.id;this.city=next;this.marina.setCity(next);this.districts.setCity(next);
    if(reset){this.cranes=[];this.celebrations=[];}
    if(!this.reduced&&this.living) {
      for(const p of changes.construction)this.cranes.push({id:p.id,x:p.x,z:p.z,until:this.elapsed+6});
      for(const d of changes.celebrations)this.celebrations.push({group:d.id,until:this.elapsed+4});
      this.cranes=this.cranes.slice(-16);this.celebrations=this.celebrations.slice(-8);
    }
    this.renderer.drop(this.parcelMesh);this.parcelMesh=this.renderer.mesh(parcelGeometry(next));
  }
  objects(seconds,rain=0) {
    this.elapsed=seconds;
    const out=[{mesh:this.staticMesh},...this.marina.objects(seconds),...this.districts.objects(),...this.civic.objects()];if(this.parcelMesh)out.push({mesh:this.parcelMesh});
    if(!this.city)return out;
    const running=this.living&&!this.reduced,t=running?seconds:0,budget=cityBudget(this.city,this.quality,this.reduced,this.living);
    this.stats={...budget,owned:this.city.owned,development:this.city.development};
    for(let i=0;i<budget.cars;i++) {
      const p=trafficPosition(i/budget.cars+t*.007,this.city);
      out.push({mesh:this.cars[i%4],model:model(p.x,.414,p.z,0,p.yaw),noShadow:true});
    }
    if(running)for(let i=0;i<2;i++) {
      const p=squareRoute(t*.045+i*2,6.98);
      out.push({mesh:this.bus,model:model(p.x,.414,p.z,0,p.yaw),noShadow:true});
    }
    // Weighted, locally walking crowds keep developed blocks visibly busier.
    const candidates=[];for(const p of this.city.parcels)for(let j=0;j<p.activity*2;j++)candidates.push({p,j});
    for(let i=0;i<budget.pedestrians;i++) {
      const {p,j}=candidates[Math.floor(i*candidates.length/budget.pedestrians)];
      const q=squareRoute(j*.73+t*(.15+(i%3)*.025),.49);
      out.push({mesh:this.people[i%4],model:model(p.x+q.x,.49+Math.abs(Math.sin(t*7+i))*.007,p.z+q.z,0,q.yaw),noShadow:true});
    }
    if(running) {
      // Short surface metro trip between the two portals; local ambient clock only.
      const progress=(t%28)/28;
      if(progress<.75)out.push({mesh:this.bus,model:model(-2.15+progress/.75*4.3,.43,-2.6,0,Math.PI/2),noShadow:true});
      // Occasional ambulance: gentle steady beacon, no strobe or unsolicited siren audio.
      const event=t%100;
      if(event>70&&event<91) {
        const p=squareRoute((event-70)*.19,6.98);
        out.push({mesh:this.ambulance,model:model(p.x,.414,p.z,0,p.yaw),noShadow:true},{mesh:this.siren,model:model(p.x,.70,p.z,0,p.yaw),noShadow:true});
      }
      for(let i=0;i<8;i++) {
        const v=(t*.7+i/8)%1,a=i*Math.PI/4;
        out.push({mesh:this.water,model:model(1.65+Math.cos(a)*v*.48,.88+Math.sin(v*Math.PI)*.30,1.45+Math.sin(a)*v*.48),noShadow:true});
      }
    }
    this.cranes=this.cranes.filter(c=>c.until>t);
    for(const c of this.cranes)out.push({mesh:this.crane,model:model(c.x+.38,.48,c.z-.38,0,Math.sin(t*.4)*.35),noShadow:true});
    this.celebrations=this.celebrations.filter(c=>c.until>t);
    for(const c of this.celebrations)for(const p of this.city.parcels.filter(p=>p.group===c.group))for(let i=0;i<6;i++) {
      const a=i*Math.PI/3+t*.8;
      out.push({mesh:this.spark,model:model(p.x+Math.cos(a)*.55,1+((t+i*.1)%1)*1.4,p.z+Math.sin(a)*.55),noShadow:true});
    }
    if(running&&rain>.1)for(let i=0;i<budget.rain;i++) {
      const x=((i*1.618)%1-.5)*9,z=((i*.731)%1-.5)*9,y=3.5-((t*1.25+i*.38)%1)*3;
      out.push({mesh:this.drop,model:model(x,y,z,0,0,.16),noShadow:true});
    }
    this.stats.objects=out.length;return out;
  }
}
export { LivingCity, parcelGeometry };
