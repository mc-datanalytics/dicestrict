import { identity, multiply, lookAt, ortho } from "./math.js";
const VERT=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition; layout(location=1) in vec3 aNormal;
layout(location=2) in vec3 aColor; layout(location=3) in vec2 aUv; layout(location=4) in float aTex;
uniform mat4 uModel; uniform mat4 uVP; uniform mat4 uLight;
out vec3 vWorld;out vec3 vNormal;out vec3 vColor;out vec2 vUv;out float vTex;out vec4 vShadow;
void main(){vec4 world=uModel*vec4(aPosition,1.);vWorld=world.xyz;gl_Position=uVP*world;vNormal=normalize(mat3(uModel)*aNormal);vColor=aColor;vUv=aUv;vTex=aTex;vShadow=uLight*world;}`;
const FRAG=`#version 300 es
precision highp float;
in vec3 vWorld;in vec3 vNormal;in vec3 vColor;in vec2 vUv;in float vTex;in vec4 vShadow;
uniform float uNight;uniform float uWeather;uniform float uTime;uniform sampler2D uAtlas;uniform sampler2D uShadow;uniform float uUseShadow;out vec4 frag;
void main(){vec3 base=vColor; if(vTex>.5&&vTex<1.5){vec4 t=texture(uAtlas,vUv);base=mix(base,t.rgb,t.a);}
 vec3 n=normalize(vNormal);float diffuse=max(dot(n,normalize(vec3(-.5,.9,.55))),0.);
 vec3 p=vShadow.xyz/vShadow.w*.5+.5;float shadow=0.;
 if(uUseShadow>.5&&p.x>0.&&p.x<1.&&p.y>0.&&p.y<1.&&p.z<1.){
  float bias=max(.0012*(1.-diffuse),.00045);
  for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){float depth=texture(uShadow,p.xy+vec2(float(x),float(y))/2048.).r;shadow+=(p.z-bias>depth?1.:0.);}
  shadow/=9.;
 }
 float light=.68+.32*diffuse*(1.-shadow*.78);float rim=pow(max(n.y,0.),3.)*.025;
 vec3 shaded=(base*light+rim)*mix(vec3(1.),vec3(.46,.57,.69),uNight);
 if(vTex>.5&&vTex<1.5)shaded=mix(base*light,shaded,.48);
 if(vTex>1.5&&vTex<2.5){
   float threshold=fract(sin(dot(floor(vWorld*13.),vec3(12.98,78.23,19.12)))*43758.54);
   float lit=smoothstep(threshold*.65,threshold*.65+.14,uNight);
   shaded=mix(vec3(.28,.43,.43)*(1.-uNight*.35),base*1.12,lit);
 }
 if(vTex>2.5)shaded=mix(shaded,base*(.90+.08*sin(uTime*.5)),.38+uNight*.60);
 shaded=mix(shaded,vec3(.66,.74,.73),uWeather*.13);
 frag=vec4(shaded,1.);
}`;
const DEPTHVERT=`#version 300 es
layout(location=0) in vec3 aPosition;uniform mat4 uModel;uniform mat4 uVP;void main(){gl_Position=uVP*uModel*vec4(aPosition,1.);}`;
const DEPTHFRAG=`#version 300 es
precision highp float;void main(){}`;
function program(gl,vs,fs){
  const shaders=[gl.VERTEX_SHADER,gl.FRAGMENT_SHADER].map((type,i)=>{const s=gl.createShader(type);gl.shaderSource(s,[vs,fs][i]);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;});
  const p=gl.createProgram();shaders.forEach(s=>gl.attachShader(p,s));gl.linkProgram(p);shaders.forEach(s=>gl.deleteShader(s));
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;
}
class Renderer {
  constructor(canvas,atlas){
    const gl=canvas.getContext('webgl2',{antialias:true,alpha:false,powerPreference:'high-performance'});
    if(!gl)throw Error('WebGL 2 indisponible. Activez l’accélération graphique ou essayez un autre navigateur.');
    this.gl=gl;this.canvas=canvas;this.meshes=new Set();this.p=program(gl,VERT,FRAG);this.dp=program(gl,DEPTHVERT,DEPTHFRAG);
    this.uniforms=new Map();this.light=multiply(ortho(-12,12,-12,12,.1,60),lookAt([-10,21,13],[0,0,0]));
    this.atlas=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.atlas);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlas);gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    this.shadow=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.shadow);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,2048,2048,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    this.fb=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,this.fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,this.shadow,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);
    this.shadowOK=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);this.shadows=true;
  }
  mesh(geo){
    const gl=this.gl,vao=gl.createVertexArray(),buffer=gl.createBuffer(),data=geo.typed();
    gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
    const sizes=[3,3,3,2,1];let offset=0;for(let i=0;i<sizes.length;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,sizes[i],gl.FLOAT,false,48,offset*4);offset+=sizes[i];}
    const mesh={vao,buffer,count:data.length/12};this.meshes.add(mesh);return mesh;
  }
  drop(mesh){if(!mesh)return;this.gl.deleteBuffer(mesh.buffer);this.gl.deleteVertexArray(mesh.vao);this.meshes.delete(mesh);}
  uniform(p,name){const key=(p===this.p?'p:':'d:')+name;if(!this.uniforms.has(key))this.uniforms.set(key,this.gl.getUniformLocation(p,name));return this.uniforms.get(key);}
  pass(p,vp,objects){const gl=this.gl;gl.useProgram(p);gl.uniformMatrix4fv(this.uniform(p,'uVP'),false,vp);
    if(p===this.p){gl.uniform1f(this.uniform(p,'uNight'),this.night??0);gl.uniform1f(this.uniform(p,'uWeather'),this.weather??0);gl.uniform1f(this.uniform(p,'uTime'),this.ambientTime??0);gl.uniformMatrix4fv(this.uniform(p,'uLight'),false,this.light);gl.uniform1f(this.uniform(p,'uUseShadow'),this.shadows&&this.shadowOK?1:0);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.atlas);gl.uniform1i(this.uniform(p,'uAtlas'),0);
      gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.shadow);gl.uniform1i(this.uniform(p,'uShadow'),1);}
    for(const o of objects){if(p===this.dp&&o.noShadow)continue;gl.uniformMatrix4fv(this.uniform(p,'uModel'),false,o.model??identity());gl.bindVertexArray(o.mesh.vao);gl.drawArrays(gl.TRIANGLES,0,o.mesh.count);}
  }
  render(vp,objects){const gl=this.gl;
    if(this.shadows&&this.shadowOK){gl.bindFramebuffer(gl.FRAMEBUFFER,this.fb);gl.viewport(0,0,2048,2048);gl.clear(gl.DEPTH_BUFFER_BIT);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1,2);this.pass(this.dp,this.light,objects);gl.disable(gl.POLYGON_OFFSET_FILL);}
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,this.canvas.width,this.canvas.height);const night=this.night??0;gl.clearColor(.955-night*.55,.95-night*.49,.924-night*.37,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);this.pass(this.p,vp,objects);
  }
  resize(w,h,dpr=1){const width=Math.max(1,Math.round(w*dpr)),height=Math.max(1,Math.round(h*dpr));if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}}
  destroy(){for(const mesh of [...this.meshes])this.drop(mesh);const gl=this.gl;gl.deleteProgram(this.p);gl.deleteProgram(this.dp);gl.deleteTexture(this.atlas);gl.deleteTexture(this.shadow);gl.deleteFramebuffer(this.fb);}
}

export { Renderer };
