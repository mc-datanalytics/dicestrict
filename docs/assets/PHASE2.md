# DICESTRICT — assets 3D, phase 2

## Base et portée

Branche de livraison : `feat/district-assets-phase2`, créée à partir de `main` `00ede3a315df3681d70abfbb17b9c45fbdb2a59c` (0.5 intégrée). Arbre source de départ vérifié : `b6e7dc0074f7e14d15fd8d811f43e31fdae2935d`.

La branche `feat/marina-assets-0-6` ne contenait pas les fichiers livrés localement en phase 1. Cette branche phase 2 les réintègre au moteur 0.5 courant, sans revenir aux anciens fichiers réseau. Les branches de l'équipe ne sont ni réécrites ni fusionnées. Aucune règle économique, aucun protocole réseau, aucune case ni interface du jeu n'est modifié.

## Modèles livrés

| Habillage | Quartier / identifiants existants | Modélisation |
|---|---|---|
| Old Town | Rivage, 1 et 2 | Brique chaude, pierre, commerces, vitrages en retrait, corniches, pilastres, balcons, deux toitures (mansarde / pignon), lucarnes, cheminées, stores rayés, terrasse et tilleul. |
| Financial District | Horizon, 15 et 16 | Tour chanfreinée à couronnement incliné et tour à retraits successifs, meneaux et ailettes volumétriques, podium, entrées vitrées, marquise, marches, végétation et équipements techniques. |
| Industrial / logistics | Ateliers, 11 et 12 | Entrepôt à sheds avec pans vitrés, bardage nervuré, portes de chargement, butoirs, marquage au sol, conteneurs, camion, portique et ventilation. |

Chaque famille : deux variantes architecturales, niveaux de propriété 0 à 3, plus un site non acquis. Cela représente 27 modèles de parcelle, chacun exporté en deux LOD (54 GLB). Huit objets réutilisables, chacun en deux LOD (16 GLB) : tilleul, banc, table et chaises de café, lampadaire ancien, lampadaire moderne, conteneur, camion et portique. **70 GLB nouveaux**, plus les **32 GLB de la marina**, soit 102 fichiers d'échange.

La génération est native et déterministe : géométries réelles indexées, couleurs, normales, UV, identifiants de surfaces. Aucun bâtiment, bateau ou arbre principal n'est un billboard. Les GLB ne sont pas chargés par le jeu : ils servent à l'échange et à l'inspection. Le runtime exécute les mêmes fonctions de création, en met les résultats en cache et conserve sa distribution HTML autonome sans dépendance externe.

Origines : Y vertical, +Z façade / proue. Bâtiments et mobilier centrés sur leur base Y=0 ; bateaux sur leur ligne de flottaison. Une unité de plateau représente environ dix mètres visuels, sans prétention de simulation à l'échelle réelle. Les parcelles restent dans leur emprise et n'empiètent pas sur la boucle routière ni les cases sélectionnables.

## Économie et animation

Un terrain non acquis utilise son modèle de site vacant. Un terrain acquis au niveau 0 montre une petite activité commerciale, un bureau bas ou un entrepôt de base. Les niveaux 1 à 3 changent réellement les volumes : étages, retraits, terrasses ou équipement logistique. Un changement de propriétaire recolore le fanion sans recharger le bâtiment. L'hypothèque désature les matériaux et éteint le vitrage occupé ; l'activité des piétons reste celle de la projection économique `deriveCity`, qui la ramène à zéro.

Il n'existe pas de progression décorative indépendante du capital réel. Les règles d'achat, de construction équilibrée, d'hypothèque et de synchronisation restent inchangées. Les vues très développées des tests utilisent un état de recette déterministe et valide ; il ne s'agit pas d'une économie distribuée aux joueurs.

Les nouveaux bâtiments et équipements n'ont pas d'animation coûteuse. Le trafic et les passants préexistants restent actifs suivant les investissements. Le mode figé et les mouvements réduits arrêtent l'activité et les oscillations des bateaux. Un état sans changement immobilier ne reconstruit aucun asset de quartier.

## Budgets de conception

La caméra normale montre les seize propriétés à la fois, dont six habillées par ce lot. Un bâtiment occupe quelques dizaines de pixels ; les petites balustrades, nervures et éléments de menuiserie détaillés ne sont justifiés qu'en rapprochement. La priorité est donc donnée aux profils de toiture, à la proportion et aux baies plutôt qu'à la microgéométrie invisible.

