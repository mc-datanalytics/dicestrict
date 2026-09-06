# DICESTRICT

**Roll. Build. Rule.** Une ville miniature, quatre ambitions, un lancer à la fois.

Jeu original de stratégie immobilière en 3D pour navigateur. Ville **Aurora**, interface française crème / vert profond / quartiers pastel. **Alpha 0.7.0 — branche de proposition**, pas une sortie commerciale. Aucun déploiement CrazyGames ou système de récompenses permanentes.

## Jouer et ouvrir le lab

Node.js 22+, aucune dépendance JavaScript à installer.

```sh
git clone https://github.com/mc-datanalytics/dicestrict.git
cd dicestrict
npm run dev
```

Jeu : **http://127.0.0.1:4173**. Lab : **http://127.0.0.1:4173/lab.html**.

```sh
npm run check
npm test
npm run build       # jeu statique + dist/dicestrict-offline.html
npm run build:lab   # ajoute lab.html + dicestrict-lab-offline.html
npm run preview
```

Les deux HTML autonomes s'ouvrent directement dans un navigateur de bureau. Le lab inclut son Worker et ne touche pas aux sauvegardes du jeu. Le jeu autonome permet le mode local ; le multijoueur nécessite une signalisation. Le lab est exclu du build ordinaire et de CrazyGames.

## 0.7 : objectifs, rythme et rivalités (branche non fusionnée)

Un cap contextuel indique le prochain quartier ou investissement ; des échanges
réciproques peuvent être préparés puis édités avant tout envoi. En solo, les IA
attendent une réponse à leurs offres, avec possibilité explicite de continuer
sans répondre. Le rythme Dynamique / Détendu ne change que leur délai de décision
local, pas les dés, les règles, les animations ou le rythme réseau.

