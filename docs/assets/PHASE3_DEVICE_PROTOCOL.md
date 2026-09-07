# Recette physique reproductible — à exécuter, non validée ici

Les résultats automatisés de cette livraison viennent d'un CPU de VM et de SwiftShader. Ils ne mesurent ni un GPU de téléphone ni la chauffe, la batterie ou la stabilité Safari/iOS. Le protocole suivant est un plan de recette, pas un résultat obtenu.

## Matériel et conditions à consigner

Utiliser au moins un Android d'entrée/milieu de gamme et un iPhone encore ciblé par le produit, sans choisir seulement les modèles haut de gamme. Noter le modèle exact, SoC/GPU, quantité de RAM, OS, navigateur et version, orientation, résolution CSS, DPR effectif, taille du canvas, réglage graphique, luminosité, batterie, mode économie d'énergie, température ambiante et état de charge. Ne pas appeler un viewport Playwright « iPhone testé ».

Utiliser le même appareil, le même navigateur, les mêmes conditions et la même orientation pour avant/après. Fermer les autres onglets. Alterner l'ordre A/B puis B/A sur au moins trois répétitions ; ne pas comparer deux runs sur machines différentes comme un delta causal. Faire une passe après fermeture complète du navigateur et une passe caches chauds. Séparer transfert réseau, génération CPU des modèles, temps jusqu'à la première image et rendu stable.

## Préparer le jeu et les états

Créer deux worktrees : phase2 `6b020530ac8ab46d0dd882ffcdfd67d00215b989` et le commit exact de phase3 indiqué dans son rapport. Ne pas remplacer les branches de l'équipe. Dans la copie phase3 :

```sh
mkdir -p public/diagnostics
node --input-type=module - <<'JS'
import { writeFileSync } from 'node:fs';
import { civicFixtures } from './scripts/assets/civic-fixtures.mjs';
writeFileSync('public/diagnostics/civic-history.json', JSON.stringify(civicFixtures()));
JS
HOST=0.0.0.0 node scripts/dev.mjs --port 4173
```

Copier seulement le JSON de recette dans le même chemin `public/diagnostics/` de la copie phase2, puis servir celle-ci sur le port 4174. Ces JSON contiennent uniquement une partie synthétique, pas des données personnelles. Le serveur de développement doit rester sur un réseau local de confiance, sans ouverture publique ou secret réseau permanent. Le multijoueur n'est pas nécessaire à ce test graphique.

Depuis le navigateur de l'appareil physique, ouvrir l'adresse LAN correspondante. Avec la console distante du navigateur, coller ceci pour un état déterminé :

```js
const {app} = await import('/src/main.js');
const {fingerprint, applyAction} = await import('/src/game/engine.js');
const f = await (await fetch('/public/diagnostics/civic-history.json')).json();
const stateName = 'late'; // refaire avec start, middle, late
const checkpoint = f.checkpoints[stateName];
clearTimeout(app.botTimer); clearTimeout(app.busyTimer);
app.settings.reduced = true;
app.accept(structuredClone(checkpoint.state));
clearTimeout(app.botTimer); clearTimeout(app.busyTimer);
app.scene.paths = checkpoint.state.players.map(p => ({
  from:p.position, to:p.position, steps:0, start:0, duration:0
}));
app.scene.lastRoll = -99999;
app.scene.view('reset');
app.scene.ambientTime = 0; // 60 pour le crépuscule
app.scene.lastAmbientFrame = null;
app.scene.configure({quality:'low', reduced:false, living:true,
  weather:false, dayMode:'day'}); // auto pour le crépuscule
console.assert(fingerprint(app.state) === checkpoint.fingerprint);
console.log({stateName, fingerprint:fingerprint(app.state),
  userAgent:navigator.userAgent, dpr:devicePixelRatio,
  viewport:[innerWidth,innerHeight]});
```

