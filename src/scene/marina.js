/** Bounded marina extension. Does not own/modify game state, dice, networking or UI. */
import { MeshBuilder, rgb } from './marina/mesh-builder.js';
import { createAsset, P } from './marina/kit.js';
import { MATERIALS as M } from './marina/surfaces.js';
import { model } from './math.js';
const MARINA_LOTS=Object.freeze([8,9]);
const WATERLINE=.427;
const HARBOR_LIGHTS=new Float32Array([-2.993,1.071,1.04, -2.993,1.071,3.12, -1.40,1.071,.716, -.956,1.071,2.51]);
const LAYOUT=Object.freeze([
  ['quay',[-3.11,.486,1.26],0,1],['quay',[-3.11,.486,2.25],0,1],['quay',[-3.11,.486,2.96],0,[1,1,.45]],
  ['quay',[-2.46,.486,.733],Math.PI/2,[1,1,1.20]],['quay',[-1.37,.486,.733],Math.PI/2,[1,1,.97]],
  ['quay',[-.827,.486,1.50],Math.PI,[.87,1,1.53]],['quay',[-.827,.486,2.53],Math.PI,[.87,1,.53]],
  ['quay',[-2.50,.486,3.274],Math.PI/2,[1,1,1.26]],['quay',[-1.59,.486,3.274],Math.PI/2,[1,1,.62]],
  ['dock',[-1.63,.535,1.445],0,1],['dock',[-1.63,.535,2.44],0,1],
  ['lantern',[-3.122,.484,1.04],0,1],['lantern',[-3.122,.484,3.12],0,1],
  ['lantern',[-1.40,.484,.587],0,1],['lantern',[-.827,.484,2.51],Math.PI,1],
  ['lantern',[-2.06,.484,3.294],-Math.PI/2,1],
  ['bench',[-3.17,.515,2.06],Math.PI/2,1],['bench',[-.798,.515,1.98],-Math.PI/2,1],
  ['bench',[-2.68,.515,3.297],Math.PI,1],
  ['cafe',[-1.395,.521,.668],0,1],['parasol',[-1.395,.521,.668],0,1],
  ['cafe',[-2.57,.522,3.20],Math.PI/2,.88],
  ['palm',[-3.105,.51,.695],0,.77],['palm',[-3.07,.51,3.28],.8,.92],['palm',[-.72,.51,.66],.7,.85],
  ['planter',[-3.13,.516,2.985],0,1],['planter',[-1.80,.516,.63],0,.75],['planter',[-.80,.516,2.91],0,.8],
  ['bollard',[-2.78,.520,.82],0,1],['bollard',[-2.76,.520,3.22],0,1],['bollard',[-1.65,.549,2.92],0,.75],
]);
function waterGeometry() {
  const g=new MeshBuilder();
  g.polygon([[-2.966,WATERLINE,.914],[-1.010,WATERLINE,.914],[-1.010,WATERLINE,2.83],[-1.22,WATERLINE,3.165],[-2.966,WATERLINE,3.165]],'#1d7780',M.water,[0,1,0]);
  return g.build('marina-water');
}
function environment(lod) {
  const g=new MeshBuilder(),cache=new Map();
  for(const [name,p,rotation,scale] of LAYOUT) {
    if(!cache.has(name))cache.set(name,createAsset(name,lod));g.add(cache.get(name),p,rotation,scale);
  }
  // Corner return stops short of the existing dice plaza; no square/road is moved.
  g.prism([[-1.01,2.82],[-.67,2.82],[-1.14,3.45],[-1.29,3.12]],.36,.506,P.stone,M.stone);
  // Quay access steps and actual mooring ropes, batched once with the furniture.
  for(let i=0;i<3;i++)g.box([-2.80,.484-i*.024,.875+i*.077],[.30,.028,.088],P.stone,M.stone);
  for(const z of [1.46,2.39]) {
    const a=[-2.04,.579,z],b=[-1.745,.575,z+.065],middle=[(a[0]+b[0])/2,.529,(a[2]+b[2])/2];
    g.rod(a,middle,.0048,'#c7bda2',M.canvas,5);g.rod(middle,b,.0048,'#c7bda2',M.canvas,5);
  }
  return g.build(`marina-furniture-batch-${lod}`);
}
function ownershipFlag() {
  const g=new MeshBuilder();
  g.rod([0,0,0],[0,.23,0],.005,P.bronze,M.metal,6);
  for(let i=0;i<3;i++)g.box([.024+i*.037,.174,Math.sin(i*1.8)*.010],[.039,.072,.009],'#ffffff',M.canvas);
  return g.build('owner-pennant');
}
class Marina {
  constructor(renderer) {
    this.renderer=renderer;this.cache=new Map();this.city=null;this.detail='low';this.quality='high';this.reduced=false;this.living=true;
    this.builds=0;this.stateUpdates=0;this.renderer.harborLights=HARBOR_LIGHTS;
    this.water=this.upload('water',waterGeometry());this.flag=this.upload('flag',ownershipFlag());
    this.ensureEnvironment();
  }
  upload(key,geometry) {const mesh=this.renderer.mesh(geometry);this.cache.set(key,mesh);this.builds++;return mesh;}
  asset(name) {const key=`${name}:${this.detail}`;return this.cache.get(key)??this.upload(key,createAsset(name,this.detail));}
  ensureEnvironment() {
    const key=`environment:${this.detail}`;
    this.environment=this.cache.get(key)??this.upload(key,environment(this.detail));
    this.house=this.asset('harbor-house');this.yacht=this.asset('yacht');this.launch=this.asset('launch');
    if(this.city)this.refreshParcels();
  }
  configure(settings={}) {
    this.quality=settings.quality??this.quality;this.reduced=settings.reduced??this.reduced;this.living=settings.living??this.living;
    if(this.quality==='low'&&this.detail!=='low'){this.detail='low';this.ensureEnvironment();}
  }
  /** Hysteresis prevents rebuild/LOD thrashing while dragging or zooming. */
  selectDetail(pixelsPerUnit) {
    const high=this.quality!=='low'&&(this.detail==='high'?pixelsPerUnit>55:pixelsPerUnit>65),next=high?'high':'low';
    if(next!==this.detail){this.detail=next;this.ensureEnvironment();}
  }
  setCity(city) {
    const signature=JSON.stringify(city.parcels.filter(p=>MARINA_LOTS.includes(p.id)).map(p=>[p.id,p.owner,p.level,p.mortgaged,p.color]));
    if(signature===this.signature)return;
    this.signature=signature;this.city=city;this.stateUpdates++;this.refreshParcels();
  }
  refreshParcels() {
    this.parcels=(this.city?.parcels??[]).filter(p=>MARINA_LOTS.includes(p.id)&&p.owner).map(p=>({
      id:p.id,level:p.level,closed:p.mortgaged?1:0,owner:p.owner,
      mesh:this.asset(`waterfront-level-${p.level}`),model:model(p.x,.481,p.z,0,Math.PI/2),
      flagModel:model(p.x-.10,.481+.067+(p.level+1)*.355+.29,p.z-.12,0,Math.PI/2),
      tint:rgb(p.mortgaged?'#969d96':p.color),
    }));
  }
  objects(seconds=0) {
    const moving=this.living&&!this.reduced,t=moving?seconds:0;
    const out=[{mesh:this.water,noShadow:true},{mesh:this.environment},{mesh:this.house,model:model(-2.25,.483,.420)},
      {mesh:this.yacht,model:model(-2.262,WATERLINE+Math.sin(t*.72)*.004,1.958,.002*Math.sin(t*.71),.037,.003*Math.sin(t*.47))},
      {mesh:this.launch,model:model(-1.205,WATERLINE+Math.sin(t*.84+1)*.004,1.428,0,-.019,.006*Math.sin(t*.84+1))},
      {mesh:this.launch,model:model(-1.203,WATERLINE+Math.sin(t*.75+2)*.004,2.378,0,Math.PI-.032,.006*Math.sin(t*.75+2),.84)},
    ];
    for(const p of this.parcels??[])out.push({mesh:p.mesh,model:p.model,closed:p.closed},{mesh:this.flag,model:p.flagModel,tint:p.tint});
    this.stats={detail:this.detail,objects:out.length,triangles:out.reduce((n,o)=>n+o.mesh.count/3,0),cachedGpuBytes:[...this.cache.values()].reduce((n,m)=>n+(m.bytes??0),0),builds:this.builds,stateUpdates:this.stateUpdates};
    return out;
  }
  destroy(){for(const mesh of this.cache.values())this.renderer.drop(mesh);this.cache.clear();}
}
export { Marina, MARINA_LOTS, WATERLINE, LAYOUT, environment, waterGeometry };
