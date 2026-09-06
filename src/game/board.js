/** Original board and economy: no Monopoly names, text, art, or 40-square layout. */
const COLORS = ['#377d72', '#e99077', '#8a80c4', '#d2a84d'];
const GROUPS = [
  { name: 'Rivage', color: '#57b6ba' }, { name: 'Jardins', color: '#a5c57b' },
  { name: 'Marina', color: '#ef9d88' }, { name: 'Ateliers', color: '#e1bd82' },
  { name: 'Horizon', color: '#86b6db' }, { name: 'Nova', color: '#a298d1' },
  { name: 'Roseraie', color: '#dc9ec1' }, { name: 'Solstice', color: '#e7c768' },
];
const lot = (name, group, price, rent) => ({ kind: 'lot', name, group, price, rent, color: GROUPS[group].color });
const special = (name, kind, color, detail) => ({ name, kind, color, detail });
const BOARD = Object.freeze([
  special('Grand départ', 'start', '#e6ce7a', '+220 à chaque passage'),
  lot('Quai des Brumes', 0, 120, 18), lot('Lagon Bleu', 0, 140, 22),
  special('L’imprévu', 'event', '#ad9fd4', 'Une carte peut tout changer'),
  lot('Jardin Suspendu', 1, 160, 25), lot('Allée des Cèdres', 1, 180, 28),
  special('Contribution', 'tax', '#e6a38d', 'Contribution de 90'),
  special('Central Park', 'park', '#9fc48d', 'Pause verte : +70'),
  lot('Port Aurora', 2, 200, 32), lot('Les Terrasses', 2, 220, 36),
  special('L’imprévu', 'event', '#ad9fd4', 'Une carte peut tout changer'),
  lot('Studio 54', 3, 230, 38), lot('Manufacture', 3, 250, 42),
  special('Mobilité', 'transit', '#90b4ba', 'Dividende mobilité : +60'),
  special('Incubateur', 'grant', '#bdb2dc', 'Bourse de création : +100'),
  lot('Skyline', 4, 270, 46), lot('Tour Azur', 4, 290, 50),
  special('L’imprévu', 'event', '#ad9fd4', 'Une carte peut tout changer'),
  lot('Nova Square', 5, 310, 55), lot('Observatoire', 5, 330, 60),
  special('Contribution', 'tax', '#e6a38d', 'Contribution de 90'),
  special('Inspection', 'audit', '#d4aea2', 'Mise aux normes : 80'),
  lot('Villa Rosée', 6, 350, 65), lot('Galerie Bloom', 6, 370, 70),
  special('Mobilité', 'transit', '#90b4ba', 'Dividende mobilité : +60'),
  lot('Palais Solaire', 7, 400, 78), lot('Golden Heights', 7, 440, 88),
  special('L’imprévu', 'event', '#ad9fd4', 'Une carte peut tout changer'),
].map((tile, id) => Object.freeze({ ...tile, id })));
const EVENTS = Object.freeze([
  { title: 'Une idée qui rapporte', text: 'Votre concept séduit un investisseur.', amount: 140 },
  { title: 'Festival de quartier', text: 'Votre stand fait sensation.', amount: 100 },
  { title: 'Rénovation surprise', text: 'Un petit rafraîchissement s’impose.', amount: -90 },
  { title: 'Coup de pouce', text: 'La ville soutient vos ambitions.', amount: 180 },
  { title: 'Un toit à réparer', text: 'La météo n’était pas de votre côté.', amount: -120 },
  { title: 'Retour sur investissement', text: 'Votre réseau porte ses fruits.', amount: 120 },
  { title: 'Une bonne action', text: 'Vous financez la fête des voisins.', amount: -60 },
  { title: 'Belle rencontre', text: 'Un nouveau partenaire vous fait confiance.', amount: 80 },
]);
const RULES = Object.freeze({ version: 3, startCash: 1800, lapIncome: 220, rounds: 12, maxLevel: 3, auctionStep: 20 });
function tilePosition(id) {
  const side = Math.floor(id / 7), t = id % 7, edge = 5.6, step = 1.6;
  return side === 0 ? [edge - t * step, edge] : side === 1 ? [-edge, edge - t * step] :
    side === 2 ? [-edge + t * step, -edge] : [edge, -edge + t * step];
}

export { COLORS,GROUPS,BOARD,EVENTS,RULES,tilePosition };
