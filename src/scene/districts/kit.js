/** Authored miniature city kit. Y up, metres-as-board-units, base at Y=0,
 * +Z facade, centre-of-parcel origin. No network, clock, state mutation or RNG.
 * A whole parcel is one indexed batch, with semantic materials in vertex data.
 */
import { MeshBuilder } from '../marina/mesh-builder.js';
import { MATERIALS as M } from '../marina/surfaces.js';
const C=Object.freeze({stone:'#e5d6b9',chalk:'#f6ead2',brick:'#b86748',brick2:'#ca8965',roof:'#425965',glass:'#517f90',ink:'#30484c',metal:'#778c8b',gold:'#c9aa6c',wood:'#a27c51',leaf:'#66845c',leaf2:'#87995b',teal:'#4f8585',red:'#b9674f',asphalt:'#73847e'});
function box(g,p,s,c=C.stone,m=M.stone,b=0){g.box(p,s,c,m,b);}
function rod(g,a,b,r=.01,c=C.ink,m=M.metal,n=6){g.rod(a,b,r,c,m,n);}
function frame(g,x,y,z,w,h,trim=C.chalk,arch=false,detail=true){
  // The glazing sits behind a 35-mm reveal. An inset cannot be mistaken for a decal.
  box(g,[x,y,z-.028],[w+.028,h+.028,.026],C.ink,M.paint);
  box(g,[x,y,z-.009],[w-.04,h-.032,.018],'#e5c58f',M.window);
  for(const dx of [-1,1])box(g,[x+dx*(w/2+.009),y,z+.012],[.035,h+.07,.045],trim,M.stone);
  box(g,[x,y-h/2-.026,z+.018],[w+.085,.045,.086],trim,M.stone);
  box(g,[x,y+h/2+.018,z+.01],[w+.073,.038,.055],trim,M.stone);
  if(detail){box(g,[x,y,z+.013],[.016,h,.024],C.chalk,M.paint);box(g,[x,y+.02,z+.013],[w,.014,.024],C.chalk,M.paint);}
  if(arch){
    const r=w/2+.022,cy=y+h/2-.01;
    for(let i=0;i<8;i++){
      const a=i/8*Math.PI,b=(i+1)/8*Math.PI;
      const ps=[[x+Math.cos(a)*r,cy+Math.sin(a)*r,z+.04],[x+Math.cos(b)*r,cy+Math.sin(b)*r,z+.04],[x+Math.cos(b)*(r+.038),cy+Math.sin(b)*(r+.038),z+.04],[x+Math.cos(a)*(r+.038),cy+Math.sin(a)*(r+.038),z+.04]];
      g.polygon(ps,trim,M.stone,[0,0,1]);
      g.polygon(ps.map(p=>[p[0],p[1],z+.006]),trim,M.stone,[0,0,-1]);
      g.polygon([ps[0],ps[1],[ps[1][0],ps[1][1],z+.006],[ps[0][0],ps[0][1],z+.006]],C.stone,M.stone);
    }
    box(g,[x,cy+r+.028,z+.026],[.056,.064,.070],C.chalk,M.stone);
  }
}
function sign(g,text,p,width=.30,c=C.gold){
  const font={C:['111','100','100','100','111'],A:['010','101','111','101','101'],F:['111','100','110','100','100'],E:['111','100','110','100','111'],O:['111','101','101','101','111'],0:['111','101','101','101','111'],1:['010','110','010','010','111'],2:['110','001','010','100','111'],3:['110','001','010','001','110'],D:['110','101','101','101','110']};
  const step=width/(text.length*4+1);
  box(g,p,[width,.095,.031],C.ink,M.paint,.006);
  for(let k=0;k<text.length;k++)for(let y=0;y<5;y++)for(let x=0;x<3;x++)if(font[text[k]]?.[y]?.[x]==='1')box(g,[p[0]-width/2+(k*4+x+1)*step,p[1]+(2-y)*.014,p[2]+.020],[step*.72,.010,.006],c,M.paint);
}
function canopy(g,x,y,z,w,color=C.teal,detail=true){
  const n=detail?8:4;
  for(let i=0;i<n;i++){
    const left=x-w/2+i*w/n,right=left+w/n,c=i%2?C.chalk:color;
    g.polygon([[left,y,z],[right,y,z],[right,y-.10,z+.16],[left,y-.10,z+.16]],c,M.canvas,[0,1,1]);
    box(g,[(left+right)/2,y-.126,z+.16],[w/n,.052,.018],c,M.canvas);
  }
  rod(g,[x-w/2,y-.11,z],[x-w/2,y-.11,z+.17],.007,C.ink);rod(g,[x+w/2,y-.11,z],[x+w/2,y-.11,z+.17],.007,C.ink);
}
function roof(g,x,y,z,w,d,mansard,detail){
  const e=.042;
  box(g,[x,y,z],[w+.08,.044,d+.08],C.chalk,M.stone);
  if(mansard){
    const low=[[-w/2-e,0,-d/2-e],[w/2+e,0,-d/2-e],[w/2+e,0,d/2+e],[-w/2-e,0,d/2+e]];
    const high=low.map(p=>[p[0]*.69,.22,p[2]*.55]);
    for(let i=0;i<4;i++){const j=(i+1)%4;g.polygon([low[i],low[j],high[j],high[i]].map(p=>[x+p[0],y+p[1]+.022,z+p[2]]),C.roof,M.slate,[i===1?1:i===3?-1:0,.8,i===0?-1:i===2?1:0]);}
    box(g,[x,y+.253,z],[w*.73,.025,d*.55],C.roof,M.roof);
    if(detail)for(const dx of [-.18,.18]){
      box(g,[x+dx,y+.13,z+d/2-.035],[.115,.15,.09],C.stone,M.stone);
      frame(g,x+dx,y+.135,z+d/2+.014,.072,.083,C.chalk,false,false);
      g.polygon([[x+dx-.083,y+.21,z+d/2+.066],[x+dx+.083,y+.21,z+d/2+.066],[x+dx,y+.28,z+d/2+.066]],C.chalk,M.stone,[0,0,1]);
    }
  }else{
    const ps=[[-w/2-e,0],[0,.25],[w/2+e,0]],a=z-d/2-e,b=z+d/2+e;
    for(const zz of [a,b])g.polygon(ps.map(p=>[x+p[0],y+p[1],zz]),C.brick2,M.brick,[0,0,zz===a?-1:1]);
    g.polygon([[x-w/2-e,y,a],[x,y+.25,a],[x,y+.25,b],[x-w/2-e,y,b]],C.roof,M.slate,[-1,1,0]);
    g.polygon([[x,y+.25,a],[x+w/2+e,y,a],[x+w/2+e,y,b],[x,y+.25,b]],C.roof,M.slate,[1,1,0]);
    rod(g,[x,y+.257,a],[x,y+.257,b],.020,C.roof,M.roof);
  }
  box(g,[x-w*.24,y+.23,z-d*.24],[.10,.31,.10],C.brick,M.brick);
  box(g,[x-w*.24,y+.395,z-d*.24],[.13,.04,.13],C.chalk,M.stone);
}
function tree(g,x,z,scale=1,detail=true){
  rod(g,[x,0,z],[x+.018*scale,.39*scale,z],.019*scale,C.wood,M.teak);
  const count=detail?5:3;
  for(let i=0;i<count;i++){
    const a=i*2.4,px=x+Math.cos(a)*.13*scale,pz=z+Math.sin(a)*.13*scale,py=(.28+(i%2)*.07)*scale;
    rod(g,[x,.20*scale,z],[px,py+.12*scale,pz],.008*scale,C.wood,M.teak,5);
    g.lathe([px,py,pz],[[0,0],[.10*scale,.025*scale],[.145*scale,.11*scale],[.105*scale,.24*scale],[0,.31*scale]],i%2?C.leaf:C.leaf2,M.foliage,detail?7:5);
  }
}
function planter(g,x,z,w=.20,d=.17,detail=true){
  box(g,[x,.055,z],[w,.11,d],C.stone,M.stone,.018);box(g,[x,.11,z],[w-.033,.012,d-.033],'#675d46',M.plaster);
  g.lathe([x,.12,z],[[0,0],[w*.36,.01],[w*.40,.055],[w*.25,.11],[0,.125]],C.leaf,M.foliage,detail?8:5);
}
function bench(g,x,z,detail=true){
  for(const dx of [-.095,.095]){box(g,[x+dx,.063,z],[.025,.126,.12],C.ink,M.metal);rod(g,[x+dx,.06,z-.045],[x+dx,.22,z-.065],.008);}
  const n=detail?3:1;
  for(let i=0;i<n;i++){box(g,[x,.14,z+(i-(n-1)/2)*.041],[.27,.025,n===1?.115:.034],C.wood,M.teak);}
  for(let i=0;i<2;i++)box(g,[x,.185+i*.045,z-.064],[.27,.031,.017],C.wood,M.teak);
}
function table(g,x,z,detail=true){
  g.lathe([x,0,z],[[0,0],[.038,0],[.046,.013],[.012,.018],[.012,.13],[.087,.13],[.087,.15],[0,.15]],C.chalk,M.paint,detail?10:6);
  for(const dz of [-.125,.125]){
    box(g,[x,.077,z+dz],[.088,.019,.085],C.teal,M.paint);box(g,[x,.137,z+dz+Math.sign(dz)*.038],[.083,.102,.019],C.teal,M.paint);
    for(const dx of [-.031,.031])rod(g,[x+dx,0,z+dz],[x+dx,.08,z+dz],.007,C.ink,M.metal,4);
  }
  if(detail){g.lathe([x,.15,z],[[.013,0],[.017,.018],[.012,.035]],C.stone,M.stone,6);}
}
function lamp(g,x,z,modern=false,detail=true){
  const height=modern?.55:.59;
  rod(g,[x,0,z],[x,height,z],.012,C.ink,M.metal,detail?8:5);
  box(g,[x,.017,z],[.065,.033,.065],C.ink,M.metal,.005);
  if(modern){box(g,[x+.04,height,z],[.16,.022,.047],C.metal,M.metal);box(g,[x+.066,height-.016,z],[.10,.012,.033],C.chalk,M.lamp);}
  else {box(g,[x,height+.07,z],[.07,.13,.07],C.gold,M.lamp);for(const dx of [-.038,.038])for(const dz of [-.038,.038])rod(g,[x+dx,height,z+dz],[x+dx,height+.15,z+dz],.006);
    g.lathe([x,height+.15,z],[[.068,0],[.01,.053],[0,.074]],C.ink,M.metal,4);}
}
function balcony(g,x,y,z,w,detail){
  box(g,[x,y,z+.06],[w,.038,.17],C.stone,M.stone);
  rod(g,[x-w/2,y+.18,z+.135],[x+w/2,y+.18,z+.135],.008,C.ink);
  for(let i=0;i<(detail?6:3);i++){const xx=x-w/2+i*w/((detail?6:3)-1);rod(g,[xx,y+.025,z+.135],[xx,y+.18,z+.135],.005,C.ink,M.metal,4);}
}
function oldTown(g,level,variant,detail){
  const floors=level+1,w=level>1?.69:.61,d=.43,x=-.07,z=-.13,h=.41+floors*.285;
  box(g,[0,.03,0],[.97,.06,.96],C.stone,M.paving,.025);
  box(g,[x,.07+h/2,z],[w,h,d],variant?C.brick2:C.brick,M.brick);
  box(g,[x,.12,z],[w+.04,.10,d+.04],C.stone,M.stone);
  // Pilasters and floor cornices create depth on every elevation.
  for(let j=0;j<floors+1;j++)box(g,[x,.38+j*.285,z],[w+.042,.035,d+.04],C.stone,M.stone);
  for(const dx of [-1,1])for(const dz of [-1,1]){
    box(g,[x+dx*(w/2-.025),.08+h/2,z+dz*(d/2+.007)],[.061,h,.035],C.chalk,M.stone);
    if(detail)for(let j=0;j<Math.floor(h/.1);j++)box(g,[x+dx*(w/2-.024),.10+j*.1,z+dz*(d/2+.015)],[.069,.026,.042],C.stone,M.stone);
  }
  frame(g,x-.145,.25,z+d/2+.017,.195,.23,C.chalk,false,detail);
  frame(g,x+.16,.25,z+d/2+.017,.18,.23,C.chalk,false,detail);
  rod(g,[x+.19,.19,z+d/2+.05],[x+.19,.26,z+d/2+.05],.007,C.gold);
  sign(g,variant?'CAFE':'DECO',[x,.431,z+d/2+.023],.29);
  canopy(g,x,.405,z+d/2+.06,w+.015,variant?C.red:C.teal,detail);
  for(let floor=0;floor<floors;floor++){
    const y=.58+floor*.285;
    for(const dx of [-.17,.17])frame(g,x+dx,y,z+d/2+.018,.145,.183,C.chalk,level>1&&floor===floors-1,detail);
    for(const side of [-1,1]){
      const t=new MeshBuilder();frame(t,0,y,0,.145,.183,C.chalk,false,detail);
      g.add(t.build('side-reveal'),[x+side*(w/2+.006),0,z],side*Math.PI/2);
    }
    // Rear elevation: inset glazing with projecting stone lintel/sill.
    // Only 26/50 triangles per floor; the rear must hold up during rotation too.
    const back=z-d/2-.006;
    g.polygon([[x-.13,y-.088,back],[x+.13,y-.088,back],[x+.13,y+.088,back],[x-.13,y+.088,back]],'#e5c58f',M.window,[0,0,-1]);
    for(const dy of [-.105,.105])box(g,[x,y+dy,back-.016],[.305,.034,.065],C.stone,M.stone);
    if(detail)for(const dx of [-.147,.147])box(g,[x+dx,y,back-.012],[.027,.18,.046],C.chalk,M.stone);
    if(floor===0&&level>0)balcony(g,x,.46,z+d/2+.034,w*.78,detail);
  }
  roof(g,x,.09+h,z,w,d,variant===0,detail);
  // A projecting shop bay and modest rooftop room diversify the upper tiers.
  if(level>=2){box(g,[x+.35,.26,z-.025],[.17,.39,.29],C.stone,M.stone);box(g,[x+.35,.46,z-.025],[.20,.025,.32],C.roof,M.roof);frame(g,x+.35,.25,z+.134,.115,.22,C.chalk,false,false);}
  if(level>=1)table(g,x+.19,.325,detail);
  if(level>=2)table(g,x-.19,.325,detail);
  planter(g,-.365,.34,.17,.16,detail);
  if(level===3){const t=new MeshBuilder();tree(t,0,0,.67,detail);g.add(t.build('linden'),[.33,.067,-.31]);}
  if(detail&&level>=1){box(g,[x-.25,.20,.32],[.07,.19,.04],C.ink,M.paint);box(g,[x-.25,.22,.344],[.05,.10,.009],C.stone,M.paint);}
}
function chamferRect(w,d,b=.06){return [[-w/2+b,-d/2],[w/2-b,-d/2],[w/2,-d/2+b],[w/2,d/2-b],[w/2-b,d/2],[-w/2+b,d/2],[-w/2,d/2-b],[-w/2,-d/2+b]];}
function officeShaft(g,x,z,w,d,y,h,variant,detail){
  const shape=chamferRect(w,d,.07).map(p=>[p[0]+x,p[1]+z]);
  g.prism(shape,y,y+h,variant?'#457588':'#548d98',M.glass);
  const floors=Math.max(1,Math.round(h/.15)),step=h/floors;
  for(let j=0;j<=floors;j++){
    const yy=y+j*step;
    if(detail||j%2===0||j===floors)g.prism(shape.map(p=>[x+(p[0]-x)*1.024,z+(p[1]-z)*1.024]),yy,yy+.015,variant?C.metal:C.chalk,M.metal);
  }
  // Glass modules have physical spandrels and deep vertical fins, not a lit flat texture.
  const count=detail?4:2;
  for(const sign of [-1,1])for(let i=0;i<count;i++){
    const xx=x+(i-(count-1)/2)*(w-.15)/count,zz=z+(i-(count-1)/2)*(d-.15)/count;
    box(g,[xx,y+h/2,z+sign*(d/2+.014)],[.018,h,.041],variant?C.metal:C.gold,M.metal);
    box(g,[x+sign*(w/2+.014),y+h/2,zz],[.04,h,.018],variant?C.metal:C.chalk,M.metal);
    if(detail)for(let j=0;j<floors;j++)if((i+j)%3===0){
      box(g,[xx+.034,y+(j+.48)*step,z+sign*(d/2+.003)],[.041,step*.51,.008],(i+j)%2?'#d5bf81':'#5b8c9f',M.window);
    }
  }
}
function financial(g,level,variant,detail){
  const height=[.49,1.05,1.68,2.36][level],x=-.055,z=-.085;
  box(g,[0,.027,0],[.97,.054,.96],C.stone,M.stone,.02);
  box(g,[0,.061,.25],[.77,.028,.30],C.chalk,M.stone);
  box(g,[x,.20,z],[.76,.31,.57],C.ink,M.paint,.055);
  // Glass podium, canopy, entrance steps and planter walls.
  for(const dx of [-.255,0,.255]){box(g,[x+dx,.216,.212],[.205,.252,.035],C.glass,M.glass);box(g,[x+dx-.115,.216,.238],[.018,.287,.044],C.chalk,M.stone);}
  box(g,[x,.21,.25],[.142,.269,.025],C.ink,M.paint);
  box(g,[x,.21,.267],[.11,.242,.012],C.glass,M.glass);
  box(g,[x,.35,.265],[.48,.028,.23],C.chalk,M.metal,.006);
  for(const dx of [-.207,.207])rod(g,[x+dx,.082,.345],[x+dx,.335,.345],.007,C.metal);
  for(let i=0;i<3;i++)box(g,[x,.054+i*.015,.40-i*.043],[.32,.017,.073],C.chalk,M.stone);
  box(g,[x,.373,z],[.80,.033,.60],C.stone,M.stone,.04);
  if(variant===0){
    officeShaft(g,x,z,.56,.43,.38,height,0,detail);
    // Chamfered crown with a slanted cap and offset service spine.
    const shape=chamferRect(.60,.47,.074).map(p=>[x+p[0],.38+height+.04+p[0]*.28,z+p[1]]);
    g.polygon(shape,C.chalk,M.metal,[0,1,0]);
    for(let i=0;i<shape.length;i++){const j=(i+1)%shape.length;g.polygon([[shape[i][0],.38+height,shape[i][2]],[shape[j][0],.38+height,shape[j][2]],shape[j],shape[i]],C.chalk,M.metal);}
    box(g,[x-.245,.38+height*.54,z-.125],[.056,height*1.08,.18],C.chalk,M.stone);
    if(level>=2)rod(g,[x-.24,.41+height,z-.13],[x-.24,.72+height,z-.13],.009,C.gold,M.metal);
  }else{
    const parts=level>1?3:2;
    for(let i=0;i<parts;i++){
      const width=.64-i*.10,depth=.44-i*.06,base=.38+height/parts*i,hh=height/parts;
      officeShaft(g,x+i*.018,z-i*.025,width,depth,base,hh,1,detail);
      box(g,[x+i*.018,base+hh+.014,z-i*.025],[width+.033,.038,depth+.033],C.chalk,M.stone,.017);
    }
  }
  box(g,[x,.45+height,z],[.21,.11,.15],C.metal,M.metal,.008);
  if(detail)for(let i=0;i<4;i++)box(g,[x-.075+i*.05,.508+height,z],[.013,.013,.14],C.ink,M.metal);
  planter(g,-.34,.32,.18,.18,detail);planter(g,.33,.32,.18,.18,detail);
  if(level>=2){box(g,[.36,.143,-.29],[.085,.20,.20],C.teal,M.foliage,.026);box(g,[.35,.047,-.29],[.17,.09,.28],C.chalk,M.stone);}
  if(detail){box(g,[.32,.23,.19],[.032,.35,.12],C.ink,M.paint);box(g,[.339,.28,.19],[.007,.06,.08],C.gold,M.metal);}
}
function container(g,x,y,z,color=C.teal,detail=true,scale=1){
  box(g,[x,y+.095*scale,z],[.205*scale,.19*scale,.42*scale],color,M.corrugated,.008*scale);
  const ribs=detail?8:4;
  for(const side of [-1,1])for(let i=0;i<ribs;i++)box(g,[x+side*.105*scale,y+.095*scale,z+((i/(ribs-1))-.5)*.36*scale],[.011*scale,.18*scale,.014*scale],color,M.metal);
  for(const dx of [-.09,.09])box(g,[x+dx*scale,y+.095*scale,z+.215*scale],[.017*scale,.19*scale,.011*scale],C.metal,M.metal);
  box(g,[x,y+.095*scale,z+.215*scale],[.006*scale,.18*scale,.009*scale],C.ink,M.metal);
}
function truck(g,x,z,detail=true){
  box(g,[x,.09,z],[.18,.10,.39],C.ink,M.paint);
  box(g,[x,.21,z+.115],[.19,.21,.16],C.chalk,M.paint,.025);
  box(g,[x,.244,z+.199],[.143,.072,.009],C.glass,M.glass);
  box(g,[x,.125,z+.215],[.185,.035,.02],C.metal,M.metal);
  for(const side of [-1,1]){box(g,[x+side*.06,.16,z+.21],[.035,.025,.013],C.gold,M.lamp);for(const zz of [-.115,.12])g.rod([x+side*.086,.067,z+zz],[x+side*.11,.067,z+zz],.049,C.ink,M.paint,detail?10:6);}
  box(g,[x,.205,z-.102],[.19,.23,.24],C.teal,M.corrugated,.006);
  if(detail){for(const side of [-1,1])rod(g,[x+side*.093,.255,z+.16],[x+side*.126,.255,z+.165],.006);box(g,[x,.094,z-.23],[.11,.023,.017],C.red,M.paint);}
}
function gantry(g,x,z,detail=true){
  const w=.70,h=.73;
  for(const dx of [-w/2,w/2]){
    box(g,[x+dx,.04,z],[.14,.08,.24],C.ink,M.paint,.012);
    box(g,[x+dx,h/2,z],[.045,h,.060],C.gold,M.paint);
    rod(g,[x+dx,h*.2,z-.09],[x+dx,h*.82,z+.07],.014,C.gold,M.metal,5);
  }
  box(g,[x,h,z],[w+.10,.075,.093],C.gold,M.paint);
  if(detail)for(let i=0;i<5;i++){const xx=x-w/2+i*w/5;rod(g,[xx,h-.019,z+.055],[xx+w/5,h+.035,z+.055],.009,C.ink,M.metal,4);}
  box(g,[x+.13,h-.045,z],[.11,.075,.12],C.ink,M.metal);
  for(const dx of [.10,.15])rod(g,[x+dx,h-.07,z],[x+dx,h-.33,z],.004,C.ink,M.metal,4);
  box(g,[x+.125,h-.34,z],[.115,.025,.07],C.gold,M.metal);
}
function industrial(g,level,variant,detail){
  box(g,[0,.022,0],[.97,.044,.96],C.asphalt,M.paving,.02);
  const x=-.035,z=-.215,w=.71,d=.38,h=[.27,.36,.43,.48][level];
  box(g,[x,.05+h/2,z],[w,h,d],variant?'#ba815a':'#6c9992',M.corrugated);
  for(const dx of [-w/2,0,w/2])box(g,[x+dx,.05+h/2,z+d/2+.006],[.035,h+.015,.028],C.chalk,M.stone);
  box(g,[x,.09,z+.15],[w+.08,.16,.24],C.stone,M.stone);
  for(const dx of [-.185,.185]){
    box(g,[x+dx,.17+h*.30,z+d/2+.023],[.244,h*.70,.02],C.ink,M.paint);
    box(g,[x+dx,.17+h*.30,z+d/2+.037],[.22,h*.65,.015],C.metal,M.corrugated);
    if(detail)for(let j=0;j<4;j++)box(g,[x+dx,.155+j*h*.16,z+d/2+.05],[.218,.009,.011],C.ink,M.metal);
    for(const s of [-1,1])box(g,[x+dx+s*.11,.132,z+d/2+.046],[.029,.10,.030],C.ink,M.paint);
  }
  // North-light sawtooth roof: a real serrated silhouette with glazed vertical faces.
  const n=variant?3:2,yy=h+.062;
  for(let i=0;i<n;i++){
    const a=x-w/2+i*w/n,b=a+w/n,top=yy+.13;
    g.polygon([[a,yy,z-d/2-.026],[b-.035,top,z-d/2-.026],[b-.035,top,z+d/2+.026],[a,yy,z+d/2+.026]],C.roof,M.roof,[0,1,0]);
    g.polygon([[b-.035,top,z-d/2-.026],[b,yy,z-d/2-.026],[b,yy,z+d/2+.026],[b-.035,top,z+d/2+.026]],C.glass,M.glass,[1,1,0]);
    for(const zz of [z-d/2-.027,z+d/2+.027])g.polygon([[a,yy,zz],[b,yy,zz],[b-.035,top,zz]],C.chalk,M.stone,[0,0,zz<z?-1:1]);
  }
  // Solid dock bumpers / painted loading lanes are readable without particles.
  for(const xx of [-.35,-.09,.09,.35])box(g,[xx,.047,.27],[.013,.006,.34],C.gold,M.paint);
  sign(g,variant?'03':'02',[x,.10+h,z+d/2+.040],.14);
  if(level>=1)container(g,-.32,.045,.20,variant?C.teal:C.red,detail,.76);
  if(level>=2){const t=new MeshBuilder();truck(t,0,0,detail);g.add(t.build('delivery-truck'),[.135,.05,.225],Math.PI,1);}
  if(level===3){gantry(g,0,.245,detail);container(g,-.32,.19,.20,C.teal,detail,.76);}
  if(level===0){box(g,[-.28,.10,.29],[.16,.12,.15],C.wood,M.teak);box(g,[-.28,.166,.29],[.17,.017,.16],C.stone,M.paint);}
  // Small ventilation stack and roof duct, no smoke system.
  rod(g,[x+.28,yy,z-.09],[x+.28,yy+.23,z-.09],.026,C.metal,M.metal,detail?10:6);
  box(g,[x+.28,yy+.231,z-.09],[.09,.027,.09],C.ink,M.metal);
}
function site(g,family,detail){
  box(g,[0,.022,0],[.97,.044,.96],family==='industrial'?C.asphalt:C.stone,M.paving,.018);
  // Unowned: genuinely empty development pad, not a free developed building.
  for(const x of [-.30,.30])box(g,[x,.048,-.11],[.015,.01,.44],C.chalk,M.paint);
  for(const z of [-.33,.11])box(g,[0,.048,z],[.60,.01,.015],C.chalk,M.paint);
  if(family==='oldtown'){tree(g,-.31,.25,.73,detail);bench(g,.14,.33,detail);}
  else if(family==='financial'){planter(g,-.32,.31,.19,.21,detail);planter(g,.32,.31,.19,.21,detail);}
  else {box(g,[-.22,.105,.32],[.24,.12,.16],C.wood,M.teak);for(const xx of [-.23,.23])rod(g,[xx,.05,-.36],[xx,.19,-.36],.011,C.gold);rod(g,[-.23,.16,-.36],[.23,.16,-.36],.012,C.gold);}
}
const FAMILIES=Object.freeze(['oldtown','financial','industrial']);
function createDistrictAsset(family,level=0,variant=0,lod='low'){
  if(!FAMILIES.includes(family)||!Number.isInteger(level)||level< -1||level>3||![0,1].includes(variant)||!['low','high'].includes(lod))throw new Error('Invalid district asset specification');
  const g=new MeshBuilder(),detail=lod==='high';
  if(level===-1)site(g,family,detail);else ({oldtown:oldTown,financial,industrial})[family](g,level,variant,detail);
  return g.build(`${family}-${variant}-level-${level}-${lod}`);
}
function createDistrictProp(name,lod='low'){
  if(!['low','high'].includes(lod))throw Error('Invalid LOD');
  const g=new MeshBuilder(),detail=lod==='high';
  switch(name){
    case 'linden':tree(g,0,0,1,detail);break;
    case 'bench':bench(g,0,0,detail);break;
    case 'cafe-table':table(g,0,0,detail);break;
    case 'heritage-lamp':lamp(g,0,0,false,detail);break;
    case 'office-lamp':lamp(g,0,0,true,detail);break;
    case 'container':container(g,0,0,0,C.teal,detail);break;
    case 'delivery-truck':truck(g,0,0,detail);break;
    case 'gantry':gantry(g,0,0,detail);break;
    default:throw Error('Unknown district prop');
  }
  return g.build(`${name}-${lod}`);
}
export { createDistrictAsset, createDistrictProp, FAMILIES, C };
