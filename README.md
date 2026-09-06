# DICESTRICT

**Roll. Build. Rule.** Une ville miniature, quatre ambitions, un lancer à la fois.

Jeu original de stratégie immobilière 3D pour navigateur. Ville : **Aurora** ; interface française, crème / vert profond / quartiers pastel. **Alpha 0.5.0**, pas une sortie commerciale. La branche de travail est `feat/balance-lab-0-5` ; la distribution CrazyGames n'est pas publiée.

## Jouer et ouvrir le lab

Node.js 22+, aucune dépendance JavaScript à installer.

```sh
git clone https://github.com/mc-datanalytics/dicestrict.git
cd dicestrict
git switch feat/balance-lab-0-5
npm run dev
```

Jeu : **http://127.0.0.1:4173**. Laboratoire : **http://127.0.0.1:4173/lab.html**.

```sh
npm run check
npm test
npm run build       # jeu statique + dist/dicestrict-offline.html
npm run build:lab   # ajoute lab.html et dicestrict-lab-offline.html
npm run preview
```

Les deux HTML autonomes s'ouvrent directement dans un navigateur de bureau. Le jeu autonome est local ; le multijoueur nécessite une signalisation. Le lab embarque son Worker et n'utilise aucune sauvegarde de jeu. La compilation ordinaire exclut le lab ; `--crazygames --lab` est interdit.

## Nouveautés 0.5

Le [Balance Lab](docs/BALANCE_LAB.md) fait jouer **le vrai moteur**, compare A/B, permute les sièges, utilise quatre profils de bots et calcule des intervalles par bloc de graine. Configuration des manches, mobilité, règle de clôture et casino ; exports JSON/CSV, empreintes des sources et replays vérifiés en 3D ou texte. Aucun ajustement automatique des règles.

```sh
npm run balance -- --experiment casino --samples 500 --seed 982451653
npm run balance -- --config docs/experiments/seats.json --out lab-results/seats
npm run balance -- --verify-replay lab-results/replay.json
```

[Premières mesures : 10 000 trajectoires, zéro échec](docs/experiments/BASELINE_0_5.md). Les répétitions et rotations ne sont pas des observations indépendantes. Ces résultats concernent des bots, pas des humains ; ils ne mesurent pas le plaisir ni la durée réelle en minutes.

Dans le jeu, les bots savent lever une hypothèque après reconstitution d'une réserve suffisante. Désactiver les mouvements pendant un déplacement place le pion à son arrivée ; les invalidations graphiques de taille identique sont filtrées. Le moteur et le protocole restent v4 : les règles n'ont pas été modifiées par le lab.

## Fonctionnalités du jeu

- Plateau original de 28 cases, 16 terrains / 8 quartiers, 2 à 4 joueurs, IA, achats, loyers, constructions équilibrées, hypothèques, enchères, faillites et score au patrimoine.
- Négociation publique non modale, contre-offres et échanges atomiques hors tour aux phases sûres. Deux jetons Mobilité gratuits permettent un choix à ±1 case après le lancer. Formats Blitz 6 / Standard 12 / Grand District 18 manches.
- Ville procédurale WebGL2 : parcelles liées aux propriétaires, niveaux et hypothèques ; commerces, terrasses, circulation, bus, piétons, grues, célébrations, éclairage jour/nuit, métro de surface, ambulance ponctuelle et pluie légère. Réglages qualité, mouvements réduits, ville figée et météo. [Spécification 0.4](docs/LIVING_CITY.md).
- Casino facultatif rouge/noir : une mise de 20/40/60 crédits maximum par manche, hors tour, réserve de 200, confirmation. **Uniquement le capital de la partie**, sans achat, conversion, retrait, recharge publicitaire ou récompense de compte. Gains et pertes affectent les investissements.
- Sauvegarde locale, aide, historique, affichage mobile et repli sans WebGL. Salons WebRTC, code d'invitation, resynchronisation, suspension lors d'une déconnexion et revanche dans le même salon.

Les sauvegardes et le réseau utilisent le schéma v4 depuis 0.4. Les anciennes sauvegardes v3 ne sont ni importées ni supprimées. Les profils Prudent, Bâtisseur et Collectionneur sont sélectionnables dans le lab ; le jeu garde Équilibré par défaut. Les bots du lab n'initient pas de négociations.

## Validation

**80 tests Node**, plus deux suites navigateur distinctes. Les résultats réellement vérifiés, environnements et limites sont dans [VALIDATION.md](docs/VALIDATION.md). Les artefacts GitHub Actions contiennent les captures, rapports, sources exactes et builds ; un artefact peut également exister après un échec, donc vérifier la conclusion du run.

```sh
npm run check && npm test && npm run build
python -m pip install playwright==1.57.0
python -m playwright install --with-deps chromium
python tests/browser.py
npm run build:lab
python tests/lab_browser.py
```

## Réseau, confiance et CrazyGames

Le serveur `scripts/dev.mjs` est une signalisation **de développement**, bornée, en mémoire, liée par défaut à `127.0.0.1`. Il n'exécute pas la partie, ne fournit pas TURN et ne survit pas à un redémarrage. Le navigateur hôte arbitre ; les pairs rejouent les commandes. Les graines publiques et checksums ne rendent pas un hôte malveillant fiable.

**Aucune XP ni monnaie permanente n'est attribuée.** Un résultat P2P n'est jamais une preuve suffisante pour créditer un compte. Arbitrage serveur, authentification vérifiée et registre transactionnel/idempotent restent à construire. Aucun Supabase existant ni service payant n'est modifié.

```sh
SIGNAL_URL=wss://votre-service.example/signal npm run build -- --crazygames
```

Le build active l'adaptateur SDK optionnel et exige une signalisation configurée ; il ne déploie rien. `TURN_CREDENTIALS_URL=https://...` peut désigner un endpoint à identifiants éphémères. Ne jamais publier un secret TURN permanent, une clé privée ou une clé service-role. L'intégration finale reste à recetter dans le portail CrazyGames.

Pas encore de matchmaking public, reconnexion après rafraîchissement, migration de l'hôte, minuterie AFK, comptes persistants, boutique ou classement serveur. Safari/iOS, Android réel, réseaux mobiles et TURN ne sont pas validés par des tests Chromium locaux. Aucune capacité à des millions de parties n'est démontrée.

Voir [architecture](docs/ARCHITECTURE.md), [sécurité](SECURITY.md), [roadmap](docs/ROADMAP.md) et [analyse des retours](docs/research/PLAYER_FEEDBACK.md). Le nom DICESTRICT reste à vérifier commercialement ; aucun plateau, texte de cartes ou élément graphique de Monopoly n'est repris.

Copyright © 2026 M&G Group. Tous droits réservés. Aucune licence open source n'est accordée.
