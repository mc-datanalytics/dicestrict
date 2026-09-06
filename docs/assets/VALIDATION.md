# Validation exécutée — Assets phase 2

## Traçabilité

Base : `00ede3a315df3681d70abfbb17b9c45fbdb2a59c` (`main` 0.5). Branche : `feat/district-assets-phase2`. Commit de code testé : `dd152847fdc9d76ad772b28b250e6f7fd5237057`.

[Exécution GitHub Actions](https://github.com/mc-datanalytics/dicestrict/actions/runs/34055747552) : check, 147 tests Node, builds, export des 102 GLB, galeries, suite navigateur jeu, suite quartiers, build du laboratoire et suite navigateur laboratoire. Aucune fusion dans main.

L’artefact `dicestrict-build-and-browser-report` contient `source.tar`, `dist/`, `assets/` et `test-results/`. Les exports binaires sont reproductibles depuis les sources natives ; ils ne sont pas une dépendance téléchargée par le jeu. Conservation GitHub Actions : 14 jours ; le paquet de livraison contient également une copie complète.

## Résultats fonctionnels

147 tests Node passent. Les 24 contrôles de la suite navigateur du jeu et les 7 contrôles du laboratoire passent, sans exception de page. Ils couvrent notamment achats/sauvegardes, enchères, mobilité, négociation, casino en crédits de partie, rematch WebRTC, repli sans WebGL, version autonome et replay du laboratoire. Les connexions WebRTC sont entre contextes d’un navigateur sur la même VM : pas une validation entre réseaux différents.

La suite spécifique aux quartiers passe : huit captures A/B, ray-plane picking de la case 1, six états hypothéqués, ville active, émulation mobile, quatorze captures studio, mesures bornées et vérification de lecture de chaque frame. Zéro erreur GL et aucune perte de contexte dans les mesures finales.

100 snapshots sans modification immobilière ne régénèrent aucun modèle de quartier. Les 20 tentatives de rendu d’une scène inactive ne soumettent aucune nouvelle frame. Le fingerprint de l’état économique reste inchangé. LRU testé sur changements de niveaux / détails : maximum 20 modèles de quartiers, visibles jamais évincés, ressources libérées à la destruction.

Une vérification indépendante avec trimesh 4.11.1 a réimporté les 102 GLB finaux, vérifié des scènes non vides et leurs dimensions : zéro échec. Ce n’est pas le validateur de conformité Khronos. Comparaison octet par octet avec la base : les 15 fichiers protégés de `src/game`, `src/network`, `src/ui`, `index.html` et `config.js` restent inchangés.

## Conditions exactes du rendu

GitHub Actions Linux VM, Chromium ANGLE SwiftShader SOFTWARE WebGL2. No physical phone.

- CPU déclaré par la VM : `model name	: AMD EPYC 9V74 80-Core Processor`.
- OS : `Linux-6.17.0-1022-azure-x86_64-with-glibc2.39` ; Node `v22.23.2` ; Python `3.12.14`.
- Chromium `143.0.7499.4`, Playwright 1.57.0.
- Rendu : `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`.
- Vue bureau : 1 600 × 1 000 CSS, DPR 1 ; canvas mesuré 1290 × 894 pixels.
- Ville figée, mouvements réduits, jour, météo désactivée. 16 propriétés possédées, 30 niveaux construits, état de test valide.
- Les deux vues A/B utilisent le moteur actuel et conservent la marina. « Avant » rétablit seulement les anciens modèles génériques des six propriétés et retire le nouveau mobilier public. Ce n’est pas un screenshot historique de main, ni une comparaison de deux bundles différents.

## Mesures

| Mode / variante | Triangles couleur | Appels couleur + ombres | Buffers géométrie, Mio | Soumission CPU p50 / p95, ms | Frame logicielle + lecture p50 / p95, ms |
|---|---:|---:|---:|---:|---:|
| Haut, ombres actives — Avant | 78,270 | 20 + 17 | 14.75 | 0.20 / 0.30 | 1255.6 / 1267.8 |
| Haut, ombres actives — Après | 78,358 | 33 + 30 | 13.07 | 0.20 / 0.30 | 1273.7 / 1278.2 |
| Bas, sans ombres — Avant | 78,270 | 20 + 0 | 14.75 | 0.20 / 0.30 | 1011.0 / 1016.3 |
| Bas, sans ombres — Après | 78,358 | 33 + 0 | 13.07 | 0.20 / 0.30 | 1030.6 / 1034.2 |

Les triangles et appels des ombres sont comptés séparément. En mode bas, aucune passe d’ombres n’est soumise. La mémoire ci-dessus est la somme des buffers vertex/index alloués, caches compris après les inspections de modèles, et non la mémoire GPU totale : textures, framebuffer/MSAA, navigateur et pilote en sont exclus. Les caches sont chauds et l’ordre A/B est fixe. Ne pas présenter l’écart de mémoire comme deux mesures de démarrage à froid.

Chaque mesure comprend quatre frames de chauffe puis seize échantillons, avec lecture synchrone `readPixels(1×1)` à chaque frame, vérification RGBA et `gl.getError()`, puis pause de 25 ms. La colonne de temps logiciel comprend synchronisation / IPC / lecture ; elle n’est ni un temps GPU matériel isolé, ni le FPS du jeu. Le temps de soumission CPU seul ne prouve pas l’exécution du rendu. Aucun intervalle statistique robuste ou essai répété multi-machine n’est revendiqué.

La scène normale reste sous les budgets de recette : 120 000 triangles couleur, 180 appels couleur, 18 Mio de buffers géométriques. La ville active atteint 110 appels couleur, sous le plafond de 200, et conserve les bornes originales de trafic et foule.

HTML autonome final : 252,521 octets ; gzip niveau 9 : 81,290 octets. Budget : 300 Kio brut / 100 Kio gzip. Un nouvel atlas de surfaces partagé de 256² pixels représente 262 144 octets RGBA, environ 349 524 avec mipmaps. Aucune texture 2K/4K ajoutée par petit objet.

## Captures réellement obtenues

`test-results/districts/` contient 26 PNG originaux : quatre paires avant/après (vue normale, Old Town, Financial, Industrial), nuit, six hypothèques, émulation mobile, vérification après mesures et sept modèles sous deux angles en lumière simple. Les modèles studio sont les mêmes géométries et le même Renderer que le jeu, sans flou, bloom ni ombres.

Les images ont été examinées : distinction brique/toiture/café vs tours à retraits/façades vitrées vs sheds/conteneurs/portiques ; fenêtres arrière d’Old Town complétées après la première revue ; vitrages du yacht corrigés après constat d’une occultation par la cabine. Les planches comparatives de livraison sont seulement des recadrages/assemblages des PNG originaux, conservés dans le paquet.

## Échecs rencontrés et limites

Le Chromium géré localement ne permettait pas ce test WebGL2 ; les preuves de rendu viennent donc de CI. Le premier run `34054145300` a passé les tests du jeu mais expiré sur une capture après son premier protocole de mesure. Ses nombres basés sur `gl.finish` ne sont pas utilisés. Le second run `34055029403` a passé toute la CI avec le protocole corrigé. Le run final ci-dessus inclut en plus la correction des vitrages du yacht.

Aucun téléphone réel, Safari/iOS, Android matériel, chauffe prolongée, consommation batterie ou réseau mobile n’a été testé. L’émulation 390 × 844 / DPR 2 avec mode bas valide l’affichage et les interactions, pas les performances d’un téléphone. Les timings SwiftShader sont lents en valeur absolue et ne permettent pas de certifier une fréquence mobile. Une recette physique reste nécessaire avant toute diffusion fondée sur une promesse de performance mobile.

Les huit propriétés non ciblées restent dans l’ancien langage de modèles, ainsi que certains équipements publics. La continuité entre îlots et la composition urbaine restent moins riches que la référence artistique ; cette phase apporte trois lots structurants, pas une ville entière finalisée. Aucun éclairage photographique ou écran de post-traitement ne masque ce périmètre.

La branche économique parallèle `feat/fair-opening-playtests` n’est ni écrasée ni fusionnée. Son intégration combinée, notamment les assertions v5 dans `tests/living-city.test.mjs`, n’est pas déclarée testée. Voir [PHASE2.md](PHASE2.md).
