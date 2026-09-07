# Phase 3 — Casino, promenade et place centrale

## Périmètre et base

Base vérifiée : `feat/district-assets-phase2` au commit `6b020530ac8ab46d0dd882ffcdfd67d00215b989`. Branche dédiée : `feat/civic-promenade-phase3`. Ce travail est empilé sur la phase 2, pas une réintégration d'un ancien gameplay dans `main`.

Le premier ensemble est volontairement limité à un édifice public et ses abords : casino, parvis, promenade terrestre le long de la marina, jonctions vers les pontons existants, plantations, mobilier et fontaine centrale. Les modèles de propriétés de phase 2 et leurs générateurs sont conservés. Les huit propriétés ci-dessous ne sont pas revendiquées comme remodelées.

## Inventaire rattaché aux fonctions existantes

Les identifiants sont ceux de `BOARD`, base zéro, et non les numéros imprimés sur les cases (base un).

| Identifiants | Quartier économique existant | Propriétés | Modèle actuel et suite envisagée |
|---|---|---|---|
| 4, 5 | Jardins | Jardin Suspendu ; Allée des Cèdres | `parcelGeometry` / `tower` : bloc générique. À traiter ensuite en habitat-jardin, sans déplacer les parcelles. |
| 18, 19 | Nova | Nova Square ; Observatoire | Tour générique. Une expression plus scientifique/culturelle devra respecter les mêmes niveaux. |
| 22, 23 | Roseraie | Villa Rosée ; Galerie Bloom | Tour générique. Villas/galerie et jardins restent à produire. |
| 25, 26 | Solstice | Palais Solaire ; Golden Heights | Tour générique. Silhouettes de prestige restent à produire. |

`deriveCity` demeure la projection économique unique : acquisition, propriétaire, niveau 0–3, hypothèque et activité. Aucun quartier supplémentaire, case, valeur patrimoniale ou coefficient de loyer n'est ajouté.

| Élément public | Fonction / coordonnées existantes | Traitement de cette passe |
|---|---|---|
| Casino | Visuel public de `LivingCity.infrastructure`, centre x=-1,25 / z=-0,95 ; l'action reste dans `src/game/casino.js` et son panneau existant | Nouveau bâtiment volumétrique, entrée et parvis. Ce n'est pas une propriété achetable ni une case nouvelle. |
| Fontaine / place centrale | x=1,65 / z=1,45 dans `LivingCity` | Vasque en pierre, eau encastrée, sculpture centrale et place circulaire ; même position. La case 7 « Central Park » et son bonus sont inchangés. |
| Marina | `Marina`, bassin, quais, pontons et maison publique existants ; propriétés 8 et 9 | Géométries des bateaux, pontons et bâtiments conservées ; promenade et jonctions terrestres ajoutées. Le polygone d'eau reste inchangé. |
| Pavillon municipal | x=1,3 / z=-1,65 dans `infrastructure` | Petit modèle générique conservé. Sa finition contraste encore avec le nouveau casino. |
| Portails de métro / segment de surface | x=-2,25 et 2,3 / z=-2,55 | Conservés. Pure animation locale, pas une nouvelle règle liée aux cases Mobilité. |
| Abris de bus et routes | `infrastructure`, anneaux 4,48 et 6,98 | Conservés ; aucune déviation des circuits ni emprise sur les cases. |

## Fabrication et intégration

`src/scene/civic/kit.js` contient les trois générateurs exécutés. Le casino repose sur un hall haut et deux ailes basses, des ouvertures encastrées entre de vrais piédroits, un portique à colonnes, une toiture vitrée polygonale, des corniches, des terrasses et de petits lanterneaux. Le nom est limité à la frise du portique. L'ancienne grande enseigne flottante et le panneau publicitaire tournant sont retirés du monde 3D ; les boutons et panneaux d'interface ne sont pas modifiés.

La pierre, le métal, le zinc, le bois, les vitrages et le feuillage utilisent la palette et l'atlas existants. Les façades ne sont pas des images de bâtiment. Les chemins sont des bandes raccordées et des surfaces pavées basses, non une série de nouveaux socles privés. Les terrains non acquis conservent leur représentation vacante.

`CivicCenter` assemble le casino, la fontaine et la promenade en **un maillage par LOD**, un appel couleur et un appel d'ombre lorsque celle-ci est activée. Les pièces sont exportables séparément en GLB, mais le runtime reste natif : il ne télécharge pas les GLB. Les deux LOD sont créés à la demande et conservés ; aucun snapshot économique ni lancer de dés n'intervient dans leur génération.

La fin de journée est une phase du cycle visuel existant : horloge locale à 60 secondes, mode `auto`, `reduced=false`. Aucun réglage UI supplémentaire. La ville figée arrête l'horloge ; les mouvements réduits conservent leur comportement actuel. Les quatre sources analytiques de proximité déjà présentes sont repositionnées, pas multipliées. Pas de bloom, SSR, flou, transparence coûteuse ni nouvelle passe de post-traitement.

