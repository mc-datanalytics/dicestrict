/** One public architectural corridor, batched once per LOD. Never grants property or cash. */
import { MeshBuilder } from './marina/mesh-builder.js';
import { createCivicAsset } from './civic/kit.js';
const CIVIC_PLACEMENT=Object.freeze({casino:Object.freeze([-1.25,.50,-.95]),fountain:Object.freeze([1.65,.48,1.45])});
// Reuse the renderer's FOUR existing analytic light slots, not additional dynamic lights.
const CIVIC_LIGHTS=new Float32Array([-1.98,1.03,-.12, -.44,1.03,-.13, -.827,1.071,2.51, 2.39,1.03,1.98]);
function civicCorridor(lod='low'){
  const g=new MeshBuilder();g.add(createCivicAsset('promenade',lod));
  g.add(createCivicAsset('casino',lod),CIVIC_PLACEMENT.casino);
  g.add(createCivicAsset('fountain',lod),CIVIC_PLACEMENT.fountain);
  return g.build(`civic-corridor-${lod}`);
}
class CivicCenter {
  constructor(renderer){this.renderer=renderer;this.detail='low';this.quality='high';this.cache=new Map();this.builds=0;this.ensure();renderer.harborLights=CIVIC_LIGHTS;}
  ensure(){if(!this.cache.has(this.detail)){this.cache.set(this.detail,this.renderer.mesh(civicCorridor(this.detail)));this.builds++;}this.mesh=this.cache.get(this.detail);}
  configure(settings={}){this.quality=settings.quality??this.quality;if(this.quality==='low'&&this.detail!=='low'){this.detail='low';this.ensure();}}
  selectDetail(pixelsPerUnit){const next=this.quality!=='low'&&pixelsPerUnit>(this.detail==='high'?55:65)?'high':'low';if(next!==this.detail){this.detail=next;this.ensure();}}
  objects(){this.stats={detail:this.detail,builds:this.builds,cachedMeshes:this.cache.size,triangles:this.mesh.count/3,cachedGpuBytes:[...this.cache.values()].reduce((n,m)=>n+(m.bytes??0),0),drawCalls:1};return [{mesh:this.mesh}];}
  destroy(){for(const m of this.cache.values())this.renderer.drop(m);this.cache.clear();}
}
export { CivicCenter, CIVIC_PLACEMENT, CIVIC_LIGHTS, civicCorridor };
