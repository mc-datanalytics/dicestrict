import { experiment, makeReplay } from './core.js';
import { SOURCE_META } from './source-meta.js';
let running=false;
self.onmessage=async({data})=>{
  if(running)return;
  running=true;
  try{
    if(data?.type==='run'){
      const run=experiment(data.config);let step,last=0;
      do{
        step=run.next();
        if(!step.done&&performance.now()-last>100){self.postMessage({type:'progress',...step.value});last=performance.now();await new Promise(r=>setTimeout(r,0));}
      }while(!step.done);
      self.postMessage({type:'done',report:{...step.value,source:SOURCE_META}});
    }else if(data?.type==='replay')self.postMessage({type:'replay',replay:makeReplay(data.config,data.side,data.seedIndex,data.rotation)});
    else throw Error('Message de laboratoire inconnu.');
  }catch(e){self.postMessage({type:'error',message:String(e.message)});}
  finally{running=false;}
};
