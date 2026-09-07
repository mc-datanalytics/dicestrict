/** Public infill only; keeps the original casino, promenade, fountain and marina.
 * The pavilion and metro occupy their existing footprints. No selectable lot is used. */
import {MeshBuilder} from '../marina/mesh-builder.js';
import {MATERIALS as M} from '../marina/surfaces.js';
import {createDistrictProp} from '../districts/kit.js';
import {C,B,R,shell,hip,steps} from '../harmony/architecture.js';
import {path} from '../civic/kit.js';
export const PUBLIC_PLACEMENT=Object.freeze({pavilion:[1.3,.48,-1.65],metro:[[-2.25,.43,-2.55],[2.3,.43,-2.55]]});
export const STREET_LIGHTS=Object.freeze([
 [-2.98,1.04],[-2.98,3.12],[-1.4,.59],[-.83,2.51],[-2.06,3.29],
 [-1.98,-.12],[-.44,-.13],[.08,.74],[2.39,1.98],
 [-3.04,-2.74],[-1.15,-3.07],[1.23,-3.07],[3.04,-2.72],
 [3.02,-.26],[3.02,2.73],[.84,3.01],[-1.20,3.07],
 [-3.07,-.69],[.71,-1.13],[1.89,-1.13],
]);
function pavilion(lod){
 const g=new MeshBuilder(),fine=lod==='high';
 B(g,[0,.03,0],[1.13,.06,.97],C.stone,M.stone,.025);
 const h=shell(g,0,-.07,.95,.75,.075,2,fine,'#e7d0a6');
 hip(g,0,-.07,1.03,.83,h,.16,'#477967',M.roof,fine);
 // Octagonal drum with glazing, a profiled copper dome, ridge bands and finial.
 g.lathe([0,h+.12,-.07],[[.28,0],[.28,.045],[.24,.045],[.24,.23],[.27,.23],[.27,.27]],C.chalk,M.stone,8);
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4,x=Math.cos(a)*.244,z=-.07+Math.sin(a)*.244;
  const panel=new MeshBuilder();B(panel,[0,0,0],[.115,.12,.013],C.glass,M.glass);
  g.add(panel.build('drum-glazing'),[x,h+.263,z],Math.PI/2-a);
 }
 const profile=[[.29,0],[.29,.035],[.265,.10],[.22,.20],[.13,.29],[.057,.33],[.057,.38],[0,.40]];
 g.lathe([0,h+.39,-.07],profile,'#467f71',M.roof,fine?24:16);
 R(g,[0,h+.765,-.07],[0,h+.95,-.07],.013,C.brass,M.metal,6);
 for(const x of [-.30,-.10,.10,.30]){
  g.lathe([x,.08,.43],[[.046,0],[.046,.06],[.032,.09],[.032,.38],[.048,.415],[.048,.445]],C.chalk,M.stone,fine?10:8);
 }
 B(g,[0,.544,.405],[.77,.07,.30],C.chalk);B(g,[0,.589,.405],[.80,.023,.33],C.brass,M.metal);
 g.polygon([[-.405,.605,.571],[.405,.605,.571],[0,.805,.571]],C.stone,M.stone,[0,0,1]);
 for(const x of [-.29,.29]){B(g,[x,.34,.332],[.055,.10,.039],C.brass,M.metal);B(g,[x,.415,.344],[.075,.085,.065],'#f7ce82',M.lamp,.009);}
 steps(g,0,.63,.68);return g.build(`municipal-pavilion-${lod}`);
}
function metro(lod){
 const g=new MeshBuilder(),fine=lod==='high';
 B(g,[0,.025,0],[.66,.05,.48],C.stone,M.stone,.013);
 B(g,[0,.060,0],[.47,.025,.40],'#213e40',M.paint);
 for(let i=0;i<5;i++)B(g,[0,.08+i*.016,.19-i*.060],[.43,.025,.060],i%2?C.stone:C.paving,M.stone);
 for(const side of [-1,1]){
  B(g,[side*.29,.15,0],[.07,.25,.46],C.stone);
  R(g,[side*.235,.25,.20],[side*.235,.32,-.15],.009,C.brass);
  for(const z of [-.18,.18])R(g,[side*.27,.20,z],[side*.27,.61,z],.013,C.dark,M.metal,6);
 }
 // True curved glazed canopy, no fake billboard entrance.
 const n=fine?10:6,pt=(i,z)=>[-.36+i/n*.72,.58+Math.sin(i/n*Math.PI)*.16,z];
 for(let i=0;i<n;i++)g.polygon([pt(i,-.28),pt(i+1,-.28),pt(i+1,.27),pt(i,.27)],'#739d9d',M.glass,[0,1,0]);
 for(const z of [-.28,.27])for(let i=0;i<n;i++)R(g,pt(i,z),pt(i+1,z),.011,C.dark);
 R(g,[0,.735,-.28],[0,.735,.27],.012,C.brass);
 // Small sculpted M on the canopy, cyan edge not a floating oversized sign.
 B(g,[0,.56,.282],[.22,.17,.023],C.dark,M.paint,.008);
 for(const [a,b] of [[[-.064,.51],[-.064,.61]],[[-.064,.61],[0,.55]],[[0,.55],[.064,.61]],[[.064,.61],[.064,.51]]])R(g,[a[0],a[1],.30],[b[0],b[1],.30],.008,'#c4e4da',M.lamp,4);
 return g.build(`metro-portal-${lod}`);
}
function landscape(lod){
 const g=new MeshBuilder(),cache=new Map();
 const prop=(name,p,a=0,s=1)=>{if(!cache.has(name))cache.set(name,createDistrictProp(name,lod));g.add(cache.get(name),p,a,s);};
 // Narrow continuous inner walk, open at the sea access and dice plaza.
 path(g,[[-3.09,-2.98],[2.95,-2.98],[2.95,2.91],[1.02,2.91]],.19,.494,C.paving,M.paving);
 path(g,[[-3.07,-2.98],[-3.07,.49]],.19,.494,C.paving,M.paving);
 path(g,[[.45,-1.10],[1.30,-1.10],[1.30,-1.02]],.31,.520,C.stone,M.paving);
 for(const x of [-2.25,2.3])path(g,[[x,-2.30],[x,-2.13],[.45,-2.13]],.18,.514,C.paving,M.paving);
 // The new lamps share one baked ground-light map, not twenty dynamic lights.
 for(const [x,z] of STREET_LIGHTS.slice(9))prop('heritage-lamp',[x,.49,z],0,.94);
 const trees=[[-2.81,-2.82,.75],[-.90,-2.83,.76],[.04,-2.82,.72],[2.76,-2.03,.79],[2.76,-.39,.82],[2.78,.42,.70],[2.78,2.58,.84],[.94,2.74,.70],[-2.76,-.58,.65],[-2.76,-1.82,.64]];
 for(const [x,z,s] of trees){B(g,[x,.496,z],[.28,.029,.26],'#887354',M.stone,.018);prop('linden',[x,.514,z],.36,s);}
 for(const [x,z,a] of [[.67,-1.08,0],[1.90,-1.08,0],[2.77,.94,-Math.PI/2],[-2.81,-1.10,Math.PI/2]])prop('bench',[x,.52,z],a,.92);
 // Low perennial beds make the pavilion approach less sterile, without masking paths.
 for(const [x,z] of [[.70,-1.46],[1.95,-1.46],[2.51,2.48]]){
  B(g,[x,.505,z],[.23,.055,.34],C.stone,M.stone,.022);
  for(let i=0;i<3;i++)g.lathe([x,.535,z+(i-1)*.083],[[0,0],[.080,.015],[.085,.09],[0,.15]],i%2?'#80a071':'#4f775d',M.foliage,6);
 }
 return g.build(`public-landscape-${lod}`);
}
export const PUBLIC_FACTORIES=Object.freeze({pavilion,metro,landscape});
export const PUBLIC_BUDGETS=Object.freeze({pavilion:[4200,6500],metro:[800,1000],landscape:[5000,8500]});
export function createPublicAsset(name,lod='low'){
 if(!PUBLIC_FACTORIES[name]||!['low','high'].includes(lod))throw Error('Invalid public asset');
 const g=PUBLIC_FACTORIES[name](lod);if(g.indices.length/3>PUBLIC_BUDGETS[name][lod==='high'?1:0])throw Error(`Public budget ${g.name}: ${g.indices.length/3}`);return g;
}
function publicBatch(lod){const g=new MeshBuilder();g.add(createPublicAsset('pavilion',lod),PUBLIC_PLACEMENT.pavilion);for(const p of PUBLIC_PLACEMENT.metro)g.add(createPublicAsset('metro',lod),p);g.add(createPublicAsset('landscape',lod));return g.build(`public-equipment-${lod}`);}
export class PublicRealm{
 constructor(renderer){this.renderer=renderer;this.quality='high';this.detail='low';this.cache=new Map();this.builds=0;this.ensure();}
 ensure(){if(!this.cache.has(this.detail)){this.cache.set(this.detail,this.renderer.mesh(publicBatch(this.detail)));this.builds++;}this.mesh=this.cache.get(this.detail);}
 configure(s={}){this.quality=s.quality??this.quality;if(this.quality==='low'&&this.detail!=='low'){this.detail='low';this.ensure();}}
 selectDetail(p){const d=this.quality!=='low'&&p>(this.detail==='high'?55:65)?'high':'low';if(d!==this.detail){this.detail=d;this.ensure();}}
 objects(){this.stats={builds:this.builds,cachedMeshes:this.cache.size,triangles:this.mesh.count/3,drawCalls:1};return [{mesh:this.mesh}];}
 destroy(){for(const m of this.cache.values())this.renderer.drop(m);this.cache.clear();}
}
