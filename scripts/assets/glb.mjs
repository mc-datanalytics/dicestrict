/** Deterministic original mesh -> GLB 2.0 / PNG. Offline, Node 22, no dependencies. */
import { deflateSync } from 'node:zlib';
import { DESCRIPTORS, surfaceTile } from '../../src/scene/marina/surfaces.js';
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc(buf){let c=0xffffffff;for(const b of buf)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function png({width,height,data}) {
  const chunk=(name,bytes)=>{const type=Buffer.from(name),len=Buffer.alloc(4),sum=Buffer.alloc(4);len.writeUInt32BE(bytes.length);sum.writeUInt32BE(crc(Buffer.concat([type,bytes])));return Buffer.concat([len,type,bytes,sum]);};
  const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header.set([8,6,0,0,0],8);
  const raw=Buffer.alloc(height*(width*4+1));for(let y=0;y<height;y++)raw.set(data.subarray(y*width*4,(y+1)*width*4),y*(width*4+1)+1);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
const linear = x => x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
function encodeGLB(mesh) {
  const json={asset:{version:'2.0',generator:'DICESTRICT miniature city kit / Node 22',copyright:'2026 M&G Group. Original project assets; all rights reserved.'},scene:0,scenes:[{nodes:[0]}],nodes:[{name:mesh.name,mesh:0}],meshes:[{name:mesh.name,primitives:[]}],accessors:[],bufferViews:[],buffers:[{byteLength:0}],materials:[],images:[],textures:[],samplers:[{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497}]};
  const chunks=[];let length=0;
  function bufferView(bytes,target) {
    const buffer=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    const id=json.bufferViews.length,view={buffer:0,byteOffset:length,byteLength:buffer.length};if(target)view.target=target;
    json.bufferViews.push(view);chunks.push(buffer);length+=buffer.length;
    const pad=(4-length%4)%4;if(pad){chunks.push(Buffer.alloc(pad));length+=pad;}return id;
  }
  function accessor(bytes,type,count,componentType=5126,min,max,target=34962) {
    const id=json.accessors.length,a={bufferView:bufferView(bytes,target),componentType,count,type};if(min)a.min=min;if(max)a.max=max;
    json.accessors.push(a);return id;
  }
  const n=mesh.data.length/12,positions=new Float32Array(n*3),normals=new Float32Array(n*3),colors=new Float32Array(n*3),uvs=new Float32Array(n*2),lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<n;i++) {
    for(let k=0;k<3;k++){const p=mesh.data[i*12+k];positions[i*3+k]=p;normals[i*3+k]=mesh.data[i*12+k+3];colors[i*3+k]=linear(mesh.data[i*12+k+6]);lo[k]=Math.min(lo[k],p);hi[k]=Math.max(hi[k],p);}
    uvs.set(mesh.data.subarray(i*12+9,i*12+11),i*2);
  }
  const attributes={POSITION:accessor(positions,'VEC3',n,5126,lo,hi),NORMAL:accessor(normals,'VEC3',n),COLOR_0:accessor(colors,'VEC3',n),TEXCOORD_0:accessor(uvs,'VEC2',n)};
  const groups=new Map();for(let i=0;i<mesh.indices.length;i+=3){const ids=Array.from(mesh.indices.subarray(i,i+3)),mat=mesh.data[ids[0]*12+11];if(ids.some(id=>mesh.data[id*12+11]!==mat))throw Error('A triangle mixes surface IDs.');if(!groups.has(mat))groups.set(mat,[]);groups.get(mat).push(...ids);}
  for(const [id,indices] of groups) {
    const d=DESCRIPTORS[id]??{name:`Surface ${id}`,roughness:.8,metallic:0},material={name:d.name,pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:d.metallic,roughnessFactor:d.roughness},doubleSided:id===13||id===14};
    if(d.tile!==undefined) {
      const image=json.images.length;json.images.push({name:d.name,bufferView:bufferView(png(surfaceTile(d.tile))),mimeType:'image/png'});
      material.pbrMetallicRoughness.baseColorTexture={index:json.textures.length};json.textures.push({source:image,sampler:0});
    }
    if(d.emissive)material.emissiveFactor=d.emissive;
    const mat=json.materials.length;json.materials.push(material);
    const data=n>65535?new Uint32Array(indices):new Uint16Array(indices);
    json.meshes[0].primitives.push({attributes,indices:accessor(data,'SCALAR',data.length,n>65535?5125:5123,undefined,undefined,34963),material:mat,mode:4});
  }
  if(json.images.length===0){delete json.images;delete json.textures;delete json.samplers;}
  json.buffers[0].byteLength=length;
  let text=Buffer.from(JSON.stringify(json));text=Buffer.concat([text,Buffer.alloc((4-text.length%4)%4,32)]);
  const bin=Buffer.concat(chunks),header=Buffer.alloc(12),jhead=Buffer.alloc(8),bhead=Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+text.length+8+bin.length,8);
  jhead.writeUInt32LE(text.length);jhead.writeUInt32LE(0x4e4f534a,4);bhead.writeUInt32LE(bin.length);bhead.writeUInt32LE(0x004e4942,4);
  return {bytes:Buffer.concat([header,jhead,text,bhead,bin]),min:lo,max:hi};
}

export { encodeGLB, png };
