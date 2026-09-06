import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
const SOURCES=['src/game/opening.js','src/game/negotiator.js','src/game/board.js','src/game/bots.js','src/game/casino.js','src/game/deals.js','src/game/engine.js','src/lab/core.js','src/lab/statistics.js'];
async function sourceMeta(root){
  const files={};
  for(const path of SOURCES)files[path]=createHash('sha256').update(await readFile(new URL(path,root))).digest('hex');
  return {sha256:createHash('sha256').update(JSON.stringify(files)).digest('hex'),scope:'engine-policies-lab-v2',files};
}
export { sourceMeta };