## Budgets de conception

À la caméra normale, la totalité du plateau et plusieurs dizaines d'objets sont visibles. Un bâtiment public d'environ deux unités de largeur ne justifie pas des matériaux ou textures indépendants par fenêtre. La priorité est donc donnée à la silhouette, au portique et aux retraits, puis aux détails de proximité.

| Catégorie | Maximum LOD bas | Maximum LOD haut |
|---|---:|---:|
| Casino | 4 400 triangles | 7 000 triangles |
| Fontaine | 1 800 triangles | 2 800 triangles |
| Promenade entière, mobilier compris | 4 700 triangles | 6 500 triangles |

Le manifeste donne les quantités produites, inférieures à ces plafonds. Le mode bas force le LOD bas. Les seuils sont 65 pixels CSS par unité pour passer au détail et 55 pour en sortir. Limite de cache : deux maillages pour tout l'ensemble public. Ce sont des choix de conception contrôlés, pas une preuve de 30 images/s sur smartphone.

La recette des trois cadrages normaux impose moins de 120 000 triangles couleur, 180 appels couleur et 18 Mio de buffers géométriques résidents. Les appels d'ombre sont suivis séparément. L'atlas de surfaces commun reste à 256² ; aucune texture supplémentaire au démarrage. Les compteurs de textures et framebuffer sont distincts, et ne prétendent pas mesurer l'allocation réelle du pilote.

## Exécuter et régénérer

```sh
npm run check
npm test
npm run build
npm run assets:export
node scripts/assets/export-civic.mjs
npm run assets:review
npm run dev
```

Jeu : `http://127.0.0.1:4173`. Le build autonome est `dist/dicestrict-offline.html`. La galerie autonome `assets/districts/review.html` contient les nouveaux modèles et tous les précédents. Les six nouveaux exports sont dans `assets/civic/{low,high}` avec leur manifeste et le PNG de l'atlas partagé. Ils sont archivés avec les preuves, et non dupliqués en binaires dans Git.

## États comparés et protocole de recette

`civic-fixtures.mjs` produit **une seule partie déterministe et légale**, graine 16, deux joueurs, format existant de 18 manches. Les 116 commandes sont rejouées par `applyAction`, avec empreintes à chaque étape. Ce n'est pas une étude d'équilibrage.

| État | Commandes déjà appliquées | Manche | Propriétés acquises | Total des niveaux | Empreinte |
|---|---:|---:|---:|---:|---|
| Début | 0 | 1 | 0 | 0 | `52e23cdb` |
| Milieu | 51 | 9 | 8 | 11 | `a211311d` |
| Fin, dernier début de tour avant clôture | 114 | 18 | 15 | 18 | `81346ab6` |

Le début a les 1 800 crédits initiaux ordinaires par joueur et **aucun terrain acquis**. Le casino et la promenade sont des équipements publics comme leurs prédécesseurs, sans transfert de patrimoine. La capture finale précède l'écran de résultat pour ne pas masquer le plateau. Deux branches de recette supplémentaires appliquent une hypothèque et une construction réellement autorisées par le reducer.

```sh
mkdir -p test-results/civic-baseline
git archive 6b020530ac8ab46d0dd882ffcdfd67d00215b989 | tar -x -C test-results/civic-baseline
python tests/civic_browser.py
```

Les captures principales sont des pages complètes à 1600×1000, DPR 1, caméra `reset` (angle 0,50 ; inclinaison 0,85 ; zoom 1 ; aucune cible déplacée). Les vues complémentaires utilisent uniquement cinq pressions sur le zoom ordinaire, plafonné à 1,5. Les vues de galerie ne remplacent pas ces captures de jeu.

L'avant provient du **véritable code phase 2 épinglé**, servi sur un autre port, non d'un bouton qui masque sélectivement de nouveaux objets. Les deux pages reçoivent les mêmes snapshots et horloges. Les visuels de jour et de fin de journée utilisent respectivement les horloges 0 et 60 : en phase 2 ce second instant n'avait pas encore le traitement chaud ajouté ici.

## Travail parallèle

La branche `feat/fair-opening-playtests` a été vérifiée au commit `b12332c211875ad08cc2918b3ce3be64008e8b11`. Son moteur et son protocole v5 ne sont ni rétrogradés ni recopiés. Cette passe conserve ceux de la base demandée. Une combinaison ultérieure doit être effectuée par intégration à trois voies, en conservant les ajouts de gameplay de cette autre branche puis en rejouant toutes les suites. Elle n'est pas déclarée testée ici.

Le workflow de cette phase est séparé ; le workflow de qualité préexistant et `package.json` sont inchangés. Aucune fusion dans `main`.
