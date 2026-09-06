/** Original civic architecture. Y-up, base at zero. No state, RNG, DOM or downloads. */
import { MeshBuilder } from '../marina/mesh-builder.js';
import { MATERIALS as M } from '../marina/surfaces.js';
import { createDistrictProp } from '../districts/kit.js';
const C=Object.freeze({stone:'#e8d9ba',light:'#f3e6cb',base:'#ab9b80',jade:'#376d62',roof:'#447b70',brass:'#bb995d',dark:'#264f49',glass:'#76aba9',warm:'#edc98b',paving:'#d8cbb3',joint:'#a9987e'});
const CIVIC_BUDGETS=Object.freeze({casino:[4400,7000],fountain:[1800,2800],promenade:[4700,6500]});
function ring(g,x,z,inner,outer,bottom,top,color,mat=M.stone,n=24){
  for(let i=0;i<n;i++){
    const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2,p=(r,y,t)=>[x+r*Math.cos(t),y,z+r*Math.sin(t)];
    g.polygon([p(inner,top,a),p(outer,top,a),p(outer,top,b),p(inner,top,b)],color,mat,[0,1,0]);
    g.polygon([p(outer,bottom,a),p(outer,bottom,b),p(outer,top,b),p(outer,top,a)],color,mat,[Math.cos((a+b)/2),0,Math.sin((a+b)/2)]);
    if(inner>0)g.polygon([p(inner,bottom,b),p(inner,bottom,a),p(inner,top,a),p(inner,top,b)],color,mat,[-Math.cos((a+b)/2),0,-Math.sin((a+b)/2)]);
  }
}
function roof(g,points,y0,y1,inset,color,mat=M.roof){
  const hi=points.map(([x,z])=>[x*inset,y1,z*inset]);
  for(let i=0;i<points.length;i++){
    const j=(i+1)%points.length,a=points[i],b=points[j],nx=b[1]-a[1],nz=a[0]-b[0];
    const ny=(1-inset)*(nx*a[0]+nz*a[1])/(y1-y0);
    g.polygon([[a[0],y0,a[1]],[b[0],y0,b[1]],hi[j],hi[i]],color,mat,[nx,ny,nz]);
  }
  g.polygon(hi,color,mat,[0,1,0]);
}
function octagon(w,d,c=.10){return [[-w/2+c,-d/2],[w/2-c,-d/2],[w/2,-d/2+c],[w/2,d/2-c],[w/2-c,d/2],[-w/2+c,d/2],[-w/2,d/2-c],[-w/2,-d/2+c]];}
/** Recessed, opaque glazing inside a stone opening, not a flat building impostor. */
function facade(width,height,bays,lod,door=false){
  const g=new MeshBuilder(),step=width/bays,pier=.057,low=.13,head=height-.13;
  g.box([0,low/2,0],[width,low,.075],C.base,M.stone);
  g.box([0,height-.065,0],[width,.13,.095],C.stone,M.stone);
  for(let i=0;i<=bays;i++)g.box([-width/2+i*step,height/2,.008],[pier,height,.11],C.light,M.stone);
  for(let i=0;i<bays;i++){
    const x=-width/2+(i+.5)*step,w=step-pier,isDoor=door&&i===Math.floor(bays/2),b=isDoor?.012:low+.014,h=head-b;
    g.box([x,b+h/2,-.044],[w,h,.012],isDoor?C.glass:C.warm,isDoor?M.glass:M.window);
    g.box([x,b+.012,.013],[w+.02,.028,.15],C.light,M.stone);
    for(const side of [-1,1])g.box([x+side*(w/2-.013),b+h/2,-.012],[.021,h,.045],C.dark,M.metal);
    g.box([x,b+h*.64,-.012],[w,.018,.045],C.dark,M.metal);
    g.box([x,b+h/2,-.010],[.014,h,.04],C.brass,M.metal);
    if(lod==='high'){
      g.box([x,head+.035,.064],[w+.028,.022,.043],C.brass,M.metal);
      if(!isDoor)g.box([x,b+.06,.041],[w*.66,.043,.032],C.jade,M.paint);
    }
    if(isDoor)for(const side of [-1,1])g.rod([x+side*.035,.23,.017],[x+side*.035,.34,.017],.006,C.brass,M.metal,6);
  }
  return g.build('civic-recessed-facade');
}
function casino(lod){
  const g=new MeshBuilder(),fine=lod==='high',segments=fine?16:12;
  // A central gaming hall, two low wings, a raised glazed lantern and deep portico.
  g.prism(octagon(1.95,1.23,.10),0,.06,C.base,M.stone);
  for(const [x,w,h] of [[0,1.03,.86],[-.73,.47,.65],[.73,.47,.65]]){
    const d=x===0?.88:.86,z=-.075;
    g.box([x,.09,z],[w+.035,.065,d+.035],C.light,M.stone);
    g.add(facade(w,h,x===0?3:2,lod,x===0),[x,.12,z+d/2]);
    g.add(facade(w,h,x===0?3:2,lod),[x,.12,z-d/2],Math.PI);
    if(x!==0)g.add(facade(d,h,3,lod),[x+Math.sign(x)*w/2,.12,z],Math.sign(x)*Math.PI/2);
    // Floor and inset roof are closed volumes; piers and frames project beyond glazing.
    g.box([x,h+.15,z],[w+.085,.065,d+.075],C.light,M.stone);
    g.box([x,h+.195,z],[w+.03,.035,d+.03],C.brass,M.metal);
    g.box([x,h+.218,z],[w-.055,.025,d-.065],C.jade,M.roof);
    if(x!==0){
      for(const sign of [-1,1])g.box([x,h+.262,z+sign*(d/2-.01)],[w+.08,.075,.04],C.stone,M.stone);
      g.box([x+Math.sign(x)*(w/2+.02),h+.262,z],[.04,.075,d],C.stone,M.stone);
      // Roof garden and a small skylight break the simple box silhouette.
      const skylight=new MeshBuilder();roof(skylight,[[-.13,-.19],[.13,-.19],[.13,.19],[-.13,.19]],0,.105,.50,C.glass,M.glass);
      g.add(skylight.build('wing-skylight'),[x,h+.24,z]);
      for(const zz of [-.25,.25])g.box([x,h+.27,z+zz],[.34,.07,.095],C.dark,M.foliage,.015);
    }
  }
  // Close the exposed hall sides above the lower wings with recessed clerestories.
  // The first studio capture exposed an open strip here, not intentional dark glazing.
  for(const sign of [-1,1]){
    g.box([sign*.515,.895,-.075],[.014,.18,.83],C.glass,M.glass);
    for(const z of [-.48,-.21,.06,.33])g.box([sign*.526,.895,z],[.038,.19,.025],C.light,M.stone);
    for(const y of [.808,.983])g.box([sign*.525,y,-.075],[.042,.024,.86],C.stone,M.stone);
  }
  // Eight-sided lantern: visible glazing between ribs, zinc facets and cap.
  const drum=octagon(.84,.77,.15);
  g.prism(drum.map(([x,z])=>[x,z-.075]),1.015,1.055,C.stone,M.stone);
  for(let i=0;i<drum.length;i++){
    const a=drum[i],b=drum[(i+1)%drum.length];
    g.polygon([[a[0],1.056,a[1]-.075],[b[0],1.056,b[1]-.075],[b[0],1.30,b[1]-.075],[a[0],1.30,a[1]-.075]],C.glass,M.glass);
    g.rod([a[0],1.045,a[1]-.075],[a[0],1.32,a[1]-.075],.023,C.stone,M.stone,6);
  }
  const crown=new MeshBuilder();g.prism(drum.map(([x,z])=>[x,z-.075]),1.305,1.34,C.brass,M.metal);
  roof(crown,octagon(.96,.89,.17),0,.19,.28,C.roof);g.add(crown.build('lantern-roof'),[0,1.345,-.075]);
  g.lathe([0,1.53,-.075],[[.14,0],[.14,.035],[.055,.10],[.027,.20],[0,.235]],C.brass,M.metal,segments);
  // Fan-shaped entrance canopy supported by real columns; open side approaches.
  const canopy=[[-.49,.35],[.49,.35],[.49,.51],[.34,.69],[-.34,.69],[-.49,.51]];
  g.prism(canopy,.675,.745,C.light,M.stone);g.prism(canopy,.748,.772,C.jade,M.roof);
  for(const x of [-.35,.35]){
    g.lathe([x,.06,.59],[[.068,0],[.068,.065],[.044,.09],[.039,.54],[.066,.575],[.066,.615]],C.light,M.stone,fine?10:8);
    g.box([x,.643,.59],[.15,.042,.15],C.brass,M.metal);
  }
  for(let j=0;j<3;j++)g.box([0,.018+j*.02,.78-j*.076],[.86-j*.045,.036+j*.04,.17],C.stone,M.stone);
  // Short balustrade at the rear roof terrace, not hundreds of submeshes.
  if(fine)for(const x of [-.9,-.73,-.56,.56,.73,.9])g.rod([x,.83,-.505],[x,1.01,-.505],.009,C.brass,M.metal,5);
  for(const x of [-.73,.73])g.rod([x-.21,.985,-.505],[x+.21,.985,-.505],.014,C.brass,M.metal,6);
  // Small original lettering integrated into the canopy frieze (no giant sign).
  const font={C:['111','100','100','100','111'],A:['010','101','111','101','101'],S:['111','100','111','001','111'],I:['111','010','010','010','111'],N:['101','111','111','111','101'],O:['111','101','101','101','111']};
  g.box([0,.708,.696],[.57,.092,.02],C.dark,M.paint);
  [...'CASINO'].forEach((c,i)=>font[c].forEach((r,y)=>[...r].forEach((v,x)=>{if(v==='1')g.box([-.254+i*.088+x*.022,.74-y*.016,.710],[.017,.012,.009],C.brass,M.metal);}))); 
  for(const x of [-.60,.60]){
    g.box([x,.37,.395],[.028,.19,.028],C.brass,M.metal);
    g.box([x,.47,.405],[.055,.072,.055],C.warm,M.lamp,.006);
  }
  return g.build(`casino-${lod}`);
}
function fountain(lod){
  const g=new MeshBuilder(),n=lod==='high'?32:24;
  ring(g,0,0,.48,.68,0,.065,C.base,M.stone,n);
  ring(g,0,0,.47,.625,.062,.15,C.light,M.stone,n);
  g.polygon(Array.from({length:n},(_,i)=>[.477*Math.cos(i/n*2*Math.PI),.100,.477*Math.sin(i/n*2*Math.PI)]),'#438d89',M.glass,[0,1,0]);
  g.lathe([0,0,0],[[.14,.035],[.14,.13],[.09,.18],[.07,.30],[.18,.32],[.19,.355],[.09,.38],[.045,.47],[0,.50]],C.light,M.stone,n/2);
  ring(g,0,0,.08,.15,.355,.364,'#73c0b9',M.glass,n);
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4;g.box([.655*Math.cos(a),.016,.655*Math.sin(a)],[.042,.021,.042],C.brass,M.metal);
  }
  return g.build(`fountain-${lod}`);
}
/** Mitred, flush pedestrian strip. Continuous topology at corners; no overlapping tiles. */
function path(g,points,width,y,color=C.paving,mat=M.paving){
  const sections=points.map((p,i)=>{
    const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],v=[b[0]-a[0],b[1]-a[1]],len=Math.hypot(...v),n=[-v[1]/len,v[0]/len];
    return [[p[0]+n[0]*width/2,y,p[1]+n[1]*width/2],[p[0]-n[0]*width/2,y,p[1]-n[1]*width/2]];
  });
  for(let i=1;i<sections.length;i++)g.polygon([sections[i-1][0],sections[i-1][1],sections[i][1],sections[i][0]],color,mat,[0,1,0]);
}
function promenade(lod){
  const g=new MeshBuilder(),fine=lod==='high',cache=new Map();
  const prop=(name,p,yaw=0,s=1)=>{if(!cache.has(name))cache.set(name,createDistrictProp(name,lod));g.add(cache.get(name),p,yaw,s);};
  // Existing public green footprints, not property foundations or a new economic lot.
  g.box([1.015,.425,.2],[3.07,.12,4.75],'#b3c3a3',M.foliage,.08);
  g.box([-1.45,.425,-.84],[1.80,.12,2.67],'#b3c3a3',M.foliage,.08);
  // The cross-axis leads from casino stairs to the main park spine.
  path(g,[[-1.25,-.25],[-1.25,.12],[-.52,.32],[.45,.32],[2.44,.32]],.40,.516);
  path(g,[[.45,-2.25],[.45,2.58]],.45,.518,C.light,M.stone);
  // Fan-shaped forecourt opens into the promenade instead of a private raised plinth.
  g.prism([[-2.19,-.42],[-.28,-.42],[-.28,.10],[-.62,.30],[-1.68,.30],[-2.19,-.02]],.476,.513,C.paving,M.paving);
  path(g,[[-1.65,.04],[-.75,.22]],.045,.52,C.brass,M.stone);
  // Landward bank: no surface covers the water polygon or changes its shoreline.
  path(g,[[-.64,.51],[-.49,.93],[-.49,2.59],[.02,2.80],[.45,2.80]],.27,.520,C.light,M.stone);
  path(g,[[-.75,.32],[-.94,.65],[-1.15,.72]],.26,.522,C.paving,M.paving);
  path(g,[[-.43,1.10],[.45,1.10],[1.10,1.45]],.30,.521);
  path(g,[[-.32,2.59],[.45,2.59],[1.55,2.40]],.29,.523);
  // Flush circular piazza surrounding the original fountain position.
  g.polygon(Array.from({length:32},(_,i)=>[1.65+.94*Math.cos(i/32*Math.PI*2),.513,1.45+.94*Math.sin(i/32*Math.PI*2)]),C.paving,M.paving,[0,1,0]);
  ring(g,1.65,1.45,.86,.895,.514,.524,C.light,M.stone,32);
  path(g,[[.45,1.45],[1.05,1.45]],.38,.524,C.light,M.stone);
  // Two permeable planted islands: visual breaks, not filling every free metre.
  for(const [x,z,w,d] of [[-.10,1.84,.33,.96],[1.58,-.55,1.05,.42]]){
    g.box([x,.512,z],[w+.04,.055,d+.04],C.base,M.stone,.04);
    g.box([x,.538,z],[w,.016,d],'#667e54',M.foliage,.025);
    for(let i=0;i<3;i++)g.box([x+(i-1)*w*.23,.574,z],[w*.25,.085,d*.55],'#8eaa6d',M.foliage,.02);
  }
  for(const [x,z,s] of [[-.11,1.76,.78],[2.23,-.78,.91],[2.16,-1.94,.8],[-.31,-1.92,.72]])prop('linden',[x,.49,z],0,s);
  for(const [x,z,a] of [[2.42,1.36,-Math.PI/2],[1.64,2.20,Math.PI],[.96,2.08,Math.PI],[-.20,.03,0]])prop('bench',[x,.528,z],a,.95);
  for(const [x,z] of [[-1.98,-.12],[-.44,-.13],[.08,.74],[2.39,1.98]])prop('heritage-lamp',[x,.518,z],0,.90);
  for(const [x,z] of [[.96,-.24],[1.46,-.24]])prop('cafe-table',[x,.528,z],0,.85);
  // Low bollards edge the casino approach and a gentle shore ramp, no fences across paths.
  for(const [x,z] of [[-2.04,.06],[-.52,.13],[-.28,.85],[-.29,2.43]]){
    g.rod([x,.515,z],[x,.64,z],.020,C.dark,M.metal,6);
    g.rod([x,.622,z],[x,.637,z],.022,C.brass,M.metal,6);
  }
  // Embedded stone bands guide the walk; detail count is bounded by LOD.
  for(let z=-1.95;z<2.45;z+=fine?.24:.48)g.box([.45,.521,z],[.39,.004,.011],C.joint,M.stone);
  return g.build(`promenade-${lod}`);
}
const CIVIC_FACTORIES=Object.freeze({casino,fountain,promenade});
function createCivicAsset(name,lod='low'){
  if(!CIVIC_FACTORIES[name]||!['low','high'].includes(lod))throw Error('Unknown civic asset or LOD');
  const mesh=CIVIC_FACTORIES[name](lod),budget=CIVIC_BUDGETS[name][lod==='high'?1:0];
  if(mesh.indices.length/3>budget)throw Error(`${name} exceeds ${lod} budget: ${mesh.indices.length/3} > ${budget}`);
  return mesh;
}
export { C, CIVIC_BUDGETS, CIVIC_FACTORIES, createCivicAsset, path, ring };
