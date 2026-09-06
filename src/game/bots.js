import { BOARD, RULES } from "./board.js";
import { currentPlayer, ownsGroup, upgradeCost, rentFor } from "./engine.js";
/** Deliberately uses visible information only, never the seed or future dice. */
function botAction(s) {
  const p = currentPlayer(s);
  if (s.phase === 'choose') {
    const value = offset => {
      const id = (p.position + s.dice[0] + s.dice[1] + offset) % BOARD.length, t = BOARD[id], prop = s.properties[id];
      if (t.kind === 'lot') {
        if (!prop.owner) return p.cash >= t.price ? 45 + (BOARD.some(x => x.kind === 'lot' && x.group === t.group && s.properties[x.id].owner === p.id) ? 90 : 0) : 0;
        return prop.owner === p.id ? 0 : -rentFor(s, id);
      }
      return ({tax:-90,audit:-80,grant:100,park:70,transit:60,start:0,event:30})[t.kind];
    };
    let offset = 0, score = value(0);
    for (const candidate of [-1, 1]) if (value(candidate) > score + 45) { offset = candidate; score = value(candidate); }
    return { type: 'MOVE', offset };
  }
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
export { botAction, botDealDecision };
