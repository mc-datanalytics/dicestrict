/** Rendering-only mapping; the original 28 tiles and all economics are unchanged. */
import { MeshBuilder, rgb } from './marina/mesh-builder.js';
import { createDistrictAsset, createDistrictProp } from './districts/kit.js';
import { MATERIALS as M } from './marina/surfaces.js';
import { model } from './math.js';
const DISTRICT_LOTS=Object.freeze([1,2,11,12,15,16]);
const familyFor=id=>id<3?'oldtown':id<13?'industrial':'financial';
const variantFor=id=>[2,12,16].includes(id)?1:0;
const CACHE_LIMIT=20;
function flag(){const g=new MeshBuilder();g.rod([0,0,0],[0,.26,0],.006,'#778d85',M.metal,6);g.box([.05,.21,0],[.10,.06,.009],'#ffffff',M.canvas);return g.build('district-owner-pennant');}
function streets(){
  const g=new MeshBuilder();
  // Pocket square on the landward edge of Rivage. No road, pawn or tile moved.
  g.box([2.18,.489,2.87],[1.10,.045,.42],'#d9c8a7',M.paving,.04);
  g.add(createDistrictProp('bench'),[2.14,.52,2.78],Math.PI);
  g.add(createDistrictProp('linden'),[2.58,.50,2.82],0,.68);
  g.add(createDistrictProp('heritage-lamp'),[1.66,.52,2.78]);
  for(const x of [-2.99,-1.14])g.add(createDistrictProp('office-lamp'),[x,.49,-3.10]);
  return g.build('district-public-furniture-batch');
}
class Districts {
  constructor(renderer){this.renderer=renderer;this.detail='low';this.quality='high';this.enabled=true;this.cache=new Map();this.city=null;this.builds=0;this.stateUpdates=0;this.clock=0;this.entries=[];this.flag=renderer.mesh(flag());this.streets=renderer.mesh(streets());}
  configure(settings={}){this.quality=settings.quality??this.quality;if(this.quality==='low'&&this.detail!=='low'){this.detail='low';this.refresh();}}
  selectDetail(pixelsPerUnit){const next=this.quality!=='low'&&pixelsPerUnit>(this.detail==='high'?55:65)?'high':'low';if(next!==this.detail){this.detail=next;this.refresh();}}
  setCity(city){
    const selected=city.parcels.filter(p=>DISTRICT_LOTS.includes(p.id));
    const signature=JSON.stringify(selected.map(p=>[p.id,p.owner,p.level,p.mortgaged,p.color]));
    if(signature===this.signature)return;
    this.city=city;this.signature=signature;this.stateUpdates++;this.refresh();
  }
  refresh(){
    if(!this.city)return;
    this.entries=this.city.parcels.filter(p=>DISTRICT_LOTS.includes(p.id)).map(p=>{
      const family=familyFor(p.id),level=p.owner?p.level:-1,variant=variantFor(p.id),key=`${family}:${level}:${variant}:${this.detail}`;
      if(!this.cache.has(key)){const mesh=this.renderer.mesh(createDistrictAsset(family,level,variant,this.detail));this.cache.set(key,{mesh,used:++this.clock});this.builds++;}
      const item=this.cache.get(key);item.used=++this.clock;
      const yaw=family==='industrial'?Math.PI/2:0;
      return {key,id:p.id,level,owner:p.owner,closed:p.mortgaged?1:0,mesh:item.mesh,model:model(p.x,.48,p.z,0,yaw),flagModel:model(p.x+.38,.53,p.z+.39),tint:rgb(p.mortgaged?'#949b94':p.color)};
    });
    const used=new Set(this.entries.map(p=>p.key));
    for(const [key,item] of [...this.cache].sort((a,b)=>a[1].used-b[1].used)){
      if(this.cache.size<=CACHE_LIMIT)break;
      if(!used.has(key)){this.renderer.drop(item.mesh);this.cache.delete(key);}
    }
  }
  objects(){
    if(!this.enabled)return [];
    const out=[{mesh:this.streets}];
    for(const p of this.entries){out.push({mesh:p.mesh,model:p.model,closed:p.closed});if(p.owner)out.push({mesh:this.flag,model:p.flagModel,tint:p.tint,closed:p.closed});}
    this.stats={detail:this.detail,objects:out.length,triangles:out.reduce((n,o)=>n+o.mesh.count/3,0),cachedGpuBytes:[...this.cache.values()].reduce((n,m)=>n+m.mesh.bytes,0),cachedMeshes:this.cache.size,builds:this.builds,stateUpdates:this.stateUpdates};
    return out;
  }
  destroy(){for(const {mesh} of this.cache.values())this.renderer.drop(mesh);this.cache.clear();this.renderer.drop(this.flag);this.renderer.drop(this.streets);}
}
export { Districts, DISTRICT_LOTS, familyFor, variantFor, CACHE_LIMIT };
