/** Batched geometry, no runtime model downloads or third-party assets. */
const rgb = c => [parseInt(c.slice(1,3),16)/255,parseInt(c.slice(3,5),16)/255,parseInt(c.slice(5,7),16)/255];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
class Geometry {
  constructor(){this.data=[];}
  vertex(p,n,c,uv=[0,0],tex=this.material??0){this.data.push(...p,...n,...(Array.isArray(c)?c:rgb(c)),...uv,tex);}
  tri(a,b,c,normal,color){this.vertex(a,normal,color);this.vertex(b,normal,color);this.vertex(c,normal,color);}
  box(pos,size,color,radius=0.04,ry=0){
    const h=size.map(v=>v/2),r=Math.max(.00001,Math.min(radius,...h)),inner=h.map(v=>v-r),co=Math.cos(ry),si=Math.sin(ry);
    const axes=[[0,1,2,1],[0,2,1,-1],[1,2,0,1],[1,0,2,-1],[2,0,1,1],[2,1,0,-1]];
    for(const [axis,u,v,sign] of axes){
      const values=i=>[-h[i],-inner[i],0,inner[i],h[i]];
      const U=values(u),V=values(v);
      const make=(i,j)=>{
        const p=[0,0,0];p[axis]=h[axis]*sign;p[u]=U[i];p[v]=V[j];
        const base=p.map((q,k)=>clamp(q,-inner[k],inner[k])),d=p.map((q,k)=>q-base[k]),len=Math.hypot(...d)||1,n=d.map(q=>q/len);
        const out=base.map((q,k)=>q+n[k]*r);
        return {p:[out[0]*co+out[2]*si+pos[0],out[1]+pos[1],-out[0]*si+out[2]*co+pos[2]],n:[n[0]*co+n[2]*si,n[1],-n[0]*si+n[2]*co]};
      };
      for(let i=0;i<4;i++)for(let j=0;j<4;j++){
        const points=[make(i,j),make(i+1,j),make(i+1,j+1),make(i,j+1)];
        for(const q of [0,1,2,0,2,3]) this.vertex(points[q].p,points[q].n,color);
      }
    }
    return this;
  }
  block(pos,size,color,ry=0){
    const h=size.map(v=>v/2),co=Math.cos(ry),si=Math.sin(ry);
    const pt=(x,y,z)=>[pos[0]+x*co+z*si,pos[1]+y,pos[2]-x*si+z*co];
    const faces=[[[1,0,0],[[1,-1,-1],[1,1,-1],[1,1,1],[1,-1,1]]],[[-1,0,0],[[-1,-1,1],[-1,1,1],[-1,1,-1],[-1,-1,-1]]],[[0,1,0],[[-1,1,-1],[-1,1,1],[1,1,1],[1,1,-1]]],[[0,-1,0],[[-1,-1,1],[-1,-1,-1],[1,-1,-1],[1,-1,1]]],[[0,0,1],[[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]],[[0,0,-1],[[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]]]];
    for(const [n,points] of faces)for(const i of [0,1,2,0,2,3]){const q=points[i];this.vertex(pt(q[0]*h[0],q[1]*h[1],q[2]*h[2]),[n[0]*co+n[2]*si,n[1],-n[0]*si+n[2]*co],color);}
    return this;
  }
  cylinder(pos,radius,height,color,segments=16,topRadius=radius){
    for(let i=0;i<segments;i++){
      const a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2;
      const p=(angle,r,y)=>[pos[0]+Math.cos(angle)*r,pos[1]+y,pos[2]+Math.sin(angle)*r];
      const n=[Math.cos((a+b)/2),(radius-topRadius)/height,Math.sin((a+b)/2)];const len=Math.hypot(...n);const norm=n.map(v=>v/len);
      const A=p(a,radius,-height/2),B=p(b,radius,-height/2),C=p(b,topRadius,height/2),D=p(a,topRadius,height/2);
      this.tri(A,B,C,norm,color);this.tri(A,C,D,norm,color);
      this.tri([pos[0],pos[1]+height/2,pos[2]],D,C,[0,1,0],color);
      this.tri([pos[0],pos[1]-height/2,pos[2]],B,A,[0,-1,0],color);
    }return this;
  }
  sphere(pos,radius,color,segments=12,rows=7,stretch=[1,1,1]){
    const make=(u,v)=>{
      const theta=u/segments*Math.PI*2,phi=v/rows*Math.PI,n=[Math.sin(phi)*Math.cos(theta),Math.cos(phi),Math.sin(phi)*Math.sin(theta)];
      return {p:n.map((x,i)=>pos[i]+x*radius*stretch[i]),n};
    };
    for(let u=0;u<segments;u++)for(let v=0;v<rows;v++){
      const p=[make(u,v),make(u+1,v),make(u+1,v+1),make(u,v+1)];
      for(const q of [0,1,2,0,2,3])this.vertex(p[q].p,p[q].n,color);
    }return this;
  }
  quad(pos,w,d,uv,color='#ffffff',ry=0){
    const c=Math.cos(ry),s=Math.sin(ry),points=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]];
    const uvs=[[uv[0],uv[3]],[uv[2],uv[3]],[uv[2],uv[1]],[uv[0],uv[1]]];
    for(const i of [0,2,1,0,3,2]){const [x,z]=points[i];this.vertex([pos[0]+x*c+z*s,pos[1],pos[2]-x*s+z*c],[0,1,0],color,uvs[i],1);}return this;
  }
  typed(){return new Float32Array(this.data);}
}

export { Geometry };
