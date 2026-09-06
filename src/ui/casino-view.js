import { casinoAvailability, rouletteColor } from '../game/casino.js';
import { icon, escapeHTML as esc } from './icons.js';
const $=s=>document.querySelector(s);
function casinoMarkup() {
  return `<aside id="casino-panel" class="casino-panel" hidden aria-labelledby="casino-title"><div class="deal-head"><div><div class="eyebrow">UNE ESCALE, PAS UNE AUTRE ÉCONOMIE</div><h2 id="casino-title">Le casino d’Aurora.</h2></div><button class="icon-button" data-ui="casino-close" aria-label="Fermer le casino">${icon('close',17)}</button></div>
  <div class="roulette-art" aria-hidden="true"><div class="roulette-disc"><span>₡</span></div><div class="roulette-caption">CRÉDITS<br>DE PARTIE<br><small>uniquement</small></div></div>
  <p class="casino-warning"><strong>Vos mises modifient votre capital sur le plateau.</strong> Aucun achat de crédits, aucune conversion, aucun retrait, aucune récompense de compte. Le casino est facultatif.</p>
  <p id="casino-status" role="status"></p><div id="casino-result" aria-live="polite"></div>
  <form id="casino-form"><fieldset><legend>Votre couleur</legend><label><input type="radio" name="casino-color" value="red" checked><i class="roulette-red"></i> Rouge</label><label><input type="radio" name="casino-color" value="black"><i class="roulette-black"></i> Noir</label></fieldset>
  <label class="stake-label" for="casino-stake">Mise en crédits de partie<select id="casino-stake"><option value="20">20 crédits</option><option value="40">40 crédits</option><option value="60">60 crédits</option></select></label>
  <label class="casino-confirm"><input id="casino-confirm" type="checkbox"> Je confirme cette mise et accepte de la perdre.</label>
  <button type="submit" class="action-main lime" disabled>Miser 20 crédits de partie</button></form>
  <p class="casino-odds">Roulette : 37 numéros, de 0 à 36. Rouge : 18 cases ; noir : 18 cases. Le zéro fait perdre les deux couleurs. Bonne couleur : retour de 2× la mise, mise comprise (gain net de 1×). Sinon : mise perdue.</p>
  <p class="casino-odds">Une mise au maximum par joueur et par manche, uniquement hors de son tour et aux moments autorisés. Réserve de 200 crédits conservée après la mise. Pas de relance automatique ni de recharge publicitaire. Le panneau ne met pas la table en pause.</p></aside>`;
}
function openCasino(app) {
  $('#deal-panel').hidden=true;$('#casino-panel').hidden=false;
  app.casinoPreviousTurn=app.state.players[app.state.turn].id;
  $('#casino-confirm').checked=false;
  updateCasino(app);$('#casino-panel [data-ui="casino-close"]').focus();
}
function closeCasino(focus=true) {
  $('#casino-panel').hidden=true;
  if(focus)$('[data-ui="casino"]')?.focus();
}
function updateCasino(app) {
  const s=app.state,p=s.players.find(p=>p.id===app.localId),panel=$('#casino-panel'),form=$('#casino-form');
  $('#casino-entry').innerHTML=`<button data-ui="casino" class="casino-entry"><span class="casino-chip" aria-hidden="true">₡</span><span><strong>Casino d’Aurora</strong><small>${s.casino.enabled?'Crédits de partie · facultatif':'Désactivé pour cette partie'}</small></span>${icon('chevron',15)}</button>`;
  const active=s.players[s.turn].id;
  if(!panel.hidden&&app.casinoPreviousTurn&&app.casinoPreviousTurn!==app.localId&&active===app.localId) {
    closeCasino(false);app.toast('À vous de jouer : retour au plateau.');$('#dock button[data-game]:not(:disabled)')?.focus();
  }
  app.casinoPreviousTurn=active;
  if(s.phase==='finished'){panel.hidden=true;return;}
  if(panel.hidden)return;
  if(form.dataset.round!==String(s.round)||form.dataset.match!==s.id) {
    $('#casino-confirm').checked=false;form.dataset.round=String(s.round);form.dataset.match=s.id;
  }
  const stake=Number($('#casino-stake').value);
  const reason=app.session?.paused?'La partie est suspendue.':casinoAvailability(s,app.localId,stake);
  $('#casino-status').textContent=reason??`Capital : ${p.cash} crédits · après une perte : ${p.cash-stake} · manche ${s.round}.`;
  const submit=form.querySelector('[type="submit"]');submit.disabled=Boolean(reason)||!$('#casino-confirm').checked;
  submit.textContent=`Miser ${stake} crédits de partie`;
  const result=s.casino.results.find(r=>r.actor===app.localId);
  $('#casino-result').innerHTML=result?`<div class="casino-settlement"><b class="roulette-${rouletteColor(result.number)}">${result.number}</b><span><strong>${result.returned?'+'+result.stake:'−'+result.stake} crédits nets</strong><small>Manche ${result.round} · mise ${result.stake} · retour ${result.returned}, mise comprise</small></span></div>`:'';
}
function submitCasino(app) {
  const form=$('#casino-form');if(form.querySelector('[type="submit"]').disabled)return;
  const action={type:'CASINO_BET',stake:Number($('#casino-stake').value),color:form.querySelector('[name="casino-color"]:checked').value,round:Number(form.dataset.round)};
  $('#casino-confirm').checked=false;updateCasino(app);app.act(action);
}
export { casinoMarkup, openCasino, closeCasino, updateCasino, submitCasino };
