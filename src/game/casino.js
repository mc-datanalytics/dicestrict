/** Casual, match-scoped roulette. No payments, account currency or rewards. */
const CASINO_STAKES = Object.freeze([20, 40, 60]);
const CASINO_RESERVE = 200;
const RED_NUMBERS = Object.freeze([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const check = (ok, message) => { if (!ok) throw Error(message); };
const int = (n, min, max) => Number.isSafeInteger(n) && n >= min && n <= max;
const rouletteColor = n => n === 0 ? 'green' : RED_NUMBERS.includes(n) ? 'red' : 'black';
function createCasino(seed, enabled) {
  return { enabled, rng: ((seed ^ 0x9e3779b9) >>> 0) || 1, results: [] };
}
function validateCasinoAction(a) {
  check(Object.keys(a).length === 4 && Object.keys(a).every(k => ['type','stake','color','round'].includes(k)), 'Champs casino invalides.');
  check(a.type === 'CASINO_BET' && CASINO_STAKES.includes(a.stake) && ['red','black'].includes(a.color) && int(a.round,1,30), 'Mise casino invalide.');
  return a;
}
function casinoAvailability(s, id, stake = 20) {
  const p = s.players.find(p => p.id === id);
  if (!s.casino.enabled) return 'Casino désactivé pour cette partie.';
  if (!p || p.bankrupt || s.phase === 'finished') return 'Le casino est fermé pour vous.';
  if (s.players[s.turn].id === id) return 'C’est votre tour : le plateau passe en priorité.';
  if (!['roll','end'].includes(s.phase)) return 'Pause des mises pendant un déplacement, un achat ou une enchère.';
  if (s.casino.results.some(r => r.actor === id && r.round === s.round)) return 'Votre mise de cette manche est déjà jouée.';
  if (!CASINO_STAKES.includes(stake) || p.cash - stake < CASINO_RESERVE) return 'Conservez au moins 200 crédits pour le plateau après la mise.';
  return null;
}
function applyCasino(s, actor, a) {
  validateCasinoAction(a);
  check(a.round === s.round, 'La manche a changé : vérifiez votre mise.');
  const reason = casinoAvailability(s, actor, a.stake); check(!reason, reason);
  const p = s.players.find(p => p.id === actor);
  // Separate deterministic stream: a casino action must never reroll the board dice.
  // Visible casual PRNG, NOT cryptographic randomness or proof of an honest host.
  let x; const bound = Math.floor(0xffffffff / 37) * 37;
  do { x=s.casino.rng>>>0; x^=x<<13; x^=x>>>17; x^=x<<5; s.casino.rng=x>>>0; } while (s.casino.rng > bound);
  const number = (s.casino.rng - 1) % 37;
  const returned = rouletteColor(number) === a.color ? a.stake * 2 : 0;
  p.cash += returned - a.stake;
  s.casino.results = s.casino.results.filter(r => r.actor !== actor);
  s.casino.results.push({ actor, round:s.round, stake:a.stake, color:a.color, number, returned });
  s.log.unshift({ text:`${p.name} · Casino : ${number}, mise ${a.stake}, retour ${returned} crédits de partie (${returned ? '+'+a.stake : '−'+a.stake} net).`, kind:returned?'income':'expense' });
  s.log = s.log.slice(0,30);
}
function assertCasino(s) {
  const c=s.casino;
  check(c && Object.keys(c).length===3 && typeof c.enabled==='boolean' && int(c.rng,1,0xffffffff), 'État casino invalide.');
  check(Array.isArray(c.results) && c.results.length<=s.players.length && new Set(c.results.map(r=>r.actor)).size===c.results.length, 'Historique casino invalide.');
  check(c.enabled || c.results.length===0, 'Casino désactivé avec résultats.');
  for (const r of c.results) {
    check(r && Object.keys(r).length===6 && s.players.some(p=>p.id===r.actor) && int(r.round,1,s.round) && CASINO_STAKES.includes(r.stake) && ['red','black'].includes(r.color) && int(r.number,0,36), 'Résultat casino invalide.');
    check(r.returned === (rouletteColor(r.number) === r.color ? r.stake*2 : 0), 'Retour casino incohérent.');
  }
}
export { CASINO_STAKES, CASINO_RESERVE, RED_NUMBERS, rouletteColor, createCasino, validateCasinoAction, casinoAvailability, applyCasino, assertCasino };