| Budget maximal par parcelle, tous niveaux compris | LOD bas | LOD haut |
|---|---:|---:|
| Old Town | 3 200 triangles | 5 000 triangles |
| Financial | 1 550 triangles | 2 650 triangles |
| Industrial | 1 450 triangles | 2 000 triangles |
| Accessoire isolé | 700 triangles | 700 triangles |

Les limites sont exécutables dans `tests/districts.test.mjs`, avec contrôles de volumes, normales unitaires, indices valides, faces non dégénérées, emprise et reproductibilité. Les mesures exactes par fichier sont dans les manifestes générés ; ne pas confondre un plafond avec une mesure.

Le LOD haut s'active au-delà de 65 pixels CSS par unité et redescend sous 55 : cette hystérésis évite les alternances pendant le zoom. Le mode graphique bas force le LOD bas, plafonne le ratio de pixels du canvas à 1 et désactive les ombres projetées. Les fonctions de génération ne sont rappelées que pour une nouvelle combinaison modèle / niveau / LOD. Le cache de quartiers est borné à 20 maillages avec éviction des moins récemment utilisés, jamais d'une parcelle actuellement affichée.

Une parcelle entière est un batch indexé, toutes surfaces confondues ; les fanions partagent un même maillage. La petite place et les lampadaires publics forment un batch. Les sous-objets (fenêtres, sièges, nervures, etc.) ne produisent pas chacun un appel de rendu. L'instancing multi-draw n'est pas ajouté pour six bâtiments essentiellement différents : le regroupement par parcelle est plus simple ici. Les géométries de mobilier sont réutilisées à la construction des batches ; celles des véhicules/passants existants restent partagées.

Surfaces mutualisées : un seul atlas RGBA 256 × 256 (349 524 octets avec mipmaps), contenant huit motifs procéduraux 64 × 64 : teck, pierre, zinc, enduit, brique, ardoise, pavés, tôle. Pas de normal map, de texture 2K par bâtiment ni de matériau transparent à trier. Les surfaces sont identifiées par sommet dans un shader partagé, sans appel de rendu distinct par matériau. Les GLB d'échange séparent les primitives PBR pour leur compatibilité avec d'autres outils ; cette organisation ne correspond pas au nombre de draw calls du jeu.

Profil mobile visé, à valider sur matériel : téléphone de milieu de gamme avec 4 Go de RAM, navigateur WebGL2 récent, viewport voisin de 390 × 844 et rendu bas au ratio de pixels 1. Profil bureau visé : GPU intégré, viewport 1 600 × 1 000. Ces profils justifient les limites de pixels, de textures et de lots ; ils ne constituent pas une validation de ces appareils.

Plafonds de recette de scène : 120 000 triangles et 180 appels couleur en vue normale figée, 200 appels couleur en activité, 18 MiB de buffers géométriques résidents. Les passes d'ombre sont comptées séparément. Les buffers géométriques sont comptés à partir des allocations de vertices et d'indices ; ce n'est pas une mesure de la VRAM totale du navigateur. L'atlas de plateau existant, la carte d'ombre, le framebuffer, le MSAA et les allocations internes du pilote s'ajoutent à ces compteurs.

Budget de chargement du jeu autonome : moins de 300 KiB bruts et 100 KiB gzip, sans téléchargement de GLB au démarrage. Les 102 GLB et leurs textures servent aux outils et à la livraison, pas au coût de chargement d’une partie.

Les reflets de l'eau et du verre sont des approximations analytiques stylisées. Pas de ray tracing, SSR, bloom ou profondeur de champ. L'éclairage simple de la galerie retire ombres projetées, reflets et émission afin d'exposer les volumes.

## Compatibilité avec le travail parallèle

La branche `feat/fair-opening-playtests`, inspectée à `a2f970d8ee5b1a4265177363618ecfef171b7844` puis recontrôlée à `b12332c211875ad08cc2918b3ce3be64008e8b11`, a progressé pendant cette phase. Ses modifications économiques et de protocole v5 ne sont pas intégrées ici. Les IDs, groupes, positions et niveaux maximum du plateau restent identiques ; aucun de ses fichiers de scène n'a changé. Le rendu reste découplé de ses nouvelles règles.

