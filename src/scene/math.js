// Small column-major matrix helpers. Kept independent for numerical unit tests.
const identity = () => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
function multiply(a,b) {
  const out = new Float32Array(16);
  for(let c=0;c<4;c++) for(let r=0;r<4;r++) for(let k=0;k<4;k++) out[c*4+r] += a[k*4+r]*b[c*4+k];
  return out;
}
function ortho(l,r,b,t,n,f) {
  return new Float32Array([2/(r-l),0,0,0, 0,2/(t-b),0,0, 0,0,-2/(f-n),0, -(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1]);
}
const normal = a => {const n=Math.hypot(...a)||1;return a.map(x=>x/n);};
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot = (a,b) => a.reduce((s,v,i)=>s+v*b[i],0);
function lookAt(eye,target,up=[0,1,0]) {
  const z=normal(eye.map((v,i)=>v-target[i])),x=normal(cross(up,z)),y=cross(z,x);
  return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
}
function model(x=0,y=0,z=0,rx=0,ry=0,rz=0,scale=1) {
  const cx=Math.cos(rx),sx=Math.sin(rx),cy=Math.cos(ry),sy=Math.sin(ry),cz=Math.cos(rz),sz=Math.sin(rz);
  const X=new Float32Array([1,0,0,0,0,cx,sx,0,0,-sx,cx,0,0,0,0,1]);
  const Y=new Float32Array([cy,0,-sy,0,0,1,0,0,sy,0,cy,0,0,0,0,1]);
  const Z=new Float32Array([cz,sz,0,0,-sz,cz,0,0,0,0,1,0,0,0,0,1]);
  const m=multiply(multiply(Z,Y),X); for(let i=0;i<12;i++)m[i]*=scale;
  m[12]=x;m[13]=y;m[14]=z;return m;
}
function transform(m,p) {
  const v=[p[0],p[1],p[2],p[3]??1],o=[0,0,0,0];
  for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[r]+=m[k*4+r]*v[k]; return o;
}
function inverse(m) {
  // Gauss-Jordan with pivoting; used only on pointer events, not per vertex.
  const a=Array.from({length:4},(_,r)=>[...Array.from({length:4},(_,c)=>m[c*4+r]),...Array.from({length:4},(_,c)=>Number(c===r))]);
  for(let col=0;col<4;col++){
    let pivot=col;for(let r=col+1;r<4;r++)if(Math.abs(a[r][col])>Math.abs(a[pivot][col]))pivot=r;
    if(Math.abs(a[pivot][col])<1e-10)throw Error('Singular matrix');
    [a[col],a[pivot]]=[a[pivot],a[col]];const div=a[col][col];a[col]=a[col].map(v=>v/div);
    for(let r=0;r<4;r++)if(r!==col){const k=a[r][col];a[r]=a[r].map((v,c)=>v-k*a[col][c]);}
  }
  return new Float32Array(Array.from({length:16},(_,i)=>a[i%4][4+Math.floor(i/4)]));
}
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);

export { identity,multiply,ortho,lookAt,model,transform,inverse,lerp,smooth };
