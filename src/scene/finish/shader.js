/** Shared stylised linear-light surface response. Analytic sky, GGX/Schlick specular,
 * generated detail normals, contact field, and retained bounded planar marina reflections.
 * This is not a full image-based PBR pipeline or global illumination. No bloom or blur. */
import {WATERFRONT_FRAGMENT} from '../marina/finish.js';
export const FINISH_FRAGMENT=`
uniform sampler2D uSurface;uniform sampler2D uDetail;uniform sampler2D uGround;
uniform float uGroundReady;uniform float uFineLighting;
uniform vec3 uCamera;uniform vec3 uObjectTint;uniform float uClosed;uniform float uStudio;
uniform vec3 uHarborLights[4];
${WATERFRONT_FRAGMENT}
vec3 displayColor(vec3 c){c=max(c,vec3(0.));c=(c*(2.51*c+.03))/(c*(2.43*c+.59)+.14);return pow(clamp(c,0.,1.),vec3(1./2.2));}
vec3 skyColor(vec3 dir){
 vec3 sky=mix(vec3(.18,.31,.40),vec3(.53,.77,.96),smoothstep(-.15,.85,dir.y));
 sky=mix(sky,vec3(.98,.47,.19),uDusk*pow(1.-max(dir.y,0.),2.)*.70);
 return sky*mix(vec3(1.),vec3(.065,.13,.27),uNight);
}
vec3 microNormal(vec3 n,vec2 map){
 vec3 dp1=dFdx(vWorld),dp2=dFdy(vWorld);vec2 duv1=dFdx(vUv),duv2=dFdy(vUv);
 vec3 p2=cross(dp2,n),p1=cross(n,dp1),t=p2*duv1.x+p1*duv2.x,b=p2*duv1.y+p1*duv2.y;
 float inv=inversesqrt(max(max(dot(t,t),dot(b,b)),.0000001));
 return normalize(n+t*map.x*inv+b*map.y*inv);
}
vec3 seaShade(vec3 n,float shadow){
 float edge=max(abs(vWorld.x),abs(vWorld.z))-7.60;
 vec3 haze=vec3(.955,.950,.924)-uNight*vec3(.19,.17,.12);
 if(edge>=2.80)return haze;
 vec3 v=normalize(uCamera-vWorld),l=normalize(vec3(-.5,.9,.55));
 float a=vWorld.x*14.7+vWorld.z*9.2+sin(vWorld.z*3.1)*1.6+uTime*.48,b=vWorld.x*7.2-vWorld.z*15.1+cos(vWorld.x*2.7)*1.4+uTime*.37;
 float aa=1./(1.+fwidth(a)*1.8);n=normalize(vec3((sin(a)+sin(b)*.45)*.07*aa,1.,cos(b)*.055*aa));
 vec3 color=mix(vec3(.028,.13,.18),vec3(.05,.29,.33),exp(-max(edge,0.)*.72));
 color*=1.-shadow*.58;color*=mix(vec3(1.),vec3(.24,.40,.63),uNight);
 color+=vec3(.08,.17,.19)*pow(max(dot(n,normalize(v+l)),0.),95.)*aa*(1.-uNight*.8);
 color+=vec3(.003,.006,.007)*sin(a+b*.38)*aa;
 return mix(pow(max(color,vec3(0.)),vec3(.85)),haze,smoothstep(.20,2.80,max(edge,0.)));
}
vec3 marinaShade(vec3 color,vec3 normal,float diffuse,float shadow){
 int m=int(vTex+.5);vec3 n=normal,v=normalize(uCamera-vWorld),l=normalize(vec3(-.5,.9,.55));
 if(m==21)return seaShade(n,shadow);
 float rough=m==5?.19:m==10?.25:m==4?.33:m==8?.36:m==11?.24:.84;
 float tile=m==6?0.:m==7?1.:m==8?2.:m==15?3.:m==17?4.:m==18?5.:m==19?6.:m==20?7.:-1.;
 if(tile>=0.){
  vec2 uv=vec2(mod(tile,4.),floor(tile/4.))*.25+(fract(vUv)*60.+2.)/256.;
  vec2 dx=dFdx(vUv)*60./256.,dy=dFdy(vUv)*60./256.;
  vec3 tex=textureGrad(uSurface,uv,dx,dy).rgb;
  color*=mix(vec3(1.),tex,m==15?.25:.62);
  if(uFineLighting>.5&&uStudio<.5&&uReflectionPass<.5){vec3 detail=textureGrad(uDetail,uv,dx,dy).rgb;n=microNormal(n,(detail.rg*2.-1.)*.64);rough=detail.b;}
 }
 if(m==14)color*=uObjectTint;
 if(uClosed>.5)color=mix(color,vec3(dot(color,vec3(.2126,.7152,.0722))),.72);
 float lamps=max(uNight,uDusk*.70);
 if(m==11||m==12)color=mix(vec3(.13,.25,.29),color,lamps*(1.-uClosed)*float(m==11));
 if(uStudio>.5)return color*(.34+.66*diffuse);
 if(m==9){vec3 water=waterfrontFinish(color,normal,diffuse,shadow,m);return pow(max(water,vec3(0.)),vec3(.92));}
 vec3 albedo=pow(max(color,vec3(.001)),vec3(2.2));
 float metallic=m==10?.82:m==8?.36:m==20?.24:0.;
 float glass=float(m==5||m==11||m==12),NoL=max(dot(n,l),0.),NoV=max(dot(n,v),.001);
 vec3 f0=mix(vec3(.04),albedo,metallic),spec=vec3(0.);
 // Matte stone/soil/foliage do not pay for a barely visible specular lobe.
 if(rough<.65){
  vec3 halfV=normalize(l+v);float NoH=max(dot(n,halfV),0.),VoH=max(dot(v,halfV),0.);
  rough=max(rough,.17);float alpha=rough*rough,a2=alpha*alpha;
  float denom=NoH*NoH*(a2-1.)+1.,D=a2/(3.14159*denom*denom+.0001),k=(rough+1.)*(rough+1.)*.125;
  float G=NoV/(NoV*(1.-k)+k)*NoL/(NoL*(1.-k)+k);
  vec3 F=f0+(1.-f0)*pow(1.-VoH,5.);spec=D*G*F/max(4.*NoV*max(NoL,.01),.01);
 }
 vec3 sun=mix(vec3(1.48,1.34,1.12),vec3(2.10,1.13,.47),uDusk*.75)*(1.-uNight*.95);
 vec3 ambient=mix(vec3(.11,.16,.22),vec3(.35,.44,.52),n.y*.5+.5);
 ambient*=mix(vec3(1.),vec3(.12,.22,.40),uNight);
 vec3 ground=vec3(1.,0.,0.);
 if(uGroundReady>.5&&vWorld.y<.86&&abs(vWorld.x)<7.8&&abs(vWorld.z)<7.8){
  vec3 field=texture(uGround,(vWorld.xz+8.)/16.).rgb;ground=mix(vec3(1.,0.,0.),field,1.-smoothstep(.55,.86,vWorld.y));
 }
 float bounce=.78+.22*smoothstep(.49,1.12,vWorld.y);
 vec3 radiance=albedo*(ambient*ground.r*bounce+sun*NoL*(1.-shadow*.87))*(1.-metallic*.73);
 radiance+=spec*sun*NoL*(1.-shadow*.90);
 if(rough<.65){
  vec3 sky=pow(max(skyColor(reflect(-v,n)),vec3(.001)),vec3(2.2));
  vec3 envF=f0+(1.-f0)*pow(1.-NoV,5.);
  radiance+=sky*envF*(1.-rough*.65)*(1.+glass*2.4);
  if(m==5)radiance=mix(radiance,sky*(.38+.40*pow(1.-NoV,3.))+albedo*.16,.64);
 }
 if(m==13){radiance+=albedo*vec3(.45,.65,.23)*pow(max(dot(-n,l),0.),2.)*(1.-uNight);radiance*=vec3(.83,1.02,.78);}
 if(m==7&&uWaterfront>.5)radiance*=.76+.24*smoothstep(.432,.57,vWorld.y);
 radiance+=albedo*(ground.g*vec3(2.9,1.45,.44)+ground.b*vec3(.29,1.25,1.70))*lamps;
 if(m==11&&uClosed<.5){float room=.76+.24*step(.35,fract(sin(dot(floor(vWorld*9.),vec3(1.7,8.1,3.4)))*4357.));radiance+=vec3(1.8,.92,.24)*lamps*room;}
 if(m==16)radiance+=vec3(2.2,1.13,.34)*(.12+lamps*1.30);
 if(lamps>.01)for(int i=0;i<4;i++){
  vec3 d=uHarborLights[i]-vWorld;float ds=dot(d,d),nd=max(dot(n,normalize(d)),0.);
  radiance+=albedo*vec3(1.,.52,.18)*nd*.15/(.08+ds)*lamps;
 }
 return mix(displayColor(radiance),vec3(.41,.51,.55),uWeather*.045);
}
`;