Trois fichiers nécessiteront une attention lors d'un éventuel regroupement : `package.json` (conserver les scripts des deux travaux), `tests/living-city.test.mjs` (conserver ses assertions de protocole v5 et notre mock de maillages indexés / cache borné), `.github/workflows/ci.yml` (conserver sa suite `playtest_browser.py` ainsi que nos exports, notre suite quartiers et l'archivage des assets).

Cette combinaison n'a pas été fusionnée ni testée. La CI de cette livraison valide la base main 0.5 / protocole v4. Main était toujours à `00ede3a315df3681d70abfbb17b9c45fbdb2a59c` lors du dernier contrôle des branches.

## Régénération et lancement

```sh
git switch feat/district-assets-phase2
npm run check
npm test
npm run assets:export
npm run assets:review
npm run build
npm run dev
```

Jeu : `http://127.0.0.1:4173`. Jeu autonome : `dist/dicestrict-offline.html`. Galerie autonome : `assets/districts/review.html` (inclut également les modèles de marina).

Sources principales : `src/scene/districts/kit.js`, `src/scene/districts.js`, `src/scene/marina/`, `scripts/assets/`. Les exports GLB/PNG sont générés et archivés dans le paquet de livraison et l'artefact CI, pas dupliqués dans l'historique Git.

## Protocole de preuve

`tests/districts_browser.py` capture le vrai `Renderer` WebGL2. Pour l'avant/après, la même scène, le même état économique, la même caméra, la même marina, le même éclairage et le même viewport sont conservés ; les six nouveaux bâtiments et leur mobilier public sont remplacés par les générateurs génériques précédents. Il s'agit d'un contrôle A/B reconstruit dans le moteur courant, pas d'une capture historique modifiée.

Les mesures avant/après utilisent le même contexte et les mêmes caches déjà chauds. Elles isolent le coût des appels et de la géométrie affichée ; la mémoire résidente « avant » contient aussi les maillages mis en cache pour « après » et n'est pas un delta de mémoire entre versions. Quatre images de chauffe précèdent 16 échantillons par condition. Chaque image est suivie d’une lecture synchrone RGBA de 1 × 1 pixel et d’une pause de 25 ms, avec contrôle de perte de contexte, d’erreur GL et du pixel lu. Les temps `cpuSubmitMs` sont des temps JavaScript de soumission. Les temps `softwareFrameAndReadbackMs` incluent la soumission, le rendu logiciel, les échanges avec le processus GPU et la lecture ; ce ne sont pas des temps GPU isolés ni un débit de jeu garanti. Les nombres obtenus lors du premier essai avec `gl.finish()` ne sont pas retenus : cette suite a bloqué à la capture suivante.

Le runner est une VM Linux GitHub Actions avec Chromium / ANGLE / SwiftShader. Le modèle CPU, les versions et les dimensions effectives sont enregistrés dans `test-results/districts/report.json`. Le viewport tactile 390 × 844 est une émulation de disposition, pas un appareil mobile réel. Safari, iOS, Android et le coût thermique / énergétique sur téléphone restent à recetter sur matériel physique.

Les captures rapprochées peuvent dépasser les limites de zoom ordinaires via une cible de caméra réservée à la recette ; la caméra et les contrôles du jeu ne sont pas modifiés. Les vues de galerie utilisent le même moteur et les mêmes géométries, pas un rendu conceptuel.

## Résultats de cette livraison

Voir [VALIDATION.md](VALIDATION.md) pour la CI exécutée, les mesures du rendu final et les limites. Les sources et captures originales sont associées au commit de rendu `dd152847fdc9d76ad772b28b250e6f7fd5237057`. Les commits ultérieurs de documentation ne changent pas le jeu.

## Corrections issues de la revue des captures

La première revue a conduit à compléter les fenêtres arrière d'Old Town, sans relever son budget de 3 200 / 5 000 triangles. La galerie sous lumière simple a ensuite révélé que certains vitrages du yacht étaient occultés par la cabine blanche : les panneaux ont été reconstruits suivant les sections réelles de la cabine, avec un faible décalage extérieur, au lieu d'augmenter leur émission. Le yacht final compte 1 712 / 3 509 triangles. Cette correction a été exportée puis recapturée dans le run final validé.
