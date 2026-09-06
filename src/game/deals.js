import { BOARD } from './board.js';

// Public casual offers, not secret contracts: all peers receive the same state.
// No escrow: ownership, development and balances are checked again at acceptance.
const DEAL_TYPES = Object.freeze(['OFFER_DEAL', 'ACCEPT_DEAL', 'DECLINE_DEAL', 'CANCEL_DEAL']);
const ok = (condition, message) => { if (!condition) throw Error(message); };
const int = (n, lo, hi) => Number.isSafeInteger(n) && n >= lo && n <= hi;
const tradingOpen = s => ['roll', 'end'].includes(s.phase);
function tradeable(s, tile, owner) {
  if (!int(tile, 0, BOARD.length - 1) || BOARD[tile].kind !== 'lot') return false;
  const prop = s.properties[tile];
  return prop.owner === owner && !prop.mortgaged && BOARD.every(t => t.kind !== 'lot' || t.group !== BOARD[tile].group || s.properties[t.id].level === 0);
}
function validateDealAction(a) {
  ok(a && DEAL_TYPES.includes(a.type), 'Négociation inconnue.');
  if (a.type !== 'OFFER_DEAL') {
    ok(Object.keys(a).every(k => ['type', 'dealId'].includes(k)) && int(a.dealId, 1, 100000), 'Identifiant d’offre invalide.');
    return a;
  }
  ok(Object.keys(a).every(k => ['type', 'to', 'giveCash', 'takeCash', 'giveTiles', 'takeTiles', 'counterOf'].includes(k)), 'Champs de négociation non autorisés.');
  ok(typeof a.to === 'string' && /^[\w-]{1,80}$/.test(a.to), 'Destinataire invalide.');
  ok(int(a.giveCash, 0, 10000000) && int(a.takeCash, 0, 10000000), 'Les crédits doivent être des entiers positifs ou nuls.');
  for (const key of ['giveTiles', 'takeTiles']) {
    const tiles = a[key];
    ok(Array.isArray(tiles) && tiles.length <= 8 && new Set(tiles).size === tiles.length && tiles.every(t => int(t, 0, BOARD.length - 1) && BOARD[t].kind === 'lot'), 'Liste de terrains invalide.');
  }
  ok(!a.giveTiles.some(t => a.takeTiles.includes(t)), 'Un terrain ne peut pas être échangé contre lui-même.');
  ok((a.giveCash > 0 || a.giveTiles.length > 0) && (a.takeCash > 0 || a.takeTiles.length > 0), 'Chaque joueur doit apporter quelque chose.');
  ok(a.giveTiles.length + a.takeTiles.length > 0, 'Un échange doit inclure au moins un terrain.');
  ok(a.counterOf === undefined || int(a.counterOf, 1, 100000), 'Contre-offre invalide.');
  return a;
}
function available(s, d) {
  const from = s.players.find(p => p.id === d.from), to = s.players.find(p => p.id === d.to);
  return from && to && from.id !== to.id && !from.bankrupt && !to.bankrupt && from.cash >= d.giveCash && to.cash >= d.takeCash &&
    d.giveTiles.every(t => tradeable(s, t, from.id)) && d.takeTiles.every(t => tradeable(s, t, to.id));
}
function note(s, text) { s.log.unshift({ text, kind: 'info' }); s.log = s.log.slice(0, 30); }
function pruneDeals(s) {
  s.deals = s.deals.filter(d => {
    const valid = s.phase !== 'finished' && s.turnSerial < d.expiresAtTurn && available(s, d);
    if (!valid) note(s, `Offre #${d.id} clôturée : délai écoulé ou conditions devenues indisponibles.`);
    return valid;
  });
}
function applyDeal(s, actorId, a) {
  const p = s.players.find(x => x.id === actorId);
  ok(p && !p.bankrupt, 'Joueur indisponible pour négocier.');
  if (a.type === 'OFFER_DEAL') {
    ok(tradingOpen(s), 'Attendez la fin du déplacement, de l’achat ou de l’enchère pour négocier.');
    ok(!s.deals.some(d => d.from === actorId), 'Annulez votre offre précédente avant d’en envoyer une autre.');
    ok(p.dealBudgetTurn !== s.turnSerial || p.dealsSent < 3, 'Limite de 3 propositions par tour actif.');
    let counter;
    if (a.counterOf !== undefined) {
      counter = s.deals.find(d => d.id === a.counterOf);
      ok(counter && counter.to === actorId && counter.from === a.to, 'Cette contre-offre ne vous est pas destinée.');
    }
    const d = { id: s.nextDealId, from: actorId, to: a.to, giveCash: a.giveCash, takeCash: a.takeCash,
      giveTiles: [...a.giveTiles].sort((a,b) => a-b), takeTiles: [...a.takeTiles].sort((a,b) => a-b), expiresAtTurn: s.turnSerial + s.players.length };
    ok(available(s, d), 'Biens ou crédits indisponibles. Seuls les quartiers sans bâtiments et les terrains non hypothéqués sont échangeables.');
    if (counter) s.deals = s.deals.filter(x => x.id !== counter.id);
    if (p.dealBudgetTurn !== s.turnSerial) { p.dealBudgetTurn = s.turnSerial; p.dealsSent = 0; }
    p.dealsSent++; s.nextDealId++; s.deals.push(d);
    note(s, `${p.name} propose l’offre #${d.id} à ${s.players.find(x => x.id === d.to).name}.`);
  } else {
    const d = s.deals.find(x => x.id === a.dealId);
    ok(d && s.turnSerial < d.expiresAtTurn, 'Cette offre a expiré ou a déjà été traitée.');
    ok(a.type === 'CANCEL_DEAL' ? d.from === actorId : d.to === actorId, 'Vous ne pouvez pas répondre à cette offre.');
    if (a.type === 'ACCEPT_DEAL') {
      ok(tradingOpen(s), 'La transaction attend la fin de l’action en cours.');
      ok(available(s, d), 'Les conditions de l’offre ont changé. Aucun transfert effectué.');
      const from = s.players.find(x => x.id === d.from), to = s.players.find(x => x.id === d.to);
      from.cash += d.takeCash - d.giveCash; to.cash += d.giveCash - d.takeCash;
      for (const tile of d.giveTiles) s.properties[tile].owner = to.id;
      for (const tile of d.takeTiles) s.properties[tile].owner = from.id;
      note(s, `${p.name} accepte l’offre #${d.id} : biens et crédits transférés ensemble.`);
    } else note(s, `${p.name} ${a.type === 'CANCEL_DEAL' ? 'annule' : 'refuse'} l’offre #${d.id}.`);
    s.deals = s.deals.filter(x => x.id !== d.id);
  }
}
function assertDeals(s) {
  ok(int(s.turnSerial, 0, 120) && int(s.nextDealId, 1, 100000), 'Horloge des offres invalide.');
  ok(Array.isArray(s.deals) && s.deals.length <= s.players.length, 'Trop d’offres.');
  const ids = new Set(), authors = new Set();
  for (const d of s.deals) {
    ok(d && Object.keys(d).length === 8 && Object.keys(d).every(k => ['id','from','to','giveCash','takeCash','giveTiles','takeTiles','expiresAtTurn'].includes(k)) && int(d.id, 1, s.nextDealId - 1) && !ids.has(d.id) && !authors.has(d.from), 'Offre dupliquée ou invalide.');
    validateDealAction({ type: 'OFFER_DEAL', to: d.to, giveCash: d.giveCash, takeCash: d.takeCash, giveTiles: d.giveTiles, takeTiles: d.takeTiles });
    ok(int(d.expiresAtTurn, s.turnSerial + 1, s.turnSerial + s.players.length) && available(s, d), 'Offre incohérente.');
    ids.add(d.id); authors.add(d.from);
  }
  ok(s.phase !== 'finished' || s.deals.length === 0, 'Offres après la fin.');
  for (const p of s.players) ok(int(p.dealBudgetTurn, -1, s.turnSerial) && int(p.dealsSent, 0, 3), 'Quota d’offres invalide.');
}
export { DEAL_TYPES, tradingOpen, tradeable, validateDealAction, available, pruneDeals, applyDeal, assertDeals };
