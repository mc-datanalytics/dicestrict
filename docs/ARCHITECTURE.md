# Architecture 0.2

## Découpage

| Module | Responsabilité |
| --- | --- |
| `src/game/board.js` | Données originales, économie, placement des 28 cases |
| `src/game/engine.js` | Réducteur pur, validation, enchères et calcul du patrimoine |
| `src/game/bots.js` | Décisions basées uniquement sur les informations visibles |
| `src/scene/` | Géométrie procédurale, matrices, WebGL2, caméra et animations |
| `src/ui/` | Interface DOM accessible et coordination des actions |
| `src/network/` | Protocole versionné et sessions WebRTC amicales |
| `src/platform/` | Adaptateur CrazyGames optionnel |
| `scripts/dev.mjs` | HTTP local + signalisation WebSocket de développement |

## État et commandes

Les commandes acceptées sont `ROLL`, `BUY`, `SKIP`, `END`, `UPGRADE`, `SELL_LEVEL`, `MORTGAGE`, `REDEEM`, `BID`, `PASS`. Le moteur clone l'état, vérifie l'acteur et la phase, applique la règle, incrémente la révision et vérifie les invariants. `currentPlayer` retourne l'enchérisseur pendant une enchère, sans modifier le propriétaire du tour normal.

Le protocole v2 porte l'identifiant de partie et sa révision. Le transport associe l'identité à la connexion ; il n'utilise jamais un identifiant d'acteur revendiqué par le client. Le checksum FNV-1a détecte les divergences accidentelles, pas une attaque. Les snapshots sont validés structurellement mais restent des données de l'hôte non fiables.

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
