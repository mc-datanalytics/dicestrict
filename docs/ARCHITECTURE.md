# Architecture 0.5

## Laboratoire isolé

`src/lab/core.js` orchestre `createGame` / `applyAction` sans session réseau, stockage ou récompense. `src/lab/worker.js` isole les calculs, `statistics.js` agrège par bloc de graine et `app.js` affiche les résultats et un replay en lecture seule. `scripts/balance.mjs` utilise les mêmes fonctions côté Node. Les versions lab/politiques et empreintes des sources accompagnent les rapports. Voir `BALANCE_LAB.md` pour les dénominateurs et limites.

La 0.4 a ajouté `CASINO_BET`, `src/game/casino.js` et `src/scene/living-city.js`. Le protocole courant est v4 (identifiant de partie et révision conservés). La 0.5 ne change ni les règles de ce réducteur ni le schéma des parties. Le lab ne se branche jamais sur `RoomSession`.

## Découpage

| Module | Responsabilité |
| --- | --- |
| `src/game/board.js` | Données originales, économie, placement des 28 cases |
| `src/game/engine.js` | Réducteur pur, validation, enchères et calcul du patrimoine |
| `src/game/deals.js` | Offres publiques bornées, échanges atomiques, expiration et validation |
| `src/game/presets.js` | Formats explicites annoncés avant le lancement |
| `src/game/bots.js` | Décisions basées uniquement sur les informations visibles |
| `src/scene/` | Géométrie procédurale, matrices, WebGL2, caméra et animations |
| `src/ui/` | Interface DOM accessible et coordination des actions |
| `src/network/` | Protocole versionné et sessions WebRTC amicales |
| `src/platform/` | Adaptateur CrazyGames optionnel |
| `scripts/dev.mjs` | HTTP local + signalisation WebSocket de développement |

## État et commandes

Les commandes acceptées sont `ROLL`, `BUY`, `SKIP`, `END`, `UPGRADE`, `SELL_LEVEL`, `MORTGAGE`, `REDEEM`, `BID`, `PASS`, `MOVE`, `OFFER_DEAL`, `ACCEPT_DEAL`, `DECLINE_DEAL`, `CANCEL_DEAL`, `CASINO_BET`. Le moteur clone l'état, vérifie l'acteur et la phase, applique la règle, incrémente la révision et vérifie les invariants. `currentPlayer` retourne l'enchérisseur pendant une enchère, sans modifier le propriétaire du tour normal.

Le protocole v4 porte l'identifiant de partie et sa révision. Le transport associe l'identité à la connexion ; il n'utilise jamais un identifiant d'acteur revendiqué par le client. Le checksum FNV-1a détecte les divergences accidentelles, pas une attaque. Les snapshots sont validés structurellement mais restent des données de l'hôte non fiables.

## Mobilité et négociation

`ROLL` produit les dés sans déplacement si le joueur possède encore un jeton. La phase `choose` attend `MOVE` avec offset −1/0/+1. Le choix normal ne consomme rien ; les autres consomment une unité. La résolution de case et le passage au départ sont appliqués une seule fois après la décision. Le moteur brut autorise zéro à trois jetons initiaux ; les trois formats exposés dans l'interface en donnent deux.

Les commandes de négociation utilisent l'identité du pair et non le joueur dont c'est le tour. Une acceptation doit viser une offre ouverte adressée à ce pair. L'objet contient des contreparties fixées ; elles sont revérifiées sur l'état courant puis transférées atomiquement. Aucun entier fractionnaire, terrain dupliqué, double acceptation, crédit négatif ou promesse différée n'est autorisé. Les offres affectées par une vente, une construction, une insolvabilité ou une expiration sont clôturées.

Le numéro `turnSerial` compte les fins de tour ordinaires (pas les clics ou enchères). Il règle les échéances et quotas, sans utiliser d'horloge murale dans le réducteur. Les tableaux d'offres, listes de terrains et identifiants sont bornés. Un client peut accepter une offre avec une révision légèrement ancienne : le jeu doit correspondre, la révision ne doit pas être future et toutes les conditions sont revérifiées. Les commandes ordinaires exigent toujours une révision exacte. Le rejeu intègre chaque action acceptée dans l'ordre choisi par l'hôte.

Les règles du salon sont diffusées par `lobby-rules`, validées puis copiées dans le snapshot de début. L'interface de choix disparaît après le lancement. En Blitz, une faillite déclenche directement la clôture commune et ferme les offres ; le score reste le patrimoine des joueurs solvables. Pas de nouvelle monnaie ou de nouvelle écriture externe.

## Partie amicale

1. La signalisation crée un code de salon et attribue les identifiants de connexion.
2. L'hôte et ses invités échangent SDP et candidats ICE via ce service.
3. Les DataChannels transportent les commandes et les résultats. Les invités recalculent l'état.
4. L'hôte complète les places libres par des bots et verrouille les admissions.
5. Toute perte de joueur suspend la partie dans cette version ; aucune victoire n'est fabriquée.
6. La revanche conserve les connexions et utilise un nouvel identifiant de partie.

La topologie est une étoile : hôte ↔ chaque invité. La signalisation n'exécute pas les règles. STUN ne remplace pas TURN : certains réseaux imposent un relais qui consomme de la bande passante. Cette version garde aussi la signalisation ouverte pour la présence.

## Parties récompensées : conception, pas implémentation

Le serveur devra vérifier l'identité du fournisseur, créer la partie récompensée et contrôler le tirage aléatoire. Il appliquera les commandes via un moteur versionné. L'argent du plateau restera séparé de la monnaie du compte. Une terminaison valide déclenchera une transaction sur un registre append-only, avec une contrainte unique `(match_id, account_id, reward_kind)`.

Les tables sensibles ne seront jamais inscriptibles par le navigateur. RLS seul ne prouve pas qu'une victoire est légitime ; le serveur doit vérifier sa provenance. Un client ne pourra pas appeler une route `claimWin` avec un montant libre. Prévoir également quotas, règles d'éligibilité, prévention du rejeu, limites de farming et contrôle de la collusion.

Aucun dimensionnement n'est extrapolé à des millions de parties : mesurer salons/connexions, taux TURN, octets relayés, actions arbitrées, écritures en base et coût par partie avant toute promesse de capacité.

## Documentation officielle de référence

- https://docs.crazygames.com/requirements/multiplayer/
- https://docs.crazygames.com/sdk/game/
- https://docs.crazygames.com/sdk/user/
- https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Connectivity

La conformité finale doit être vérifiée dans le portail CrazyGames, pas déduite des mocks ou de la présence de l'adaptateur.