Des étapes de partie, le vrai écart de patrimoine et un bilan de vos achats,
constructions, échanges et loyers rendent les décisions plus lisibles. Aucun
bonus économique ni récompense permanente. Les historiques partiels sont signalés.
Voir [l'évaluation, les changements et les limites](docs/ENGAGEMENT_0_7.md).
La ville 3D parallèle n'est pas remplacée ; aucun module de règles, de réseau,
de scène ou de simulation n'est modifié par cette tranche.

## 0.6.1 : correctifs de fiabilité

Exports d’essais limités à la partie enregistrée, résultats conservés après resynchronisation, envois réseau en file bornée plutôt qu’abandonnés en cas de congestion, handshake relancé, suspension propagée aux autres pairs et snapshots anciens refusés. **118 tests Node**, dont 21 nouveaux contrôles ciblés. Les montants, dés et options de départ ne changent pas. [Détails de l’audit](docs/BUGFIX_AUDIT_0_6_1.md) et [preuve de validation](docs/VALIDATION.md).

Exporter une trace avant de lancer une autre partie : l’enregistreur est effacé au changement de session et le consentement n’arme que la prochaine partie.

## 0.6 : tester une ouverture plus équitable

**Départ compensé, facultatif** : 1 800 / 1 860 / 1 920 / 1 980 crédits à quatre sièges. Le choix est annoncé avant le lancement et conservé dans l'état. Le bonus compte aussi dans le score au patrimoine. **Classique reste le réglage par défaut** : une réduction de biais chez certains bots ne suffit pas à imposer une nouvelle règle aux humains.

Six variantes ont été comparées sur des graines de développement, puis une seule retenue avant confirmation. **19 800 trajectoires, zéro échec**, 6 800 graines distinctes dont 6 000 hors développement. Sur la confirmation principale à quatre bots identiques / 12 manches, l'écart maximum–minimum des parts de victoire passe de **13,45 à 4,225 points**. Un autre corpus avec négociation automatisée confirme une réduction. Le résultat à deux joueurs est moins bon ; les autres sensibilités restent non concluantes. [Plan, résultats et limites](docs/experiments/FAIR_OPENING_RESULTS.md).

Les bots peuvent maintenant **proposer des échanges réciproques** complétant un quartier pour chacun, via les vraies commandes du moteur. Cette politique est volontairement bornée, sans lecture des futurs tirages. Le lab permet de l'activer ou de la couper ; le jeu l'utilise pour ses bots. Les joueurs humains restent libres de proposer, refuser ou faire une contre-offre.

**Essais locaux enregistrés sur consentement** : activer l'enregistrement de la prochaine partie depuis le salon/réglages, puis exporter sa trace pseudonymisée. Aucun envoi automatique. Importer la trace dans le lab pour la rejouer, sans la mélanger aux statistiques simulées. La trace ne certifie pas la présence d'humains ou l'honnêteté de l'hôte. [Protocole de pilote humain](docs/HUMAN_PLAYTESTS.md) — **aucun essai humain recueilli dans cette livraison**.

```sh
npm run balance:opening -- development lab-results/fair-opening
npm run balance:opening -- confirmation lab-results/fair-opening
npm run playtest:verify -- chemin/trace.json
```

## Le jeu et le laboratoire

Plateau original de 28 cases / 16 terrains / 8 quartiers. Achats, loyers, constructions équilibrées, hypothèques, enchères, faillites et score au patrimoine ; négociation publique non modale, contre-offres et échanges atomiques ; deux jetons Mobilité gratuits pour ±1 case. Formats Blitz 6 / Standard 12 / Grand District 18 manches. Le moteur et le lab supportent 2–4 joueurs ; l'interface de partie remplit quatre places, avec des bots si nécessaire.

La ville procédurale WebGL2 reflète propriétaires, constructions et hypothèques : commerces, terrasses, circulation, bus, piétons, grues, éclairage jour/nuit et événements visuels. Réglages qualité, mouvements réduits, ville figée et météo. [Spécification de la ville](docs/LIVING_CITY.md).

Le casino facultatif utilise **uniquement le capital fictif de la partie** : pas d'achat, conversion, retrait, recharge publicitaire, XP ou monnaie de compte. Ses gains et pertes changent réellement les fonds disponibles pour investir. La roulette rouge/noir conserve ses mises plafonnées, quotas, réserve et confirmation.

Le [Balance Lab](docs/BALANCE_LAB.md) exécute le vrai moteur : comparaisons A/B, quatre profils, rotations des sièges, intervalles par blocs de graines, configurations et exports JSON/CSV, empreintes de sources, replays 3D ou textuels. Prix et loyers restent définis dans les règles, pas dans un moteur approximatif séparé.

## Migration et validation

**Règles, réseau et sauvegardes passent en v5**, lab v2 / politiques v3. Pas de compatibilité silencieuse avec v4. Les anciennes sauvegardes restent sous leur ancienne clé ; elles ne sont ni supprimées ni importées. Les configurations historiques du lab reçoivent explicitement les valeurs `opening: classic` et `negotiation: none` ; les anciens replays de moteur restent incompatibles.

Consulter [VALIDATION.md](docs/VALIDATION.md) pour les résultats exécutés, les révisions et les limites, pas seulement le nombre de tests. Les artefacts GitHub Actions peuvent exister après un échec : vérifier aussi la conclusion et les rapports.

```sh
npm run check && npm test && npm run build
python -m pip install playwright==1.57.0
python -m playwright install --with-deps chromium
python tests/browser.py
npm run build:lab
python tests/lab_browser.py
python tests/playtest_browser.py
```

## Réseau, confiance et CrazyGames

`scripts/dev.mjs` est une signalisation de développement bornée, en mémoire, liée par défaut à `127.0.0.1`, sans TURN. Le navigateur hôte arbitre ; les pairs rejouent les commandes. Les graines publiques et checksums ne rendent pas un hôte malveillant fiable. Ni résultat P2P ni trace de test ne doivent créditer un compte.

```sh
SIGNAL_URL=wss://votre-service.example/signal npm run build -- --crazygames
```

Cette compilation configure le SDK optionnel ; elle ne déploie pas de service. Aucun Supabase existant ni service payant n'a été modifié. Ne jamais publier de secret TURN permanent, clé privée ou service-role. Authentification vérifiée, arbitre serveur, registre de récompenses, matchmaking, reprise après rafraîchissement et migration de l'hôte restent à construire.

Safari/iOS, téléphones physiques, GPU matériel et réseaux mobiles/TURN restent à recetter. Aucun résultat de simulation ne démontre une rétention, une durée humaine ou une capacité à des millions de parties.

[Architecture](docs/ARCHITECTURE.md) · [Sécurité](SECURITY.md) · [Roadmap](docs/ROADMAP.md). Le nom DICESTRICT reste à vérifier commercialement. Aucun plateau, texte de carte ou graphisme de Monopoly n'est repris.

Copyright © 2026 M&G Group. Tous droits réservés. Aucune licence open source n'est accordée.
