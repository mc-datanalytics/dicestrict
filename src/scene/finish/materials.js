/** One shared, generated micro-normal/roughness atlas; matches the existing 8 tiles.
 * RG = tangent normal, B = perceptual roughness, A = 1. All 64² tiles have mipmaps.
 * No fetched textures, no extra textures per object. */
import {surfaceTile} from '../marina/surfaces.js';
export function detailAtlas(){
 const width=256,data=new Uint8Array(width*width*4);data.fill(255);
 const roughness=[.62,.86,.35,.90,.88,.74,.92,.48];
 for(let id=0;id<8;id++){
  const tile=surfaceTile(id),ox=id%4*64,oy=Math.floor(id/4)*64;
  const h=(x,y)=>tile.data[(((y+64)%64)*64+(x+64)%64)*4]/255;
  for(let y=0;y<64;y++)for(let x=0;x<64;x++){
   const dx=(h(x-1,y)-h(x+1,y))*.48,dy=(h(x,y-1)-h(x,y+1))*.48;
   const k=((y+oy)*256+x+ox)*4;
   data.set([Math.round((dx*.5+.5)*255),Math.round((dy*.5+.5)*255),Math.round(255*Math.min(.98,roughness[id]+(h(x,y)-.85)*.15)),255],k);
  }
 }
 return {width,height:width,data};
}
