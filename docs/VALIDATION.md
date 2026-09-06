# Validation — alpha 0.6.1

## Révision de l’audit

Code corrigé : **`cd1bd538b49ce0934e8192316f99098d46d99775`**. [CI normale sur ce code](https://github.com/mc-datanalytics/dicestrict/actions/runs/34057877712). La courte matérialisation des sources n’est pas une preuve de recette navigateur : seule la suite complète et son artefact font foi. Les changements documentaires postérieurs ne modifient pas le code testé.

**118 tests Node réussis**, aucun échec ou test ignoré ; **48 fichiers JavaScript** contrôlés ; constructions du jeu et du laboratoire réussies. Les 11 premiers tests ciblés échouaient sur la base non modifiée `b12332c`, puis passent avec les correctifs. Les 21 nouvelles régressions sont dans `tests/bug-audit.test.mjs` et `tests/outbox.test.mjs`.

`tests/browser.py` conserve ses 24 contrôles et en ajoute quatre : résultats après snapshot final, consentement/revanche/export, handshake avec les deux premières salutations volontairement perdues et propagation d’une suspension terminale. `tests/lab_browser.py` conserve ses sept contrôles ; `tests/playtest_browser.py` ses trois contrôles de parties complètes et d’import. Aucun seuil de convergence, test WebGL2 ou limite réseau n’est supprimé. Les fixtures indépendantes de négociation avancent leur révision au lieu d’imposer un snapshot périmé. En cas d’échec à quatre pairs, le diagnostic du salon est collecté avant de fermer les pages.

Une comparaison locale de l’ancien et du nouveau moteur a reproduit exactement **200 trajectoires et 29 196 commandes**, Classique/comp-60, avec/sans négociation. Cela n’est pas une nouvelle campagne d’équilibrage : les résultats statistiques historiques restent liés à l’ancienne empreinte du moteur. L’empreinte courante moteur/politiques/lab est `c9a114cc1a346369760d5c6ff10ea9f2bb3efd55eddb34c9338e6e85981ca9aa`.

[Audit détaillé et limites](BUGFIX_AUDIT_0_6_1.md). Les résultats des exécutions courantes et leurs rapports doivent être vérifiés sur le lien CI ci-dessus : un artefact peut exister après un échec. Chromium/SwiftShader est un rendu WebGL2 effectif sur GPU logiciel ; les pairs sont sur le même runner. Pas de validation Safari/iOS, téléphone réel, TURN inter-réseaux ou participation humaine. Le navigateur local de rédaction interdit la navigation de test ; les parcours sont exécutés sur le runner autorisé, sans contourner cette restriction.

## Historique séparé

L’ancienne recette 0.6 (97 tests Node et 24 + 7 + 3 contrôles navigateur) reste documentée dans [la révision antérieure](https://github.com/mc-datanalytics/dicestrict/blob/b12332c211875ad08cc2918b3ce3be64008e8b11/docs/VALIDATION.md). Elle n’est pas utilisée comme preuve des correctifs. La CI normale `34055490314` avait ensuite échoué dans la connexion de la deuxième table à quatre pairs ; l’audit a reproduit des défauts de handshake et conservé de meilleurs diagnostics, sans prétendre avoir identifié toutes les causes d’intermittence.

## Reproduire

```sh
npm run check && npm test && npm run build
python -m pip install playwright==1.57.0
python -m playwright install --with-deps chromium
python tests/browser.py
npm run build:lab
python tests/lab_browser.py
python tests/playtest_browser.py
```

Les artefacts Actions sont conservés 14 jours. Les sessions complètes automatisées ne sont pas des tests utilisateurs : zéro participant humain. La validation humaine décrite dans [HUMAN_PLAYTESTS.md](HUMAN_PLAYTESTS.md) et l’issue #4 restent ouvertes. Ni production CrazyGames, ni récompenses de compte, ni arbitre serveur déployé. Le protocole et les règles v5, le lab v2 et les politiques v3 restent inchangés.
