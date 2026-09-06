/** Isolated model turntable using the game's actual Renderer, not a concept render. */
import { Renderer } from '../webgl.js';
import { createAsset, FACTORIES } from './kit.js';
import { MeshBuilder } from './mesh-builder.js';
import { lookAt, ortho, multiply } from '../math.js';
const canvas=document.querySelector('canvas'),atlas=document.createElement('canvas');atlas.width=atlas.height=2;
const ctx=atlas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,2,2);
const renderer=new Renderer(canvas,atlas);renderer.studio=true;renderer.shadows=false;
const cache=new Map();let current='yacht',detail='high',angle=.65,pitch=.55,mesh,bounds;
function select(name,lod='high') {
  if(!FACTORIES[name])throw Error('Unknown model');current=name;detail=lod;
  const key=`${name}:${lod}`;
  if(!cache.has(key)) {
    const geo=createAsset(name,lod),min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    for(let i=0;i<geo.data.length;i+=12)for(let k=0;k<3;k++){min[k]=Math.min(min[k],geo.data[i+k]);max[k]=Math.max(max[k],geo.data[i+k]);}
    cache.set(key,{mesh:renderer.mesh(geo),bounds:{min,max}});
  }
  ({mesh,bounds}=cache.get(key));document.querySelector('#asset').value=name;document.querySelector('#lod').value=lod;draw();
}
function draw() {
  const r=canvas.getBoundingClientRect();renderer.resize(r.width,r.height,Math.min(devicePixelRatio,1.5));
  const target=bounds.min.map((v,i)=>(v+bounds.max[i])/2),size=bounds.max.map((v,i)=>v-bounds.min[i]);
  const radius=Math.hypot(...size)*.58,eye=[target[0]+Math.sin(angle)*6*Math.cos(pitch),target[1]+6*Math.sin(pitch),target[2]+Math.cos(angle)*6*Math.cos(pitch)];
  renderer.camera=eye;renderer.render(multiply(ortho(-radius*r.width/r.height,radius*r.width/r.height,-radius,radius,.01,30),lookAt(eye,target)),[{mesh}]);
  document.querySelector('#info').textContent=`${current} · ${detail} · ${mesh.count/3} triangles · ${mesh.vertices} vertices · ${Math.round(mesh.bytes/1024)} KiB buffers · native WebGL2`;
}
const chooser=document.querySelector('#asset');for(const name of Object.keys(FACTORIES)){const option=document.createElement('option');option.value=option.textContent=name;chooser.append(option);}
chooser.onchange=()=>select(chooser.value,detail);document.querySelector('#lod').onchange=e=>select(current,e.target.value);
document.querySelector('#light').onchange=e=>{renderer.studio=e.target.value==='studio';renderer.night=e.target.value==='night'?1:0;draw();};
let pointer=null;canvas.onpointerdown=e=>{pointer=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);};canvas.onpointerup=()=>pointer=null;
canvas.onpointermove=e=>{if(!pointer)return;angle+=(e.clientX-pointer[0])*.01;pitch=Math.max(-.25,Math.min(1.35,pitch+(e.clientY-pointer[1])*.007));pointer=[e.clientX,e.clientY];draw();};
window.addEventListener('resize',draw);
globalThis.marinaReview={select,draw,renderer,setView(a,p=.55){angle=a;pitch=p;draw();},setLight(mode){renderer.studio=mode==='studio';renderer.night=mode==='night'?1:0;document.querySelector('#light').value=mode;draw();},get bounds(){return bounds;}};
select('yacht');
