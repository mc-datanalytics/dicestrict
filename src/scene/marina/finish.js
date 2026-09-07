/** Waterfront material finish; all other districts keep the established shader.
 * Stylised direct/sky response and actual local planar water reflections in high.
 * No blur, bloom, SSR, purchased texture or extra dynamic light sources.
 */
const WATERFRONT_FRAGMENT=`
uniform float uWaterfront;uniform float uReflectionPass;uniform float uUseReflection;
uniform sampler2D uWaterReflection;uniform mat4 uReflectionProject;
vec3 waterfrontFinish(vec3 color,vec3 n,float diffuse,float shadow,int material){
  vec3 v=normalize(uCamera-vWorld),sun=normalize(vec3(-.5,.9,.55));
  float night=uNight,dusk=uDusk,lamps=max(night,dusk*.72);
  vec3 key=mix(vec3(1.04,1.01,.94),vec3(1.17,.86,.62),dusk*.65);
  vec3 fill=mix(vec3(.31,.39,.48),vec3(.17,.25,.37),dusk*.45);
  vec3 lit=color*(fill*.65+key*(.28+.58*diffuse)*(1.-shadow*.65));
  lit*=mix(vec3(1.),vec3(.36,.49,.67),night);
  if(material==7||material==19||material==15){
    // Damp courses at the actual quay waterline, not generic black outlines.
    float damp=(1.-smoothstep(.432,.57,vWorld.y))*float(material==7);
    lit*=1.-damp*.27;
    lit*=.88+.12*smoothstep(.49,.92,vWorld.y);
  }
  if(material==6){lit*=vec3(1.07,.90,.73);}
  if(material==13){lit*=vec3(.69,.97,.77);lit+=vec3(.10,.16,.04)*pow(max(dot(-n,sun),0.),2.)*(1.-night);}
  float fresnel=pow(1.-max(dot(n,v),0.),5.);
  vec3 reflected=reflect(-v,n);
  vec3 sky=mix(vec3(.15,.32,.40),vec3(.64,.81,.87),smoothstep(-.12,.65,reflected.y));
  sky=mix(sky,vec3(.85,.58,.36),dusk*(1.-smoothstep(-.1,.55,reflected.y))*.45);
  sky*=mix(vec3(1.),vec3(.12,.21,.37),night);
  float specular=0.;
  if(material==5||material==11||material==12){
    float closed=1.-uClosed*.8;
    lit=mix(lit*vec3(.55,.81,.94),sky,(.35+fresnel*.40)*closed);
    // Broad upper/lower glazing contrast is readable at board-camera scale.
    lit*=.88+.12*smoothstep(.6,1.5,vWorld.y);
    specular=.42;
  }else if(material==10){lit=mix(lit,sky,.30+fresnel*.32);specular=.60;}
  else if(material==4){specular=.28;}
  else if(material==8){lit*=vec3(.74,.92,.97);specular=.20;}
  float spec=pow(max(dot(n,normalize(v+sun)),0.),material==4?48.:material==5?72.:32.);
  lit+=key*spec*specular*(1.-shadow*.80)*(1.-night*.85);
  if(material==9){
    float a=vWorld.x*24.+vWorld.z*18.+uTime*.85,b=vWorld.x*11.-vWorld.z*17.+uTime*.61;
    float aa=1./(1.+fwidth(a)*.6);
    vec2 ripple=vec2(sin(a)+sin(b)*.45,cos(a*.47+b*.31))*.018*aa;
    n=normalize(vec3(ripple.x,1.,ripple.y));
    float edge=min(min(abs(vWorld.x+2.966),abs(vWorld.x+1.01)),min(abs(vWorld.z-.914),abs(vWorld.z-3.165)));
    vec3 deep=vec3(.028,.245,.345),shallow=vec3(.12,.47,.47);
    lit=mix(deep,shallow,exp(-edge*4.8)*.75)*(1.-shadow*.30);
    lit*=mix(vec3(1.),vec3(.38,.54,.78),night);
    lit+=vec3(.014,.026,.026)*sin(a*.42+b*.58)*aa;
    vec4 q=uReflectionProject*vec4(vWorld,1.);vec2 uv=q.xy/q.w*.5+.5;
    if(uUseReflection>.5){
      vec4 sampleColor=texture(uWaterReflection,clamp(uv+ripple*.18,vec2(.002),vec2(.998)));
      float border=smoothstep(0.,.035,min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y)));
      lit=mix(lit,sampleColor.rgb,.68*sampleColor.a*border);
    }
    float sheen=pow(max(dot(n,normalize(sun+v)),0.),160.);
    lit+=key*sheen*.38*(1.-night*.9);
    // Thin quay-edge water contact, not a foam-filled swimming pool.
    lit+=vec3(.035,.065,.065)*(1.-smoothstep(.006,.025,edge))*.45;
    specular=.68;
  }
  if(material==11&&uClosed<.5)lit=mix(lit,color*vec3(1.06,.87,.61),lamps*.88);
  if(material==16)lit=mix(lit,color*vec3(1.1,.90,.65),.32+lamps*.66);
  if(lamps>.01)for(int i=0;i<4;i++){
    vec3 d=uHarborLights[i]-vWorld;float ds=dot(d,d);vec3 l=normalize(d);
    float pool=max(dot(n,l),0.)*.075/(.06+ds);
    float glint=pow(max(dot(n,normalize(l+v)),0.),material==9?55.:32.)*.085/(.03+ds);
    lit+=vec3(1.,.68,.34)*(pool+glint*specular)*lamps;
  }
  return mix(lit,vec3(.48,.59,.61),uWeather*.075);
}
`;
export { WATERFRONT_FRAGMENT };
