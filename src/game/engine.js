import { validOpening, openingBonus, roundOrder } from './opening.js';
import { createCasino, validateCasinoAction, applyCasino, assertCasino } from './casino.js';
import { BOARD, EVENTS, RULES } from "./board.js";
import { DEAL_TYPES, validateDealAction, applyDeal, pruneDeals, assertDeals } from "./deals.js";

/** @typedef {{id:string,name:string,bot:boolean,cash:number,position:number,bankrupt:boolean}} Player */
/** @typedef {{owner:string|null,level:number,mortgaged:boolean}} Property */
/** @typedef {{version:number,id:string,rng:number,revision:number,turn:number,round:number,maxRounds:number,phase:string,players:Player[],properties:Property[],dice:number[],event:number|null,pending:number|null,log:{text:string,kind:string}[],winners:string[]}} GameState */
/** @typedef {{type:string,tile?:number}} Action */

class RuleError extends Error { constructor(message) { super(message); this.name = 'RuleError'; } }
const demand = (ok, msg) => { if (!ok) throw new RuleError(msg); };
const integer = (n, min, max) => Number.isSafeInteger(n) && n >= min && n <= max;
function cleanName(name) { return String(name ?? 'Joueur').replace(/[\x00-\x1f\x7f<>]/g, '').trim().slice(0, 20) || 'Joueur'; }
function randomSeed() { return crypto.getRandomValues(new Uint32Array(1))[0] || 1; }

/** Deterministic casual-only PRNG; NEVER a security boundary or hidden dice source. */
function nextRandom(s, limit) {
  // Rejection sampling avoids modulo bias. xorshift32 has nonzero state.
  let x; const bound = Math.floor(0xffffffff / limit) * limit;
  do { x = s.rng >>> 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; s.rng = x >>> 0; } while (s.rng > bound);
  return (s.rng - 1) % limit;
}
function log(s, text, kind = 'info') { s.log.unshift({ text, kind }); s.log = s.log.slice(0, 30); }

