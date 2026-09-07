# Phase 4 — ville assemblée, matériaux et effets

## Base et périmètre

Base : `main b5f547c97ce8387f1c31b25bef3a29952d0a94a7`, fusion de la PR #9. Livraison sur `feat/phase4-visual-finish`, PR #10 en brouillon, sans nouvelle fusion. La branche d'équipe `feat/engagement-rhythm-0-7` reste indépendante. Les règles, le réseau, l'UI, le laboratoire, les 28 cases et les cinq workflows préexistants sont conservés. Les scripts et assertions des tests antérieurs ne sont pas remplacés.

« AAA » désigne une ambition, pas une qualité certifiée. Même dans une scène développée, la référence illustrée possède une continuité urbaine, une densité et une étendue d'eau plus grandes. Cette passe ne prétend pas les avoir reproduites. Les vues de départ conservent les terrains vacants, sans argent ni bâtiments privés offerts pour embellir les captures.

## Modèles et intégration

Jardins 4–5 : maison à terrasses plantées et orangeraie vitrée à belvédère. Nova 18–19 : campus vertical à ailettes et observatoire à tambour/coupole. Solstice 25–26 : palazzo à portique et résidence à volumes décalés. Les variantes changent de silhouette et de volume, pas seulement de couleur. Chaque bien dispose de l'état vacant, des niveaux 0–3 et de deux LOD ; origine au centre, Y vers le haut, façade principale en +Z. La projection existante assure l'orientation, l'état hypothéqué, le fanion du propriétaire et l'activité.

Roseraie 22–23 conserve son générateur et ses géométries. Les lots Marina, Rivage, Horizon et Ateliers sont réutilisés. Le casino conserve son architecture avec une frise intégrée plus lisible. La promenade et la fontaine ne sont pas refaites.

Le pavillon municipal remplace l'ancien volume aux mêmes coordonnées : ouvertures profondes, portique, fronton, tambour vitré et coupole profilée. Les deux portails de métro possèdent marches, murets, garde-corps, verrières courbes et un petit M intégré. Leurs cheminements, plantations, bancs et lampes forment un maillage public partagé par LOD, sans empiéter sur les cases.

## Matériaux et VFX

`src/scene/finish/shader.js` fournit une réponse stylisée commune en espace linéaire, éclairage direct et hémisphérique, spéculaire GGX/Schlick pour les surfaces brillantes, réflexion de ciel analytique et courbe de sortie filmique. Il ne s'agit pas d'une chaîne PBR complète avec HDRI/GI. Les surfaces mates évitent le calcul d'un lobe spéculaire peu perceptible. Le bassin conserve son reflet planaire borné ; la nappe extérieure emploie des ondulations analytiques et un fondu spatial vers le fond. Aucun bloom ou flou plein écran n'est ajouté.

Un atlas RGBA8 256² encode micro-normales et rugosité des huit surfaces existantes. Le mode bas ne l'échantillonne pas ; les textures restent partagées. Un autre atlas RGBA8 256² encode les contacts et les petites zones de lumière au sol. Ce champ se reconstruit lors des changements immobiliers, pas à chaque frame ou lancer de dés. Ce n'est pas du SSAO ni de la GI. Les quatre sources analytiques de proximité sont conservées ; les lampes supplémentaires ne créent pas de nouvelles shadow maps.

Les transitions économiques existantes déclenchent un ruban de construction, une poussière légère et des gerbes teintées. Petits triangles regroupés, animation au vertex shader, âge en uniforme : aucun upload par particule ou par frame. Quatre constructions visibles maximum en haut, deux en bas ; poussière seulement en haut ; deux célébrations simultanées. Les effets disparaissent en mode mouvements réduits ou ville figée. Ils ne créent ni monnaie, ni commande réseau, ni récompense. L'état du mélange alpha et de l'écriture de profondeur est restauré après les effets.

## Budgets des modèles effectivement générés

| Modèle/famille | Maximum de triangles bas / haut |
|---|---:|
| Jardins, un bien | 2 748 / 4 644 |
| Nova, un bien | 2 908 / 4 912 |
| Roseraie conservée, un bien | 2 534 / 4 362 |
| Solstice, un bien | 3 024 / 5 188 |
| Pavillon municipal | 2 119 / 3 583 |
| Un portail de métro | 564 / 700 |
| Cheminements et mobilier nouveaux | 4 592 / 6 340 |

Les silhouettes, toits et ouvertures visibles ont priorité sur les micro-objets. Un bien est un maillage indexé plus son fanion. Le lot public est un seul maillage par LOD. Le cache Harmony est limité à 16 maillages et 4 Mio, sans évincer un modèle visible. Les huit variantes actives au détail haut totalisent au maximum 3 616 392 octets ; les LOD inactifs les moins récents sont supprimés. Les autres lots gardent leurs caches bornés.

