/** Bounded, cropped planar reflection of the waterfront only. No image impostors.
 * One 512² RGBA8 texture + DEPTH_COMPONENT16 renderbuffer, high quality only.
 * Values below count explicit storage, not driver padding or complete VRAM.
 */
import { identity, multiply, transform } from '../math.js';
const REFLECTION_SIZE=512, REFLECTION_WATERLINE=.427;
function reflectionProjection(vp){
  const corners=[[-3.05,.427,.82],[-.82,.427,.82],[-.82,.427,3.27],[-3.05,.427,3.27]];
  const p=corners.map(v=>transform(vp,[...v,1]));
  const xs=p.map(v=>v[0]/v[3]),ys=p.map(v=>v[1]/v[3]);
  const lo=[Math.min(...xs)-.015,Math.min(...ys)-.015],hi=[Math.max(...xs)+.015,Math.max(...ys)+.015];
  const crop=identity();crop[0]=2/Math.max(.001,hi[0]-lo[0]);crop[5]=2/Math.max(.001,hi[1]-lo[1]);crop[12]=-(hi[0]+lo[0])/(hi[0]-lo[0]);crop[13]=-(hi[1]+lo[1])/(hi[1]-lo[1]);
  const project=multiply(crop,vp),mirror=identity();mirror[5]=-1;mirror[13]=2*REFLECTION_WATERLINE;
  return {project,view:multiply(project,mirror)};
}
class WaterfrontReflection {
  constructor(renderer){this.renderer=renderer;this.forget();}
  forget(){this.texture=null;this.depth=null;this.fb=null;this.ready=false;this.failed=false;this.project=identity();}
  release(){
    const gl=this.renderer.gl;
    if(!this.renderer.lost){if(this.texture)gl.deleteTexture(this.texture);if(this.depth)gl.deleteRenderbuffer(this.depth);if(this.fb)gl.deleteFramebuffer(this.fb);}
    this.forget();this.memory();
  }
  memory(){if(this.renderer.textureBytes){this.renderer.textureBytes.waterReflectionRGBA8=this.ready?REFLECTION_SIZE**2*4:0;this.renderer.textureBytes.waterReflectionDepth16=this.ready?REFLECTION_SIZE**2*2:0;}}
  ensure(){
    if(this.ready||this.failed||this.renderer.lost)return;
    const gl=this.renderer.gl,s=REFLECTION_SIZE;
    this.texture=gl.createTexture();gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,this.texture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,s,s,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    this.depth=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,this.depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,s,s);
    this.fb=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,this.fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.texture,0);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,this.depth);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);gl.readBuffer(gl.COLOR_ATTACHMENT0);this.ready=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.bindRenderbuffer(gl.RENDERBUFFER,null);
    if(!this.ready){this.release();this.failed=true;}this.memory();
  }
  render(vp,objects){
    const r=this.renderer;
    if(!r.shadows||r.studio||!objects.some(o=>o.waterfrontWater)){this.release();return;}
    this.ensure();if(!this.ready)return;
    const gl=r.gl,projection=reflectionProjection(vp);this.project=projection.project;
    gl.bindFramebuffer(gl.FRAMEBUFFER,this.fb);gl.viewport(0,0,REFLECTION_SIZE,REFLECTION_SIZE);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    // Only known waterfront objects. Water is never submitted to its own target.
    // Reflection shades use the same material model without a second shadow lookup.
    r.pass(r.p,projection.view,objects.filter(o=>o.waterfront&&!o.waterfrontWater&&!o.noReflection),true);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);r.stats.reflectionPasses=1;
  }
}
export { WaterfrontReflection, reflectionProjection, REFLECTION_SIZE, REFLECTION_WATERLINE };
