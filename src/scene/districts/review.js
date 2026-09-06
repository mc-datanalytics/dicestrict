/** Isolated asset inspection with the SAME Renderer and geometry factories as the game. */
import { Renderer } from '../webgl.js';
import { createDistrictAsset, createDistrictProp, FAMILIES } from './kit.js';
import { createAsset, FACTORIES } from '../marina/kit.js';
import { lookAt, ortho, multiply } from '../math.js';
const choices=new Map();
for(const family of FAMILIES)for(const level of [-1,0,1,2,3])for(const variant of level<0?[0]:[0,1])choices.set(`${family}-${variant}-level-${level}`,lod=>createDistrictAsset(family,level,variant,lod));
for(const name of ['linden','bench','cafe-table','heritage-lamp','office-lamp','container','delivery-truck','gantry'])choices.set(name,lod=>createDistrictProp(name,lod));
for(const name of Object.keys(FACTORIES))choices.set(name,lod=>createAsset(name,lod));
const canvas=document.querySelector('canvas'),atlas=document.createElement('canvas');atlas.width=atlas.height=2;
const ctx=atlas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,2,2);
const renderer=new Renderer(canvas,atlas);renderer.studio=true;renderer.shadows=false;
let current,detail='high',angle=.60,pitch=.44,mesh,bounds,closed=0;
function select(name,lod='high'){
 if(!choices.has(name))throw Error('Unknown asset');
 current=name;detail=lod;const geo=choices.get(name)(lod),min=[Infinity,Infinity,Infinity],max=min.map(v=>-v);
 for(let i=0;i<geo.data.length;i+=12)for(let k=0;k<3;k++){min[k]=Math.min(min[k],geo.data[i+k]);max[k]=Math.max(max[k],geo.data[i+k]);}
 renderer.drop(mesh);mesh=renderer.mesh(geo);bounds={min,max};document.querySelector('#asset').value=name;document.querySelector('#lod').value=lod;draw();
}
function draw(){
 const r=canvas.getBoundingClientRect();renderer.resize(r.width,r.height,Math.min(devicePixelRatio,1.5));
 const target=bounds.min.map((v,i)=>(v+bounds.max[i])/2),size=bounds.max.map((v,i)=>v-bounds.min[i]),radius=Math.hypot(...size)*.60;
 const eye=[target[0]+Math.sin(angle)*6*Math.cos(pitch),target[1]+6*Math.sin(pitch),target[2]+Math.cos(angle)*6*Math.cos(pitch)];
 renderer.camera=eye;renderer.render(multiply(ortho(-radius*r.width/r.height,radius*r.width/r.height,-radius,radius,.01,30),lookAt(eye,target)),[{mesh,closed}]);
 document.querySelector('#info').textContent=`${current} · ${detail} · ${mesh.count/3} triangles · ${Math.round(mesh.bytes/1024)} KiB buffers · WebGL2 natif`;
}
const chooser=document.querySelector('#asset');for(const name of choices.keys()){const option=document.createElement('option');option.value=option.textContent=name;chooser.append(option);}
chooser.onchange=()=>select(chooser.value,detail);document.querySelector('#lod').onchange=e=>select(current,e.target.value);
function setLight(mode){renderer.studio=mode==='studio';renderer.night=mode==='night'?1:0;document.querySelector('#light').value=mode;draw();}
document.querySelector('#light').onchange=e=>setLight(e.target.value);
document.querySelector('#closed').onchange=e=>{closed=e.target.checked?1:0;draw();};
let pointer=null;canvas.onpointerdown=e=>{pointer=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);};canvas.onpointerup=()=>pointer=null;canvas.onpointercancel=()=>pointer=null;
canvas.onpointermove=e=>{if(!pointer)return;angle+=(e.clientX-pointer[0])*.01;pitch=Math.max(-.25,Math.min(1.35,pitch+(e.clientY-pointer[1])*.007));pointer=[e.clientX,e.clientY];draw();};
window.addEventListener('resize',draw);
globalThis.assetReview={select,draw,renderer,setView(a,p=.44){angle=a;pitch=p;draw();},setLight,get bounds(){return bounds;}};
select('oldtown-0-level-3');
