# DICESTRICT Balance Lab — alpha 0.5

Le laboratoire fait jouer **le même réducteur `applyAction` que le client**, sans renderer pendant les simulations, sans serveur de partie, sans XP, portefeuille, publicité ou connexion à un compte. Il ne modifie ni les règles d'une partie en cours ni sa sauvegarde. L'interface est séparée du jeu.

## Ouvrir le laboratoire

```sh
npm run dev
# ouvrir http://127.0.0.1:4173/lab.html
npm run build:lab
# dist/lab.html : version ESM ; dist/dicestrict-lab-offline.html : autonome
```

Le lab autonome contient aussi son Web Worker. Il fonctionne sans service externe en `file://`. Le bouton **Arrêter** termine ce Worker ; aucun résultat partiel n'est promu en rapport terminé. Une expérience précédente reste consultable et porte un avertissement si les paramètres ont changé.

La compilation ordinaire **exclut le lab** du client statique et du bundle du jeu. `--crazygames --lab` est rejeté. La 3D du replay est facultative : graphiques, tableaux, simulateur et états textuels restent accessibles sans WebGL.

## Ce que l'on peut comparer

Deux conditions A et B partagent les graines, identités et rotations. Les réglages disponibles sont le plafond de manches (4–30), les jetons Mobilité (0–3), la fin commune à la première faillite et le casino. Le casino peut être désactivé, activé sans aucune mise, joué par tous à 20 ou 60 crédits, ou uniquement par l'identité 1 à 60 crédits. Les quotas et la réserve sont ceux du vrai moteur ; les politiques ne les contournent jamais.

Deux à quatre identités sont associées à quatre heuristiques explicites dans `BOT_PROFILES` : Équilibré, Prudent, Bâtisseur et Collectionneur. Le jeu utilise Équilibré par défaut ; le choix des autres profils est un réglage du lab, pas encore un sélecteur de difficulté dans le jeu. Les profils ajustent réserves de trésorerie, plafond d'enchère et développement. Ils voient les dés déjà lancés mais ne lisent ni les graines internes ni les tirages futurs. Le casino choisit rouge sans prédiction.

**Les bots ne proposent pas d'échanges dans ce lab.** Leur comportement ne représente donc pas une table humaine négociant ses quartiers. Les montants immobiliers, loyers, capital initial et revenus du départ restent ceux du code du jeu ; il n'y a pas de multiplicateur expérimental injecté dans un moteur différent. Pour les changer, modifier les règles versionnées et lancer à nouveau les mêmes expériences sur une autre révision.

## Méthode et limites statistiques

Une graine maîtresse produit une liste reproductible de graines de parties (`mix32-v1`). Avec quatre joueurs et la permutation activée, chaque graine donne quatre rotations pour A et quatre pour B. Ainsi **500 graines donnent 4 000 parties, mais seulement 500 blocs expérimentaux**, pas 4 000 observations indépendantes.

L'ordre des identités est `identity = (seat + rotation) % players`. Chaque identité joue à chaque place. Pour mesurer l'ordre seul, l'expérience « Ordre de passage » met des bots identiques, sans rotation redondante, et A=B comme contrôle de calcul. Sans rotation avec des profils différents, siège et stratégie sont confondus ; le rapport le signale.

Pour chaque indicateur, on moyenne les rotations à l'intérieur d'une graine, séparément pour A et B. La différence est calculée **B − A sur cette même graine**, avant l'agrégation. Les intervalles à 95 % sont les quantiles 2,5 % / 97,5 % de **600 rééchantillonnages de blocs entiers**, tirés par un générateur séparé et fixé. Les rotations ne sont jamais rééchantillonnées comme si elles étaient indépendantes. Pour moins de deux blocs, les bornes sont `null`. En dessous de 100 graines, l'interface signale une exploration de petit échantillon.

Ces intervalles sont approximatifs, conditionnels à ces politiques et à ce générateur. Ils ne mesurent pas une population de joueurs humains. Ils ne sont pas corrigés pour les comparaisons multiples. Choisir une variante après avoir examiné beaucoup de résultats puis la retester sur les mêmes graines produit un biais de sélection : utiliser une nouvelle graine maîtresse, garder une série de confirmation à part et faire des essais humains.

A/B ont la même graine initiale, **pas une garantie de mêmes dés attribués à chaque personne jusqu'à la fin**. Une mobilité différente, un événement ou une élimination peut faire diverger la consommation de hasard. Le flux du casino reste distinct des dés ; cela ne fournit pas un aléatoire secret ni un anti-triche.

