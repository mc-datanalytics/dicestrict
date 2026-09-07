# Ville réactive — continuité des habitants et lecture du quartier

## Base préservée

Cette tranche part du `main` **b5f547c97ce8387f1c31b25bef3a29952d0a94a7**, après la fusion artistique #9. Elle ne réimporte pas l'ancienne 0.4, ne fusionne pas `feat/engagement-rhythm-0-7`, ne modifie aucun kit artistique et n'annonce pas la phase 4 terminée. Livraison sur `feat/city-response-continuity`, sans fusion automatique dans `main`.

Moteur, protocole v5, dés, négociations, laboratoire, prix, casino et sauvegardes sont inchangés. La version du paquet reste 0.6.1 : ce n'est pas une nouvelle version des règles.

## Ce qui change

`src/scene/city-life.js` garde des identités et des positions locales stables pour les voitures et les piétons. Avant, recalculer les poids de circulation et diviser les positions par un nouveau nombre d'agents pouvait téléporter des véhicules lors d'un investissement. Maintenant, l'économie change leurs objectifs de densité et de vitesse, pas leur position courante. Les arrivées et départs visuels sont progressifs. Les virages ont une tangente continue. Les bus marquent une pause de 2,5 secondes aux deux abribus existants.

Les passants sont répartis entre les parcelles actives, davantage sur les terrains développés. Leur identité ne change pas quand un autre terrain est acheté. Une hypothèque fait progressivement disparaître le passage local. De brèves pauses près des commerces rythment les déplacements ; ce n'est pas un calcul de clientèle, de revenus ni une navigation évitant tous les obstacles.

Les grues ont un mât fixe, une flèche orientable et un câble de levage. Leur hauteur suit le niveau concerné. Plusieurs investissements rapides dans le même terrain renouvellent une seule grue, pas une pile de grues. Vente, hypothèque ou perte du quartier annulent les effets devenus obsolètes. **Le bâtiment économique est toujours mis à jour immédiatement** : pas d'assemblage étage par étage dans cette tranche.

La fiche **La ville réagit** décrit le terrain sélectionné : ouverture des commerces, activité accrue, quartier réuni ou mise en veille. Sa jauge 0–8 représente uniquement l'intensité de la projection visuelle, pas un nombre réel d'habitants ni un multiplicateur économique. Le bouton **Voir en ville** cadre le terrain sans déplacer de pion ni interrompre la table. Le retour caméra est disponible. La fiche reste consultable sans WebGL ; seul le bouton caméra est désactivé. Sur mobile, elle occupe toute la largeur et le bouton mesure au moins 44 px de haut.

## Budgets et isolation

18 voitures et 48 piétons visibles au maximum en qualité élevée ; 6 et 12 en légère, plus deux bus. Les slots locaux sont bornés à 18 voitures et 128 piétons potentiels (8 par parcelle), dont au plus 48 sont affichés. Le changement de qualité peut retirer immédiatement du détail mais ne déplace pas les agents conservés.

Le temps est local, plafonné à 0,1 seconde par pas ; il ne rattrape pas une absence d'onglet ou une pause. Aucun accès au générateur aléatoire du jeu, réseau ou stockage. Les mouvements réduits et la ville figée désactivent ces animations. Les maillages sont réutilisés, y compris ceux des pièces de grue. La limite de soumission existante de 30 images/s est conservée ; elle ne garantit pas 30 FPS sur téléphone.

Casino : uniquement les crédits fictifs de la partie ; aucune nouvelle monnaie, recharge publicitaire, conversion, retrait ou XP. Les gains/pertes restent bien ceux du capital de la partie. L'aléatoire P2P demeure public et prédictible, pas un dispositif anti-triche.

## Validation

Localement : **223 tests Node réussis**, dont 13 nouvelles régressions ; 83 fichiers JavaScript contrôlés ; construction statique et HTML autonome réussie. Les tests ajoutés caractérisent notamment l'ancien saut de position, la continuité des routes, les quotas, les pauses, les bus, le cache GPU simulé, les effets périmés et l'absence de mutation économique.

Le navigateur local refuse la navigation sur localhost (`ERR_BLOCKED_BY_ADMINISTRATOR`). Aucun contournement : la recette réelle est exécutée par GitHub Actions. `tests/city_life_browser.py` ajoute les captures de terrain disponible, construction, quartier développé de nuit, hypothèque et mobile émulé, ainsi que les contrôles caméra, mode sans WebGL, HTML autonome et arrêt des dessins. La CI ordinaire garde tous ses contrôles et ajoute ce script ; aucune assertion d'origine n'est supprimée.

Vérifier la conclusion du run et `test-results/city-response/report.json`, pas la seule présence d'un artefact. Les fixtures graphiques sont contrôlées ; ce ne sont pas des participants humains ni des benchmarks sur appareil réel. La CI habituelle conserve les parcours WebRTC et les sessions complètes Classique / comp-60. Les performances GPU matériel, Safari/iOS, téléphones physiques et TURN restent à valider. Aucun déploiement de production ou publication CrazyGames.

Références techniques consultées :
- https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion
- https://docs.crazygames.com/requirements/technical/
