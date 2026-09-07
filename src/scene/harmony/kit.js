/** The remaining economic families. Factories affect appearance only; IDs stay in BOARD. */
import { MeshBuilder } from '../marina/mesh-builder.js';
import { MATERIALS as M } from '../marina/surfaces.js';
import {C,B,R,base,planter,cedar,rail,shell,hip,barrel,pergola,steps} from './architecture.js';
import {jardins,nova,solstice} from './extensions.js';
const HARMONY_FAMILIES=Object.freeze(['jardins','nova','roseraie','solstice']);
const HARMONY_BUDGETS=Object.freeze({jardins:[3400,5600],nova:[3600,5800],roseraie:[3200,5200],solstice:[4400,7400]});
function roseraie(g,level,variant,fine){
 if(variant===0){
  // Villa Rosée: staggered hipped roofs, courtyard and timber loggia, never a pink tower.
  const floors=level===0?1:level===3?3:2;
  const y=shell(g,-.105,-.10,.53,.49,.075,floors,fine,C.rose);
  hip(g,-.105,-.10,.60,.56,y,.18,C.terra,M.slate,fine);
  if(level>=2){const h=shell(g,.28,-.17,.23,.37,.075,level===3?2:1,fine,C.stone);hip(g,.28,-.17,.29,.43,h,.115,C.terra,M.slate,fine);}
  pergola(g,.225,.215,.29,.26,.39,fine);
  B(g,[.225,.065,.21],[.35,.034,.32],'#d2b58d',M.paving);
  if(level>=1){B(g,[-.12,.383,.176],[.52,.042,.11],C.stone);rail(g,-.12,.405,.219,.46,fine);}
  if(level===3){B(g,[-.26,y+.045,-.23],[.085,.25,.075],C.rose,M.brick);B(g,[-.26,y+.181,-.23],[.11,.036,.10],C.chalk);}
  steps(g,-.12,.295,.27);planter(g,-.34,.31,.16,.13,fine,true);
  if(level<2)cedar(g,.315,-.29,.55,fine);else planter(g,.405,.29,.095,.18,fine,true);
 }else{
  // Galerie Bloom: deep glazed exhibition hall under a barrel vault, separate foyer.
  const floors=level>=2?2:1,y=shell(g,-.10,-.11,.53,.51,.075,floors,fine,C.stone,M.glass);
  barrel(g,-.10,-.11,.565,.55,y,.215,fine);
  if(level>=1){
   const h=shell(g,.085,.275,.39,.17,.075,1,fine,C.rose,M.glass);
   B(g,[.085,h+.015,.275],[.43,.038,.225],C.dark,M.metal);
  }
  if(level===3){const h=shell(g,.30,-.16,.22,.35,.075,2,fine,C.stone);B(g,[.30,h+.02,-.16],[.25,.040,.40],C.brass,M.metal);rail(g,.30,h+.04,.012,.21,fine);}
  // A compact sculpted stone/bronze flower is an object, not a billboard.
  B(g,[.30,.083,.12],[.10,.08,.10],C.stone);
  R(g,[.30,.12,.12],[.30,.255,.12],.011,C.brass);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;R(g,[.30,.22,.12],[.30+Math.cos(a)*.058,.27,.12+Math.sin(a)*.058],.017,C.brass,M.metal,5);}
  planter(g,-.34,.31,.16,.13,fine,true);planter(g,.34,-.36,.16,.11,fine,true);steps(g,level>=1?.085:-.10,.405,.23);
 }
}
function createHarmonyAsset(family,level=0,variant=0,lod='low'){
 if(!HARMONY_FAMILIES.includes(family)||!Number.isInteger(level)||level< -1||level>3||![0,1].includes(variant)||!['low','high'].includes(lod))throw Error('Invalid harmony asset');
 const g=new MeshBuilder();base(g,family,level);
 if(level>=0)({jardins,nova,roseraie,solstice})[family](g,level,variant,lod==='high');
 const result=g.build(`${family}-${variant}-level-${level}-${lod}`);
 const budget=HARMONY_BUDGETS[family][lod==='high'?1:0];if(result.indices.length/3>budget)throw Error(`${result.name}: ${result.indices.length/3} exceeds ${budget} triangles`);
 return result;
}
export {createHarmonyAsset,HARMONY_FAMILIES,HARMONY_BUDGETS};
