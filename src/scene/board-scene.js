import { BOARD, COLORS, tilePosition } from "../game/board.js";
import { Geometry } from "./geometry.js";
import { Renderer } from "./webgl.js";
import { identity,model,multiply,ortho,lookAt,inverse,transform,lerp,smooth } from "./math.js";
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
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
function tree(g,x,z,scale=1,tint='#79a984'){
  g.cylinder([x,.56,z],.055*scale,.42*scale,'#b39972',7);
  g.sphere([x,.9*scale,z],.30*scale,tint,9,5,[.85,1.2,.85]);
  g.sphere([x-.13*scale,.84*scale,z+.08*scale],.21*scale,tint,8,5);
}
function building(g,x,z,w,d,h,color,roof='#f5edda'){
  const bottom=.44;
  g.box([x,bottom+h/2,z],[w,h,d],color,.075);
  g.box([x,bottom+h+.04,z],[w+.07,.10,d+.07],roof,.035);
  // Windows are merged into the static mesh, not separate draw calls.
  const cols=Math.max(1,Math.floor(w/.30)),floors=Math.max(1,Math.floor(h/.34));
  for(let i=0;i<cols;i++)for(let j=0;j<floors;j++){
    const wx=x-w/2+(i+.5)*w/cols,wy=bottom+.18+j*.32;
    if(wy<bottom+h-.08){g.box([wx,wy,z+d/2+.006],[.11,.16,.016],'#ecf0d9',.002);g.box([wx,wy,z-d/2-.006],[.11,.16,.016],'#ecf0d9',.002);}
  }
  for(let i=0;i<Math.max(1,Math.floor(d/.35));i++)for(let j=0;j<floors;j++){
    const wz=z-d/2+(i+.5)*d/Math.max(1,Math.floor(d/.35)),wy=bottom+.18+j*.32;
    if(wy<bottom+h-.08)g.box([x+w/2+.007,wy,wz],[.016,.16,.11],'#d5e7db',.002);
  }
}
function cityGeometry(){
  const g=new Geometry();
  g.box([0,-.67,0],[150,.08,150],'#f4f2e9',0);
  g.box([0,-.14,0],[13.5,.78,13.5],'#9bb6a7',.25);
  g.box([0,.05,0],[13.38,.42,13.38],'#ffffff',.19);
  g.box([0,.27,0],[13.16,.16,13.16],'#dce5d8',.12);
  g.box([0,.35,0],[9.52,.20,9.52],'#abc9b6',.17);
  // Pedestrian boulevards and a branching canal.
  g.box([0,.46,-1.2],[8.7,.04,.76],'#d6d9c7',.08);
  g.box([.5,.462,-1.7],[.74,.045,5.6],'#d6d9c7',.06);
  g.box([-2.4,.465,1.38],[3.7,.035,.47],'#d6d9c7',.04);
  g.box([-1.5,.464,2.6],[.45,.035,2.4],'#d6d9c7',.04);
  g.box([2.8,.49,1.5],[2.7,.10,2.8],'#f0ecda',.2);
  g.box([2.8,.55,1.5],[2.45,.05,2.52],'#8dc7c7',.20);
  g.box([2.75,.58,1.48],[1.2,.018,.018],'#e2f3e4',.001);
  g.box([3.1,.58,1.1],[.65,.018,.018],'#e2f3e4',.001);
  g.box([3.05,.58,2.0],[.85,.018,.018],'#e2f3e4',.001);
  // Architectural collection: warm terracotta, creamy stone, sea-glass and lavender.
  building(g,-3.25,-3.20,.9,1.0,.78,'#deb385');
  building(g,-1.9,-3.25,1.05,1.1,1.55,'#c3c5df');
  building(g,-.45,-3.55,.72,.75,2.20,'#7ba79c');
  g.box([-.45,2.82,-3.55],[.52,.19,.55],'#f6e2ac',.05);
  g.cylinder([-.45,3.11,-3.55],.024,.42,'#dab56f',8);
  building(g,1.65,-3.25,1.05,1.3,1.2,'#e1ad92');
  building(g,3.1,-3.1,.82,.92,1.85,'#a5bcd0');
  building(g,3.3,-1.9,.9,.64,.70,'#f0d3a5');
  building(g,-3.10,-.04,.93,1.03,1.05,'#e3b88e');
  building(g,-1.65,-.02,1.0,1.03,1.65,'#79a899');
  building(g,-.23,.17,.62,.73,.82,'#bac6d5');
  // Town hall: broad steps, colonnade, copper roof.
  g.box([-3.35, .54, 2.73],[1.60,.18,1.32],'#e4dec2',.055);
  g.box([-3.35, .64, 2.63],[1.39,.16,1.16],'#eee7d4',.045);
  building(g,-3.35,2.53,1.2,.89,.92,'#f1dfb9','#82a696');
  for(let x=0;x<4;x++)g.cylinder([-3.82+x*.31,1.03,3.0],.06,.62,'#ffefca',8);
  g.box([-3.35,1.53,2.53],[1.34,.28,1.04],'#88ac9a',.06);
  // Parks and sculpted trees.
  for(const [x,z,s] of [[-4.12,-3.25,.85],[-2.65,-2.05,.75],[-1.25,-2.25,.74],[1.00,-4.05,.8],[2.45,-2.05,.9],[4.04,-3.04,1.0],[-4.15,-.55,.82],[-4.1,.65,.84],[-2.75,1.1,.8],[-2.13,2.15,1.0],[-1.75,3.55,.9],[-.2,2.0,.82],[1.16,.2,.82],[4.0,.10,.8],[3.6,3.3,.85],[2.65,3.15,.72]])tree(g,x,z,s);
  // Planters, benches and tiny boulevard lamps.
  for(const [x,z] of [[-1.2,-1.85],[2.0,-.66],[-2.5,3.3],[1.0,3.65]]){
    g.box([x,.55,z],[.56,.10,.19],'#9b7955',.02);g.box([x-.16,.49,z],[.045,.15,.10],'#5c7e70',.01);g.box([x+.16,.49,z],[.045,.15,.10],'#5c7e70',.01);
  }
  for(const x of [-3.8,-.7,2.6]){g.cylinder([x,.88,-.66],.025,.86,'#7c9684',8);g.sphere([x,1.31,-.66],.075,'#f6e7ad',8,5);}
  // Dice plaza and city stamp.
  g.box([.3,.48,3.40],[2.68,.15,1.53],'#d1dec8',.16);
  g.quad([.65,.455,1.55],2.30,1.20,uv(28));
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
    this.resizeObserver=new ResizeObserver(()=>{this.dirty=true;});this.resizeObserver.observe(canvas);
    const loop=t=>{if(this.lost)return;this.render(t);this.raf=requestAnimationFrame(loop);};this.raf=requestAnimationFrame(loop);
  }
  configure({quality,reduced}={}){if(quality)this.renderer.shadows=quality!=='low';if(reduced!==undefined)this.reduced=reduced;this.dirty=true;}
  view(mode){if(mode==='top'){this.pitch=1.42;this.angle=0;this.zoom=1.1;}else if(mode==='reset'){this.pitch=.85;this.angle=.50;this.zoom=1;}else this.zoom=clamp(this.zoom*(mode==='in'?1.12:.89),.72,1.5);this.dirty=true;}
  setSelected(id){this.selected=id;this.updateOwnership();this.dirty=true;}
  setState(s){
    const now=performance.now();
    if(this.state&&s.revision!==this.state.revision&&s.dice&&(s.players.some((p,i)=>p.position!==this.state.players[i]?.position))){this.lastRoll=now;}
    this.paths=s.players.map((p,i)=>{
      const old=this.state?.players[i]?.position??p.position,steps=(p.position-old+28)%28;
      return {from:old,to:p.position,steps,start:now,duration:this.reduced?0:Math.max(600,steps*95)};
    });
    this.state=s;this.updateOwnership();this.dirty=true;
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
    if(document.hidden)return;
    // Do not submit GPU work for an idle board; only redraw for animation or invalidation.
    const moving=!this.reduced&&(t-this.lastRoll<900||this.paths.some(p=>p.steps>0&&t-p.start<p.duration));
    if(!this.dirty&&!moving)return;
    // Animation cap: 45 FPS (30 with reduced motion).
    if(t-this.time<(this.reduced?1000/30:1000/45)&&!this.dirty)return;this.time=t;this.dirty=false;
    const rect=this.canvas.getBoundingClientRect(),aspect=rect.width/Math.max(rect.height,1);
    this.renderer.resize(rect.width,rect.height,Math.min(devicePixelRatio||1,this.renderer.shadows?1.7:1.0));
    const extent=(aspect<1.15?9.3/aspect:8.1)/this.zoom;
    const eye=[Math.sin(this.angle)*24*Math.cos(this.pitch),Math.sin(this.pitch)*24,Math.cos(this.angle)*24*Math.cos(this.pitch)];
    this.vp=multiply(ortho(-extent*aspect,extent*aspect,-extent,extent,.1,80),lookAt(eye,[0,.3,0]));
    const objects=[{mesh:this.staticMesh,model:identity()}];if(this.ownerMesh)objects.push({mesh:this.ownerMesh});
    if(this.state)for(let i=0;i<this.state.players.length;i++){
      const p=this.state.players[i];if(p.bankrupt)continue;const path=this.paths[i],progress=path.duration?clamp((t-path.start)/path.duration,0,1):1,total=progress*path.steps,step=Math.floor(total),fraction=total-step;
      const from=tilePosition((path.from+step)%28),to=tilePosition((path.from+step+1)%28),x=lerp(from[0],to[0],smooth(fraction)),z=lerp(from[1],to[1],smooth(fraction));
      const offset=[[-.26,-.19],[.26,-.19],[-.26,.24],[.26,.24]][i],jump=progress<1?Math.sin(fraction*Math.PI)*.32:0;
      objects.push({mesh:this.tokens[i],model:model(x+offset[0],.535+jump,z+offset[1],0,-.2,0,1)});
    }
    const elapsed=t-this.lastRoll,rolling=!this.reduced&&elapsed<900;
    for(let i=0;i<2;i++){const value=this.state?.dice[i]??(i?5:3),rot=DICE_ROT[value];const spin=rolling?(1-elapsed/900)*Math.PI*6:0;
      objects.push({mesh:this.diceMesh,model:model(-.32+i*.94,.91+(rolling?Math.abs(Math.sin(elapsed/85+i))*.65:0),3.35,rot[0]+spin,rot[1]+spin*.72,rot[2]+spin*.61)});
    }
    this.renderer.render(this.vp,objects);
  }
  destroy(){cancelAnimationFrame(this.raf);this.abort.abort();this.resizeObserver.disconnect();this.renderer.destroy();}
}

export { BoardScene };
