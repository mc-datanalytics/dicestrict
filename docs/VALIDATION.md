# Validation

## Exécuté dans l'environnement de développement

- `npm run check` : syntaxe et résolution des imports locaux.
- `npm test` : 27 tests verts ; 500 parties à 2–4 joueurs et leurs replays identiques (44 337 actions).
- Signalisation : vraies connexions WebSocket locales, identité attribuée côté service, verrouillage du salon, refus d'une commande d'hôte émise par un invité et départ de l'hôte.
- `npm run build` : génération du client statique et du HTML autonome.

Le navigateur local de cet environnement est restreint : navigation locale bloquée et WebGL2 indisponible. Le mode de secours peut être inspecté en injectant le HTML autonome ; cela ne valide ni la 3D ni une connexion WebRTC réelle.

## GitHub Actions

Le workflow lance la suite Node et `tests/browser.py` sous Chromium. Le test navigateur refuse de valider la 3D si WebGL2 ne démarre pas, vérifie un framebuffer non uniforme sans erreur GL, teste deux contextes reliés en WebRTC, puis enregistre les captures desktop/mobile.

Consulter la conclusion du run, `test-results/browser-report.json`, les captures et l'éventuel `failure.txt`. Un artefact peut exister même si le test a échoué : sa présence ne signifie pas succès.

## À tester sur matériel et réseaux réels

Safari/macOS et iOS, Firefox, Android d'entrée de gamme, écran tactile, pause d'onglet, perte réseau, STUN/TURN, réseaux mobiles, performances et lisibilité des cases. La mesure de capacité serveur et la conformité CrazyGames restent distinctes des tests fonctionnels.
