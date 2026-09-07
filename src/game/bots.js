import { BOARD, RULES } from "./board.js";
import { currentPlayer, ownsGroup, upgradeCost } from "./engine.js";
/** Explicit heuristic profiles shared by the game and the offline balance lab.
 * These are test policies, not claims about human skill or optimal play. */
const BOT_PROFILES = Object.freeze({
  balanced: Object.freeze({label:'Équilibré',buyReserve:220,pairReserve:80,bidReserve:160,bidRatio:.85,pairBidRatio:1.25,buildReserve:650,build:true}),
  prudent: Object.freeze({label:'Prudent',buyReserve:450,pairReserve:250,bidReserve:400,bidRatio:.75,pairBidRatio:1.1,buildReserve:900,build:true}),
  builder: Object.freeze({label:'Bâtisseur',buyReserve:180,pairReserve:80,bidReserve:200,bidRatio:.90,pairBidRatio:1.35,buildReserve:300,build:true}),
  collector: Object.freeze({label:'Collectionneur',buyReserve:80,pairReserve:40,bidReserve:100,bidRatio:1,pairBidRatio:1.3,buildReserve:650,build:false}),
});
/** Deliberately uses visible information only, never the seed or future dice. */
function botAction(s, profile = 'balanced') {
  const policy = BOT_PROFILES[profile];
  if (!policy) throw Error('Profil de bot inconnu.');
  const p = currentPlayer(s);
  if (s.phase === 'roll') return { type: 'ROLL' };
  if (s.phase === 'buy') {
    const t = BOARD[p.position], matching = BOARD.filter(x => x.kind === 'lot' && x.group === t.group && s.properties[x.id].owner === p.id).length;
    return { type: p.cash >= t.price + (matching ? policy.pairReserve : policy.buyReserve) ? 'BUY' : 'SKIP' };
  }
  if (s.phase === 'auction') {
    const t = BOARD[s.auction.tile];
    const matching = BOARD.some(x => x.kind === 'lot' && x.group === t.group && s.properties[x.id].owner === p.id);
    const cap = Math.min(p.cash - policy.bidReserve, Math.floor(t.price * (matching ? policy.pairBidRatio : policy.bidRatio)));
    return { type: s.auction.highBid + RULES.auctionStep <= cap ? 'BID' : 'PASS' };
  }
  if (s.phase === 'end') {
    // A solvent bot must be able to reopen a mortgaged district after recovering.
    const redeem = BOARD.find(t => t.kind === 'lot' && s.properties[t.id].owner === p.id &&
      s.properties[t.id].mortgaged && p.cash >= Math.ceil(t.price * .55) + policy.buildReserve);
    if (redeem) return { type: 'REDEEM', tile: redeem.id };
    const lot = policy.build && BOARD.find(t => t.kind === 'lot' && s.properties[t.id].owner === p.id && ownsGroup(s,p.id,t.group) && s.properties[t.id].level < 3 && p.cash >= upgradeCost(t.id) + policy.buildReserve &&
      s.properties[t.id].level === Math.min(...BOARD.filter(q => q.kind === 'lot' && q.group === t.group).map(q => s.properties[q.id].level)));
    return lot ? { type: 'UPGRADE', tile: lot.id } : { type: 'END' };
  }
  return null;
}

// Incoming offers are evaluated using visible assets, cash and group completion, never future dice.
function botDealDecision(s) {
  if (!['roll','end'].includes(s.phase)) return null;
  const d = s.deals.find(d => s.players.some(p => p.id === d.to && p.bot && !p.bankrupt));
  if (!d) return null;
  const p = s.players.find(p => p.id === d.to);
  const value = (tiles, owner) => tiles.reduce((sum, id) => sum + BOARD[id].price * (BOARD.some(t => t.kind === 'lot' && t.id !== id && t.group === BOARD[id].group && (s.properties[t.id].owner === owner || tiles.includes(t.id))) ? 1.4 : 1), 0);
  const received = d.giveCash + value(d.giveTiles, p.id), given = d.takeCash + value(d.takeTiles, p.id);
  const accept = received >= given && p.cash + d.giveCash - d.takeCash >= 160;
  return { actor: p.id, action: { type: accept ? 'ACCEPT_DEAL' : 'DECLINE_DEAL', dealId: d.id } };
}
export { BOT_PROFILES, botAction, botDealDecision };
