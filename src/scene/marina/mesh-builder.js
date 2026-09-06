/** Small indexed modelling toolkit. Y up; +Z is forward; no DOM, RNG or dependency. */
const TAU = Math.PI * 2;
const sub = (a, b) => a.map((v, i) => v - b[i]);
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const unit = a => { const l = Math.hypot(...a) || 1; return a.map(v => v / l); };
const rgb = c => Array.isArray(c) ? c : [1,3,5].map(i => parseInt(c.slice(i,i+2),16)/255);
const dot = (a,b) => a.reduce((n,v,i) => n+v*b[i],0);
function planar(p, n) {
  const k = n.map(Math.abs).indexOf(Math.max(...n.map(Math.abs)));
  return k===1 ? [p[0]*4,p[2]*4] : k===0 ? [p[2]*4,p[1]*4] : [p[0]*4,p[1]*4];
}
class MeshBuilder {
  constructor() { this.vertices=[]; this.indices=[]; }
  vertex(p,n,color,material,uv) {
    this.vertices.push(...p,...n,...rgb(color),...(uv??planar(p,n)),material);
    return this.vertices.length/12-1;
  }
  polygon(points,color,material=4,normal=null) {
    if(points.length<3)return this;
    let n=unit(cross(sub(points[1],points[0]),sub(points[2],points[0])));
    if(normal && dot(n,normal)<0) { points=[...points].reverse(); n=unit(normal); }
    if(normal)n=unit(normal);
    const v=points.map(p=>this.vertex(p,n,color,material));
    for(let i=1;i<v.length-1;i++)this.indices.push(v[0],v[i],v[i+1]);
    return this;
  }
  box(p,s,color,material=4,bevel=0) {
    const h=s.map(v=>v/2),r=Math.min(bevel,...h)*.999,k=h.map(v=>v-r);
    const pt=q=>q.map((v,i)=>v+p[i]);
    for(let axis=0;axis<3;axis++)for(const sign of [-1,1]) {
      const u=(axis+1)%3,v=(axis+2)%3,n=[0,0,0]; n[axis]=sign;
      const points=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>{const q=[0,0,0];q[axis]=sign*h[axis];q[u]=a*(r?k[u]:h[u]);q[v]=b*(r?k[v]:h[v]);return pt(q);});
      this.polygon(points,color,material,n);
    }
    if(r>0) {
      for(let axis=0;axis<3;axis++)for(const a of [-1,1])for(const b of [-1,1]) {
        const u=(axis+1)%3,v=(axis+2)%3,n=[0,0,0];n[u]=a;n[v]=b;
        const points=[[-1,0],[1,0],[1,1],[-1,1]].map(([sign,side])=>{const q=[0,0,0];q[axis]=sign*k[axis];q[u]=a*(side?k[u]:h[u]);q[v]=b*(side?h[v]:k[v]);return pt(q);});
        this.polygon(points,color,material,n);
      }
      for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]) {
        const signs=[x,y,z];this.polygon([0,1,2].map(axis=>pt(k.map((v,i)=>signs[i]*(i===axis?h[i]:v)))),color,material,signs);
      }
    }
    return this;
  }
  prism(points,bottom,top,color,material=4) {
    const low=points.map(p=>[p[0],bottom,p[1]]),high=points.map(p=>[p[0],top,p[1]]);
    this.polygon(high,color,material,[0,1,0]);this.polygon(low,color,material,[0,-1,0]);
    const center=points.reduce((a,p)=>[a[0]+p[0]/points.length,a[1]+p[1]/points.length],[0,0]);
    for(let i=0;i<points.length;i++) {const j=(i+1)%points.length;const n=[(points[i][0]+points[j][0])/2-center[0],0,(points[i][1]+points[j][1])/2-center[1]];this.polygon([low[i],low[j],high[j],high[i]],color,material,n);}
    return this;
  }
  /** Smooth longitudinal surface, including closed end caps. Rings are CCW in XY. */
  loft(rings,color,material=4,openTop=false) {
    const rows=rings.length,cols=rings[0].length,ids=[];
    for(let i=0;i<rows;i++)for(let j=0;j<cols;j++) {
      const tangent=sub(rings[i][(j+1)%cols],rings[i][(j+cols-1)%cols]);
      const along=sub(rings[Math.min(i+1,rows-1)][j],rings[Math.max(i-1,0)][j]);
      ids.push(this.vertex(rings[i][j],unit(cross(tangent,along)),color,material));
    }
    for(let i=0;i<rows-1;i++)for(let j=0;j<cols;j++) {
      if(openTop&&j===0)continue;
      const a=i*cols+j,b=i*cols+(j+1)%cols,c=b+cols,d=a+cols;
      this.indices.push(ids[a],ids[b],ids[c],ids[a],ids[c],ids[d]);
    }
    this.polygon(rings[0],color,material,[0,0,-1]);this.polygon(rings[rows-1],color,material,[0,0,1]);return this;
  }
  rod(a,b,r,color,material=10,segments=8,topRadius=r) {
    const d=unit(sub(b,a)),u=unit(cross(d,Math.abs(d[1])>.9?[1,0,0]:[0,1,0])),v=cross(d,u);
    const ids=[],ends=[[],[]],length=Math.hypot(...sub(b,a));
    for(let end=0;end<2;end++)for(let j=0;j<segments;j++) {
      const t=j/segments*TAU,rad=end?topRadius:r,center=end?b:a;
      const radial=u.map((x,i)=>x*Math.cos(t)+v[i]*Math.sin(t));
      const p=center.map((x,i)=>x+radial[i]*rad),n=unit(radial.map((x,i)=>x+d[i]*(r-topRadius)/length));
      ends[end].push(p);ids.push(this.vertex(p,n,color,material));
    }
    for(let j=0;j<segments;j++) {
      const k=(j+1)%segments;this.indices.push(ids[j],ids[k],ids[k+segments],ids[j],ids[k+segments],ids[j+segments]);
    }
    // The ring above is clockwise about d; orient triangles explicitly outwards.
    const start=this.indices.length-segments*6;
    for(let i=start;i<this.indices.length;i+=3) {
      const p=this.indices.slice(i,i+3).map(id=>this.vertices.slice(id*12,id*12+3));
      const n=this.vertices.slice(this.indices[i]*12+3,this.indices[i]*12+6);
      if(dot(cross(sub(p[1],p[0]),sub(p[2],p[0])),n)<0)[this.indices[i+1],this.indices[i+2]]=[this.indices[i+2],this.indices[i+1]];
    }
    this.polygon(ends[0],color,material,d.map(x=>-x));this.polygon(ends[1],color,material,d);return this;
  }
  lathe(p,profile,color,material=4,segments=12) {
    for(let j=0;j<profile.length-1;j++)for(let i=0;i<segments;i++) {
      const a=i/segments*TAU,b=(i+1)/segments*TAU;
      const make=(q,t)=>[p[0]+q[0]*Math.cos(t),p[1]+q[1],p[2]+q[0]*Math.sin(t)];
      const q=profile[j],r=profile[j+1],n=[Math.cos((a+b)/2),(q[0]-r[0])/Math.max(.0001,r[1]-q[1]),Math.sin((a+b)/2)];
      const points=[make(q,a),make(q,b),make(r,b),make(r,a)];
      if(q[0]===0)points.splice(1,1);if(r[0]===0)points.splice(points.length-1,1);
      this.polygon(points,color,material,n);
    }return this;
  }
  add(mesh,p=[0,0,0],yaw=0,scale=1) {
    const s=Array.isArray(scale)?scale:[scale,scale,scale],c=Math.cos(yaw),sin=Math.sin(yaw),offset=this.vertices.length/12;
    const data=mesh.data??mesh.vertices,indices=mesh.indices;
    for(let i=0;i<data.length;i+=12) {
      const x=data[i]*s[0],z=data[i+2]*s[2],nx=data[i+3]/s[0],nz=data[i+5]/s[2];
      const n=unit([nx*c+nz*sin,data[i+4]/s[1],-nx*sin+nz*c]);
      this.vertices.push(x*c+z*sin+p[0],data[i+1]*s[1]+p[1],-x*sin+z*c+p[2],...n,...data.slice(i+6,i+12));
    }
    for(const id of indices)this.indices.push(offset+id);return this;
  }
  build(name='mesh') {
    const data=[],indices=[],weld=new Map();
    for(const id of this.indices) {
      const v=this.vertices.slice(id*12,id*12+12);
      if(v.some(x=>!Number.isFinite(x)))throw Error(`Non-finite vertex: ${name}`);
      const key=v.map(x=>Math.round(x*1000000)).join(',');
      let next=weld.get(key);
      if(next===undefined){next=data.length/12;data.push(...v);weld.set(key,next);}
      indices.push(next);
    }
    const array=new Float32Array(data),Index=data.length/12>65535?Uint32Array:Uint16Array;
    return {name,data:array,indices:new Index(indices),typed(){return this.data;}};
  }
}
export { MeshBuilder, rgb, unit, cross, sub };
