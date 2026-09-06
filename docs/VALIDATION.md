# Validation — alpha 0.6.0

## Séparer les preuves

Le plan et le choix de la variante précèdent les corpus de confirmation : voir les commits et résultats dans [FAIR_OPENING_RESULTS.md](experiments/FAIR_OPENING_RESULTS.md). **19 800 trajectoires locales terminées, zéro échec**. Ces simulations ne constituent pas une recette humaine.

Le contrôle local de sources compte 45 fichiers JavaScript valides ; **97 tests Node passent**. Le jeu et le lab autonomes sont compilés. Les recettes navigateur sont exécutées sur GitHub Actions : le navigateur local de rédaction bloque la navigation de test et aucune tentative de contournement n'est utilisée.

## Recette navigateur réellement exécutée

Le [run 34054343253](https://github.com/mc-datanalytics/dicestrict/actions/runs/34054343253) a réussi tous les contrôles de code et les trois suites navigateur : **97 tests Node, 24 contrôles du jeu, 7 du lab et 3 des sessions complètes**. Les trois rapports récupérés ont `pageErrors: []` ; le dernier précise `humanParticipants: 0` et des entrées automatisées.

Deux parties complètes, Classique puis comp-60, ont chacune exécuté **147 commandes légales par l'interface**, dont **un échange accepté**, avec quatre pairs WebRTC. La trace exportée a été vérifiée en Node et importée dans le lab jusqu'à l'empreinte finale. Les captures de départ, négociation et import ont été inspectées. L'artefact **9995637996** a été téléchargé et son `tested-source.tar` comparé au code local : sources `src/`, `scripts/`, `tests/`, `package.json` et `lab.html` identiques octet par octet.

La conclusion globale de ce premier run est néanmoins **échec** : seule l'étape ultérieure de publication Git a été refusée, car le jeton du runner n'a pas la permission de modifier `ci.yml`. Aucun test n'a été supprimé pour résoudre cela. Le [run de publication 34055060055](https://github.com/mc-datanalytics/dicestrict/actions/runs/34055060055), **réussi**, a réappliqué exactement le même payload SHA-256, revérifié les tests Node et publié uniquement les sources sous `a2f970d8ee5b1a4265177363618ecfef171b7844`. Les fichiers de workflow sont gérés séparément via le connecteur autorisé.

La CI normale du dépôt exécute désormais les trois suites directement sur les fichiers publiés ; ses résultats doivent être lus sur la révision concernée. La réussite de la courte étape de publication n'est pas une nouvelle recette navigateur.

## Contrôles ajoutés

`tests/fair-opening.test.mjs` vérifie capitaux initiaux, absence de second versement, ouvertures interdites, ordre alterné et élimination, replays des six variantes à 2/3/4 joueurs, négociation légale et atomique, absence de lecture des futurs tirages, quotas, snapshots v4 refusés, messages de salon v5, pseudonymisation des traces (y compris identifiants ressemblant à des pseudonymes ou propriétés JS), altérations, horodatages, commandes manquantes et replays négociés.

`tests/playtest_browser.py` lance deux parties complètes avec quatre contextes Chromium isolés et de véritables DataChannels WebRTC locaux. Départ vierge, aucune injection de propriété ou de fortune : les commandes de lancer, achat, gestion et négociation passent par les contrôles de l'interface. La graine fonctionnelle a été choisie pour permettre une transaction reproductible ; elle n'est pas ajoutée aux résultats statistiques de confirmation. Les entrées sont **automatisées par des politiques**, même si les sièges réseau ne sont pas marqués IA : **zéro participant humain**.

Le test vérifie le choix de départ annoncé à tous, les capitaux, l'accord des quatre états après chaque commande, une négociation conclue, le terme de la partie, l'export volontaire, sa pseudonymisation, sa vérification en Node et son import/rejeu dans le lab. Les limites de fréquence réseau ne sont pas désactivées. Les rapports distinguent explicitement ces parcours de véritables sessions humaines.

Les suites préexistantes du jeu (`tests/browser.py`) et du lab (`tests/lab_browser.py`) gardent leurs contrôles WebGL2 stricts, mobilité, enchères, sauvegardes, casino, négociation/contre-offres, revanche, perte d'hôte, mobile, Worker et offline. Un rendu de secours ne remplace pas la vérification WebGL2.

## Reproduire

```sh
npm run check && npm test && npm run build
python -m pip install playwright==1.57.0
python -m playwright install --with-deps chromium
python tests/browser.py
npm run build:lab
python tests/lab_browser.py
python tests/playtest_browser.py
npm run balance:opening -- development lab-results/fair-opening
npm run balance:opening -- confirmation lab-results/fair-opening
```

## Portée et limites

Les recettes Chromium utilisent SwiftShader : API WebGL2 réelle, GPU logiciel. Les quatre pairs restent sur un seul runner. Ni téléphones physiques, Safari/iOS, GPU matériel, ni changements de réseau ou TURN ne sont couverts. Les fichiers exportés ne sont pas des preuves d'authenticité ou des droits à des récompenses.

La validation humaine nécessite encore les sessions et retours décrits dans [HUMAN_PLAYTESTS.md](HUMAN_PLAYTESTS.md). Issue #4 maintenue ouverte. Aucune publication CrazyGames, aucun arbitre serveur, XP ou portefeuille n'est déployé. Les données historiques de la 0.5 restent disponibles dans l'historique du dépôt, pas utilisées comme preuve de la 0.6.

Les artefacts peuvent exister après un échec. Toujours contrôler la conclusion du run, ses révisions et les rapports ; rétention de 14 jours sur GitHub Actions.
