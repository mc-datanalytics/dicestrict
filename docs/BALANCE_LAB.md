# DICESTRICT Balance Lab — alpha 0.6

Le laboratoire exécute le même réducteur `applyAction` que le jeu, sans renderer pendant les simulations, sans réseau de partie, sauvegarde humaine, XP, portefeuille ou compte. Il ne change jamais une partie en cours.

## Accès

```sh
npm run dev
# http://127.0.0.1:4173/lab.html
npm run build:lab
# dist/lab.html et dist/dicestrict-lab-offline.html
```

Le HTML autonome embarque son Worker et fonctionne en `file://` sans requête externe. Arrêter termine le Worker ; une expérience incomplète ne devient pas un rapport terminé. Le lab est exclu du build ordinaire ; `--crazygames --lab` est rejeté. Sans WebGL, simulateur, tableaux et replay textuel restent disponibles.

## Comparaisons

A et B partagent graines, identités et rotations. Deux à quatre profils Équilibré, Prudent, Bâtisseur ou Collectionneur ; plafonds de 4–30 manches, 0–3 jetons Mobilité, fin commune à la première faillite, casino désactivé ou politiques de mise bornées. Activer le casino sans politique de mise ne simule pas une participation. Les quotas et réserves sont ceux du moteur.

La 0.6 ajoute les ouvertures Classique, ordre alterné et compensations de 20/40/60/80 par rang. Le jeu expose seulement Classique et comp-60 facultatif ; la validation de ce dernier est limitée à certains scénarios à quatre sièges. Voir [résultats et contre-exemples](experiments/FAIR_OPENING_RESULTS.md). Le bonus est attribué une fois et compte au score.

Négociation : aucune proposition ou politique réciproque. Celle-ci cherche un échange complétant un quartier pour chaque partie, avec différence de prix et réserve. Les propositions et réponses passent par les commandes réelles du moteur ; les indicateurs comptent propositions, acceptations, refus et terrains échangés. Cette politique étroite ne simule ni bluff, ni alliances, ni conversation humaine. Les bots ne consultent pas les futurs tirages.

Les prix et loyers restent ceux du code versionné, pas ceux d'un simulateur économique distinct. Modifier ces règles demande de relancer les campagnes sur la nouvelle révision. Les configurations historiques reçoivent explicitement `opening: classic` et `negotiation: none` ; les replays v4 ne sont pas chargés dans v5.

## Méthode statistique

Avec permutation, `identity = (seat + rotation) % players`. Chaque identité occupe chaque siège. Quatre joueurs et 500 graines produisent 4 000 exécutions A+B, mais seulement **500 blocs**. Les rotations sont moyennées par graine et par condition avant les différences B−A. Sans rotation et avec profils différents, siège et stratégie sont confondus.

Les intervalles à 95 % sont les quantiles 2,5 % / 97,5 % de 600 rééchantillonnages de blocs entiers, avec un générateur séparé fixé. Moins de deux blocs : bornes nulles. Moins de 100 graines : avertissement d'exploration. Les résultats sont conditionnels aux politiques, approximatifs et sans correction pour comparaisons multiples ; ils ne décrivent pas une population humaine. Ne jamais choisir puis confirmer une correction sur les mêmes graines.

A/B partagent une graine initiale, pas nécessairement les mêmes dés par personne jusqu'à la fin : décisions, événements et éliminations peuvent changer la consommation du hasard. Le casino a un flux séparé, public et prédictible ; ce n'est pas un anti-triche.

## Indicateurs et échecs

Tours joués = commandes ROLL, sans conversion en minutes. Faillites = fraction de joueurs éliminés et de parties avec une faillite ; son premier moment se calcule seulement là où elle survient. Développement = niveaux et biens finaux, pas constructions cumulées. Patrimoine = `netWorth`, comme le score. Chaque ex æquo reçoit `1 / nombre de gagnants`, pas une victoire exclusive entière. Concentration = part finale du meneur.

Les loyers sont les montants réellement transférés et les investissements ceux des achats, enchères et constructions. Un impayé n'est pas un revenu ; un loyer cumulé n'est pas un rendement causal propre au terrain. Le casino mesure les mises et leur résultat net ; pour la roulette couleur du moteur, 18 numéros gagnent et 19 perdent, soit une espérance de −1/37 par crédit misé, sans garantie sur un échantillon.

Toute erreur, absence d'action ou dépassement de 4 000 commandes produit une partie failed avec motif et configuration. Le bloc A/B contenant un échec est exclu intégralement de la comparaison, mais reste exporté. Les descriptifs peuvent inclure les parties terminées d'un bloc défectueux avec dénominateur explicite. CLI : code 1 sur échec, 2 sur argument invalide. Aucune partie bloquée n'est transformée en égalité ni remplacée par une autre graine.

## Exports et reproduction

```sh
npm run balance -- --config docs/experiments/casino.json --out lab-results/custom --replay-out lab-results/replay.json
npm run balance -- --verify-replay lab-results/replay.json
npm run balance:opening -- development lab-results/fair-opening
npm run balance:opening -- confirmation lab-results/fair-opening
npm run playtest:verify -- chemin/trace.json
```

CLI : au plus 2 000 graines par condition ; interface : 500. JSON : configuration, versions, mesures, trajectoires et empreintes. CSV : une ligne par tentative. Les résumés omettent les listes de parties. SHA-256 du moteur, des politiques et du lab avec hashes individuels ; le mode de développement est indiqué non empreinté. Les temps d'exécution ne perturbent pas le rapport déterministe.

Le replay reconstruit la partie depuis sa configuration, puis vérifie acteur, commande et checksum après chaque action. Son lecteur 3D est en lecture seule. Les hashes détectent des divergences ; ils ne sont pas des signatures.

## Essais locaux importés

L'import `dicestrict-playtest` accepte au plus 8 Mo / 4 000 commandes et vérifie une trace pseudonymisée. Il la rejoue sans l'ajouter aux statistiques A/B, sans toucher aux sauvegardes et sans télémétrie. Une trace conforme ne certifie pas la présence de personnes ni l'honnêteté de l'hôte. Voir [HUMAN_PLAYTESTS.md](HUMAN_PLAYTESTS.md) : **aucun résultat humain recueilli dans cette livraison**.

Les tests du lab comparent Worker/Node, contrôlent annulation, mobile émulé, mode autonome, WebGL et secours. Les sessions complètes à quatre pairs sont automatisées et distinctes de la campagne statistique. Preuves et limites dans [VALIDATION.md](VALIDATION.md).
