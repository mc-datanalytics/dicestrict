#!/usr/bin/env node
import { readFile, stat } from 'node:fs/promises';
import { verifyPlaytest } from '../src/game/playtest.js';
try {
 const [file,...extra]=process.argv.slice(2);
 if(!file||extra.length)throw Error('Usage: npm run playtest:verify -- essai.json');
 if((await stat(file)).size>8_000_000)throw Error('Trace trop volumineuse.');
 const {summary}=verifyPlaytest(JSON.parse(await readFile(file,'utf8')));
 console.log(JSON.stringify(summary,null,2));
 console.log('Rejeu valide, mais provenance humaine non certifiée. Aucun droit à une récompense.');
} catch(e) {console.error(e.message);process.exitCode=1;}
