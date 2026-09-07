# Architecture 0.6.2

## Réducteur et versions

Les modules natifs ESM du navigateur et du lab Node partagent `src/game/engine.js`. `createGame` crée l'état ; `applyAction` clone, valide l'identité et les paramètres, applique la commande, incrémente la révision et vérifie les invariants. Aucun temps mural ni accès réseau dans les règles. Règles/snapshots/protocole **v6**, lab **v3**, politiques **v4**. Pas d'import silencieux des anciennes parties v5 ; leurs clés de sauvegarde ne sont pas supprimées.

`board.js` définit le plateau et les montants, `presets.js` les formats, `deals.js` les transactions, `casino.js` le casino uniquement en crédits de partie. Les commandes sont ROLL, BUY, SKIP, END, UPGRADE, SELL_LEVEL, MORTGAGE, REDEEM, BID, PASS, OFFER_DEAL, ACCEPT_DEAL, DECLINE_DEAL, CANCEL_DEAL et CASINO_BET. `currentPlayer` retourne l'enchérisseur durant une enchère, sans modifier le propriétaire du tour normal.

## Ouverture et négociation

`opening.js` définit les six ouvertures du lab. `createGame` applique le bonus une seule fois au capital initial. `nextTurn` utilise l'ordre de la manche et ignore les joueurs éliminés, y compris lors de l'ordre alterné. Le jeu expose Classique et comp-60 facultatif ; Classique reste par défaut. Le bonus compte dans le patrimoine et n'a aucune valeur hors partie.

`negotiator.js` propose des échanges réciproques à partir des biens et fonds visibles, sans futurs tirages. Les deux parties complètent chacune un quartier, avec différence de prix et réserve contrôlées. Les bots du jeu l'utilisent ; le lab l'active explicitement selon sa configuration. Le moteur continue à revérifier toutes les transactions atomiquement. Pas de fonds réservés, cadeau gratuit, hypothèque ou quartier construit échangeable. La politique n'est pas un modèle complet du comportement humain.

`turnSerial` compte les fins de tour ordinaires pour les quotas et expirations. Les offres et identifiants sont bornés. Une acceptation tardive reste liée au même jeu, ne peut venir d'une révision future et est revérifiée sur l'état courant ; une commande ordinaire exige une révision exacte. Les règles sont annoncées par `lobby-rules` puis verrouillées au départ. ROLL tire les dés, déplace le pion de leur total et résout la case d'arrivée dans une seule transition. Le passage au départ est crédité une seule fois. Aucun jeton, phase choose ou commande MOVE n'existe dans les règles v6.

## Scène, lab et essais enregistrés

`src/scene/` projette l'économie en ville WebGL2 sans la modifier. Les bâtiments ne sont reconstruits que sur changement économique. Circulation, éclairage et événements visuels ne produisent pas de commandes réseau. Réglages de qualité, mouvements réduits et arrêt du rendu au repos : voir LIVING_CITY.md.

`src/lab/core.js` orchestre le même moteur sans réseau, stockage ni récompense. Un Worker exécute les simulations ; `statistics.js` agrège les rotations par graine. La CLI utilise les mêmes fonctions. Le hash SHA-256 du moteur, des politiques et du lab accompagne les rapports. Prix et loyers ne sont pas réimplémentés dans un simulateur simplifié. Le lab est exclu du build ordinaire/CrazyGames.

`playtest.js` observe les commandes acceptées via un callback du transport ou du jeu local. Il rejoue dans un état pseudonymisé indépendant. Une resynchronisation sautant des commandes marque la trace discontinue. Enregistrement volontaire de la prochaine partie, en mémoire, sans envoi automatique ; export explicite. Une trace rechargée ou importée dans le lab ne modifie jamais une partie humaine ou les statistiques A/B. Le vérificateur n'est ni un anti-triche ni une preuve de participants humains.

## Réseau amical et limites

La signalisation de développement attribue les identités de connexion et échange SDP/ICE. Topologie étoile : hôte vers chaque invité, via DataChannels. L'hôte attend la disponibilité des pairs, complète les sièges libres par des bots, verrouille les admissions puis transmet les commandes ; les invités rejouent les décisions. L'identité revendiquée dans un payload ne remplace jamais celle du pair. Le checksum FNV détecte une divergence, pas un hôte malveillant. Les graines sont visibles et prédictibles.

Toute perte de joueur suspend la partie. La revanche garde les connexions mais renouvelle l'identifiant de partie. Pas de migration de l'hôte ni reprise après rafraîchissement. Le serveur fourni est borné, en mémoire et réservé au développement. Il ne fournit pas de TURN ; certains réseaux nécessiteront un relais. Les tests entre contextes d'un runner ne valident pas les réseaux mobiles.

## Récompenses et production : conception uniquement

Aucune XP, monnaie de compte ou victoire classée ne découle d'une partie P2P ou d'une trace. Le futur arbitre devra vérifier les identités, appliquer un moteur versionné et contrôler l'aléatoire. Un registre transactionnel devra dédupliquer `(match_id, account_id, reward_kind)`. Les tables sensibles ne seront pas inscriptibles par le navigateur ; RLS seul n'atteste pas une victoire. Prévoir rejeu, quotas, farming et collusion. Ne jamais exposer de service-role, secret TURN permanent ou clé de signature.

L'adaptateur CrazyGames reste à recetter dans le portail. Aucun service payant ou base Supabase existante n'est déployé/modifié. Mesurer connexions, taux de relais, débit des commandes, écritures et coût avant une promesse de capacité. Le pilote humain décrit dans HUMAN_PLAYTESTS.md reste à réaliser.
