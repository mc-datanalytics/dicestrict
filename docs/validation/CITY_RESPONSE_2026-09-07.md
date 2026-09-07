# Recette de la ville réactive — 7 septembre 2026

## Sources et publication

Base conservée : `b5f547c97ce8387f1c31b25bef3a29952d0a94a7` sur main.
Code livré : `b2b1d805981b2b7f54291fcca8b60050be099850` sur `feat/city-response-continuity`.
Arbre exact testé : `78b8ec7b9f1e5aea747bcfa2460ecb32f678a80e`.

Le [run de recette 34165090921](https://github.com/mc-datanalytics/dicestrict/actions/runs/34165090921) a réussi **toutes ses étapes de test**, mais sa conclusion globale est **failure** : l'étape finale de push a été refusée parce que le jeton du runner ne possède pas la permission de modifier les workflows. Ce n'est pas un échec fonctionnel, et ce run ne doit pas être présenté comme entièrement vert.

La publication de ce même commit a ensuite été effectuée par le connecteur GitHub autorisé, en avance rapide et sans force. Aucune permission n'a été élargie. Le `source.tar` récupéré dans l'artefact a été indexé localement : son `git write-tree` correspond exactement à l'arbre testé et publié ci-dessus. Les fichiers temporaires de livraison et leur workflow ont été retirés du résultat. Main et les autres branches n'ont pas été modifiés.

## Résultats exécutés

| Suite | Résultat |
| --- | --- |
| `npm run check` | 83 fichiers JavaScript, syntaxe et imports valides |
| `npm test` | 223 tests réussis, 0 échec, 0 ignoré |
| `npm run build` | Client ESM statique et HTML autonome construits ; HTML : 323 002 octets |
| `assets:export` / `assets:review` | Exports et revue des modèles réussis |
| `tests/browser.py` | 28 contrôles réussis ; `pageErrors: []` |
| `tests/city_life_browser.py` | 9 contrôles réussis ; `pageErrors: []` |
| `tests/districts_browser.py` | 7 contrôles réussis ; aucune erreur remontée |
| `build:lab` / `tests/lab_browser.py` | Construction et 7 contrôles réussis ; `pageErrors: []` |

Les nouveaux parcours passent par de vrais boutons d'achat, de construction équilibrée, de revente et d'hypothèque. Ils vérifient la stabilité des positions lors de l'achat, les grues articulées, le cadrage caméra, une image WebGL2 non uniforme sans erreur GL, les plafonds de population, la réutilisation des maillages pendant 600 pas d'animation et l'arrêt des dessins en mode figé. Ils couvrent aussi le viewport tactile émulé de 390 px, l'accès sans WebGL et le fichier autonome en `file://`.

La suite existante a notamment revérifié les négociations et le casino entre deux contextes Chromium reliés par de vrais DataChannels WebRTC. Le pari débite/crédite le même capital de partie sur les deux pairs, sans modifier le générateur des dés du plateau. Aucune monnaie de compte, aucun achat de crédits, aucun retrait ni XP n'a été ajouté.

## Preuves récupérées et inspectées

[Artefact 10034119092 — sources, builds et rapports](https://github.com/mc-datanalytics/dicestrict/actions/runs/34165090921/artifacts/10034119092), rétention 14 jours.
SHA-256 de l'archive téléchargée : `ddaeca0f8971999540ceca7ca91616caa4625be2ade8c8604682221cb98ae7f9`.

- `test-results/city-response/report.json` : résultats et diagnostics GPU.
- `test-results/city-response/01-terrain-disponible.png` à `05-mobile-emule.png` : captures du client exécuté, pas des maquettes générées.
- `test-results/browser-report.json`, `test-results/districts/report.json`, `test-results/lab-browser-report.json` : suites conservées.
- `delivery-logs/` : contrôle statique, tests Node et construction.

Les captures de construction, de quartier développé la nuit et de mobile ont été ouvertes et inspectées. Le style reste celui du jeu low-poly existant ; ce n'est pas le rendu cinématique des maquettes conceptuelles.

## Limites de cette preuve

Environnement : runner GitHub Linux, Node 22, Playwright 1.57 et Chromium 143.0.7499.4, WebGL2 via SwiftShader. Les tests réseau utilisent deux contextes isolés sur une même machine, pas deux réseaux distants. Les états initiaux sont des fixtures contrôlées, pas des parties humaines observées.

Les sessions WebRTC complètes Classique / comp-60 restent dans la CI habituelle et n'ont pas été exécutées par ce workflow de livraison. Leur résultat appartient au run de PR correspondant, pas à la présente preuve. Aucun test existant n'a été supprimé ou affaibli.

Pas de mesure de FPS sur GPU matériel ou téléphone réel, ni validation Safari/iOS ou TURN. Les bâtiments changent encore de niveau immédiatement : les grues ne constituent pas une construction étage par étage. Pas de navigation complète évitant les obstacles. L'interface mobile conserve des limites de cadrage et de densité malgré l'absence de débordement horizontal. Aucun déploiement de production, arbitrage serveur de récompenses ou publication CrazyGames.
