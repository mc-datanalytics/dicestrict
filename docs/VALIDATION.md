# Validation — alpha 0.2.0

## Résultat vérifié le 6 septembre 2026

Le [run GitHub Actions 34041652218](https://github.com/mc-datanalytics/dicestrict/actions/runs/34041652218) est **vert**, y compris le test navigateur réel. Le premier run avait révélé un `require` résiduel dans le module ESM d'interface. Il a été remplacé par un import natif ; le contrôle statique interdit désormais ce mélange dans `src/`.

### Moteur, protocole et construction

- `npm run check` : 20 fichiers JavaScript, syntaxe et imports locaux valides.
- `npm test` : **27 tests réussis, aucun échec**. Cela inclut 500 parties complètes à 2–4 joueurs et le rejeu identique de leurs **44 337 actions**.
- Vraies connexions WebSocket locales pour la signalisation : identité attribuée par le service, verrouillage du salon, refus d'une commande réservée à l'hôte envoyée par un invité et départ de l'hôte.
- `npm run build` : client statique et HTML autonome construits. HTML autonome : **123 390 octets**, avant compression de transport.

### Navigateur — neuf contrôles réussis

Environnement : runner Ubuntu, Chromium 143 / Playwright 1.57.0, WebGL2 via SwiftShader. Les contextes multijoueurs sont isolés mais tournent sur la même machine de test ; ce n'est pas un essai sur deux réseaux publics.

1. Initialisation WebGL2, image effectivement dessinée et non uniforme, aucune erreur GL remontée.
2. Achat puis conservation de la sauvegarde après rechargement.
3. Enchère légale via les boutons de l'interface.
4. Deux contextes reliés par un véritable DataChannel WebRTC ; états identiques après un lancer.
5. Revanche synchronisée dans le même salon, avec fermeture des résultats.
6. Départ de l'hôte : suspension du client restant, sans victoire inventée.
7. Affichage mobile à 390 px sans débordement horizontal ; accès aux propriétés par la liste.
8. Mode de secours jouable lorsque WebGL est indisponible.
9. Aucune exception JavaScript non interceptée dans les parcours desktop/multijoueur testés.

Les captures desktop, mobile et multijoueur ont été récupérées et inspectées. L'artefact `dicestrict-build-and-browser-report` contient `test-results/browser-report.json` et les captures. Les artefacts sont conservés 14 jours ; les nouveaux runs en produisent de nouveaux. Un artefact peut aussi être conservé après un échec : toujours lire la conclusion du run.

## Reproduire

```sh
npm run check
npm test
npm run build
python -m pip install playwright==1.57.0
python -m playwright install --with-deps chromium
python tests/browser.py
```

Le navigateur local de l'environnement de rédaction était restreint ; les tests 3D/WebRTC ont donc été exécutés sur GitHub Actions. Aucun contournement de ses politiques locales n'a été appliqué.

## Non validé par ces tests

Safari/macOS et iOS, Firefox, Android d'entrée de gamme, matériel tactile réel, longue mise en veille d'onglet, changements de réseau, STUN/TURN et réseaux mobiles, performances GPU réelles et lisibilité en situation de jeu. Les captures ne constituent pas une mesure de fluidité.

L'intégration au portail CrazyGames, l'hébergement de production, le matchmaking public et la capacité à grande échelle restent à recetter ou à construire. Aucun arbitre serveur, système d'XP ou portefeuille persistant n'est déployé. Le contrôle de synchronisation P2P ne rend pas un hôte malveillant digne de confiance.
