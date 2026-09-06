# Plan de livraison

Référence produit : [retours Monopoly → exigences DICESTRICT](research/PLAYER_FEEDBACK.md).

## Livré dans l'alpha 0.3

Plateau 3D original, achats/loyers/constructions/hypothèques, enchères au tour par tour, parties locales et salons WebRTC amicals ; maintenant échanges publics atomiques hors tour et contre-offres, deux jetons Mobilité, formats 6/12/18 et fin commune à la première faillite en Blitz. Les fins de tour bornent les offres ; aucune garantie en minutes. Les tests fonctionnels ne valent pas validation du plaisir ou de l'équilibrage.

## Priorité de production : ne pas perdre la table

Reconnexion au même siège après interruption et rafraîchissement, rattrapage de commandes, absence de double application, période de grâce, statut réseau explicite. Puis migration de l'hôte avec politique claire sur les états divergents et partitions réseau. Tester sous Wi-Fi, 4G/5G, NAT différents, TURN, suspension d'onglet et Safari/iOS. La version actuelle suspend la partie lors d'une perte de joueur ; elle ne la rétablit pas.

## Expérience : observer avant d'accumuler des règles

Comparer 0.2/0.3 avec des humains, mesurer durée et attente entre décisions, compréhension des offres, jetons consommés, abandon et demande de revanche. Évaluer la fin commune de Blitz et les effets de la négociation sur l'avance des leaders. Tester ensuite les horloges d'enchères/décisions et la gestion AFK sans interrompre une négociation active.

La restructuration « Last Stand », les prêts et l'éditeur de règles ne doivent entrer qu'avec un coût explicite, des limites anti-boucles et un protocole versionné. Une variante classée devra traiter la collusion et les échanges de complaisance.

## Publication et récompenses

Déployer une signalisation sécurisée, des identifiants TURN éphémères et des métriques de capacité/coût ; aucune promesse de millions de parties sans mesure. Recetter l'adaptateur sur CrazyGames, contrôler le chargement, les invitations, l'audio et l'accessibilité sur appareils réels.

Les parties récompensées nécessitent une autorité serveur, une identité vérifiée et un registre transactionnel idempotent. Aucun crédit persistant ne découle d'une déclaration du navigateur hôte. Pas de monétisation des jetons de décision dans cette proposition.
