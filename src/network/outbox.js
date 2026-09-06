/** Bounded FIFO for reliable ordered DataChannels. Never silently drop a command
 * on backpressure. OperationError is retryable; fatal errors pause the session.
 * See MDN RTCDataChannel.bufferedAmount / bufferedamountlow. */
const HIGH_WATER = 128000, LOW_WATER = 64000, MAX_QUEUED_BYTES = 262144, MAX_QUEUED_MESSAGES = 256;
class Outbox {
  constructor(channel, onFailure) {
    this.channel=channel;this.onFailure=onFailure;this.queue=[];this.bytes=0;this.closed=false;
    channel.bufferedAmountLowThreshold=LOW_WATER;
    channel.onbufferedamountlow=()=>this.flush();
  }
  enqueue(raw) {
    if(this.closed||this.channel.readyState!=='open')return false;
    const bytes=new TextEncoder().encode(raw).byteLength;
    if(this.bytes+bytes>MAX_QUEUED_BYTES||this.queue.length>=MAX_QUEUED_MESSAGES){
      this.abort('Le réseau est saturé. La partie est suspendue pour éviter une désynchronisation.');return false;
    }
    this.queue.push({raw,bytes});this.bytes+=bytes;this.flush();return !this.closed;
  }
  flush() {
    if(this.closed||this.channel.readyState!=='open')return;
    while(this.queue.length&&this.channel.bufferedAmount<HIGH_WATER){
      const next=this.queue[0];
      try{this.channel.send(next.raw);}catch(error){
        // The heartbeat also retries: some browsers do not emit a low-buffer
        // event after OperationError when bufferedAmount is already small.
        if(error?.name==='OperationError')return;
        this.abort('Impossible de transmettre les commandes. La partie est suspendue.');return;
      }
      this.queue.shift();this.bytes-=next.bytes;
    }
  }
  abort(message){this.close();this.onFailure(message);}
  close(){this.closed=true;this.queue=[];this.bytes=0;this.channel.onbufferedamountlow=null;}
}
export { Outbox, HIGH_WATER, LOW_WATER, MAX_QUEUED_BYTES, MAX_QUEUED_MESSAGES };
