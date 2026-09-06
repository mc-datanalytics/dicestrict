# Validation — alpha 0.3.0

## Résultat vérifié le 6 septembre 2026

Le [run GitHub Actions 34043772081](https://github.com/mc-datanalytics/dicestrict/actions/runs/34043772081) est **réussi**. Le patch contrôlé par empreinte a été appliqué, puis les sources ont été publiées sur la branche uniquement après réussite des tests Node, de la construction et des essais navigateur.

- `npm run check` : 24 fichiers JavaScript, syntaxe et imports locaux valides.
- `npm test` : **52 tests réussis, aucun échec**. Le corpus synthétique comprend 500 parties de référence (44 337 actions) et 300 parties avec mobilité/offres (40 889 actions, 3 207 offres). Les 800 replays sont identiques, soit 85 226 actions vérifiées.
- `npm run build` : client statique natif et HTML autonome générés. Le HTML autonome testé pèse 150 848 octets avant compression de transport.
- `tests/browser.py` : **16 contrôles réussis**, rapport `pageErrors: []`.

Ces simulations ne sont ni des avis collectés, ni des tests utilisateurs, ni une mesure d'équilibrage. Une réussite fonctionnelle ne prouve pas une meilleure rétention.

## Essais navigateur de 0.3

Environnement : runner GitHub Ubuntu, Chromium / Playwright 1.57.0, WebGL2 via SwiftShader. Les deux contextes WebRTC sont isolés mais sur la même machine. Le test de connexion directe locale ne dépend pas d'un service STUN public.

1. Initialisation WebGL2, image effectivement dessinée et non uniforme, aucune erreur GL remontée.
2. Achat et sauvegarde locale conservés après rechargement.
3. Enchère légale via les boutons de l'interface.
4. Format Blitz, choix explicite après les dés et consommation du jeton conservés après rechargement.
5. Deux contextes reliés par un véritable DataChannel WebRTC, états identiques après un lancer.
6. Format choisi par l'hôte visible à l'invité et fixé dans l'état synchronisé.
7. Panneau de négociation non modal : la table continue et le brouillon reste présent lorsque l'autre joueur agit.
8. Proposition et acceptation hors tour par l'interface : transfert conjoint de terrains et de crédits sur WebRTC.
9. Contre-offre par l'interface : inversion des lots, révision des crédits, seuls les termes acceptés sont exécutés.
10. Revanche synchronisée dans le même salon avec fermeture des résultats.
11. Départ de l'hôte : suspension du client restant, sans victoire inventée.
12. Affichage à 390 px sans débordement horizontal et accès à toutes les propriétés.
13. Commandes de mobilité et panneau de négociation utilisables dans le viewport tactile émulé à 390 px.
14. HTML autonome généré exécuté en `file://` : initialisation WebGL2, mobilité et panneau de négociation.
15. Mode de secours jouable sans WebGL.
16. Aucune exception JavaScript non interceptée dans les parcours desktop/multijoueur et HTML autonome observés.

L'artefact `dicestrict-feedback-build-and-browser-report` (ID 9992484611) a été récupéré. Son rapport et les captures de négociation, de mobilité et du viewport mobile ont été inspectés. Les scénarios de négociation utilisent des états de départ contrôlés pour rendre les achats et échanges reproductibles ; ce ne sont pas des parties humaines observées.

Les artefacts GitHub ont une rétention de 14 jours. Un artefact peut exister après un échec : toujours consulter la conclusion du run et le rapport. La CI habituelle `DICESTRICT quality` relance les mêmes suites lors des changements de code et des pull requests.

## Migration

Protocole et schéma de sauvegarde v3. La sauvegarde v2 reste dans sa clé locale mais n'est pas chargée par 0.3. Pas de migration de partie en cours ni de compatibilité réseau inter-versions.

## Reproduire

```sh
npm run check
npm test
npm run build
python -m pip install playwright==1.57.0
python -m playwright install --with-deps chromium
python tests/browser.py
```

Le navigateur local de rédaction ne permet pas la navigation sur le serveur de test : les essais réels ont été exécutés sur le runner GitHub autorisé, sans contourner les politiques locales. Les tests conservent le contrôle strict de WebGL2, sans accepter le rendu de secours à sa place.

## Non validé par ces tests

Safari/macOS et iOS, Firefox, Android d'entrée de gamme, matériel tactile réel, longue mise en veille d'onglet, changements de réseau, STUN/TURN et réseaux mobiles, performances GPU réelles et lisibilité pendant une partie humaine. Les captures ne sont pas une mesure de fluidité.

Reconnexion, récupération d'un siège et migration d'hôte restent à développer. Le matchmaking public, l'intégration au portail CrazyGames, l'hébergement de production et la capacité à grande échelle restent à construire ou à recetter. Aucun arbitre serveur, système d'XP ou portefeuille persistant n'est déployé. La synchronisation P2P ne rend pas un hôte malveillant digne de confiance.

## Historique distinct — alpha 0.2

Le [run 34041652218](https://github.com/mc-datanalytics/dicestrict/actions/runs/34041652218) avait validé 27 tests Node, 500 parties / 44 337 actions et neuf contrôles Chromium. Le premier run avait révélé un `require` résiduel dans l'interface ESM ; il avait été remplacé par un import natif et interdit par le contrôle statique. La preuve de 0.2 n'est pas utilisée comme validation de 0.3.
