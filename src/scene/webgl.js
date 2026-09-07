import {cityField} from './finish/field.js';
import {detailAtlas} from './finish/materials.js';
import {EFFECT_VERTEX} from './finish/effects.js';
import { WaterfrontReflection } from './marina/reflection.js';
import { surfaceAtlas } from './marina/surfaces.js';
import { MARINA_FRAGMENT } from './marina/shader.js';
import { identity, multiply, lookAt, ortho } from "./math.js";
const VERT=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition; layout(location=1) in vec3 aNormal;
layout(location=2) in vec3 aColor; layout(location=3) in vec2 aUv; layout(location=4) in float aTex;
uniform mat4 uModel; uniform mat4 uVP; uniform mat4 uLight;
out vec3 vWorld;out vec3 vNormal;out vec3 vColor;out vec2 vUv;out float vTex;out vec4 vShadow;
${EFFECT_VERTEX}
void main(){vec4 world=uModel*vec4(effectPosition(aPosition),1.);vWorld=world.xyz;gl_Position=uVP*world;vNormal=normalize(mat3(uModel)*aNormal);vColor=aColor;vUv=aUv;vTex=aTex;vShadow=uLight*world;}`;
const FRAG=`#version 300 es
precision highp float;
in float vEffectFade;in vec3 vWorld;in vec3 vNormal;in vec3 vColor;in vec2 vUv;in float vTex;in vec4 vShadow;
uniform float uNight;uniform float uDusk;uniform float uWeather;uniform float uTime;uniform sampler2D uAtlas;uniform sampler2D uShadow;uniform float uUseShadow;out vec4 frag;
${MARINA_FRAGMENT}
void main(){if(vTex>22.5){if(vEffectFade<.008)discard;frag=vec4(vColor*mix(vec3(1.),uObjectTint,.42)*(1.+uNight*.3),vEffectFade);return;}if(uReflectionPass>.5&&vWorld.y<.428)discard;vec3 base=vColor; if(vTex>.5&&vTex<1.5){vec4 t=texture(uAtlas,vUv);base=mix(base,t.rgb,t.a);}
 vec3 n=normalize(vNormal);float diffuse=max(dot(n,normalize(vec3(-.5,.9,.55))),0.);
 vec3 p=vShadow.xyz/vShadow.w*.5+.5;float shadow=0.;
 if(uUseShadow>.5&&p.x>0.&&p.x<1.&&p.y>0.&&p.y<1.&&p.z<1.){
  float bias=max(.0012*(1.-diffuse),.00045);
  for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){float depth=texture(uShadow,p.xy+vec2(float(x),float(y))/2048.).r;shadow+=(p.z-bias>depth?1.:0.);}
  shadow/=9.;
 }
 if(vTex>3.5||vTex<.5){frag=vec4(marinaShade(base,n,diffuse,shadow),1.);return;}
 float light=.68+.32*diffuse*(1.-shadow*.78);float rim=pow(max(n.y,0.),3.)*.025;
 vec3 shaded=(base*light+rim)*mix(vec3(1.),vec3(.46,.57,.69),uNight);
 if(vTex>.5&&vTex<1.5)shaded=mix(base*light,shaded,.48);
 if(vTex>1.5&&vTex<2.5){
   float threshold=fract(sin(dot(floor(vWorld*13.),vec3(12.98,78.23,19.12)))*43758.54);
   float lit=smoothstep(threshold*.65,threshold*.65+.14,uNight);
   shaded=mix(vec3(.28,.43,.43)*(1.-uNight*.35),base*1.12,lit);
 }
 if(vTex>2.5)shaded=mix(shaded,base*(.90+.08*sin(uTime*.5)),.38+uNight*.60);
 shaded*=mix(vec3(1.),vec3(1.06,.97,.86),uDusk*.5);
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
    this.gl=gl;this.canvas=canvas;this.atlasSource=atlas;this.meshes=new Set();this.uniforms=new Map();
    this._shadows=true;this.lost=false;this.meshUploads=0;this.meshDrops=0;this.restoreCount=0;
    this.light=multiply(ortho(-12,12,-12,12,.1,60),lookAt([-10,21,13],[0,0,0]));
    this.groundSource=cityField();this.groundUploads=0;this.groundDirty=false;this.reflections=new WaterfrontReflection(this);this.initializeGPU();
    this.abort=new AbortController();const opts={signal:this.abort.signal};
    canvas.addEventListener('webglcontextlost',e=>{
      e.preventDefault();this.lost=true;this.reflections.forget();this.reflections.memory();this.shadow=null;this.fb=null;this.shadowOK=false;
      this.textureBytes.shadowDepth24StorageUpperBound=0;this.ground=null;this.detail=null;this.textureBytes.groundFieldRGBA8=0;this.textureBytes.materialDetailMipmapped=0;
      this.stats={...this.stats,contextLost:true,gpuBufferBytes:0,drawCalls:0,shadowDrawCalls:0};
    },opts);
    canvas.addEventListener('webglcontextrestored',()=>{
      try{this.initializeGPU();for(const mesh of this.meshes)this.upload(mesh);this.lost=false;this.restoreError=null;this.restoreCount++;}
      catch(error){this.restoreError=error;this.lost=true;}
    },opts);
  }
  initializeGPU(){
    this.reflections.forget();
    const gl=this.gl,atlas=this.atlasSource;this.p=program(gl,VERT,FRAG);this.dp=program(gl,DEPTHVERT,DEPTHFRAG);this.uniforms.clear();
    gl.activeTexture(gl.TEXTURE0);
    this.atlas=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.atlas);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlas);gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    const surface=surfaceAtlas();this.surface=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.surface);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,surface.width,surface.height,0,gl.RGBA,gl.UNSIGNED_BYTE,surface.data);gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    this.textureBytes={boardAtlasMipmapped:Math.round(atlas.width*atlas.height*4*4/3),surfaceAtlasMipmapped:Math.round(surface.width*surface.height*4*4/3),shadowDepth24StorageUpperBound:0};
    const detail=detailAtlas();this.detail=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.detail);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,detail.width,detail.height,0,gl.RGBA,gl.UNSIGNED_BYTE,detail.data);gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    this.ground=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.ground);const field=this.groundSource;
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,field.width,field.height,0,gl.RGBA,gl.UNSIGNED_BYTE,field.data);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    this.groundUploads++;this.groundDirty=false;
    this.textureBytes.materialDetailMipmapped=Math.round(detail.data.byteLength*4/3);this.textureBytes.groundFieldRGBA8=field.data.byteLength;
    this.reflections.memory();
    // No shadow allocation at construction or in low mode. A complete colour texture is
    // bound to the inactive depth sampler; no incomplete-texture warnings on mobile GL.
    this.shadow=null;this.fb=null;this.shadowOK=false;this.shadowFailed=false;
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
    this.defaultFramebufferConfig={depthBits:gl.getParameter(gl.DEPTH_BITS),samples:gl.getParameter(gl.SAMPLES),driverAllocationUnknown:true};
  }
  setGroundCity(city){if(this.groundSignature===city.signature)return;this.groundSignature=city.signature;this.groundSource=cityField(city);this.groundDirty=true;}
  syncGround(){if(!this.groundDirty||this.lost)return;const g=this.gl,f=this.groundSource;g.activeTexture(g.TEXTURE4);g.bindTexture(g.TEXTURE_2D,this.ground);g.texSubImage2D(g.TEXTURE_2D,0,0,0,f.width,f.height,g.RGBA,g.UNSIGNED_BYTE,f.data);this.groundUploads++;this.groundDirty=false;}
  get shadows(){return this._shadows;}
  set shadows(value){this._shadows=Boolean(value);if(!this._shadows){this.releaseShadow();this.reflections?.release();}}
  releaseShadow(){
    const gl=this.gl;
    if(this.shadow)gl.deleteTexture(this.shadow);if(this.fb)gl.deleteFramebuffer(this.fb);
    this.shadow=null;this.fb=null;this.shadowOK=false;this.shadowFailed=false;
    if(this.textureBytes)this.textureBytes.shadowDepth24StorageUpperBound=0;
  }
  ensureShadow(){
    if(!this._shadows||this.shadowOK||this.shadowFailed||this.lost)return;
    const gl=this.gl;this.shadow=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.shadow);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,2048,2048,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    this.fb=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,this.fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,this.shadow,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);
    this.shadowOK=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    if(this.shadowOK)this.textureBytes.shadowDepth24StorageUpperBound=2048*2048*4;
    else{this.releaseShadow();this.shadowFailed=true;}
  }
  upload(mesh){
    const gl=this.gl;mesh.vao=gl.createVertexArray();mesh.buffer=gl.createBuffer();
    gl.bindVertexArray(mesh.vao);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);gl.bufferData(gl.ARRAY_BUFFER,mesh.sourceData,gl.STATIC_DRAW);
    const sizes=[3,3,3,2,1];let offset=0;for(let i=0;i<sizes.length;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,sizes[i],gl.FLOAT,false,48,offset*4);offset+=sizes[i];}
    mesh.indexBuffer=null;mesh.indexType=null;
    if(mesh.sourceIndices){mesh.indexBuffer=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,mesh.sourceIndices,gl.STATIC_DRAW);mesh.indexType=mesh.sourceIndices instanceof Uint32Array?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT;}
    this.meshUploads++;
  }
  mesh(geo){
    // Retain ONE compact typed-array copy for context restoration. Count it separately
    // from GPU buffers. Dropped cache entries release these CPU references as well.
    const data=geo.typed(),indices=geo.indices??null;
    const mesh={count:indices?.length??data.length/12,vertices:data.length/12,bytes:data.byteLength+(indices?.byteLength??0),name:geo.name??'legacy-mesh',sourceData:data,sourceIndices:indices};
    this.meshes.add(mesh);if(!this.lost)this.upload(mesh);return mesh;
  }
  drop(mesh){
    if(!mesh||!this.meshes.has(mesh))return;
    const gl=this.gl;if(!this.lost){gl.deleteBuffer(mesh.buffer);if(mesh.indexBuffer)gl.deleteBuffer(mesh.indexBuffer);gl.deleteVertexArray(mesh.vao);}
    mesh.sourceData=null;mesh.sourceIndices=null;this.meshes.delete(mesh);this.meshDrops++;
  }
  uniform(p,name){const key=(p===this.p?'p:':'d:')+name;if(!this.uniforms.has(key))this.uniforms.set(key,this.gl.getUniformLocation(p,name));return this.uniforms.get(key);}
  pass(p,vp,objects,reflection=false){const gl=this.gl;gl.useProgram(p);gl.uniformMatrix4fv(this.uniform(p,'uVP'),false,vp);
    if(p===this.p){gl.uniform1f(this.uniform(p,'uNight'),this.night??0);gl.uniform1f(this.uniform(p,'uDusk'),this.dusk??0);gl.uniform1f(this.uniform(p,'uWeather'),this.weather??0);gl.uniform1f(this.uniform(p,'uTime'),this.ambientTime??0);gl.uniformMatrix4fv(this.uniform(p,'uLight'),false,this.light);gl.uniform1f(this.uniform(p,'uUseShadow'),this.shadows&&this.shadowOK&&!reflection?1:0);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.atlas);gl.uniform1i(this.uniform(p,'uAtlas'),0);
      gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.shadow??this.atlas);gl.uniform1i(this.uniform(p,'uShadow'),1);
      gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,this.surface);gl.uniform1i(this.uniform(p,'uSurface'),2);
      const camera=this.camera??[10,18,20];gl.uniform3fv(this.uniform(p,'uCamera'),reflection?[camera[0],.854-camera[1],camera[2]]:camera);
      gl.uniform1f(this.uniform(p,'uReflectionPass'),reflection?1:0);gl.uniform1f(this.uniform(p,'uUseReflection'),!reflection&&this.reflections.ready?1:0);gl.uniformMatrix4fv(this.uniform(p,'uReflectionProject'),false,this.reflections.project);
      gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,reflection?this.atlas:(this.reflections.texture??this.atlas));gl.uniform1i(this.uniform(p,'uWaterReflection'),3);gl.uniform1f(this.uniform(p,'uStudio'),this.studio?1:0);
      gl.uniform3fv(this.uniform(p,'uHarborLights[0]'),this.harborLights??new Float32Array(12));
      gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,this.ground);gl.uniform1i(this.uniform(p,'uGround'),4);gl.uniform1f(this.uniform(p,'uGroundReady'),this.groundSignature&&!this.studio?1:0);
      gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,this.detail);gl.uniform1i(this.uniform(p,'uDetail'),5);gl.uniform1f(this.uniform(p,'uFineLighting'),this.shadows?1:0);}
    for(const o of objects){if(p===this.dp&&o.noShadow)continue;gl.uniformMatrix4fv(this.uniform(p,'uModel'),false,o.model??identity());gl.bindVertexArray(o.mesh.vao);
      if(p===this.p){gl.uniform1f(this.uniform(p,'uEffectAge'),o.effectAge??0);gl.uniform1f(this.uniform(p,'uEffectKind'),o.effectKind??0);gl.uniform3fv(this.uniform(p,'uObjectTint'),o.tint??[1,1,1]);gl.uniform1f(this.uniform(p,'uClosed'),o.closed??0);gl.uniform1f(this.uniform(p,'uWaterfront'),o.waterfront?1:0);gl.uniform3fv(this.uniform(p,'uHarborLights[0]'),(o.waterfront?this.waterfrontLights:this.harborLights)??new Float32Array(12));}
      const fx=p===this.p&&o.effect===true;if(fx){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);this.stats.effectDrawCalls++;}
      if(o.mesh.indexBuffer)gl.drawElements(gl.TRIANGLES,o.mesh.count,o.mesh.indexType,0);else gl.drawArrays(gl.TRIANGLES,0,o.mesh.count);
      if(fx){gl.depthMask(true);gl.disable(gl.BLEND);}
      if(p===this.dp){this.stats.shadowDrawCalls++;this.stats.shadowTriangles+=o.mesh.count/3;}else if(reflection){this.stats.reflectionDrawCalls++;this.stats.reflectionTriangles+=o.mesh.count/3;}else{this.stats.drawCalls++;this.stats.triangles+=o.mesh.count/3;}}
  }
  render(vp,objects){if(this.lost||this.gl.isContextLost())return;this.syncGround();this.ensureShadow();const gl=this.gl,start=performance.now();
    this.stats={effectDrawCalls:0,groundUploads:this.groundUploads,cpuFieldBytes:this.groundSource.data.byteLength,drawCalls:0,shadowDrawCalls:0,triangles:0,shadowTriangles:0,reflectionDrawCalls:0,reflectionTriangles:0,reflectionPasses:0,gpuBufferBytes:[...this.meshes].reduce((n,m)=>n+m.bytes,0),meshUploads:this.meshUploads,meshDrops:this.meshDrops,cpuRetainedGeometryBytes:[...this.meshes].reduce((n,m)=>n+m.bytes,0),restoreCount:this.restoreCount,textureBytes:{...this.textureBytes},defaultFramebuffer:{pixels:this.canvas.width*this.canvas.height,rgba8SingleSampleLowerBound:this.canvas.width*this.canvas.height*4,...this.defaultFramebufferConfig},meshes:this.meshes.size,width:this.canvas.width,height:this.canvas.height};
    if(this.shadows&&this.shadowOK){gl.bindFramebuffer(gl.FRAMEBUFFER,this.fb);gl.viewport(0,0,2048,2048);gl.clear(gl.DEPTH_BUFFER_BIT);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1,2);this.pass(this.dp,this.light,objects);gl.disable(gl.POLYGON_OFFSET_FILL);}
    this.reflections.render(vp,objects);this.stats.textureBytes={...this.textureBytes};
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,this.canvas.width,this.canvas.height);const night=this.night??0;gl.clearColor(.955-night*.55,.95-night*.49,.924-night*.37,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);this.pass(this.p,vp,objects);this.stats.cpuSubmitMs=performance.now()-start;
  }
  resize(w,h,dpr=1){const width=Math.max(1,Math.round(w*dpr)),height=Math.max(1,Math.round(h*dpr));if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}}
  destroy(){this.abort.abort();this.reflections.release();for(const mesh of [...this.meshes])this.drop(mesh);const gl=this.gl;gl.deleteProgram(this.p);gl.deleteProgram(this.dp);gl.deleteTexture(this.atlas);gl.deleteTexture(this.surface);gl.deleteTexture(this.detail);gl.deleteTexture(this.ground);this.groundSource=null;gl.deleteTexture(this.shadow);gl.deleteFramebuffer(this.fb);}
}

export { Renderer };
