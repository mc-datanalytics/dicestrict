/** Shared, single-pass marina surface model. No bloom, SSR, transparent sorting or blur.
 * Water/sky reflections are stylised analytic approximations, not ray tracing.
 */
const MARINA_FRAGMENT=`
uniform sampler2D uSurface;
uniform vec3 uCamera; uniform vec3 uObjectTint; uniform float uClosed; uniform float uStudio;
uniform vec3 uHarborLights[4];
vec3 marinaShade(vec3 color, vec3 normal, float diffuse, float shadow) {
  int material=int(vTex+.5);vec3 n=normal;vec3 v=normalize(uCamera-vWorld);
  float night=uStudio>.5?0.:uNight;
  float tile=material==6?0.:material==7?1.:material==8?2.:material==15?3.:material==17?4.:material==18?5.:material==19?6.:material==20?7.:-1.;
  if(tile>=0.) {
    vec2 corner=vec2(mod(tile,4.),floor(tile/4.))*.25;
    vec2 uv=corner+(fract(vUv)*60.+2.)/256.;
    vec3 tex=textureGrad(uSurface,uv,dFdx(vUv)*60./256.,dFdy(vUv)*60./256.).rgb;
    color*=mix(vec3(1.),tex,material==15?.35:.73);
  }
  if(material==14)color*=uObjectTint;
  if(uClosed>.5)color=mix(color,vec3(dot(color,vec3(.2126,.7152,.0722))),.68);
  if(material==11||material==12)color=mix(vec3(.15,.30,.33),color,night*(1.-uClosed)*float(material==11));
  if(uStudio>.5) {
    if(material==5)color=mix(color,vec3(.22,.36,.40),.3);
    return color*(.39+.61*diffuse*(1.-shadow*.70));
  }
  vec3 sun=normalize(vec3(-.5,.9,.55));
  if(material==9) {
    float a=vWorld.x*33.+vWorld.z*23.+uTime*1.35,b=vWorld.x*16.-vWorld.z*27.+uTime*.94;
    float attenuation=1./(1.+fwidth(a)*.8);
    n=normalize(vec3((sin(a)*.080+sin(b)*.042)*attenuation,1.,cos(a*.73+b*.32)*.080*attenuation));
    float edge=min(min(abs(vWorld.x+2.966),abs(vWorld.x+1.01)),min(abs(vWorld.z-.914),abs(vWorld.z-3.165)));
    color=mix(vec3(.035,.255,.296),vec3(.145,.405,.395),exp(-edge*7.)*.55);
    color+=sin(a*.46+b*.62)*.012*attenuation;
    diffuse=max(dot(n,sun),0.);
  }
  float fresnel=pow(1.-max(dot(n,v),0.),5.);
  float light=.44+.56*diffuse*(1.-shadow*.73);
  vec3 hemisphere=mix(vec3(.79,.86,.89),vec3(1.055,1.027,.94),n.y*.5+.5);
  vec3 shaded=color*light*hemisphere*mix(vec3(1.),vec3(.40,.51,.64),night);
  float shiny=material==5?.65:material==9?.68:material==10?.62:material==4?.22:material==8?.13:.015;
  if(material==5||material==9||material==10) {
    vec3 r=reflect(-v,n);vec3 sky=mix(vec3(.37,.52,.53),vec3(.64,.81,.87),smoothstep(-.08,.85,r.y));
    sky*=mix(vec3(1.),vec3(.16,.26,.44),night);
    float amount=material==9?.15+fresnel*.55:material==5?.27+fresnel*.50:.18+fresnel*.28;
    shaded=mix(shaded,sky,amount);
  }
  float spec=pow(max(dot(n,normalize(sun+v)),0.),material==9?100.:material==5?76.:material==4?55.:28.);
  shaded+=vec3(1.,.96,.86)*spec*shiny*(1.-shadow*.8)*(1.-night*.86);
  if(material==11&&uClosed<.5)shaded=mix(shaded,color*(.88+.035*sin(uTime*.15)),night*.94);
  if(material==16)shaded=mix(color*light*.76,color*1.02,night);
  if(night>.01)for(int i=0;i<4;i++) {
    vec3 d=uHarborLights[i]-vWorld;float ds=dot(d,d);vec3 l=normalize(d);
    float pool=max(dot(n,l),0.)*.043/(.045+ds);
    float glint=pow(max(dot(n,normalize(l+v)),0.),material==9?62.:35.)*.10/(.02+ds);
    shaded+=vec3(1.,.65,.30)*(pool+glint*shiny)*night;
  }
  return mix(shaded,vec3(.48,.59,.61),uWeather*.075);
}
`;
export { MARINA_FRAGMENT };
