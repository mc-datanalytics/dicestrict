/** Remaining real properties, independently cached. No economy or network writes. */
import {MeshBuilder,rgb} from './marina/mesh-builder.js';
import {MATERIALS as M} from './marina/surfaces.js';
import {createHarmonyAsset} from './harmony/kit.js';
import {model} from './math.js';
const HARMONY_SPEC=Object.freeze({4:['jardins',0],5:['jardins',1],18:['nova',0],19:['nova',1],22:['roseraie',0],23:['roseraie',1],25:['solstice',0],26:['solstice',1]});
const HARMONY_LOTS=Object.freeze(Object.keys(HARMONY_SPEC).map(Number));
const HARMONY_CACHE_LIMIT=16;
const HARMONY_CACHE_BYTES=4*1024*1024;
function pennant(){const g=new MeshBuilder();g.rod([0,0,0],[0,.25,0],.008,'#7b8e80',M.metal,5);g.box([.044,.206,0],[.090,.069,.012],'#ffffff',M.canvas);return g.build('neighbourhood-owner-pennant');}
class Harmony {
 constructor(renderer){this.renderer=renderer;this.detail='low';this.quality='high';this.cache=new Map();this.entries=[];this.builds=0;this.clock=0;this.flag=renderer.mesh(pennant());}
 configure(settings={}){this.quality=settings.quality??this.quality;if(this.quality==='low'&&this.detail!=='low'){this.detail='low';this.refresh();}}
 selectDetail(pixels){const next=this.quality!=='low'&&pixels>(this.detail==='high'?55:65)?'high':'low';if(next!==this.detail){this.detail=next;this.refresh();}}
 setCity(city){const selected=city.parcels.filter(p=>HARMONY_LOTS.includes(p.id));const signature=JSON.stringify(selected.map(p=>[p.id,p.owner,p.level,p.mortgaged,p.color]));if(this.signature===signature)return;this.signature=signature;this.city=city;this.refresh();}
 refresh(){
  if(!this.city)return;
  this.entries=this.city.parcels.filter(p=>HARMONY_LOTS.includes(p.id)).map(p=>{
   const [family,v]=HARMONY_SPEC[p.id],level=p.owner?p.level:-1,variant=level<0?0:v,key=`${family}:${variant}:${level}:${this.detail}`;
   if(!this.cache.has(key)){this.cache.set(key,{mesh:this.renderer.mesh(createHarmonyAsset(family,level,variant,this.detail)),used:++this.clock});this.builds++;}
   const item=this.cache.get(key);item.used=++this.clock;
   // East-bank blocks address the inner promenade. All four elevations are finished.
   const yaw=p.id>=22?-Math.PI/2:p.id<7?Math.PI:0;
   return {id:p.id,key,level,owner:p.owner,closed:p.mortgaged?1:0,mesh:item.mesh,model:model(p.x,.48,p.z,0,yaw),flagModel:model(p.x+.39,.53,p.z+.38),tint:rgb(p.mortgaged?'#949b94':p.color)};
  });
  // Retain current visible meshes; evict only least-recently-used inactive LODs.
  // Eight active high-detail variants fit under 4 MiB; counts alone did not bound bytes.
  const used=new Set(this.entries.map(e=>e.key));
  let bytes=[...this.cache.values()].reduce((n,item)=>n+(item.mesh.bytes??0),0);
  for(const [key,item] of [...this.cache].sort((a,b)=>a[1].used-b[1].used)){
   if(this.cache.size<=HARMONY_CACHE_LIMIT&&bytes<=HARMONY_CACHE_BYTES)break;
   if(!used.has(key)){bytes-=item.mesh.bytes??0;this.renderer.drop(item.mesh);this.cache.delete(key);}
  }
 }
 objects(){const out=[];for(const e of this.entries){out.push({mesh:e.mesh,model:e.model,closed:e.closed});if(e.owner)out.push({mesh:this.flag,model:e.flagModel,tint:e.tint,closed:e.closed});}this.stats={detail:this.detail,builds:this.builds,cachedMeshes:this.cache.size,cachedGpuBytes:[...this.cache.values()].reduce((n,m)=>n+m.mesh.bytes,0),triangles:out.reduce((n,o)=>n+o.mesh.count/3,0),objects:out.length};return out;}
 destroy(){for(const {mesh} of this.cache.values())this.renderer.drop(mesh);this.cache.clear();this.renderer.drop(this.flag);}
}
export {Harmony,HARMONY_SPEC,HARMONY_LOTS,HARMONY_CACHE_LIMIT,HARMONY_CACHE_BYTES};
