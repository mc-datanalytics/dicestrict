/** World-space contact/illumination field, 256² RGBA8. One CPU regeneration and
 * one texture upload on economic changes; no camera, dice or network clock dependency.
 * R=soft contact visibility; G=warm pools; B=cool transit pools. Not SSAO or GI. */
import {STREET_LIGHTS} from './public.js';
export const FIELD_SIZE=256;
export function cityField(city=null){
 const n=FIELD_SIZE,data=new Uint8Array(n*n*4);for(let i=0;i<data.length;i+=4){data[i]=255;data[i+3]=255;}
 const splat=(x,z,w,d,r,strength,channel)=>{
  const loX=Math.max(0,Math.floor((x-w-r+8)*n/16)),hiX=Math.min(n-1,Math.ceil((x+w+r+8)*n/16));
  const loZ=Math.max(0,Math.floor((z-d-r+8)*n/16)),hiZ=Math.min(n-1,Math.ceil((z+d+r+8)*n/16));
  for(let j=loZ;j<=hiZ;j++)for(let i=loX;i<=hiX;i++){
   const dx=Math.max(0,Math.abs((i+.5)*16/n-8-x)-w),dz=Math.max(0,Math.abs((j+.5)*16/n-8-z)-d),dist=Math.hypot(dx,dz);
   if(dist>r)continue;const a=strength*Math.pow(1-dist/r,2),at=(j*n+i)*4+channel;
   data[at]=channel===0?Math.round(data[at]*(1-a)):Math.min(255,data[at]+Math.round(255*a));
  }
 };
 for(const p of city?.parcels??[])if(p.owner){splat(p.x,p.z,.29,.28,.31,.38,0);if(!p.mortgaged)splat(p.x,p.z+.32,.19,.05,.46,.11+p.level*.045,1);}
 for(const p of [[-1.25,-.95,.88,.43],[1.3,-1.65,.48,.36],[-2.25,.355,.52,.36],[1.65,1.45,.31,.31]])splat(...p,.30,.42,0);
 for(const [x,z] of STREET_LIGHTS)splat(x,z,0,0,.72,.72,1);
 for(const x of [-2.25,2.3])splat(x,-2.24,.17,.03,.46,.60,2);
 return {width:n,height:n,data};
}
