import { LivingCity } from './living-city.js';
import { BOARD, COLORS, tilePosition } from "../game/board.js";
import { Geometry } from "./geometry.js";
import { Renderer } from "./webgl.js";
import { identity,model,multiply,ortho,lookAt,inverse,transform,lerp,smooth } from "./math.js";
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
// Toggling reduced motion mid-move must snap to the destination, not freeze a pawn.
const motionProgress=(path,t,reduced)=>reduced||!path.duration?1:clamp((t-path.start)/path.duration,0,1);
function atlas(){
  const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=1024;const c=canvas.getContext('2d');
  for(const t of BOARD){const x=t.id%8*256,y=Math.floor(t.id/8)*256;c.save();c.translate(x,y);
    c.fillStyle='#fcfbf2';c.fillRect(0,0,256,256);c.fillStyle=t.color;c.fillRect(9,9,238,36);
    c.textAlign='center';c.fillStyle='#274a43';c.font='600 23px Arial, sans-serif';
    const words=t.name.split(' ');let lines=[''];for(const w of words){const last=lines.length-1;if((lines[last]+' '+w).trim().length>15)lines.push(w);else lines[last]=(lines[last]+' '+w).trim();}
    lines.forEach((line,i)=>c.fillText(line,128,83+i*29));
    c.font='600 29px Arial, sans-serif';c.fillStyle=t.kind==='lot'?'#42685e':t.color;
    c.fillText(t.kind==='lot'?String(t.price)+' C':({start:'→ +220',event:'✦',park:'+70',tax:'−90',audit:'−80',grant:'+100',transit:'+60'})[t.kind],128,176);
    c.fillStyle='#929f92';c.font='15px Arial';c.fillText(String(t.id+1).padStart(2,'0'),128,229);c.restore();
  }
  // Atlas slot 28 = original city wordmark / welcome plaza.
  c.save();c.translate(4*256,3*256);c.fillStyle='#b8d3c4';c.fillRect(0,0,256,256);c.fillStyle='#507c67';c.textAlign='center';c.font='700 43px Arial';c.fillText('AURORA',128,130);c.font='14px Arial';c.fillText('THE CITY IS YOURS',128,163);c.restore();return canvas;
}
function uv(id){const x=id%8*256,y=Math.floor(id/8)*256;return [(x+2)/2048,1-(y+254)/1024,(x+254)/2048,1-(y+2)/1024];}
function cityGeometry(){
  const g=new Geometry();
  g.block([0,-.67,0],[150,.08,150],'#f4f2e9');
  g.box([0,-.14,0],[15.3,.78,15.3],'#9bb6a7',.25);
  g.box([0,.13,0],[15.18,.32,15.18],'#e3e8d8',.18);
  g.box([0,.32,0],[14.98,.08,14.98],'#c8d9c4',.12);
  g.box([0,.37,0],[9.54,.10,9.54],'#a5c3ac',.12);
  g.quad([.4,.525,2.6],2.20,.85,uv(28));
  g.box([.1,.47,3.38],[2.45,.08,.95],'#d0ddc5',.1);
  for(const t of BOARD){const [x,z]=tilePosition(t.id);g.box([x,.40,z],[1.49,.21,1.49],'#fffff6',.09);g.quad([x,.509,z],1.37,1.37,uv(t.id));}
  return g;
}
function token(color){const g=new Geometry();g.cylinder([0,.10,0],.26,.13,'#f8edcc',20);g.cylinder([0,.21,0],.20,.18,color,18,.14);g.sphere([0,.40,0],.165,color,15,9);g.cylinder([0,.55,0],.095,.10,'#e6cb83',12);g.sphere([0,.62,0],.055,'#f8eac1',10,6);g.sphere([-.055,.415,.143],.024,'#f8f7e9',8,5);g.sphere([.055,.415,.143],.024,'#f8f7e9',8,5);return g;}
function dice(){const g=new Geometry();g.box([0,0,0],[.62,.62,.62],'#fff7df',.08);
  const patterns={1:[[0,0]],2:[[-1,-1],[1,1]],3:[[-1,-1],[0,0],[1,1]],4:[[-1,-1],[-1,1],[1,-1],[1,1]],5:[[-1,-1],[-1,1],[0,0],[1,-1],[1,1]],6:[[-1,-1],[-1,0],[-1,1],[1,-1],[1,0],[1,1]]};
  for(const [n,axis,sign] of [[1,1,1],[6,1,-1],[2,2,1],[5,2,-1],[3,0,1],[4,0,-1]])for(const [u,v] of patterns[n]){
    const pos=[0,0,0],stretch=[1,1,1];pos[axis]=sign*.305;pos[(axis+1)%3]=u*.145;pos[(axis+2)%3]=v*.145;stretch[axis]=.28;g.sphere(pos,.044,'#315d50',10,6,stretch);
  }return g;
}
const DICE_ROT=[[0,0,0],[0,0,0],[-Math.PI/2,0,0],[0,0,Math.PI/2],[0,0,-Math.PI/2],[Math.PI/2,0,0],[Math.PI,0,0]];
class BoardScene {
  constructor(canvas,onSelect,onError){
    this.canvas=canvas;this.onSelect=onSelect;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.renderer=new Renderer(canvas,atlas());this.staticMesh=this.renderer.mesh(cityGeometry());this.tokens=COLORS.map(c=>this.renderer.mesh(token(c)));this.diceMesh=this.renderer.mesh(dice());
    this.city=new LivingCity(this.renderer);this.ambientTime=0;this.lastAmbientFrame=null;this.living=true;this.dayMode='auto';this.weather=true;
    this.angle=.50;this.pitch=.85;this.zoom=1;this.time=0;this.selected=1;this.paths=[];this.lastRoll=-99999;this.state=null;this.dirty=true;
    this.abort=new AbortController();const opts={signal:this.abort.signal};
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;cancelAnimationFrame(this.raf);onError('Le contexte graphique a été interrompu. Rechargez la page pour reprendre votre partie locale.');},opts);
    let pointer=null;
    canvas.addEventListener('pointerdown',e=>{pointer={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);},opts);
    canvas.addEventListener('pointermove',e=>{if(!pointer)return;const dx=e.clientX-pointer.lastX,dy=e.clientY-pointer.lastY;if(Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>6)pointer.moved=true;
      if(pointer.moved){this.angle-=dx*.006;this.pitch=clamp(this.pitch+dy*.003,.60,1.43);this.dirty=true;}pointer.lastX=e.clientX;pointer.lastY=e.clientY;},opts);
    canvas.addEventListener('pointerup',e=>{if(pointer&&!pointer.moved)this.pick(e.clientX,e.clientY);pointer=null;},opts);
    canvas.addEventListener('pointercancel',()=>{pointer=null;},opts);
    canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom=clamp(this.zoom*(e.deltaY>0?.96:1.04),.72,1.5);this.dirty=true;},{...opts,passive:false});
    this.resizeObserver=new ResizeObserver(entries=>{const rect=entries[0]?.contentRect;
      if(rect&&(rect.width!==this.cssWidth||rect.height!==this.cssHeight)){this.cssWidth=rect.width;this.cssHeight=rect.height;this.dirty=true;}
    });this.resizeObserver.observe(canvas);
    document.addEventListener('visibilitychange',()=>{this.lastAmbientFrame=null;if(!document.hidden)this.dirty=true;},opts);
    const loop=t=>{if(this.lost)return;this.render(t);this.raf=requestAnimationFrame(loop);};this.raf=requestAnimationFrame(loop);
  }
  configure(settings={}){
    const {quality,reduced,living,dayMode,weather}=settings;
    if(quality)this.renderer.shadows=quality!=='low';if(reduced!==undefined)this.reduced=reduced;
    if(living!==undefined)this.living=living;if(dayMode)this.dayMode=dayMode;if(weather!==undefined)this.weather=weather;
    this.city.configure(settings);this.dirty=true;
  }
  view(mode){if(mode==='top'){this.pitch=1.42;this.angle=0;this.zoom=1.1;}else if(mode==='reset'){this.pitch=.85;this.angle=.50;this.zoom=1;}else this.zoom=clamp(this.zoom*(mode==='in'?1.12:.89),.72,1.5);this.dirty=true;}
  setSelected(id){this.selected=id;this.updateOwnership();this.dirty=true;}
  setState(s){
    const now=performance.now();
    const sameMatch=this.state?.id===s.id;
    if(this.state&&s.revision!==this.state.revision&&s.dice&&(s.players.some((p,i)=>p.position!==this.state.players[i]?.position))){this.lastRoll=now;}
    this.paths=s.players.map((p,i)=>{
      if(sameMatch && p.position===this.state.players[i]?.position && this.paths[i])return this.paths[i];
      const old=sameMatch?(this.state?.players[i]?.position??p.position):p.position,steps=(p.position-old+28)%28;
      return {from:old,to:p.position,steps,start:now,duration:this.reduced?0:Math.max(600,steps*95)};
    });
    this.city.setState(s);this.state=s;this.updateOwnership();this.dirty=true;
  }
  updateOwnership(){
    const g=new Geometry();
    if(this.state)for(const t of BOARD){const p=this.state.properties[t.id],position=tilePosition(t.id),x=position[0],z=position[1];
      if(p.owner){const idx=this.state.players.findIndex(q=>q.id===p.owner);g.box([x,.535,z+.59],[1.18,.035,.12],p.mortgaged?'#a7aaa0':COLORS[idx],.022);
        for(let level=0;level<p.level;level++){const nx=x+(x===5.6?-.44:x===-5.6?.44:(level-1)*.28),nz=z+(z===5.6?-.40:z===-5.6?.40:(level-1)*.28);g.box([nx,.69,nz],[.19,.30,.18],COLORS[idx],.02);g.box([nx,.855,nz],[.22,.04,.21],'#f5e4ba',.01);}}
    }
    if(this.selected!==null){const [x,z]=tilePosition(this.selected);for(const dz of [-.735,.735])g.box([x,.538,z+dz],[1.49,.03,.04],'#d7b761',.013);for(const dx of [-.735,.735])g.box([x+dx,.538,z],[.04,.03,1.49],'#d7b761',.013);}
    this.renderer.drop(this.ownerMesh);this.ownerMesh=this.renderer.mesh(g);
  }
  pick(clientX,clientY){if(!this.vp)return;const r=this.canvas.getBoundingClientRect(),x=(clientX-r.left)/r.width*2-1,y=1-(clientY-r.top)/r.height*2;const inv=inverse(this.vp);
    const rawA=transform(inv,[x,y,-1,1]),rawB=transform(inv,[x,y,1,1]),a=rawA.slice(0,3).map(v=>v/rawA[3]),b=rawB.slice(0,3).map(v=>v/rawB[3]);const t=(.51-a[1])/(b[1]-a[1]);
    const wx=lerp(a[0],b[0],t),wz=lerp(a[2],b[2],t),tile=BOARD.find(q=>{const [px,pz]=tilePosition(q.id);return Math.abs(wx-px)<.77&&Math.abs(wz-pz)<.77;});
    if(tile)this.onSelect(tile.id);
  }
  render(t){
    if(document.hidden){this.lastAmbientFrame=null;return;}
    // Do not submit GPU work for an idle board; only redraw for animation or invalidation.
    const ambient=this.living&&!this.reduced;
    const moving=ambient||!this.reduced&&(t-this.lastRoll<900||this.paths.some(p=>p.steps>0&&t-p.start<p.duration));
    if(!this.dirty&&!moving){this.lastAmbientFrame=null;return;}
    // Active animation cap: 30 FPS; dirty frames render immediately.
    if(t-this.time<(this.reduced?1000/30:1000/30)&&!this.dirty)return;this.time=t;this.dirty=false;
    if(ambient&&this.lastAmbientFrame!==null)this.ambientTime+=Math.min(.10,Math.max(0,(t-this.lastAmbientFrame)/1000));
    this.lastAmbientFrame=t;
    const cycle=this.ambientTime/240*Math.PI*2;
    this.renderer.night=this.dayMode==='night'?1:this.dayMode==='day'||this.reduced?0:Math.max(0,-Math.cos(cycle));
    this.renderer.weather=this.weather&&ambient?Math.max(0,Math.sin(this.ambientTime/39)-.82)*4:0;
    this.renderer.ambientTime=this.ambientTime;
    const rect=this.canvas.getBoundingClientRect(),aspect=rect.width/Math.max(rect.height,1);
    this.renderer.resize(rect.width,rect.height,Math.min(devicePixelRatio||1,this.renderer.shadows?1.7:1.0));
    const extent=(aspect<1.15?10.1/aspect:9.0)/this.zoom;
    const target=this.captureTarget??[0,.3,0];
    const eye=[target[0]+Math.sin(this.angle)*24*Math.cos(this.pitch),target[1]-.3+Math.sin(this.pitch)*24,target[2]+Math.cos(this.angle)*24*Math.cos(this.pitch)];
    this.renderer.camera=eye;this.city.marina.selectDetail(rect.height/(2*extent));this.city.districts.selectDetail(rect.height/(2*extent));
    this.vp=multiply(ortho(-extent*aspect,extent*aspect,-extent,extent,.1,80),lookAt(eye,target));
    const objects=[{mesh:this.staticMesh,model:identity()},...this.city.objects(this.ambientTime,this.renderer.weather)];if(this.ownerMesh)objects.push({mesh:this.ownerMesh});
    if(this.state)for(let i=0;i<this.state.players.length;i++){
      const p=this.state.players[i];if(p.bankrupt)continue;const path=this.paths[i],progress=motionProgress(path,t,this.reduced),total=progress*path.steps,step=Math.floor(total),fraction=total-step;
      const from=tilePosition((path.from+step)%28),to=tilePosition((path.from+step+1)%28),x=lerp(from[0],to[0],smooth(fraction)),z=lerp(from[1],to[1],smooth(fraction));
      const offset=[[-.26,-.19],[.26,-.19],[-.26,.24],[.26,.24]][i],jump=progress<1?Math.sin(fraction*Math.PI)*.32:0;
      objects.push({mesh:this.tokens[i],model:model(x+offset[0],.535+jump,z+offset[1],0,-.2,0,1)});
    }
    const elapsed=t-this.lastRoll,rolling=!this.reduced&&elapsed<900;
    for(let i=0;i<2;i++){const value=this.state?.dice[i]??(i?5:3),rot=DICE_ROT[value];const spin=rolling?(1-elapsed/900)*Math.PI*6:0;
      objects.push({mesh:this.diceMesh,model:model(-.32+i*.94,.91+(rolling?Math.abs(Math.sin(elapsed/85+i))*.65:0),3.35,rot[0]+spin,rot[1]+spin*.72,rot[2]+spin*.61)});
    }
    this.renderer.render(this.vp,objects);this.frameCount=(this.frameCount??0)+1;
  }
  destroy(){cancelAnimationFrame(this.raf);this.abort.abort();this.resizeObserver.disconnect();this.renderer.destroy();}
}

export { BoardScene, motionProgress };
