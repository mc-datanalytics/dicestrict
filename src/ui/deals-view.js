import { BOARD } from '../game/board.js';
import { tradeable, tradingOpen } from '../game/deals.js';
import { escapeHTML as esc } from './icons.js';

const cash = n => new Intl.NumberFormat('fr-FR').format(n) + ' ₡';
function dealBundle(tiles, amount) { return [...tiles.map(id => esc(BOARD[id].name)), ...(amount ? [cash(amount)] : [])].join(' + '); }
function renderDealComposer(app, draft = {}) {
  const s = app.state, me = app.localId, others = s.players.filter(p => p.id !== me && !p.bankrupt);
  const to = others.some(p => p.id === draft.to) ? draft.to : others[0]?.id;
  const choices = (owner, field) => BOARD.filter(t => tradeable(s, t.id, owner)).map(t => `<label class="deal-lot"><input type="checkbox" name="${field}" value="${t.id}" ${(draft[field] ?? []).includes(t.id) ? 'checked' : ''}><i style="background:${t.color}"></i><span>${esc(t.name)}<small>${cash(t.price)} · valeur nominale</small></span></label>`).join('') || '<p class="deal-empty">Aucun terrain échangeable pour le moment.</p>';
  document.querySelector('#deal-compose').innerHTML = `<form id="deal-form" data-counter="${draft.counterOf ?? ''}"><label for="deal-to">Avec qui négocier ?</label><select id="deal-to" ${draft.counterOf ? 'disabled' : ''}>${others.map(p => `<option value="${esc(p.id)}" ${p.id === to ? 'selected' : ''}>${esc(p.name)}${p.bot ? ' · IA' : ''}</option>`).join('')}</select>${draft.counterOf ? `<p class="deal-note">Contre-offre #${draft.counterOf} : l’ancienne proposition ne sera remplacée qu’à l’envoi.</p>` : ''}<div class="deal-sides"><fieldset><legend>Vous donnez</legend><label for="give-cash">Crédits</label><input id="give-cash" type="number" min="0" max="10000000" step="1" value="${draft.giveCash ?? 0}">${choices(me, 'giveTiles')}</fieldset><fieldset><legend>Vous recevez</legend><label for="take-cash">Crédits</label><input id="take-cash" type="number" min="0" max="10000000" step="1" value="${draft.takeCash ?? 0}">${choices(to, 'takeTiles')}</fieldset></div><p class="deal-note">Un terrain ou des crédits de chaque côté. Pas de bâtiments ni d’hypothèques. Les valeurs affichées ne garantissent pas un échange équitable.</p><button type="submit" class="action-main lime">Envoyer la proposition</button><button type="button" class="action-secondary" data-deal-ui="reset">Nouvelle proposition / actualiser les biens</button></form>`;
  updateDealPanel(app);
}
function readDealDraft() {
  const form = document.querySelector('#deal-form');
  return { type: 'OFFER_DEAL', to: document.querySelector('#deal-to').value,
    giveCash: Number(document.querySelector('#give-cash').value), takeCash: Number(document.querySelector('#take-cash').value),
    giveTiles: [...form.querySelectorAll('[name="giveTiles"]:checked')].map(el => Number(el.value)),
    takeTiles: [...form.querySelectorAll('[name="takeTiles"]:checked')].map(el => Number(el.value)),
    ...(form.dataset.counter ? { counterOf: Number(form.dataset.counter) } : {}) };
}
function updateDealPanel(app) {
  const s = app.state, me = app.localId, alive = s.players.some(p => p.id === me && !p.bankrupt);
  const open = tradingOpen(s) && alive && !app.session?.paused;
  const inbox = document.querySelector('#deal-inbox');
  document.querySelectorAll('.deal-count').forEach(e => e.textContent = s.deals.filter(d => d.to === me).length || '');
  if (!inbox || document.querySelector('#deal-panel').hidden) return;
  document.querySelector('#deal-status').textContent = s.phase === 'finished' ? 'Le marché est fermé : partie terminée.' : !open ? 'La table continue. Transactions possibles avant le lancer ou à la fin d’un tour.' : 'La table continue : négociez même pendant le tour d’un autre joueur.';
  const submit = document.querySelector('#deal-form [type="submit"]');
  if (submit) submit.disabled = !open || s.deals.some(d => d.from === me);
  inbox.innerHTML = `<h3>Offres publiques · ${s.deals.length}</h3>${s.deals.map(d => {
    const from = s.players.find(p => p.id === d.from), to = s.players.find(p => p.id === d.to);
    return `<article class="deal-offer" data-offer="${d.id}"><strong>#${d.id} · ${esc(from.name)} → ${esc(to.name)}</strong><p>${esc(from.name)} donne : ${dealBundle(d.giveTiles, d.giveCash)}<br>${esc(to.name)} donne : ${dealBundle(d.takeTiles, d.takeCash)}</p><small>Expire dans ${d.expiresAtTurn - s.turnSerial} fin(s) de tour. Aucun crédit réservé.</small><div class="deal-actions">${d.to === me ? `<button data-deal-action="ACCEPT_DEAL" data-id="${d.id}" ${open ? '' : 'disabled'}>Accepter</button><button data-deal-ui="counter" data-id="${d.id}" ${open ? '' : 'disabled'}>Contre-offre</button><button data-deal-action="DECLINE_DEAL" data-id="${d.id}" ${app.session?.paused ? 'disabled' : ''}>Refuser</button>` : d.from === me ? `<button data-deal-action="CANCEL_DEAL" data-id="${d.id}" ${app.session?.paused ? 'disabled' : ''}>Annuler</button>` : ''}</div></article>`;
  }).join('') || '<p class="deal-empty">Aucune offre ouverte. Proposez un échange pour compléter un quartier.</p>'}`;
}
export { renderDealComposer, readDealDraft, updateDealPanel };
