# Validation — alpha 0.5.0

## Preuve courante, vérifiée le 6 septembre 2026

Révision de code : **`b10524bc9e00c51d5fb162f10ccc83a7ffbc4cb6`**.

Les deux exécutions indépendantes de CI ci-dessous sont **réussies** :

- [Push 34051347554](https://github.com/mc-datanalytics/dicestrict/actions/runs/34051347554).
- [Pull request 34051350115](https://github.com/mc-datanalytics/dicestrict/actions/runs/34051350115).

Elles exécutent chacune les contrôles statiques, les tests Node, la compilation du jeu, la suite navigateur du jeu, la compilation optionnelle du lab et sa suite navigateur. Les contrôles de WebGL2 n'ont pas été remplacés par l'acceptation d'un rendu de secours.

| Contrôle | Résultat |
| --- | --- |
| Syntaxe et imports locaux | 39 fichiers JavaScript valides |
| `npm test` | **83 tests réussis**, zéro échec |
| `tests/browser.py` | **24 contrôles réussis**, `pageErrors: []` |
| `tests/lab_browser.py` | **7 contrôles réussis**, `pageErrors: []` |
| Compilations jeu et lab | Client statique et deux HTML autonomes produits |

L'artefact du push **9994668677**, `dicestrict-build-and-browser-report`, a été téléchargé et ouvert. Les deux rapports JSON ont été lus ; les captures du tableau de bord, du replay WebGL2 et de l'affichage à 390 px ont été inspectées. Le `source.tar` a été comparé octet par octet à l'arbre local : le code était identique ; seuls les README/CHANGELOG en cours de mise à jour documentaire différaient. Les changements de documentation suivants ne constituent pas un nouveau résultat de test du code.

## Portée de la recette navigateur

Environnement : GitHub Actions Ubuntu, Node 22, Python 3.12, Playwright 1.57.0, Chromium, WebGL2 via SwiftShader. Le rendu est réellement effectué par l'API WebGL2 mais sur un GPU logiciel. Les contextes WebRTC sont isolés **sur le même runner** : il ne s'agit ni d'un réseau mobile ni d'une liaison inter-réseaux avec TURN.

La suite du jeu contrôle la ville dépendant des propriétaires et constructions, l'éclairage nocturne, la grue, l'arrêt des soumissions GPU au repos avec mouvements réduits, les achats/sauvegardes, les enchères, Mobilité, les règles annoncées au salon, le WebRTC, les négociations/contre-offres, le casino hors tour, la revanche, la perte de l'hôte, le mobile émulé, le HTML autonome et le mode sans WebGL.

Les sept contrôles du lab couvrent :

1. Un vrai Web Worker termine les simulations sans lire ni remplacer la sauvegarde sentinelle d'une partie humaine.
2. Son rapport égale exactement le résultat Node, y compris les intervalles, données par partie et empreintes.
3. Le replay en lecture seule vérifie les commandes, atteint l'empreinte finale attendue et dessine une image WebGL2 non uniforme sans erreur GL.
4. L'arrêt termine le Worker ; aucun échantillon interrompu n'est présenté comme un rapport terminé.
5. Le laboratoire fonctionne dans un viewport de 390 px sans débordement horizontal du document.
6. Le HTML `file://` embarque aussi son Worker, sans requête externe, et donne le même rapport que la version native.
7. Le simulateur et le replay textuel restent utilisables lorsque WebGL n'est pas disponible.

## Défauts rencontrés et corrections

La première recette du lab a détecté un accès `/lab.html` absent de la liste blanche du serveur. La route explicite et une assertion HTTP de non-régression ont été ajoutées. La suivante a détecté un débordement à 390 px : les pistes de grille peuvent désormais rétrécir et les tableaux défilent à l'intérieur de leur panneau ; les dimensions sont archivées.

Un run parallèle a ensuite expiré en attendant l'annonce des règles à un invité, alors que le run de push avait réussi. Cela a conduit à renforcer l'initialisation d'un DataChannel déjà ouvert et à attendre le message de disponibilité de l'invité avant d'activer le départ côté hôte. Trois tests ciblés ont été ajoutés. Les deux suites complètes ci-dessus ont repassé après ce changement. Cela ne prouve pas l'absence de toute autre course réseau.

## Campagnes d'équilibrage distinctes

**10 000 trajectoires terminées, zéro échec**, en trois campagnes Node locales documentées dans [BASELINE_0_5.md](experiments/BASELINE_0_5.md). Les configurations et empreintes des rapports permettent de les reproduire. Les graines distinctes sont respectivement 1 000 / 500 / 500 ; les exécutions A=B et les rotations ne sont pas des observations indépendantes supplémentaires.

Ces campagnes ne doivent pas être confondues avec les petits scénarios des tests navigateur, ni avec les simulations de non-régression comprises dans les 83 tests. Elles n'établissent aucune durée humaine, aucun effet sur la rétention et aucune qualité d'équilibrage universelle. Les bots du lab n'initient pas de négociations.

## Reproduire

```sh
npm run check && npm test && npm run build
python -m pip install playwright==1.57.0
python -m playwright install --with-deps chromium
python tests/browser.py
npm run build:lab
python tests/lab_browser.py
```

Les artefacts GitHub ont une rétention de 14 jours. Un artefact peut exister après un échec : vérifier la conclusion du run et les rapports, pas seulement la présence d'un ZIP. Le navigateur local de rédaction n'autorise pas la navigation vers le serveur de test ; la recette a donc été exécutée sur GitHub Actions, sans contourner cette restriction.

## Limites et historique

Safari/macOS et iOS, Firefox, Android réel, performance GPU matérielle, téléphone tactile réel, veille prolongée, changements de réseau et TURN restent à recetter. Reconnexion après rafraîchissement, migration d'hôte, matchmaking public, arbitre serveur, compte/XP/portefeuille et publication CrazyGames restent absents. Aucun service payant ni base Supabase existante n'a été modifié. Aucune capacité à des millions de parties n'est mesurée.

Le protocole et le schéma de partie restent v4 depuis 0.4 ; le lab n'ajoute pas de nouvelle économie au jeu. Les anciennes preuves 0.3 (52 tests Node / 16 contrôles navigateur) sont conservées dans [l'historique Git](https://github.com/mc-datanalytics/dicestrict/blob/45949c36c106213ddb4e0e6e952ddc3f04212c68/docs/VALIDATION.md) et ne servent pas de preuve de la version 0.5.