Cette configuration choisit des états rejouables, sans augmenter le capital. Le début attendu est `52e23cdb`, 0 propriété, 1 800 crédits par joueur ; le milieu `a211311d` ; la fin `81346ab6`. La capture finale est le dernier tour avant l'écran de résultats. Ne pas activer `captureTarget`, ne pas dépasser le zoom 1,5 ou les limites de rotation ordinaires. Garder la même sélection de case pour les deux versions.

## Mesurer sans confondre soumission et exécution

Enregistrer 60 secondes de trace navigateur après une chauffe de 15 secondes, trois fois par état et mode, puis une session continue de 15 minutes dans l'état final animé. Le jeu plafonne volontairement ses soumissions à 30 images/s : comparer les intervalles entre **images effectivement soumises**, les images longues, les pauses et les pertes de contexte, pas seulement le rythme de `requestAnimationFrame`.

Dans le profiler, relever temps CPU principal et génération des maillages, raster/composition et GPU lorsque la plateforme l'expose. Une mesure `renderer.stats.cpuSubmitMs` n'attend pas la fin du travail GPU. Le test automatisé avec `readPixels(1×1)` force au contraire une synchronisation intrusive ; ne pas l'utiliser dans le run physique de fluidité stable. Une extension GPU timer, lorsqu'elle existe, doit être lue de façon asynchrone et rejeter les résultats disjoints ; son absence doit être consignée.

Pour le compteur de scènes, conserver `app.scene.renderer.stats` : `drawCalls`, `shadowDrawCalls`, `triangles`, `shadowTriangles`, `gpuBufferBytes`, `textureBytes`, `defaultFramebuffer`, `meshUploads`, `meshDrops`. Le compteur de géométrie additionne vertex/index ; il exclut les textures, le framebuffer, MSAA, les caches navigateur et le pilote. `defaultFramebuffer` donne des dimensions/bornes et non une allocation complète. Le mode bas ne soumet pas d'ombres, mais l'allocation de la shadow map existe encore dans ce moteur.

## Scénarios obligatoires

Faire les trois états en mode bas puis haut, jour puis fin de journée. Mesurer séparément ville figée, ville animée et mouvements réduits. Une fois figée et sans interaction, `frameCount` ne doit pas augmenter : ce n'est pas un problème de FPS, c'est l'arrêt attendu du rendu.

Appliquer les épisodes légaux `f.episodes.upgrade` et `f.episodes.mortgage` par `app.accept(episode.before)` puis `app.accept(applyAction(app.state,episode.actor,episode.action))`, après avoir arrêté les timers de bots. Relever le temps CPU, les pics de mémoire et la première image visible après l'action. Le casino/la promenade ne doivent pas être reconstruits. Ces épisodes sont des branches de recette indépendantes, pas des modifications de la partie de production.

Faire cinq pressions sur zoom+, cinq sur zoom−, puis un tour de caméra complet par glissement tactile. Relever saccades au changement de LOD, lisibilité des accès et collision visuelle avec les cases. La sélection des propriétés doit rester fonctionnelle aux limites de zoom. Vérifier les mêmes scènes en portrait et paysage, sans substituer les mesures entre orientations.

## Critères proposés, à confirmer avec le parc d'appareils réel

Viser une image stable à 30 Hz en mode bas, pas 60 Hz imposés à un moteur plafonné à 30. Relever le p50/p95/p99 des intervalles réels, les frames dépassant 50/100 ms, le nombre de pertes de contexte, la chauffe et la dégradation entre la minute 1 et la minute 15. Un seuil d'acceptation produit doit être choisi sur les appareils ciblés ; aucun seuil n'est certifié atteint par la livraison CI.

Archiver un JSON par run avec modèle d'appareil, conditions, commit, empreinte d'état, modes, capture et trace. Garder les échecs et valeurs aberrantes expliquées. L'absence de téléphone physique dans cette session demeure une limite explicite, même si les tests de disposition mobile passent.