Ressources GPU ajoutées : 349 525 octets pour le détail avec mipmaps, 262 144 pour le champ au sol, soit environ 597 Kio. Ce dernier possède une copie CPU de 256 Kio. Les buffers géométriques, leur copie CPU de restauration, l'atlas du plateau, les ombres, le reflet, le framebuffer et les allocations inconnues du pilote sont comptés séparément. Le mode bas libère la shadow map et la cible de reflet ; le changement de qualité et la restauration du contexte restent testés.

Les GLB sont des exports d'échange des mêmes modèles natifs, pas des téléchargements obligatoires au démarrage. Les matériaux glTF de base sont exportés ; un lecteur générique ne reproduit pas les shaders natifs ou le champ de lumière. Le PNG RG-normal/B-rugosité est un format empaqueté pour ce moteur, pas une normal map glTF directement branchable.

## Régénérer et vérifier

```sh
npm run check
npm test
npm run build
npm run assets:export
node scripts/assets/export-civic.mjs
node scripts/assets/export-harmony.mjs
node scripts/assets/export-finish.mjs
npm run assets:review
```

Sources : `src/scene/harmony/extensions.js`, `src/scene/finish/`, `scripts/assets/`. Exports : `assets/harmony/`, `assets/finish/`, et kits précédents. Galerie : `assets/districts/review.html`. Les binaires reproductibles sont dans les artefacts CI et la livraison, pas dupliqués dans Git.

Le workflow `visual-finish.yml` sépare preuve et mesures. L'avant est le vrai `main b5f547c9`, servi sur une autre origine, pas une fonction qui masque des objets. `civicFixtures()` et `waterfrontFixtures()` fournissent des historiques légaux déterministes. Dimensions 1600 × 1000, DPR 1, état, horloge et caméra identiques dans chaque paire. Caméra principale : angle 0,5, inclinaison 0,85, zoom 1, cible normale. Les vues obliques (inclinaison 0,63 / zoom 1,12) et le zoom 1,5 restent accessibles au joueur. Les vues studio servent seulement de complément.

Le diagnostic ABBA bas/haut, figé/animé, conserve six mesures après deux chauffes par bloc. Une lecture synchrone d'un pixel mesure rendu logiciel et synchronisation, pas le seul GPU matériel. Les nouvelles ressources sont testées après perte de contexte, au repos et pendant les transitions. Les scénarios WebRTC complets Classique et comp-60 restent séparés, avec leurs assertions et délais de convergence d'origine. Seule la limite globale de l'étape CI passe de 22 à 25 minutes (job borné à 28 minutes), car le rendu logiciel simultané de quatre navigateurs a dépassé l'ancien budget de quelques secondes.

## Défauts trouvés pendant la mise au point

La première preuve native a montré une eau extérieure trop striée et un contraste insuffisant derrière le titre inchangé. Les ondulations et le fondu spatial ont été corrigés. La galerie a révélé un réexport non supporté par le bundler ESM minimal : import/export explicite et test syntaxique sur les bundles produits ajoutés.

Le code `86108430` a mesuré un surcoût SwiftShader de 45–49 % par rapport au vrai main. Un premier allègement du shader n'a pas démontré de gain ; ne pas annoncer de non-régression temporelle ou de performances mobiles. La suite quartiers a également observé 18 949 206 octets de buffers après des zooms, dépassant la limite de 18 Mio. La borne en octets du cache corrige ce problème ; le seuil du test n'est pas relevé. Les résultats des anciennes exécutions échouées ne constituent pas une validation finale. Consulter le commit effectivement testé et ses rapports dans la PR #10.

Les journaux du run `34158220245` montrent la progression continue de la session Classique, 147 commandes, trace vérifiée et import du laboratoire réussi, avant une conclusion CI timeout à 22 minutes. La session comp-60 a également exporté ses 147 commandes avant son interruption. Ces sorties ne sont pas présentées comme une CI réussie ; la nouvelle limite globale est bornée, les contrôles fonctionnels et leur ordre sont inchangés, et toute la recette est relancée.

## Matériel restant à tester

Aucun téléphone physique, Safari/iOS, réseau mobile/TURN, batterie ou essai humain n'est validé ici. Sur appareils réels, noter modèle, OS, navigateur, résolution/DPR, qualité, température et alimentation. Exécuter les mêmes états jour/crépuscule, trois passages de 60 secondes après chauffe, puis 10 minutes animées. Relever distributions des intervalles de frames, longues tâches, chargement, transitions, mémoire, arrière-plan et restauration. Utiliser un compteur GPU seulement s'il est disponible et non disjoint. Le protocole détaillé `PHASE3_DEVICE_PROTOCOL.md` reste applicable. L'émulation tactile valide uniquement l'affichage et les interactions.
