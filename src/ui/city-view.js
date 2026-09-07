/** Accessible, read-only explanation of what the selected parcel contributes visually. */
import { deriveCity } from '../scene/city-state.js';
import { BOARD } from '../game/board.js';
import { icon } from './icons.js';

function parcelInsight(state, tileId) {
  const city = deriveCity(state), p = city.parcels.find(p => p.id === tileId);
  if (!p) return null;
  const labels = ['Les commerces ouvrent', 'Les terrasses s’animent', 'Le quartier attire', 'Un pôle de vie'];
  return {
    id: p.id, name: BOARD[p.id].name, activity: p.activity, level: p.level, owner: p.owner,
    title: !p.owner ? 'Un quartier à imaginer' : p.mortgaged ? 'L’activité est en veille' : labels[p.level],
    detail: !p.owner ? 'L’achat ouvrira les commerces et fera arriver les premiers passants.' : p.mortgaged ? 'Les vitrines se ferment, le passage diminue. Le bâtiment reste en place.' : 'Les investissements attirent les passants et densifient la circulation locale.',
    status: p.mortgaged ? 'Hypothéqué' : !p.owner ? 'Terrain disponible' : `Niveau ${p.level} / 3${p.complete ? ' · Quartier réuni' : ''}`,
    ownerName: state.players.find(q => q.id === p.owner)?.name ?? '',
  };
}
function renderCityInsight(app) {
  const root = app.root.querySelector('#city-insight');
  if (!root) return;
  const p = parcelInsight(app.state, app.selected);
  root.hidden = !p;
  if (!p) { root.replaceChildren(); return; }
  // Keep a focused control alive through a peer snapshot. No animation timer or aria-live spam.
  if (!root.firstElementChild) root.innerHTML = `<article class="city-insight-card" aria-labelledby="city-insight-title"><div class="city-insight-heading"><span>LA VILLE RÉAGIT</span><button type="button" data-ui="focus-city" aria-label="Voir ce terrain dans la ville 3D">${icon('expand',16)}<span>Voir en ville</span></button></div><h3 id="city-insight-title"></h3><p class="city-insight-detail"></p><div class="city-insight-meter" role="meter" aria-label="Intensité de l’animation du quartier" aria-valuemin="0" aria-valuemax="8">${Array.from({length:8},()=>'<i aria-hidden="true"></i>').join('')}</div><div class="city-insight-meta"><strong></strong><span>Activité visuelle</span></div></article>`;
  root.dataset.tile = String(p.id);
  root.querySelector('h3').textContent = p.title;
  root.querySelector('.city-insight-detail').textContent = p.detail;
  root.querySelector('.city-insight-meta strong').textContent = p.status;
  const meter = root.querySelector('[role="meter"]');
  meter.setAttribute('aria-valuenow', String(p.activity));
  meter.setAttribute('aria-valuetext', `${p.name} : ${p.activity} sur 8, activité visuelle uniquement`);
  [...meter.children].forEach((bar, i) => bar.classList.toggle('lit', i < p.activity));
  const button = root.querySelector('button');
  button.disabled = !app.scene || Boolean(app.scene.lost);
  button.title = app.scene ? `Centrer la caméra sur ${p.name}` : 'La description du quartier reste disponible sans WebGL';
}
export { parcelInsight, renderCityInsight };
