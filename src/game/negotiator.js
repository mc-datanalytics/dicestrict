import { BOARD } from './board.js';
import { tradeable, tradingOpen } from './deals.js';
/** Reciprocal, visible-information policy. No access to seed or future dice.
 * Only exchange single lots that complete a different district for each party.
 * Pay the difference at face value, retaining 160 cash on both sides.
 * One proposal per actor's ordinary turn; no gifts, breaking a set or bot collusion.
 * This deliberately narrow policy is NOT a model of human negotiation. */
function botProposeDeal(s, actor) {
  const p = s.players.find(p => p.id === actor);
  if (!p || p.bankrupt || s.phase !== 'roll' || !tradingOpen(s) ||
      s.players[s.turn].id !== actor || p.dealBudgetTurn === s.turnSerial ||
      s.deals.some(d => d.from === actor)) return null;
  const completes = (owner, tile) => BOARD.some(t => t.kind === 'lot' && t.id !== tile.id &&
    t.group === tile.group && s.properties[t.id].owner === owner && !s.properties[t.id].mortgaged);
  // Rotate the search start by turn/seat rather than always privileging player 0.
  const others = s.players.slice(s.turn + 1).concat(s.players.slice(0, s.turn));
  for (const other of others) {
    if (other.bankrupt) continue;
    for (const give of BOARD) {
      if (!tradeable(s, give.id, actor) || completes(actor, give) || !completes(other.id, give)) continue;
      for (const take of BOARD) {
        if (take.group === give.group || !tradeable(s, take.id, other.id) ||
            completes(other.id, take) || !completes(actor, take)) continue;
        const difference = take.price - give.price;
        const giveCash = Math.max(0, difference), takeCash = Math.max(0, -difference);
        if (p.cash < giveCash + 160 || other.cash < takeCash + 160) continue;
        return {type:'OFFER_DEAL',to:other.id,giveCash,takeCash,giveTiles:[give.id],takeTiles:[take.id]};
      }
    }
  }
  return null;
}
export { botProposeDeal };
