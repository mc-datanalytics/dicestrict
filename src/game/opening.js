/** Versioned, finite opening variants. Match credits only; no account effects. */
const OPENINGS = Object.freeze({
  classic: Object.freeze({ label: 'Classique', step: 0, snake: false }),
  snake: Object.freeze({ label: 'Ordre alterné (lab)', step: 0, snake: true }),
  'comp-20': Object.freeze({ label: 'Compensation 20 (essai)', step: 20, snake: false }),
  'comp-40': Object.freeze({ label: 'Compensation 40 (essai)', step: 40, snake: false }),
  'comp-60': Object.freeze({ label: 'Compensation 60 (essai)', step: 60, snake: false }),
  'comp-80': Object.freeze({ label: 'Compensation 80 (essai)', step: 80, snake: false }),
});
function validOpening(id) { return typeof id === 'string' && Object.hasOwn(OPENINGS, id); }
function openingBonus(id, seat) {
  if (!validOpening(id) || !Number.isInteger(seat) || seat < 0 || seat > 3) throw Error('Ouverture invalide.');
  return OPENINGS[id].step * seat;
}
function roundOrder(s, round = s.round) {
  const order = s.players.map((_, i) => i);
  return OPENINGS[s.opening].snake && round % 2 === 0 ? order.reverse() : order;
}
function openingDescription(id, count = 4) {
  if (!validOpening(id)) throw Error('Ouverture inconnue.');
  if (id === 'classic') return 'Même capital de départ pour tous · ordre fixe';
  if (id === 'snake') return 'Ordre inversé à chaque manche ; le dernier rejoue en premier';
  return `Bonus par siège : ${Array.from({length: count}, (_, i) => '+' + openingBonus(id, i)).join(' / ')} crédits de partie · inclus dans le patrimoine`;
}
export { OPENINGS, validOpening, openingBonus, roundOrder, openingDescription };
