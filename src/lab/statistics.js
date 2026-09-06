/** Seed-block statistics. Rotations of one seed are NOT independent samples. */
const mean = values => values.length ? values.reduce((a,b)=>a+b,0)/values.length : null;
function quantile(sorted, p) {
  if (!sorted.length) return null;
  const i=(sorted.length-1)*p, j=Math.floor(i);
  return sorted[j]+(sorted[Math.min(j+1,sorted.length-1)]-sorted[j])*(i-j);
}
function seedAt(base, index) {
  let x=(base+Math.imul(index+1,0x9e3779b9))>>>0;
  x=Math.imul(x^(x>>>16),0x85ebca6b);x=Math.imul(x^(x>>>13),0xc2b2ae35);
  return ((x^(x>>>16))>>>0)||1;
}
function randomSequence(seed) {
  let x=seed>>>0||1;
  return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};
}
/** Percentile bootstrap of whole seed blocks (600 fixed resamples).
 * Approximate uncertainty over these synthetic seeds, not human populations. */
function estimate(values, seed=173) {
  if (values.some(x=>!Number.isFinite(x))) throw Error('Statistique non finie.');
  if (!values.length) return {mean:null,low:null,high:null,blocks:0};
  const avg=mean(values);
  if (values.length<2) return {mean:avg,low:null,high:null,blocks:values.length};
  // No O(N*B) work for constant arrays (also makes identical A/B exactly zero).
  if(values.every(x=>x===values[0]))return {mean:avg,low:avg,high:avg,blocks:values.length};
  const rng=randomSequence(seed),samples=[];
  for(let b=0;b<600;b++){let sum=0;for(let i=0;i<values.length;i++)sum+=values[Math.floor(rng()*values.length)];samples.push(sum/values.length);}
  samples.sort((a,b)=>a-b);
  return {mean:avg,low:quantile(samples,.025),high:quantile(samples,.975),blocks:values.length};
}
export { mean, quantile, seedAt, randomSequence, estimate };
