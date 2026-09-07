/** Shader-animated bursts/dust/ribbons. Every particle is a real tiny triangle,
 * collected into one shared mesh; no per-frame vertex upload or timer per particle. */
import {MeshBuilder} from '../marina/mesh-builder.js';
export function effectMesh(kind,lod='low'){
 if(!['burst','dust','scan'].includes(kind)||!['low','high'].includes(lod))throw Error('Invalid effect mesh');
 const g=new MeshBuilder(),n=kind==='scan'?4:kind==='dust'?(lod==='high'?8:4):(lod==='high'?24:8);
 for(let i=0;i<n;i++){
  let points;
  if(kind==='scan'){
   const a=i*Math.PI/2,b=a+Math.PI/2,r=.51;
   points=[[Math.cos(a)*r,0,Math.sin(a)*r],[Math.cos(b)*r,0,Math.sin(b)*r],[Math.cos(b)*r,.025,Math.sin(b)*r],[Math.cos(a)*r,.025,Math.sin(a)*r]];
  }else{
   const r=kind==='dust'?.048:.021;
   points=[[-r,0,0],[0,r*1.7,.010],[r,0,0],[0,-r*1.7,-.010]];
  }
  const ids=points.map(p=>g.vertex(p,[0,0,1],kind==='dust'?'#d7c5a3':i%3?'#eac578':'#bce1d4',23,[i/n,(i*.6180339)%1]));
  g.indices.push(ids[0],ids[1],ids[2],ids[0],ids[2],ids[3]);
 }
 return g.build(`event-${kind}-${lod}`);
}
export const EFFECT_VERTEX=`
uniform float uEffectAge;uniform float uEffectKind;out float vEffectFade;
vec3 effectPosition(vec3 p){
 vEffectFade=1.;if(aTex<22.5)return p;
 float t=max(uEffectAge,0.),a=aUv.x*6.283185,s=aUv.y;
 if(uEffectKind>1.5){p.y+=.08+min(t/3.,1.)*1.6;vEffectFade=.38*(1.-smoothstep(1.8,3.0,t));}
 else if(uEffectKind>.5){p*=1.+t*1.8;p+=vec3(cos(a)*(.40+t*.18),.10+t*(.16+s*.10),sin(a)*(.40+t*.18));vEffectFade=.22*(1.-smoothstep(.2,2.4,t));}
 else {p*=1.-smoothstep(1.7,3.6,t);p+=vec3(cos(a)*(.26+s*.22)*t,.12+(1.+s*.8)*t-.49*t*t,sin(a)*(.26+s*.22)*t);vEffectFade=.95*(1.-smoothstep(1.5,3.6,t));}
 return p;
}
`;
