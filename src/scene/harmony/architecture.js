/** Reusable architectural modelling, not scene objects. Metres-as-board-units; Y up.
 * Four real wall elevations with recessed openings, roof volumes and planting.
 * Baked into one indexed mesh per property. No DOM, network, time or randomness. */
import { MeshBuilder } from '../marina/mesh-builder.js';
import { MATERIALS as M } from '../marina/surfaces.js';
const C=Object.freeze({stone:'#e9dcc3',chalk:'#f5e8d0',rose:'#d9b2a0',terra:'#ad7155',roof:'#487264',glass:'#6798a3',dark:'#315557',brass:'#c6a66d',wood:'#947657',leaf:'#789369',leaf2:'#527d68',paving:'#d5cab5',soil:'#776b54'});
const B=(g,p,s,c=C.stone,m=M.stone,b=0)=>g.box(p,s,c,m,b);
const R=(g,a,b,r=.012,c=C.dark,m=M.metal,n=5)=>g.rod(a,b,r,c,m,n);
function base(g,family,level){
 B(g,[0,.018,0],[.96,.036,.94],C.paving,M.paving,.012);
 B(g,[0,.039,0],[.84,.016,.82],family==='jardins'?'#a8ba91':'#e1d5bd',family==='jardins'?M.foliage:M.stone);
 if(level<0){
  B(g,[0,.049,-.035],[.67,.022,.56],'#a7ba90',M.foliage,.015);
  for(const x of [-.38,.38])B(g,[x,.053,0],[.025,.042,.77],C.stone);
  B(g,[0,.052,.315],[.69,.021,.032],C.brass);
  R(g,[.26,.04,-.29],[.26,.27,-.29],.009,C.wood,M.teak);
  B(g,[.26,.24,-.28],[.15,.077,.018],C.wood,M.teak);
  planter(g,-.27,.26,.16,.13,false);return;
 }
 // Public-facing access remains open; a thin apron, not a tall independent pedestal.
 B(g,[0,.048,.37],[.45,.025,.19],C.stone);
}
function planter(g,x,z,w=.18,d=.13,fine=false,rose=false,y=.045){
 B(g,[x,y+.034,z],[w,.068,d],C.stone,M.stone);
 B(g,[x,y+.072,z],[w-.025,.01,d-.025],C.soil,M.plaster);
 const count=fine?3:2;
 for(let i=0;i<count;i++){
  const xx=x+(i-(count-1)/2)*w*.25;
  g.lathe([xx,y+.075,z],[[0,0],[w*.27,.016],[w*.30,.064],[w*.19,.113],[0,.135]],i%2?C.leaf:C.leaf2,M.foliage,fine?7:5);
  if(rose)g.lathe([xx,y+.176,z],[[0,0],[.025,.010],[.020,.028],[0,.038]],i%2?'#d98f81':'#edd9b0',M.plaster,5);
 }
}
function cedar(g,x,z,s=1,fine=false,y=.047){
 R(g,[x,y,z],[x,y+.30*s,z],.014*s,C.wood,M.teak);
 g.lathe([x,y+.13*s,z],[[.02,0],[.12*s,.018],[.10*s,.13*s],[.13*s,.15*s],[.06*s,.32*s],[.08*s,.34*s],[0,.58*s]],C.leaf2,M.foliage,fine?8:6);
}
function rail(g,x,y,z,w,fine=false){
 R(g,[x-w/2,y+.115,z],[x+w/2,y+.115,z],.009,C.brass);
 for(let i=0;i<(fine?5:3);i++){
  const xx=x-w/2+i*w/((fine?5:3)-1);R(g,[xx,y,z],[xx,y+.12,z],.006,C.dark);
 }
}
function elevation(w,floors,bays,fine,color,door=false,glazing=M.window){
 const g=new MeshBuilder(),step=w/bays,story=.28,th=.060;
 for(let j=0;j<floors;j++){
  const y=j*story;
  B(g,[0,y+.027,0],[w,.054,th],C.stone);
  B(g,[0,y+story-.020,0],[w,.040,th+.026],color);
  for(let k=0;k<=bays;k++)B(g,[-w/2+k*step,y+story/2,0],[.032,story,th+.014],color);
  for(let k=0;k<bays;k++){
   const x=-w/2+(k+.5)*step,low=door&&j===0&&k===Math.floor(bays/2)?.015:.067,h=story-.043-low;
   // Glass is behind the piers, with no opaque box intersecting the opening.
   g.polygon([[x-(step-.036)/2,y+low,-.027],[x+(step-.036)/2,y+low,-.027],[x+(step-.036)/2,y+low+h,-.027],[x-(step-.036)/2,y+low+h,-.027]],glazing===M.window?'#d7c296':C.glass,glazing,[0,0,1]);
   B(g,[x,y+low-.008,.018],[step-.014,.023,.092],C.chalk);
   for(const dx of [-1,1]){const xx=x+dx*(step/2-.025);if(fine)B(g,[xx,y+low+h/2,-.006],[.013,h,.039],C.dark,M.metal);else g.polygon([[xx-.0065,y+low,.013],[xx+.0065,y+low,.013],[xx+.0065,y+low+h,.013],[xx-.0065,y+low+h,.013]],C.dark,M.metal,[0,0,1]);}
   if(fine){B(g,[x,y+low+h/2,-.004],[.012,h,.03],C.dark,M.metal);B(g,[x,y+low+h*.60,-.004],[step-.050,.013,.03],C.dark,M.metal);}
  }
 }
 return g.build('recessed-elevation');
}
function shell(g,x,z,w,d,y,floors=1,fine=false,color=C.stone,glazing=M.window){
 const h=floors*.28;
 B(g,[x,y+.007,z],[w,.022,d],C.dark,M.plaster);
 g.add(elevation(w,floors,Math.max(1,Math.round(w/.23)),fine,color,true,glazing),[x,y,z+d/2]);
 g.add(elevation(w,floors,Math.max(1,Math.round(w/.23)),fine,color,false,glazing),[x,y,z-d/2],Math.PI);
 for(const side of [-1,1])g.add(elevation(d,floors,Math.max(1,Math.round(d/.25)),fine,color,false,glazing),[x+side*w/2,y,z],side*Math.PI/2);
 B(g,[x,y+h+.008,z],[w+.040,.038,d+.040],C.chalk);
 return y+h+.029;
}
function hip(g,x,z,w,d,y,h=.16,color=C.terra,mat=M.slate,fine=false){
 const a=[x-w/2,y,z-d/2],b=[x+w/2,y,z-d/2],c=[x+w/2,y,z+d/2],d0=[x-w/2,y,z+d/2],r0=[x,y+h,z-d*.22],r1=[x,y+h,z+d*.22];
 g.polygon([a,b,r0],color,mat,[0,d*.28/h,-1]);g.polygon([b,c,r1,r0],color,mat,[1,w*.5/h,0]);g.polygon([c,d0,r1],color,mat,[0,d*.28/h,1]);g.polygon([d0,a,r0,r1],color,mat,[-1,w*.5/h,0]);
 R(g,r0,r1,.016,color,mat,6);
 if(fine)for(const [pa,pb] of [[a,r0],[b,r0],[c,r1],[d0,r1]])R(g,pa,pb,.007,color,mat,4);
}
function barrel(g,x,z,w,d,y,h,fine=false){
 const n=fine?10:6,pt=(i,zz)=>[x+Math.cos(i/n*Math.PI)*w/2,y+Math.sin(i/n*Math.PI)*h,zz];
 for(let i=0;i<n;i++)g.polygon([pt(i,z-d/2),pt(i+1,z-d/2),pt(i+1,z+d/2),pt(i,z+d/2)],C.glass,M.glass,[Math.cos((i+.5)/n*Math.PI)/(w/2),Math.sin((i+.5)/n*Math.PI)/h,0]);
 for(const zz of [z-d/2,z+d/2]){
  g.polygon(Array.from({length:n+1},(_,i)=>pt(i,zz)),C.glass,M.glass,[0,0,zz>z?1:-1]);
  for(let i=0;i<n;i++)R(g,pt(i,zz),pt(i+1,zz),.013,C.dark,M.metal,5);
  R(g,[x,y,zz],[x,y+h,zz],.012,C.dark);
 }
 for(const i of [0,n/2,n])R(g,pt(i,z-d/2),pt(i,z+d/2),.012,C.dark);
 if(fine)for(let i=0;i<n;i++)R(g,pt(i,z),pt(i+1,z),.009,C.brass);
}
function pergola(g,x,z,w,d,y,fine=false){
 for(const dx of [-1,1])for(const dz of [-1,1])B(g,[x+dx*w/2,(y+.05)/2,z+dz*d/2],[.027,y-.05,.027],C.wood,M.teak);
 B(g,[x,y,z-d/2],[w+.05,.04,.032],C.wood,M.teak);B(g,[x,y,z+d/2],[w+.05,.04,.032],C.wood,M.teak);
 const n=fine?7:4;for(let i=0;i<n;i++)B(g,[x-w/2+i*w/(n-1),y+.028,z],[.026,.025,d+.06],C.wood,M.teak);
}
function steps(g,x,z,w=.24){for(let i=0;i<3;i++)B(g,[x,.055+i*.017,z-i*.042],[w,.028+i*.032,.063],C.stone);}
export {C,B,R,base,planter,cedar,rail,elevation,shell,hip,barrel,pergola,steps};