/** @returns {GameState} */
function createGame(seats, seed = 1, options = {}) {
  demand(Array.isArray(seats) && seats.length >= 2 && seats.length <= 4, 'Il faut 2 à 4 joueurs.');
  demand(new Set(seats.map(p => p.id)).size === seats.length, 'Identifiants en double.');
  demand(seats.every(p => typeof p.id === 'string' && /^[\w-]{1,80}$/.test(p.id)), 'Identifiant invalide.');
  demand(integer(seed, 1, 0xffffffff), 'Graine invalide.');
  const rounds = options.rounds ?? RULES.rounds;
  demand(integer(rounds, 4, 30), 'Durée invalide.');
  demand(!Object.hasOwn(options, 'mobility'), 'Ancienne option de déplacement incompatible. Démarrez une nouvelle partie.');
  const finishOnBankruptcy = options.finishOnBankruptcy ?? false;
  demand(typeof finishOnBankruptcy === 'boolean', 'Règles de partie invalides.');
  const casino = options.casino ?? false; demand(typeof casino === 'boolean', 'Règle casino invalide.');
  demand(typeof (options.id ?? `local-${seed}`) === 'string' && (options.id ?? `local-${seed}`).length > 0 && (options.id ?? `local-${seed}`).length <= 100, 'Identifiant de partie invalide.');
  const opening = options.opening ?? 'classic'; demand(validOpening(opening), 'Ouverture invalide.');
  return {
    opening, casino: createCasino(seed, casino),
    version: RULES.version, id: String(options.id ?? `local-${seed}`).slice(0, 100), rng: seed >>> 0,
    revision: 0, turn: 0, round: 1, maxRounds: rounds, phase: 'roll',
    finishOnBankruptcy, turnSerial: 0, deals: [], nextDealId: 1, endReason: null,
    players: seats.map((p, seat) => ({ id: p.id, name: cleanName(p.name), bot: Boolean(p.bot), cash: RULES.startCash + openingBonus(opening, seat), position: 0, bankrupt: false, dealBudgetTurn: -1, dealsSent: 0 })),
    properties: BOARD.map(() => ({ owner: null, level: 0, mortgaged: false })),
    dice: [1, 1], event: null, pending: null, auction: null, log: [{ text: 'Aurora vous ouvre ses portes. À vous de bâtir la suite.', kind: 'info' }], winners: [],
  };
}
const currentPlayer = s => s.players[s.phase === 'auction' ? s.auction.bidder : s.turn];
const ownsGroup = (s, owner, group) => { const lots = BOARD.filter(t => t.kind === 'lot' && t.group === group); return lots.length > 0 && lots.every(t => s.properties[t.id].owner === owner && !s.properties[t.id].mortgaged); };
const upgradeCost = tile => Math.ceil(BOARD[tile].price * 0.5);
function rentFor(s, tile) {
  const t = BOARD[tile], p = s.properties[tile];
  if (t.kind !== 'lot' || !p.owner || p.mortgaged) return 0;
  return t.rent * (1 + 2 * p.level) * (ownsGroup(s, p.owner, t.group) ? 2 : 1);
}
function netWorth(s, playerId) {
  const player = s.players.find(p => p.id === playerId);
  if (!player || player.bankrupt) return 0;
  return player.cash + s.properties.reduce((sum, p, i) => p.owner === playerId
    ? sum + BOARD[i].price + upgradeCost(i) * p.level - (p.mortgaged ? Math.floor(BOARD[i].price * 0.5) : 0) : sum, 0);
}
function ranking(s) { return [...s.players].sort((a, b) => netWorth(s, b.id) - netWorth(s, a.id)); }
function endGame(s) {
  s.phase = 'finished'; s.pending = null; s.auction = null;
  s.endReason ??= 'round-cap';
  const active = s.players.filter(p => !p.bankrupt); const top = Math.max(...active.map(p => netWorth(s, p.id)));
  s.winners = active.filter(p => netWorth(s, p.id) === top).map(p => p.id);
  log(s, `${s.winners.map(id => s.players.find(p => p.id === id).name).join(' & ')} remporte${s.winners.length > 1 ? 'nt' : ''} la partie !`, 'win');
}
function nextTurn(s) {
  if (s.players.filter(p => !p.bankrupt).length < 2) { s.endReason = 'last-solvent'; return endGame(s); }
  s.turnSerial++;
  const order = roundOrder(s), remaining = order.slice(order.indexOf(s.turn) + 1);
  let idx = remaining.find(i => !s.players[i].bankrupt);
  if (idx === undefined) {
    if (s.round === s.maxRounds) return endGame(s);
    s.round++;
    idx = roundOrder(s).find(i => !s.players[i].bankrupt);
  }
  s.turn = idx; s.event = null; s.pending = null; s.auction = null;
  s.phase = 'roll';
}
/** Debt is automatically liquidated, highest level first; no negative cash or stalled turns. */
function charge(s, debtor, amount, recipient = null) {
  while (debtor.cash < amount) {
    const upgrade = s.properties.map((p,i) => ({...p,i})).filter(p => p.owner === debtor.id && p.level > 0).sort((a,b) => b.level-a.level || a.i-b.i)[0];
    if (upgrade) { s.properties[upgrade.i].level--; debtor.cash += Math.floor(upgradeCost(upgrade.i) / 2); log(s, `${debtor.name} revend un niveau de ${BOARD[upgrade.i].name}.`, 'expense'); continue; }
    const lot = s.properties.findIndex(p => p.owner === debtor.id && !p.mortgaged);
    if (lot >= 0) { s.properties[lot].mortgaged = true; debtor.cash += Math.floor(BOARD[lot].price / 2); log(s, `${debtor.name} hypothèque ${BOARD[lot].name}.`, 'expense'); continue; }
    break;
  }
  const paid = Math.min(amount, debtor.cash); debtor.cash -= paid;
  if (recipient) recipient.cash += paid;
  if (paid < amount) {
    debtor.bankrupt = true;
    // Original fast-play rule: insolvent assets return to the city, debt is written off.
    s.properties.forEach(p => { if (p.owner === debtor.id) { p.owner = null; p.level = 0; p.mortgaged = false; } });
    log(s, `${debtor.name} quitte la course. Ses biens redeviennent disponibles.`, 'expense');
  }
}
/** A passed bidder leaves this auction. Only the winner pays; no credit is created. */
function advanceAuction(s) {
  const a = s.auction;
  const eligible = s.players.map((p,i) => ({p,i})).filter(({p}) => !p.bankrupt && !a.passed.includes(p.id) && p.id !== a.highBidder);
  if (eligible.length === 0) {
    if (a.highBidder) {
      const winner = s.players.find(p => p.id === a.highBidder);
      winner.cash -= a.highBid; s.properties[a.tile].owner = winner.id;
      log(s, `${winner.name} remporte ${BOARD[a.tile].name} pour ${a.highBid}.`, 'buy');
    } else log(s, `Aucune offre : ${BOARD[a.tile].name} reste disponible.`);
    s.auction = null; s.phase = 'end'; return;
  }
  let i = a.bidder;
  do { i = (i + 1) % s.players.length; } while (!eligible.some(e => e.i === i));
  a.bidder = i;
}
function resolveLanding(s, p) {
    const steps = s.dice[0] + s.dice[1], raw = p.position + steps;
    if (raw >= BOARD.length) { p.cash += RULES.lapIncome; log(s, `${p.name} passe le départ : +${RULES.lapIncome}.`, 'income'); }
    p.position = raw % BOARD.length; s.pending = p.position; s.phase = 'end'; s.event = null;
    const tile = BOARD[p.position], prop = s.properties[p.position];
    log(s, `${p.name} avance de ${steps} et arrive sur ${tile.name}.`, 'move');
    if (tile.kind === 'lot') {
      if (!prop.owner) s.phase = 'buy';
      else if (prop.owner !== p.id && !prop.mortgaged) {
        const rent = rentFor(s, tile.id), owner = s.players.find(o => o.id === prop.owner);
        charge(s,p,rent,owner); log(s, `${p.name} verse ${rent} de loyer à ${owner.name}.`, 'expense');
      }
    } else if (tile.kind === 'event') {
      s.event = nextRandom(s, EVENTS.length); const card = EVENTS[s.event];
      if (card.amount >= 0) p.cash += card.amount; else charge(s,p,-card.amount);
      log(s, `${card.title} : ${card.amount > 0 ? '+' : ''}${card.amount} pour ${p.name}.`, card.amount > 0 ? 'income' : 'expense');
    } else if (['tax','audit'].includes(tile.kind)) { const cost = tile.kind === 'tax' ? 90 : 80; charge(s,p,cost); log(s, `${p.name} verse ${cost} à la ville.`, 'expense'); }
    else if (['park','grant','transit'].includes(tile.kind)) { const cash = ({park:70,grant:100,transit:60})[tile.kind]; p.cash += cash; log(s, `${p.name} reçoit ${cash} de la ville.`, 'income'); }
    if (p.bankrupt) { if (s.finishOnBankruptcy) { s.endReason = 'first-bankruptcy'; endGame(s); } else nextTurn(s); }
}

