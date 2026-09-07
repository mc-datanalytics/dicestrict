/** Completion of the six real lots. All elevations/terraces are volumetric.
 * Y-up, base at zero, +Z entrance. Geometry changes only with the legal level.
 * The retained Roseraie factory is deliberately not duplicated here. */
import {MATERIALS as M} from '../marina/surfaces.js';
import {C,B,R,planter,cedar,rail,shell,hip,barrel,pergola,steps} from './architecture.js';

function roofGarden(g,x,z,w,d,y,fine){
 B(g,[x,y,z],[w,.045,d],C.stone,M.stone,.009);
 B(g,[x,y+.029,z],[w-.05,.018,d-.05],'#6e9367',M.foliage);
 for(const s of [-1,1])B(g,[x+s*(w/2-.017),y+.043,z],[.034,.080,d],C.chalk);
 if(fine)for(const s of [-1,1])B(g,[x,y+.043,z+s*(d/2-.017)],[w,.080,.034],C.chalk);
}
function dome(g,x,z,y,r,fine,color=C.roof){
 g.lathe([x,y,z],[[r*1.08,0],[r*1.08,.034],[r,.034],[r,.095],[r*.95,.15],[r*.75,.235],[r*.40,.30],[0,.335]],color,M.roof,fine?16:10);
 R(g,[x,y+.31,z],[x,y+.405,z],.011,C.brass,M.metal,6);
}
function jardins(g,level,v,fine){
 if(v===0){
  // Jardin Suspendu: stepped limestone maison, projecting planted terraces.
  const floors=level===0?1:level===3?3:2;
  const h=shell(g,-.105,-.13,.46,.43,.075,floors,fine,'#ead7b9');
  hip(g,-.105,-.13,.53,.50,h,.19,C.roof,M.slate,fine);
  if(level>=2){const w=shell(g,.245,-.09,.23,.36,.075,level===3?2:1,fine,C.chalk,M.glass);roofGarden(g,.245,-.09,.27,.40,w+.016,fine);}
  else {barrel(g,.245,-.09,.235,.34,.15,.26,fine);}
  for(let f=0;f<Math.min(2,level);f++){
   const y=.385+f*.28;B(g,[-.10,y,.153],[.53,.045,.13],C.chalk);rail(g,-.10,y+.02,.207,.49,fine);
   B(g,[-.29,y+.048,.173],[.13,.055,.08],'#46735b',M.foliage,.01);
  }
  pergola(g,.22,.255,.23,.24,.37,fine);steps(g,-.105,.30,.26);
  planter(g,-.32,.30,.16,.12,fine,true);planter(g,.34,-.32,.15,.12,fine);
  if(level===3)B(g,[-.23,h+.10,-.18],[.08,.25,.085],C.stone,M.brick);
 }else{
  // Allée des Cèdres: low orangery and taller pitched-roof belvedere.
  const h=shell(g,-.16,-.09,.37,.48,.075,level>=2?2:1,fine,C.chalk,M.glass);
  barrel(g,-.16,-.09,.41,.52,h,.18,fine);
  const tower=shell(g,.245,-.16,.23,.27,.075,1+Math.min(level,2),fine,C.stone);
  hip(g,.245,-.16,.28,.33,tower,.19,'#956c4f',M.slate,fine);
  if(level===3){const wing=shell(g,.19,.21,.31,.20,.075,1,fine,C.chalk);roofGarden(g,.19,.21,.35,.24,wing,fine);rail(g,.19,wing+.04,.335,.30,fine);}
  steps(g,-.16,.29,.28);cedar(g,-.36,.24,.52,fine);cedar(g,.36,.30,.56,fine);
  if(level>=1)pergola(g,.14,.20,.22,.19,.34,fine);
 }
}
function nova(g,level,v,fine){
 if(v===0){
  // Nova Square: rising tech campus, deep pale fins around blue glazing.
  const h=shell(g,-.04,-.11,.58,.44,.075,1,fine,C.chalk,M.glass);
  B(g,[-.04,h+.018,-.11],[.65,.048,.50],C.dark,M.metal,.01);
  const floors=level+1,w=.38,d=.32,top=shell(g,-.02,-.13,w,d,h+.045,floors,fine,'#b3bec7',M.glass);
  for(const x of [-.225,.185])B(g,[x,(h+top)/2,-.13],[.028,top-h+.09,.40],C.chalk,M.stone);
  B(g,[-.02,top+.075,-.13],[.45,.12,.37],C.dark,M.metal,.014);
  B(g,[-.02,top+.146,-.13],[.47,.027,.40],C.brass,M.metal,.006);
  if(level>=2){const wing=shell(g,.25,.14,.22,.24,.075,2,fine,C.stone,M.glass);roofGarden(g,.25,.14,.26,.28,wing+.018,fine);}
  if(level===3){R(g,[-.15,top+.15,-.21],[-.15,top+.42,-.21],.008,C.brass);}
  B(g,[-.14,.39,.21],[.40,.035,.20],C.dark,M.metal,.007);steps(g,-.14,.34,.28);
  planter(g,-.34,.29,.16,.13,fine);planter(g,.34,.30,.15,.12,fine);
 }else{
  // Observatoire: distinct round drum/dome on a terraced research pavilion.
  const h=shell(g,-.09,-.11,.49,.45,.075,1+Math.min(level,2),fine,C.chalk,M.glass);
  B(g,[-.09,h+.018,-.11],[.55,.041,.51],C.brass,M.metal,.006);
  g.lathe([-.09,h+.035,-.11],[[.19,0],[.19,.04],[.17,.04],[.17,.20],[.19,.20],[.19,.235]],C.stone,M.stone,fine?16:10);
  dome(g,-.09,-.11,h+.267,.20,fine,'#547e93');
  for(const side of [-1,1])B(g,[-.09+side*.18,h+.14,-.11],[.016,.095,.075],C.glass,M.glass);
  if(level>=1){const wing=shell(g,.25,.17,.25,.28,.075,1,fine,C.stone,M.glass);roofGarden(g,.25,.17,.29,.33,wing+.01,fine);}
  if(level===3){const side=shell(g,.255,-.25,.20,.22,.075,2,fine,C.stone);hip(g,.255,-.25,.24,.27,side,.12,C.roof,M.roof,fine);}
  planter(g,-.34,.29,.16,.12,fine);steps(g,-.10,.30,.28);
 }
}
function solstice(g,level,v,fine){
 if(v===0){
  // Palais Solaire: warm resort palazzo, twin wings and copper/gold belvedere.
  const floors=level+1,h=shell(g,-.065,-.115,.51,.45,.075,floors,fine,'#eed6ad');
  hip(g,-.065,-.115,.57,.51,h,.20,'#ab7453',M.slate,fine);
  if(level>=1){const wing=shell(g,.28,.02,.22,.33,.075,Math.max(1,level-1),fine,C.chalk);hip(g,.28,.02,.27,.38,wing,.15,C.roof,M.roof,fine);}
  for(let j=0;j<Math.min(level,2);j++){const y=.382+j*.28;B(g,[-.065,y,.168],[.57,.042,.14],C.chalk);rail(g,-.065,y+.025,.223,.52,fine);}
  if(level===3){const y=h+.09;B(g,[-.065,y+.105,-.115],[.19,.22,.20],C.stone);dome(g,-.065,-.115,y+.22,.16,fine,'#bc9f65');}
  // Portico entrance, transparent behind the columns rather than solid box.
  B(g,[-.065,.353,.275],[.37,.045,.24],C.chalk);for(const x of [-.215,.085])R(g,[x,.09,.34],[x,.33,.34],.018,C.chalk,M.stone,8);
  steps(g,-.065,.385,.30);planter(g,-.35,.28,.13,.12,fine,true);planter(g,.34,.31,.14,.12,fine,true);
 }else{
  // Golden Heights: unequal stepped volumes; every stage raises the silhouette.
  let y=.075;
  const stages=level===0?1:level===1?2:3;
  for(let i=0;i<stages;i++){
   const w=.60-i*.11,d=.44-i*.07,x=-.045+i*.025,z=-.095-i*.035;
   const floors=level===3?2:1;
   y=shell(g,x,z,w,d,y,floors,fine,i%2?C.chalk:'#ddc294',M.glass);
   B(g,[x,y+.02,z],[w+.075,.046,d+.095],C.chalk,M.stone,.01);
   rail(g,x,y+.043,z+d/2+.028,w+.04,fine);
   for(const s of [-1,1])B(g,[x+s*(w/2-.065),y+.052,z+d/2+.005],[.10,.06,.065],'#466f58',M.foliage);
   y+=.06;
  }
  if(level>=2){B(g,[.05,y+.08,-.16],[.22,.13,.22],C.glass,M.glass,.009);B(g,[.05,y+.16,-.16],[.29,.035,.29],C.brass,M.metal);}
  B(g,[.14,.365,.22],[.37,.035,.20],C.dark,M.metal,.005);steps(g,-.045,.31,.28);
  planter(g,-.34,.28,.15,.13,fine);planter(g,.34,.30,.15,.13,fine);
 }
}
export {jardins,nova,solstice};
