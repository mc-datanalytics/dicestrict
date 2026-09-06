/** Shared deterministic 256² atlas: 8 authored 64² surfaces in a 4x4 grid.
 * Pixels are authored here, not fetched. Same source serves WebGL and PNG/GLB export.
 */
const MATERIALS = Object.freeze({
  paint:4, glass:5, teak:6, stone:7, roof:8, water:9, metal:10,
  window:11, unlitWindow:12, foliage:13, canvas:14, plaster:15, lamp:16, brick:17, slate:18, paving:19, corrugated:20,
});
const DESCRIPTORS = Object.freeze({
  17:{name:'Hand-fired warm brick',roughness:.89,metallic:0,tile:4},
  18:{name:'Overlapping slate',roughness:.8,metallic:.04,tile:5},
  19:{name:'Setts and paving',roughness:.92,metallic:0,tile:6},
  20:{name:'Painted industrial sheet',roughness:.55,metallic:.25,tile:7},
  4:{name:'Ivory marine lacquer',roughness:.28,metallic:0},
  5:{name:'Smoked marine glazing',roughness:.16,metallic:.28},
  6:{name:'Oiled teak',roughness:.68,metallic:0,tile:0},
  7:{name:'Cut limestone',roughness:.85,metallic:0,tile:1},
  8:{name:'Standing seam zinc',roughness:.42,metallic:.32,tile:2},
  9:{name:'Marina water — static export',roughness:.19,metallic:.22},
  10:{name:'Brushed marine metal',roughness:.24,metallic:.8},
  11:{name:'Occupied warm glazing',roughness:.22,metallic:.06,emissive:[.25,.13,.035]},
  12:{name:'Closed glazing',roughness:.40,metallic:.08},
  13:{name:'Palm leaf',roughness:.94,metallic:0},
  14:{name:'Woven canvas',roughness:.95,metallic:0},
  16:{name:'Warm lantern glass',roughness:.4,metallic:0,emissive:[.40,.21,.06]},
  15:{name:'Lime plaster',roughness:.88,metallic:0,tile:3},
});
function hash(x,y,s=0) { let n=Math.imul(x+137,374761393)^Math.imul(y+73,668265263)^s; n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295; }
function surfaceTile(id,size=64) {
  const data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const n=hash(x,y,id*937),xx=x/size,yy=y/size;let v=1;
    if(id===0) { const plank=Math.floor(xx*8),join=(xx*8)%1<.0625,cut=((yy+(plank%3)*.305)%1)<.016;
      v=join||cut?.46:.89+hash(plank,1)*.14+Math.sin(y*.2+Math.sin(x*.3))* .025+(n-.5)*.05;
    } else if(id===1) { const row=Math.floor(yy*4),u=(xx*3+(row%2)*.5)%1;
      v=(u<.025||(yy*4)%1<.027)?.72:.94+(n-.5)*.085+hash(Math.floor(xx*3+(row%2)*.5),row)*.04;
    } else if(id===2) { const seam=(xx*4)%1;v=seam<.0625?.56:seam<.125?1.08:.92+(n-.5)*.06; }
    else if(id===4) {const row=Math.floor(yy*8),u=(xx*4+(row%2)*.5)%1;v=u<.07||(yy*8)%1<.14?.53:.80+hash(Math.floor(xx*4+(row%2)*.5),row)*.20+(n-.5)*.15;}
    else if(id===5) {const row=Math.floor(yy*7),u=(xx*5+(row%2)*.5)%1;v=(yy*7)%1<.15||u<.05?.46:.77+hash(Math.floor(xx*5+(row%2)*.5),row)*.19+(n-.5)*.12;}
    else if(id===6) {const row=Math.floor(yy*5),u=(xx*5+(row%2)*.5)%1;v=(yy*5)%1<.08||u<.06?.56:.83+hash(Math.floor(xx*5+(row%2)*.5),row)*.14+(n-.5)*.07;}
    else if(id===7) {const rib=(xx*10)%1;v=rib<.12?.57:rib<.25?1.03:.83+(n-.5)*.09;}
    else v=.91+(n-.5)*.15;
    const index=(y*size+x)*4,c=Math.max(0,Math.min(255,Math.round(v*240)));
    data.set([c,c,c,255],index);
  }return {width:size,height:size,data};
}
function surfaceAtlas() {
  const size=256,data=new Uint8Array(size*size*4);
  data.fill(255);
  for(let id=0;id<8;id++) {
    const tile=surfaceTile(id),ox=id%4*64,oy=Math.floor(id/4)*64;
    for(let y=0;y<64;y++)data.set(tile.data.subarray(y*256,(y+1)*256),((oy+y)*size+ox)*4);
  }
  return {width:size,height:size,data};
}
export { MATERIALS, DESCRIPTORS, surfaceTile, surfaceAtlas };