function validateAction(a) {
  demand(a && typeof a === 'object' && !Array.isArray(a), 'Action invalide.');
  if (DEAL_TYPES.includes(a.type)) return validateDealAction(a);
  if (a.type === 'CASINO_BET') return validateCasinoAction(a);
  demand(['ROLL','BUY','SKIP','END','UPGRADE','SELL_LEVEL','MORTGAGE','REDEEM','BID','PASS'].includes(a.type), 'Action inconnue.');
  demand(Object.keys(a).every(k => ['type', 'tile'].includes(k)), 'Champs non autorisés.');
  if (['UPGRADE','SELL_LEVEL','MORTGAGE','REDEEM'].includes(a.type)) demand(integer(a.tile,0,BOARD.length-1) && BOARD[a.tile].kind === 'lot', 'Terrain invalide.');
  else demand(a.tile === undefined, 'Cette action ne prend pas de terrain.');
  return a;
}
/** Pure reducer. The transport must authenticate actorId, NOT accept a packet's self-claimed ID. */
function applyAction(state, actorId, action) {
  validateAction(action);
  demand(state.phase !== 'finished', 'La partie est terminée.');
  demand(action.type === 'CASINO_BET' || DEAL_TYPES.includes(action.type) || currentPlayer(state).id === actorId, 'Ce n’est pas votre tour.');
  const s = structuredClone(state), p = currentPlayer(s), a = action;
  if (a.type === 'CASINO_BET') {
    applyCasino(s, actorId, a);
  } else if (DEAL_TYPES.includes(a.type)) {
    applyDeal(s, actorId, a);
  } else if (a.type === 'BID' || a.type === 'PASS') {
    demand(s.phase === 'auction' && s.auction, 'Aucune enchère en cours.');
    const auction = s.auction;
    if (a.type === 'BID') {
      const amount = auction.highBid + RULES.auctionStep;
      demand(p.cash >= amount, 'Capital insuffisant pour cette enchère.');
      auction.highBid = amount; auction.highBidder = p.id;
      log(s, `${p.name} propose ${amount} pour ${BOARD[auction.tile].name}.`, 'info');
    } else { auction.passed.push(p.id); log(s, `${p.name} quitte l’enchère.`); }
    advanceAuction(s);
  } else if (a.type === 'ROLL') {
    demand(s.phase === 'roll', 'Les dés ont déjà été lancés.');
    s.dice = [1 + nextRandom(s, 6), 1 + nextRandom(s, 6)];
    log(s, `${p.name} lance ${s.dice.join(' + ')}.`, 'move');
    resolveLanding(s, p);
  } else if (a.type === 'BUY') {
    demand(s.phase === 'buy' && s.pending === p.position, 'Aucun terrain à acheter.');
    const tile = BOARD[p.position], prop = s.properties[p.position];
    demand(tile.kind === 'lot' && prop.owner === null, 'Terrain indisponible.');
    demand(p.cash >= tile.price, 'Capital insuffisant.');
    p.cash -= tile.price; prop.owner = p.id; s.phase = 'end';
    log(s, `${p.name} acquiert ${tile.name} pour ${tile.price}.`, 'buy');
    if (ownsGroup(s,p.id,tile.group)) log(s, `Quartier ${tile.group + 1} complet ! Les loyers de ${p.name} doublent.`, 'win');
  } else if (a.type === 'SKIP') {
    demand(s.phase === 'buy', 'Aucun achat à passer.'); s.phase = 'auction';
    s.auction = { tile: p.position, bidder: s.turn, highBid: 0, highBidder: null, passed: [] };
    log(s, `${BOARD[p.position].name} est mis aux enchères. Première offre : ${RULES.auctionStep}.`);
  } else if (a.type === 'END') {
    demand(s.phase === 'end', 'Terminez votre action avant de passer.'); nextTurn(s);
  } else {
    demand(['roll','end'].includes(s.phase), 'Terminez votre achat d’abord.');
    const tile = BOARD[a.tile], prop = s.properties[a.tile];
    demand(prop.owner === p.id, 'Ce terrain ne vous appartient pas.');
    const siblings = BOARD.filter(t => t.kind === 'lot' && t.group === tile.group).map(t => s.properties[t.id]);
    if (a.type === 'UPGRADE') {
      demand(ownsGroup(s,p.id,tile.group), 'Réunissez les deux terrains du quartier, sans hypothèque.');
      demand(prop.level < RULES.maxLevel, 'Niveau maximum atteint.');
      demand(prop.level === Math.min(...siblings.map(x => x.level)), 'Développez le quartier de façon équilibrée.');
      const cost = upgradeCost(a.tile); demand(p.cash >= cost, 'Capital insuffisant.');
      p.cash -= cost; prop.level++; log(s, `${p.name} développe ${tile.name} au niveau ${prop.level}.`, 'buy');
    } else if (a.type === 'SELL_LEVEL') {
      demand(prop.level > 0 && prop.level === Math.max(...siblings.map(x => x.level)), 'Revendez d’abord un bâtiment de niveau supérieur.');
      prop.level--; p.cash += Math.floor(upgradeCost(a.tile)/2); log(s, `${p.name} revend un niveau de ${tile.name}.`, 'income');
    } else if (a.type === 'MORTGAGE') {
      demand(!prop.mortgaged && siblings.every(x => x.level === 0), 'Revendez les bâtiments du quartier avant d’hypothéquer.');
      prop.mortgaged = true; p.cash += Math.floor(tile.price/2); log(s, `${p.name} hypothèque ${tile.name}.`, 'income');
    } else if (a.type === 'REDEEM') {
      demand(prop.mortgaged, 'Ce terrain n’est pas hypothéqué.');
      const cost = Math.ceil(tile.price * 0.55); demand(p.cash >= cost, 'Capital insuffisant.');
      prop.mortgaged = false; p.cash -= cost; log(s, `${p.name} lève l’hypothèque de ${tile.name}.`, 'expense');
    }
  }
  s.revision++;
  if (s.phase !== 'finished' && s.players.filter(x => !x.bankrupt).length < 2) { s.endReason = 'last-solvent'; endGame(s); }
  pruneDeals(s);
  assertState(s); return s;
}
/** Defensive boundary for saved games / peer snapshots. Casual snapshots are still untrusted. */
function assertState(s) {
  demand(s && typeof s === 'object' && s.version === RULES.version, 'Version de partie incompatible.');
  demand(validOpening(s.opening), 'Ouverture de partie incompatible.');
  demand(typeof s.id === 'string' && s.id.length > 0 && s.id.length <= 100, 'Identifiant invalide.');
  demand(integer(s.rng,1,0xffffffff) && integer(s.revision,0,100000), 'État invalide.');
  demand(Array.isArray(s.players) && s.players.length >= 2 && s.players.length <= 4, 'Joueurs invalides.');
  const ids = new Set();
  for (const p of s.players) {
    demand(p && typeof p.id === 'string' && /^[\w-]{1,80}$/.test(p.id) && !ids.has(p.id), 'Identifiant joueur invalide.'); ids.add(p.id);
    demand(typeof p.name === 'string' && p.name.length > 0 && p.name.length <= 20 && p.name === cleanName(p.name), 'Nom invalide.');
    demand(integer(p.cash,0,10000000) && integer(p.position,0,27) && typeof p.bot === 'boolean' && typeof p.bankrupt === 'boolean', 'Joueur invalide.');
  }
  demand(integer(s.turn,0,s.players.length-1) && integer(s.round,1,30) && integer(s.maxRounds,4,30) && s.round <= s.maxRounds, 'Tour invalide.');
  demand(['roll','buy','auction','end','finished'].includes(s.phase), 'Phase invalide.');
  demand(s.phase === 'auction' || s.auction === null, 'Enchère hors phase.');
  if (s.phase === 'auction') {
    const a = s.auction;
    demand(a && integer(a.tile,0,BOARD.length-1) && BOARD[a.tile].kind === 'lot' && integer(a.bidder,0,s.players.length-1), 'Enchère invalide.');
    demand(integer(a.highBid,0,10000000) && a.highBid % RULES.auctionStep === 0, 'Offre invalide.');
    demand(Array.isArray(a.passed) && a.passed.length <= s.players.length && new Set(a.passed).size === a.passed.length && a.passed.every(id => ids.has(id)), 'Participants invalides.');
    demand((a.highBid === 0 && a.highBidder === null) || (a.highBid > 0 && ids.has(a.highBidder) && !a.passed.includes(a.highBidder)), 'Meneur invalide.');
    demand(!s.players[a.bidder].bankrupt && !a.passed.includes(s.players[a.bidder].id) && a.highBidder !== s.players[a.bidder].id, 'Enchérisseur invalide.');
    demand(!a.highBidder || s.players.some(p => p.id === a.highBidder && !p.bankrupt && p.cash >= a.highBid), 'Offre insolvable.');
    demand(a.tile === s.pending && s.players[s.turn].position === a.tile, 'Terrain aux enchères incohérent.');
  }
  demand(s.phase === 'finished' || !currentPlayer(s).bankrupt, 'Joueur éliminé actif.');
  demand(Array.isArray(s.properties) && s.properties.length === BOARD.length, 'Propriétés invalides.');
  s.properties.forEach((p,i) => {
    demand(p && (p.owner === null || ids.has(p.owner)) && integer(p.level,0,3) && typeof p.mortgaged === 'boolean', 'Propriété invalide.');
    demand((BOARD[i].kind === 'lot' && p.owner !== null) || (p.owner === null && p.level === 0 && !p.mortgaged), 'Propriété incohérente.');
    demand(!p.mortgaged || p.level === 0, 'Bâtiment hypothéqué.');
    demand(p.owner === null || !s.players.find(x => x.id === p.owner).bankrupt, 'Bien détenu par un joueur éliminé.');
  });
  if (s.auction) demand(s.properties[s.auction.tile].owner === null, 'Terrain déjà vendu.');
  demand(Array.isArray(s.dice) && s.dice.length === 2 && s.dice.every(x => integer(x,1,6)), 'Dés invalides.');
  demand(s.pending === null || integer(s.pending,0,27), 'Case invalide.');
  demand(s.event === null || integer(s.event,0,EVENTS.length-1), 'Carte invalide.');
  demand(Array.isArray(s.log) && s.log.length <= 30 && s.log.every(x => x && typeof x.text === 'string' && x.text.length <= 300 && ['info','win','expense','income','move','buy'].includes(x.kind)), 'Journal invalide.');
  demand(Array.isArray(s.winners) && s.winners.length <= 4 && new Set(s.winners).size === s.winners.length && s.winners.every(x => ids.has(x) && !s.players.find(p => p.id === x).bankrupt), 'Résultat invalide.');
  demand(s.phase === 'finished' ? s.winners.length > 0 : s.winners.length === 0, 'Résultat hors phase.');
  if (s.phase === 'buy') demand(s.pending === currentPlayer(s).position && BOARD[s.pending].kind === 'lot' && s.properties[s.pending].owner === null, 'Achat incohérent.');
  demand(!Object.hasOwn(s, 'mobility') && s.players.every(p => !Object.hasOwn(p, 'mobilityTokens')), 'Ancien état de déplacement incompatible.');
  demand(typeof s.finishOnBankruptcy === 'boolean', 'Règles invalides.');
  demand(s.endReason === null || ['first-bankruptcy','round-cap','last-solvent'].includes(s.endReason), 'Motif de fin invalide.');
  demand(s.phase === 'finished' ? s.endReason !== null : s.endReason === null, 'Motif de fin hors phase.');
  assertDeals(s);
  assertCasino(s);
  return s;
}
/** FNV-1a is ONLY an accidental-desync checksum; it is not an anti-cheat signature. */
function fingerprint(s) {
  let h = 2166136261; const str = JSON.stringify(s);
  for (let i=0;i<str.length;i++) { h ^= str.charCodeAt(i); h = Math.imul(h,16777619); }
  return (h>>>0).toString(16).padStart(8,'0');
}

export { RuleError,cleanName,randomSeed,createGame,currentPlayer,ownsGroup,upgradeCost,rentFor,netWorth,ranking,validateAction,applyAction,assertState,fingerprint };