## Indicateurs

- **Tours joués** : nombre de commandes ROLL. Les enchères, choix Mobilité et mises apparaissent dans le nombre séparé de commandes. Aucune conversion trompeuse en minutes.
- **Faillites** : part des joueurs éliminés et fraction de parties avec au moins une faillite. Le moment de la première faillite a un dénominateur explicite : seulement les parties où elle survient.
- **Développement** : niveaux, terrains détenus, premier quartier complet et pic des constructions. Les valeurs finales ne sont pas des créations cumulées.
- **Concentration** : part du patrimoine final détenue par le joueur le plus riche. Le patrimoine est calculé par `netWorth`, exactement comme le score du jeu.
- **Victoire par siège et identité** : chaque vainqueur d'un ex æquo reçoit `1 / nombre de vainqueurs`. La somme des parts d'une partie vaut 1. Ce ne sont pas des taux de victoires exclusives.
- **Casino** : mises effectuées et résultat net réellement ajouté au capital du plateau. Pour cette roulette, 18 numéros gagnent et 19 perdent sur un pari de couleur : l'espérance théorique par crédit misé est `(18 − 19) / 37 = −1/37`. Ce n'est pas une garantie sur un petit corpus.
- **Carte du plateau** : arrivées, loyers effectivement transférés au propriétaire et investissements (achats directs, adjudications et constructions). Un loyer nominal impayé n'est pas compté comme revenu. Les loyers cumulés ne sont pas présentés comme un rendement causal intrinsèque d'un terrain.

Toute erreur du réducteur, absence d'action ou plafond de 4 000 commandes produit une partie **failed**, avec graine, rotation, condition et motif. Les blocs contenant un échec sont exclus intégralement des comparaisons ; les tentatives et échecs restent exportés. Les statistiques descriptives de chaque condition peuvent inclure ses parties terminées dans un bloc défectueux ; ce dénominateur est explicite. La CLI sort avec le code 1 en cas d'échec et 2 en cas d'argument invalide. Il n'y a pas de tirage automatiquement remplacé ni de match bloqué transformé en égalité.

## Reproduire, exporter, auditer

```sh
npm run balance -- --experiment casino --samples 500 --seed 982451653 --out lab-results/casino
npm run balance -- --experiment mobility --samples 500 --seed 123456789 --out lab-results/mobility
npm run balance -- --experiment seats --samples 1000 --seed 20260906 --out lab-results/seats
npm run balance -- --config docs/experiments/casino.json --out lab-results/custom --replay-out lab-results/replay.json
npm run balance -- --verify-replay lab-results/replay.json
```

La CLI autorise jusqu'à 2 000 graines ; l'interface navigateur est bornée à 500. Le rapport JSON complet contient les conditions, versions, politiques, règles, résultats par partie et empreintes. Le CSV fournit une ligne par tentative. Le fichier `*-summary.json` conserve les agrégats sans répéter toutes les parties.

La compilation du lab et la CLI enregistrent le **SHA-256 des sources du moteur, des politiques et du lab**, avec empreinte individuelle de chaque fichier pertinent. Le mode `npm run dev` est explicitement indiqué comme non empreinté. Conserver le rapport et la révision Git avec toute décision. Les horloges d'exécution ne sont pas incluses dans les résultats : à sources et configuration identiques, le rapport est reproductible.

Le replay régénère une partie choisie et conserve l'état initial, l'acteur, la commande et le checksum après chaque action. La vérification reconstruit l'état initial attendu depuis la configuration et refuse un état modifié, une commande illégale ou une empreinte divergente. Le lecteur propose une ville 3D manipulable et un curseur par commande, sans rejouer ces actions dans une session humaine. Le checksum FNV de replay détecte des divergences ; ce n'est pas une signature anti-triche.

## Validation

`tests/balance.test.mjs` couvre configuration, rotations, reproductibilité, intervalle par bloc, échecs explicites, données économiques, politiques casino, replays altérés et CSV. `tests/lab_browser.py` compare le rapport d'un vrai Web Worker au résultat Node, teste l'annulation, le mode autonome sans requête externe, le mobile émulé, le replay WebGL2 et son repli textuel. Le build et le lab ne contactent pas la production.

Référence technique officielle pour l'arrêt des calculs : https://developer.mozilla.org/en-US/docs/Web/API/Worker/terminate
