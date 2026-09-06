import { BOARD, RULES } from "./board.js";
import { currentPlayer, ownsGroup, upgradeCost } from "./engine.js";
/** Deliberately uses visible information only, never the seed or future dice. */
function botAction(s) {
  const p = currentPlayer(s);
  if (s.phase === 'roll') return { type: 'ROLL' };
  if (s.phase === 'buy') {
    const t = BOARD[p.position], matching = BOARD.filter(x => x.kind === 'lot' && x.group === t.group && s.properties[x.id].owner === p.id).length;
    return { type: p.cash >= t.price + (matching ? 80 : 220) ? 'BUY' : 'SKIP' };
  }
  if (s.phase === 'auction') {
    const t = BOARD[s.auction.tile];
    const matching = BOARD.some(x => x.kind === 'lot' && x.group === t.group && s.properties[x.id].owner === p.id);
    const cap = Math.min(p.cash - 160, Math.floor(t.price * (matching ? 1.25 : .85)));
    return { type: s.auction.highBid + RULES.auctionStep <= cap ? 'BID' : 'PASS' };
  }
  if (s.phase === 'end') {
    const lot = BOARD.find(t => t.kind === 'lot' && s.properties[t.id].owner === p.id && ownsGroup(s,p.id,t.group) && s.properties[t.id].level < 3 && p.cash >= upgradeCost(t.id) + 650 &&
      s.properties[t.id].level === Math.min(...BOARD.filter(q => q.kind === 'lot' && q.group === t.group).map(q => s.properties[q.id].level)));
    return lot ? { type: 'UPGRADE', tile: lot.id } : { type: 'END' };
  }
  return null;
}

export { botAction };
