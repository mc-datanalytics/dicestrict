import { BOARD, GROUPS } from '../game/board.js';
import { rentFor, netWorth } from '../game/engine.js';
import { escapeHTML as esc, icon } from './icons.js';
import { districtStatus, publicRace, reciprocalOpportunity, developmentOpportunity, incomingOffers, currentMilestones } from './momentum.js';
const money=n=>new Intl.NumberFormat('fr-FR').format(n);
const viewCache=new WeakMap();
function raceCopy(race){
  if(race.bankrupt)return 'Faillite · vous pouvez suivre la fin de partie.';
  if(race.sharedLead)return 'Égalité en tête · rien n’est encore joué.';
  if(race.leader)return race.rivalName?`${money(race.margin)} ₡ d’avance sur ${race.rivalName}.`:'Votre patrimoine mène la partie.';
  return `${money(race.gap)} ₡ de patrimoine pour rejoindre la tête.`;
}
function renderMomentum(app){
  const node=document.querySelector('#momentum'),s=app.state,id=app.localId;
  if(!node)return;
  const player=s.players.find(p=>p.id===id),race=publicRace(s,id);
  if(!player||s.phase==='finished'){node.hidden=true;return;}
  node.hidden=false;
  const stages=app.story?.achieved??currentMilestones(s,id),districts=districtStatus(s,id);
  const owned=districts.reduce((n,g)=>n+g.owned,0),offer=incomingOffers(s,id)[0];
  const trade=reciprocalOpportunity(s,id),build=developmentOpportunity(s,id);
  let label='VOTRE PROCHAIN CAP',title='Votre première adresse.',copy='Acquérez un terrain, puis réunissez son quartier pour construire.',action='';
  if(player.bankrupt){label='LA VILLE CONTINUE';title='Suivez les dernières décisions.';copy='Aucun pari ni investissement disponible après une faillite.';}
  else if(offer){
    label='UNE PROPOSITION POUR VOUS';title=`${s.players.find(p=>p.id===offer.from).name} veut négocier.`;
    copy=app.offerHold()?'Les IA attendent. Prenez le temps de comparer les termes.':'Examinez les termes. Les fonds ne sont pas réservés et la table continue.';
    action='<button data-momentum="inbox">Examiner l’offre</button>';
  }else if(trade){
    title=`Réunissez ${GROUPS[trade.group].name}.`;
    copy=`Un échange avec ${trade.other} peut compléter un quartier pour chacun. Rien n’est envoyé automatiquement.`;
    action=`<button data-momentum="trade" data-key="${esc(trade.key)}" data-match="${esc(s.id)}">Préparer cet échange ${icon('arrow',13)}</button>`;
  }else if(build){
    const t=BOARD[build.tile];title=`Développez ${t.name}.`;
    copy=`${money(build.cost)} ₡ pour un niveau. Loyer ${money(rentFor(s,t.id))} → ${money(rentFor(s,t.id)+4*t.rent)} ₡ ; réserve après : ${money(build.cashAfter)} ₡.`;
    action=`<button data-momentum="inspect" data-lot="${t.id}">Examiner l’investissement</button>`;
  }else if(owned){
    const near=districts.find(g=>g.owned>0&&g.owned<g.total);
    if(near){const target=BOARD.find(t=>t.kind==='lot'&&t.group===near.group&&s.properties[t.id].owner!==id);
      title=`${near.name} · ${near.owned}/${near.total} adresses.`;
      copy=s.properties[target.id].owner?`${target.name} appartient à un adversaire. Vous pouvez lui proposer un échange.`:`Il vous manque ${target.name}. Inspectez-le pour préparer votre prochain passage.`;
      action=`<button data-momentum="inspect" data-lot="${target.id}">Voir l’adresse manquante</button>`;
    }else{title='Faites grandir votre quartier.';copy='Inspectez vos biens : développez pendant votre tour et gardez des crédits pour les loyers.';action='<button data-momentum="assets">Mes biens</button>';}
  }
  const last=app.story?.moments[0];
  const markup=`<div class="momentum-eyebrow">${label}</div><h2>${esc(title)}</h2><p class="momentum-copy">${esc(copy)}</p>${action}
    <div class="journey" aria-label="Étapes de cette partie, sans bonus de crédits">${[['address','Acquérir'],['district','Réunir'],['develop','Bâtir']].map(([key,name])=>`<span class="${stages[key]?'reached':''}" aria-label="${name} : ${stages[key]?'étape atteinte':'à atteindre'}"><i aria-hidden="true">${stages[key]?'✓':'○'}</i>${name}</span>`).join('')}</div>
    <div class="momentum-race"><strong>${race.bankrupt?'Éliminé':`${race.rank}${race.rank===1?'er':'e'}${race.tied?' ex æquo':''}`} · ${money(netWorth(s,id))} ₡</strong><small>${esc(raceCopy(race))}</small></div>
    ${last?`<button class="momentum-memory" data-ui="story">${icon('star',12)}<span>${esc(last.title)}</span></button>`:''}`;
  // Preserve focus on a prepared draft/CTA through identical network redraws.
  if(viewCache.get(node)!==markup){node.innerHTML=markup;viewCache.set(node,markup);}
}
function storyMarkup(app){
  const s=app.state,id=app.localId,story=app.story?.gameId===s.id?app.story:null;
  const race=publicRace(s,id);if(!race)return '';
  const owned=BOARD.filter(t=>s.properties[t.id].owner===id),districts=districtStatus(s,id).filter(g=>g.active).length;
  const stats=story?.stats??{purchases:0,developments:0,trades:0,rent:0};
  return `<section class="story-summary" aria-label="Votre bilan de partie"><h3>Votre empreinte sur Aurora.</h3>
    <p>${story?.complete?'Événements observés depuis le début de cette partie.':'Bilan partiel : événements observés depuis l’ouverture de cet écran, hors interruptions de synchronisation.'}</p>
    <div class="story-grid"><div><strong>${stats.purchases}</strong><span>achats conclus</span></div><div><strong>${stats.developments}</strong><span>niveaux construits</span></div><div><strong>${stats.trades}</strong><span>accords acceptés</span></div><div><strong>${money(stats.rent)} ₡</strong><span>loyers encaissés</span></div></div>
    <p>${owned.length} terrain(s) et ${districts} quartier(s) actif(s) actuellement. Ces étapes n’accordent aucun crédit, XP ou avantage.</p>
    ${story?.moments.length?`<ol class="story-moments">${story.moments.slice(0,4).map(m=>`<li><strong>${esc(m.title)}</strong><span>${esc(m.detail)}</span></li>`).join('')}</ol>`:'<p>Aucun temps fort enregistré pour le moment.</p>'}
    <p class="story-tip">Le patrimoine inclut les biens. Construire transforme des crédits en bâtiments ; ce sont les loyers ultérieurs qui peuvent creuser l’écart.</p></section>`;
}
export {renderMomentum,storyMarkup,raceCopy};
