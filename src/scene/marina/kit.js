/** Original marina kit, authored in board units (approximately 10 visual metres).
 * All geometry is genuinely volumetric. Boats: origin at waterline, bow +Z.
 * Architecture/props: origin at foundation/ground, frontage +Z. No external assets.
 */
import { MeshBuilder } from './mesh-builder.js';
import { MATERIALS as M } from './surfaces.js';
const P=Object.freeze({ivory:'#eee9dc',white:'#fffaf0',navy:'#183944',glass:'#213f50',teak:'#bb8b55',stone:'#d9cfb8',wall:'#ebd9bc',roof:'#557d83',bronze:'#586760',metal:'#ccd1c5',warm:'#ffd69a',leaf:'#39765b',leafLight:'#6b9d67',red:'#cb8266'});
const TAU=Math.PI*2;
function line(g,points,r,color=P.metal,material=M.metal,segments=6) {for(let i=1;i<points.length;i++)g.rod(points[i-1],points[i],r,color,material,segments);}
function hullRings(stations) {
  return stations.map(([z,w,top,keel])=>[
    [w,top,z],[-w,top,z],[-w*.98,top*.60+keel*.40,z],[-w*.83,top*.24+keel*.76,z],[-w*.42,keel+.009,z],
    [0,keel,z],[w*.42,keel+.009,z],[w*.83,top*.24+keel*.76,z],[w*.98,top*.60+keel*.40,z],
  ]);
}
function yacht(lod='high') {
  const g=new MeshBuilder(),high=lod==='high',seg=high?8:5;
  const stations=[[-.72,.175,.12,-.092],[-.57,.227,.126,-.115],[-.31,.251,.137,-.126],[0,.25,.15,-.122],[.26,.223,.164,-.11],[.49,.166,.18,-.075],[.69,.084,.196,.01],[.82,.009,.21,.14]];
  g.loft(hullRings(stations),P.ivory,M.paint);
  // Teak decks follow the sheer line, not a floating rectangular card.
  for(let i=1;i<stations.length;i++) {
    const [z,w,y]=stations[i], [zz,ww,yy]=stations[i-1];
    g.polygon([[-ww*.87,yy+.004,zz],[ww*.87,yy+.004,zz],[w*.87,y+.004,z],[-w*.87,y+.004,z]],P.teak,M.teak,[0,1,0]);
  }
  for(const sign of [-1,1]) {
    line(g,stations.map(([z,w,y])=>[sign*w,y+.01,z]),.009,P.white,M.paint,seg);
    line(g,stations.slice(0,-1).map(([z,w,y])=>[sign*w*.955,y-.043,z]),.007,P.navy,M.paint,seg);
    // Guard rails: clear open space between deck and rail, with separate stanchions.
    const stops=high?[0,1,2,3,4,5,6]:[0,2,4,6];
    const rail=stops.map(i=>{const [z,w,y]=stations[i];return [sign*w*.96,y+.103,z];});
    line(g,rail,.0045,P.metal,M.metal,seg);
    for(const i of stops){const [z,w,y]=stations[i];g.rod([sign*w*.96,y+.015,z],[sign*w*.96,y+.104,z],.0036,P.metal,M.metal,seg);}
    if(high)for(const z of [-.38,-.15,.085]) {
      const w=.250,yy=.073;
      g.rod([sign*(w-.008),yy,z],[sign*(w+.007),yy,z],.025,P.bronze,M.metal,12);
      g.rod([sign*(w+.007),yy,z],[sign*(w+.009),yy,z],.018,P.glass,M.glass,12);
    }
  }
  // Swimming platform, transom gate and aft sofa.
  g.box([0,.094,-.792],[.352,.037,.19],P.ivory,M.paint,.015);
  g.box([0,.114,-.797],[.325,.012,.157],P.teak,M.teak,.006);
  g.box([0,.181,-.588],[.316,.079,.122],P.white,M.paint,.013);
  g.box([0,.228,-.619],[.310,.085,.035],P.ivory,M.paint,.012);
  g.box([0,.226,-.574],[.286,.022,.077],'#d1ae83',M.canvas,.008);
  // Cabin: sloping bow and recessed continuous side glazing.
  const cabin=[[-.43,.179,.184,.39],[-.30,.181,.19,.444],[.08,.158,.197,.445],[.34,.113,.216,.324]];
  const rings=cabin.map(([z,w,b,t])=>[[w*.9,t,z],[-w*.9,t,z],[-w,b,z],[w,b,z]]);
  g.loft(rings,P.white,M.paint);
  // Follow the actual tapered cabin skin. The earlier flat panels intersected
  // the white cabin and hid most of the glazing in the neutral-light review.
  const section=z=>{let i=1;while(i<cabin.length-1&&z>cabin[i][0])i++;
    const a=cabin[i-1],b=cabin[i],t=(z-a[0])/(b[0]-a[0]);return a.map((v,k)=>v+(b[k]-v)*t);};
  const sidePoint=(z,fraction,sign)=>{const [,w,b,t]=section(z);return [sign*(w*(1-.1*fraction)+.003),b+(t-b)*fraction,z];};
  const breaks=[-.405,-.30,.08,.304];
  for(const sign of [-1,1]) {
    for(let i=1;i<breaks.length;i++)g.polygon([
      sidePoint(breaks[i-1],.39,sign),sidePoint(breaks[i],.39,sign),
      sidePoint(breaks[i],.88,sign),sidePoint(breaks[i-1],.88,sign)
    ],P.glass,M.glass,[sign,.1,0]);
    if(high)for(const z of [-.21,-.035])g.rod(sidePoint(z,.39,sign),sidePoint(z,.89,sign),.006,P.ivory,M.paint,5);
  }
  const wind=(z,sign)=>{const [,w,,top]=section(z);return [sign*w*.9*.88,top+.004,z];};
  g.polygon([wind(.119,-1),wind(.119,1),wind(.308,1),wind(.308,-1)],P.glass,M.glass,[0,1,.465]);
  const windA=wind(.119,0),windB=wind(.308,0);windA[1]+=.003;windB[1]+=.003;
  line(g,[windA,windB],.004,P.ivory,M.paint,5);
  g.polygon([[-.153,.226,-.436],[.153,.226,-.436],[.148,.366,-.436],[-.148,.366,-.436]],P.glass,M.glass,[0,0,-1]);
  // Flybridge, cushions and actual suspended hardtop.
  g.box([0,.451,-.135],[.397,.040,.576],P.white,M.paint,.013);
  g.box([0,.474,-.177],[.337,.012,.413],P.teak,M.teak,.003);
  for(const x of [-.095,.095]) {
    g.box([x,.494,-.285],[.12,.038,.135],P.ivory,M.paint,.010);
    g.box([x,.528,-.343],[.12,.074,.028],P.white,M.paint,.009);
    g.box([x,.519,-.280],[.104,.014,.11],'#ceb490',M.canvas,.005);
  }
  g.box([.076,.495,.011],[.125,.055,.12],P.ivory,M.paint,.010);
  g.box([.076,.527,.01],[.085,.012,.07],P.glass,M.glass,.002);
  g.polygon([[-.178,.474,.095],[.178,.474,.095],[.156,.544,.064],[-.156,.544,.064]],P.glass,M.glass,[0,0,1]);
  for(const x of [-.166,.166])for(const z of [-.331,.012])g.rod([x,.474,z],[x*.90,.666,z-.035],.009,P.bronze,M.metal,seg);
  g.box([0,.682,-.187],[.442,.037,.538],P.white,M.paint,.018);
  g.box([0,.703,-.178],[.28,.008,.37],'#c6d2ca',M.paint,.003);
  if(high) {
    g.rod([0,.704,-.31],[0,.779,-.34],.012,P.white,M.paint,8);
    g.box([0,.783,-.34],[.17,.025,.04],P.ivory,M.paint,.01);
    g.rod([-.11,.704,-.35],[-.10,.856,-.37],.0035,P.bronze,M.metal,6);
    // Three foredeck sunbed cushions rather than a blank slab.
    for(const x of [-.077,0,.077])g.box([x,.209,.444],[.073,.034,.192],x===0?'#d8b48d':P.ivory,M.canvas,.011);
    for(const x of [-.097,-.037])line(g,[[x,.122,-.83],[x,.10,-.894],[x,-.065,-.894]],.004,P.metal,M.metal,6);
    for(const y of [.055,.005,-.047])g.rod([-.098,y,-.894],[-.036,y,-.894],.004,P.metal,M.metal,6);
    g.rod([.21,.115,-.67],[.21,.195,-.67],.007,P.bronze,M.metal,6);
    g.polygon([[.211,.191,-.67],[.211,.168,-.73],[.211,.153,-.67]],'#d48f75',M.canvas,[1,0,0]);
  } else g.box([0,.211,.443],[.224,.031,.182],P.ivory,M.canvas,.006);
  return g.build(`yacht-${lod}`);
}
function launch(lod='high') {
  const g=new MeshBuilder(),high=lod==='high';
  const stations=[[-.42,.135,.157,-.071],[-.26,.162,.163,-.078],[.03,.153,.176,-.066],[.25,.111,.194,-.020],[.43,.009,.222,.141]];
  g.loft(hullRings(stations),'#598f91',M.paint,true);
  g.box([0,.048,-.13],[.228,.019,.40],P.teak,M.teak,.002);
  for(const sign of [-1,1])line(g,stations.map(([z,w,y])=>[sign*w,y,z]),.013,P.ivory,M.paint,high?8:5);
  g.box([0,.119,-.294],[.245,.055,.098],P.ivory,M.paint,.012);
  g.box([0,.161,-.326],[.242,.061,.024],P.ivory,M.paint,.010);
  g.box([0,.149,-.293],[.219,.011,.074],'#c8a374',M.canvas,.004);
  g.box([0,.129,.021],[.223,.083,.051],P.teak,M.teak,.006);
  g.polygon([[-.125,.174,.077],[.125,.174,.077],[.100,.267,.035],[-.100,.267,.035]],P.glass,M.glass,[0,.2,1]);
  line(g,[[-.10,.267,.035],[.10,.267,.035]],.006,P.bronze,M.metal,6);
  g.polygon([[-.137,.18,.126],[.137,.18,.126],[.009,.226,.429],[-.009,.226,.429]],P.ivory,M.paint,[0,1,0]);
  g.box([.072,.13,-.44],[.046,.18,.04],P.bronze,M.metal,.005);
  g.box([.072,.189,-.463],[.10,.12,.082],P.navy,M.paint,.014);
  g.box([.072,.025,-.46],[.067,.026,.06],P.bronze,M.metal,.006);
  if(high) {
    g.rod([.072,.015,-.46],[.072,.012,-.494],.021,P.metal,M.metal,8);
    g.rod([-.08,.18,.27],[-.08,.274,.265],.0035,P.bronze,M.metal,6);
    g.rod([.08,.18,.27],[.08,.274,.265],.0035,P.bronze,M.metal,6);
    line(g,[[-.08,.274,.265],[0,.31,.389],[.08,.274,.265]],.004,P.bronze,M.metal,6);
    g.box([-.081,.123,-.07],[.062,.046,.08],P.ivory,M.canvas,.008);
  }
  return g.build(`launch-${lod}`);
}
function hipRoof(g,w,d,y,h,color=P.roof) {
  const lower=[[-w/2,y,-d/2],[w/2,y,-d/2],[w/2,y,d/2],[-w/2,y,d/2]];
  const upper=[[-w*.27,y+h,-d*.055],[w*.27,y+h,-d*.055],[w*.27,y+h,d*.055],[-w*.27,y+h,d*.055]];
  for(let i=0;i<4;i++){const j=(i+1)%4;g.polygon([lower[i],lower[j],upper[j],upper[i]],color,M.roof,[lower[i][0]+lower[j][0],h*2,lower[i][2]+lower[j][2]]);}
  g.polygon(upper,color,M.roof,[0,1,0]);
  g.rod([-w*.29,y+h+.012,0],[w*.29,y+h+.012,0],.016,P.bronze,M.metal,6);
}
function archedWindow(g,x,b,w,h,high,door=false) {
  const r=w/2,cy=b+h-r,steps=high?10:5;
  const glass=[[x-r,b,-.044],[x+r,b,-.044]];
  for(let i=0;i<=steps;i++){const t=i/steps*Math.PI;glass.push([x+r*Math.cos(t),cy+r*Math.sin(t),-.044]);}
  g.polygon(glass,P.warm,M.window,[0,0,1]);
  // Jambs have measurable depth, as does the underside of each voussoir.
  for(const sign of [-1,1])g.box([x+sign*(r+.012),(b+cy)/2,-.011],[.025,cy-b+.012,.072],P.ivory,M.stone);
  for(let i=0;i<steps;i++) {
    const a=i/steps*Math.PI,bb=(i+1)/steps*Math.PI;
    const pa=(t,rr,z)=>[x+rr*Math.cos(t),cy+rr*Math.sin(t),z];
    g.polygon([pa(a,r,.027),pa(bb,r,.027),pa(bb,r+.030,.027),pa(a,r+.030,.027)],P.ivory,M.stone,[0,0,1]);
    g.polygon([pa(a,r,-.045),pa(bb,r,-.045),pa(bb,r,.027),pa(a,r,.027)],P.stone,M.stone,[Math.cos((a+bb)/2),Math.sin((a+bb)/2),0].map(v=>-v));
  }
  g.box([x,b-.006,-.012],[w+.067,.029,.102],P.stone,M.stone);
  g.box([x,b+(cy-b)*.52,-.033],[.012,cy-b+.013,.012],P.bronze,M.metal);
  g.box([x,cy,-.033],[w,.012,.012],P.bronze,M.metal);
  if(door)g.box([x+.028,b+.10,-.015],[.008,.035,.010],'#b2a071',M.metal);
}
function facade(w,floors,lod,bays=3,balconies=true) {
  const g=new MeshBuilder(),high=lod==='high',cell=w/bays,H=.355;
  for(let floor=0;floor<floors;floor++) {
    const y=.067+floor*H;
    g.box([0,y+.028,-.034],[w,.056,.068],P.wall,M.plaster);
    g.box([0,y+H-.036,-.034],[w,.072,.068],P.wall,M.plaster);
    for(let i=0;i<=bays;i++) {
      const x=-w/2+i*cell,edge=i===0||i===bays;
      g.box([x+(i===0?.024:i===bays?-.024:0),y+H/2,-.034],[edge?.049:.078,H,.068],P.wall,M.plaster);
    }
    for(let i=0;i<bays;i++) {
      const x=-w/2+(i+.5)*cell,ww=cell-.103,b=y+.062,h=.231;
      archedWindow(g,x,b,ww,h,high,floor===0&&i===Math.floor(bays/2));
      // Fill the spandrel above the arch, not the aperture itself.
      const rr=ww/2+.031,cy=b+h-ww/2;
      for(let j=0;j<(high?10:5);j++) {
        const steps=high?10:5,a=j/steps*Math.PI,bb=(j+1)/steps*Math.PI;
        const A=[x+rr*Math.cos(a),cy+rr*Math.sin(a),0],B=[x+rr*Math.cos(bb),cy+rr*Math.sin(bb),0];
        g.polygon([A,B,[B[0],y+H-.024,0],[A[0],y+H-.024,0]],P.wall,M.plaster,[0,0,1]);
      }
      if(floor>0&&balconies) {
        g.box([x,b-.014,.061],[ww+.075,.028,.17],P.ivory,M.stone);
        const count=high?5:3;
        for(let j=0;j<count;j++){const xx=x-ww*.57+j/(count-1)*ww*1.14;g.rod([xx,b,.137],[xx,b+.091,.137],.0042,P.bronze,M.metal,5);}
        line(g,[[x-ww*.57,b+.094,-.005],[x-ww*.57,b+.094,.138],[x+ww*.57,b+.094,.138],[x+ww*.57,b+.094,-.005]],.0055,P.bronze,M.metal,6);
        if(high)for(const sign of [-1,1])g.rod([x+sign*ww*.4,b-.048,.006],[x+sign*ww*.4,b-.021,.101],.007,P.stone,M.stone,5);
      }
    }
    g.box([0,y+H+.003,-.013],[w+.042,.038,.114],P.ivory,M.stone);
  }
  return g;
}
function waterfrontHouse(lod='high',level=1,publicHouse=false) {
  const g=new MeshBuilder(),high=lod==='high',floors=level+1,w=publicHouse?.94:.83,d=publicHouse?.70:.65,H=.355,top=.067+floors*H;
  g.box([0,.027,0],[w+.094,.054,d+.094],P.stone,M.stone,.012);
  g.box([0,top/2,0],[w-.142,top,d-.142],P.wall,M.plaster);
  // Four independently modelled facades. The core stops behind the recessed glass.
  g.add(facade(w,floors,lod,3,true),[0,0,d/2]);
  g.add(facade(w,floors,lod,3,false),[0,0,-d/2],Math.PI);
  g.add(facade(d,floors,lod,2,false),[w/2,0,0],Math.PI/2);
  g.add(facade(d,floors,lod,2,false),[-w/2,0,0],-Math.PI/2);
  for(const x of [-1,1])for(const z of [-1,1]) {
    g.box([x*(w/2-.026),top/2,z*(d/2-.024)],[.065,top,.065],P.ivory,M.stone,.005);
    if(high)for(let y=.12;y<top-.05;y+=.119)g.box([x*(w/2-.024),y,z*(d/2-.022)],[.081,.028,.078],P.stone,M.stone);
  }
  g.box([0,top+.019,0],[w+.10,.053,d+.098],P.ivory,M.stone,.009);
  hipRoof(g,w+.12,d+.12,top+.046,.237,publicHouse?P.roof:level%2?P.roof:'#a27562');
  // Dormers are intersecting gabled roof volumes, not roof textures.
  if(high||floors>1)for(const x of [-w*.245,w*.245]) {
    const z=d*.325,y=top+.13;
    g.box([x,y,z],[.161,.163,.172],P.ivory,M.stone);
    g.box([x,y+.006,z+.088],[.107,.097,.010],P.warm,M.window);
    g.box([x,y+.006,z+.095],[.009,.107,.012],P.bronze,M.metal);
    const points=[[x-.098,y+.081,z-.10],[x+.098,y+.081,z-.10],[x+.098,y+.081,z+.105],[x-.098,y+.081,z+.105]];
    g.polygon([points[0],points[3],[x,y+.147,z+.105],[x,y+.147,z-.10]],P.roof,M.roof,[-1,1,0]);
    g.polygon([points[2],points[1],[x,y+.147,z-.10],[x,y+.147,z+.105]],P.roof,M.roof,[1,1,0]);
    g.polygon([points[3],points[2],[x,y+.147,z+.105]],P.ivory,M.stone,[0,0,1]);
  }
  g.box([w*.31,top+.226,-d*.20],[.113,.249,.112],P.stone,M.stone,.004);
  g.box([w*.31,top+.36,-d*.20],[.145,.038,.14],P.ivory,M.stone,.005);
  g.box([w*.31,top+.382,-d*.20],[.094,.010,.085],P.navy,M.paint);
  // Canvas shop canopies and a curved cornice give a recognisable street frontage.
  for(const x of [-w*.325,w*.325]) {
    const awning=new MeshBuilder();
    for(let i=0;i<6;i++) {
      const xx=x-.109+i*.0436;
      awning.polygon([[xx,.306,d/2+.009],[xx+.0436,.306,d/2+.009],[xx+.0436,.251,d/2+.155],[xx,.251,d/2+.155]],i%2?P.ivory:P.red,M.canvas,[0,1,.3]);
      awning.box([xx+.0218,.231,d/2+.153],[.0436,.04,.012],i%2?P.ivory:P.red,M.canvas);
    }
    g.add(awning);
  }
  g.box([0,.079,d/2+.052],[.198,.036,.136],P.stone,M.stone);
  if(publicHouse) {
    // Small belvedere: a second silhouette, not a giant label or UI panel.
    g.box([-.16,top+.334,-.071],[.253,.281,.257],P.wall,M.plaster,.006);
    for(const sign of [-1,1])g.box([-.16+sign*.129,top+.338,-.07],[.013,.155,.141],P.glass,M.glass);
    g.box([-.16,top+.34,.060],[.15,.155,.013],P.warm,M.window);
    const roof=new MeshBuilder();hipRoof(roof,.326,.324,top+.481,.131);g.add(roof,[-.16,0,-.071]);
    g.rod([-.16,top+.615,-.071],[-.16,top+.699,-.071],.006,P.bronze,M.metal,6);
  }
  return g.build(`${publicHouse?'harbor-house':`waterfront-level-${level}`}-${lod}`);
}
function dock(lod='high') {
  const g=new MeshBuilder(),high=lod==='high';
  g.box([0,-.070,0],[.254,.075,.94],P.navy,M.paint,.010);
  g.box([0,-.018,0],[.300,.042,1.0],P.teak,M.teak,.007);
  for(const x of [-.147,.147])g.box([x,.007,0],[.024,.027,1.025],P.stone,M.stone,.004);
  if(high)for(let z=-.46;z<.48;z+=.12)for(const x of [-.11,.11])g.rod([x,.004,z],[x,.009,z],.006,P.bronze,M.metal,6);
  for(const z of [-.39,.39]) {
    g.rod([.102,.006,z],[.102,.040,z],.008,P.metal,M.metal,6);
    g.rod([.073,.040,z],[.132,.040,z],.007,P.metal,M.metal,6);
    g.box([-.175,-.021,z],[.035,.07,.125],P.navy,M.paint,.011);
  }
  return g.build(`floating-dock-${lod}`);
}
function quay(lod='high') {
  const g=new MeshBuilder();
  g.box([0,-.082,0],[.37,.164,1.0],'#b8ab95',M.stone,.009);
  g.box([0,.012,0],[.40,.034,1.025],P.stone,M.stone,.008);
  g.box([-.157,.037,0],[.043,.016,1.0],P.ivory,M.stone);
  if(lod==='high')for(const z of [-.36,0,.36])g.rod([.189,-.035,z],[.205,-.035,z],.036,P.navy,M.paint,12);
  return g.build(`quay-${lod}`);
}
function lantern(lod='high') {
  const g=new MeshBuilder(),n=lod==='high'?8:5;
  g.lathe([0,0,0],[[0,0],[.047,0],[.047,.033],[.030,.068],[.018,.089],[.016,.571]],P.bronze,M.metal,n);
  line(g,[[0,.50,0],[0,.63,0],[.031,.676,0],[.089,.692,0],[.131,.668,0]],.009,P.bronze,M.metal,n);
  g.box([.129,.588,0],[.077,.126,.077],P.warm,M.lamp,.012);
  for(const x of [-1,1])for(const z of [-1,1])g.rod([.129+x*.036,.524,z*.036],[.129+x*.036,.649,z*.036],.004,P.bronze,M.metal,5);
  g.lathe([.129,0,0],[[.054,.655],[.050,.666],[.012,.702],[0,.713]],P.bronze,M.metal,4);
  g.box([.129,.522,0],[.088,.017,.088],P.bronze,M.metal,.004);
  return g.build(`lantern-${lod}`);
}
function bench(lod='high') {
  const g=new MeshBuilder();
  for(const x of [-.112,.112]) {
    line(g,[[x,0,.061],[x,.098,.045],[x,.11,-.032],[x,.209,-.045]],.009,P.bronze,M.metal,6);
    g.rod([x,0,-.04],[x,.11,.019],.008,P.bronze,M.metal,6);
  }
  const slats=lod==='high'?4:2;
  for(let i=0;i<slats;i++) {
    g.box([0,.104,-.041+(i+.5)/slats*.113],[.304,.019,.105/slats-.003],P.teak,M.teak,.003);
    g.box([0,.143+i/(slats-1)*.056,-.044],[.304,.052/slats,.016],P.teak,M.teak,.002);
  }
  return g.build(`bench-${lod}`);
}
function bollard(lod='high') {
  const g=new MeshBuilder(),n=lod==='high'?10:6;
  g.lathe([0,0,0],[[0,0],[.031,0],[.034,.018],[.021,.032],[.021,.089],[.031,.102],[.029,.117],[0,.123]],P.bronze,M.metal,n);
  return g.build(`bollard-${lod}`);
}
function cafe(lod='high') {
  const g=new MeshBuilder(),high=lod==='high';
  g.rod([0,0,0],[0,.144,0],.010,P.bronze,M.metal,6);
  g.lathe([0,0,0],[[0,.137],[.099,.137],[.099,.154],[0,.154]],P.ivory,M.stone,high?16:8);
  for(const sign of [-1,1]) {
    const z=sign*.148;
    for(const x of [-.033,.033])for(const zz of [-.029,.029])g.rod([x,0,z+zz],[x,.079,z+zz],.005,P.bronze,M.metal,5);
    g.box([0,.083,z],[.093,.017,.081],P.teak,M.teak,.004);
    g.box([0,.132,z+sign*.041],[.093,.086,.014],P.teak,M.teak,.005);
  }
  return g.build(`cafe-set-${lod}`);
}
function parasol(lod='high') {
  const g=new MeshBuilder(),n=lod==='high'?12:8;
  g.rod([0,0,0],[0,.383,0],.008,P.bronze,M.metal,6);
  for(let i=0;i<n;i++) {
    const a=i/n*TAU,b=(i+1)/n*TAU,c=i%2?P.ivory:'#dcb783';
    const A=[Math.cos(a)*.231,.306,Math.sin(a)*.231],B=[Math.cos(b)*.231,.306,Math.sin(b)*.231],peak=[0,.395,0];
    g.polygon([A,B,peak],c,M.canvas,[Math.cos((a+b)/2)*.3,1,Math.sin((a+b)/2)*.3]);
    g.polygon([A,[A[0],.279,A[2]],[B[0],.279,B[2]],B],c,M.canvas,[Math.cos((a+b)/2),0,Math.sin((a+b)/2)]);
    if(lod==='high')g.rod([0,.39,0],A,.0027,P.ivory,M.paint,4);
  }
  return g.build(`parasol-${lod}`);
}
function palm(lod='high') {
  const g=new MeshBuilder(),high=lod==='high';
  const trunk=[[0,0,0],[.012,.28,.012],[.046,.56,.011],[.085,.83,.002],[.105,.98,0]];
  for(let i=1;i<trunk.length;i++)g.rod(trunk[i-1],trunk[i],.030-i*.003,'#967650',M.teak,high?8:5,.027-i*.003);
  const count=high?9:6,steps=high?6:3;
  for(let i=0;i<count;i++) {
    const angle=i/count*TAU,reach=.34+(i%3)*.045,side=[Math.cos(angle+Math.PI/2),0,Math.sin(angle+Math.PI/2)];
    const center=t=>[.105+Math.cos(angle)*reach*t,.98+Math.sin(t*Math.PI)*.15-t*t*.08,Math.sin(angle)*reach*t];
    for(let j=0;j<steps;j++) {
      const a=j/steps,b=(j+1)/steps,ca=center(a),cb=center(b),wa=Math.sin(a*Math.PI)*.078,wb=Math.sin(b*Math.PI)*.078;
      // Folded ribbon with a raised spine: foliage is not a billboard or alpha card.
      for(const sign of [-1,1])g.polygon([ca,cb,cb.map((v,k)=>v+side[k]*wb*sign-(k===1?.018:0)),ca.map((v,k)=>v+side[k]*wa*sign-(k===1?.018:0))],i%3===0?P.leafLight:P.leaf,M.foliage,[sign*side[0]*.2,1,sign*side[2]*.2]);
    }
    if(high)line(g,Array.from({length:5},(_,j)=>center(j/4)),.003,'#9aa168',M.foliage,4);
  }
  g.lathe([.105,.946,0],[[0,0],[.058,.018],[.034,.068],[0,.095]],P.leaf,M.foliage,8);
  return g.build(`palm-${lod}`);
}
function planter(lod='high') {
  const g=new MeshBuilder();
  g.box([0,.061,0],[.218,.122,.218],P.stone,M.stone,.022);
  g.box([0,.124,0],[.19,.012,.19],'#706947',M.plaster,.008);
  g.lathe([0,.115,0],[[0,0],[.10,.026],[.099,.066],[.073,.125],[0,.161]],P.leaf,M.foliage,lod==='high'?12:7);
  return g.build(`planter-${lod}`);
}
const FACTORIES=Object.freeze({yacht,launch,'harbor-house':(lod)=>waterfrontHouse(lod,1,true),dock,quay,lantern,bench,bollard,cafe,parasol,palm,planter,
  'waterfront-level-0':lod=>waterfrontHouse(lod,0),'waterfront-level-1':lod=>waterfrontHouse(lod,1),'waterfront-level-2':lod=>waterfrontHouse(lod,2),'waterfront-level-3':lod=>waterfrontHouse(lod,3)});
function createAsset(name,lod='high') {
  if(!Object.hasOwn(FACTORIES,name))throw Error(`Unknown marina asset: ${name}`);
  if(!['high','low'].includes(lod))throw Error(`Unknown LOD: ${lod}`);
  return FACTORIES[name](lod);
}
export { createAsset, FACTORIES, P };
