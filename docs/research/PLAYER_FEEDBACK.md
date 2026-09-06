# Retours Monopoly → exigences DICESTRICT

**Révision du 6 septembre 2026 — lot alpha 0.3.0.** Base : étude qualitative fournie par le propriétaire du projet, intitulée « Quels sont les retours clients sur Monopoly ? ». Elle est traitée comme une synthèse d'hypothèses, pas comme un corpus d'avis codés. Son texte intégral n'est pas republié ici.

## Ce que les sources permettent réellement de dire

L'étude décrit dix familles de problèmes : durée, emballement économique, élimination, hasard, enchères mal utilisées, négociation, règles maison, fin de partie, fiabilité numérique et positionnement. Elle souhaite préserver l'accumulation, la propriété visible, la transformation du plateau, la tension des dés et les confrontations économiques. Cette organisation sert de base à notre revue ci-dessous.

Elle ne fournit cependant ni liste d'avis, ni méthode d'échantillonnage, ni fréquence par thème, ni liens correspondant à chaque citation. Les expressions « consensus extrêmement fort », « problème numéro un » et « 90 % du destin » ne constituent donc pas des résultats statistiques. On ne peut pas déduire d'une mauvaise note globale quelle mécanique explique cette note.

### Vérifications externes ciblées

| Source consultée | Observation accessible | Limite d'interprétation |
| --- | --- | --- |
| [BoardGameGeek, Monopoly](https://boardgamegeek.com/boardgame/1406/monopoly) | La fiche indexée affiche une moyenne arrondie de 4,4, environ 40 000 notes et 60–180 minutes. | La valeur exacte 4,37 citée dans l'étude n'a pas été revalidée. Les votants BGG ne représentent pas tous les acheteurs ou les joueurs occasionnels. |
| [Steam, NEW MONOPOLY, app 2929170](https://store.steampowered.com/app/2929170/MONOPOLY/) | La page consultée indique 36 % d'avis positifs parmi 517 avis d'acheteurs Steam dans le résumé. Elle précise que le jeu sorti le 26 septembre 2024 s'appelait auparavant MONOPOLY. | Photographie de la page accessible, pas mesure exhaustive en temps réel. Les filtres, langues, clés externes et mises à jour modifient les dénominateurs ; ne pas attribuer ce score à toutes les éditions. |
| [Discussion Steam Monopoly Plus, 2020–2023](https://steamcommunity.com/app/562810/discussions/0/1866119378815773454/) | Un message de janvier 2023 décrit un minuteur AFK qui gêne une négociation active. Le fil contient des interventions du support Ubisoft. | Témoignage daté concernant une autre édition, pas preuve d'un bug actuel dans toutes les versions. Il illustre le risque d'un minuteur mal conçu. |
| Même page Steam du jeu de 2024 | Le concurrent propose déjà une ville 3D animée et des achats, ventes et échanges. | La 3D n'est pas à elle seule une différenciation. La qualité des décisions et la fiabilité devront être éprouvées. |

Il s'agit d'un complément documentaire ciblé, **pas d'une collecte de centaines d'avis**. Les pages consultées peuvent être mises en cache. Le Monopoly physique, Monopoly Plus, l'édition numérique 2024 et Monopoly GO doivent rester des populations séparées ; nous n'avons pas étudié ici les achats intégrés de Monopoly GO.

## Revue des dix axes de l'étude

### 1. Durée : prévisibilité, pas seulement rapidité

Hypothèse issue de l'étude : le pire n'est pas nécessairement une longue partie, mais une longue période sans espoir ni décision utile. Exigence : annoncer la condition de fin et mesurer la durée réelle, les temps entre décisions et l'abandon.

**Livré :** formats Blitz (6 manches), Standard (12), Grand District (18), annoncés avant le lancement en solo et dans le salon. En Blitz, la première faillite conclut la partie pour tous ; le meilleur patrimoine des joueurs encore solvables gagne. Le cap en manches existait déjà en 0.2 : le choix des formats et cette fin commune sont nouveaux.

**Pas encore livré :** plafond garanti en minutes. Sans horloge de décision et règles AFK, six manches peuvent encore prendre longtemps. Les objectifs de l'étude (15–20 / 30–40 / 60 minutes) restent des cibles de tests humains, pas des promesses affichées.

### 2. Snowball : nouvelles décisions, pas rente au perdant

L'étude propose un retour par le risque plutôt qu'un bonus automatique au dernier. Nous retenons ce principe, sans prétendre l'avoir équilibré. Les échanges et la mobilité offrent de nouvelles options mais peuvent également renforcer un leader habile.

**Différé :** prêts, spéculation, aides de restructuration. Il faut d'abord définir leur coût, leur durée, le traitement des dettes dans le score et les boucles d'abus. Aucune monnaie gratuite liée au classement n'est introduite dans ce lot.

### 3. Élimination : un premier mode sans attente après la faillite

Le « Last Stand » de l'étude est une proposition, pas une préférence utilisateur directement mesurée. Lui ajouter crédit, intérêts, protection et objectifs risque d'allonger la phase déjà frustrante.

**Livré :** la fin commune de Blitz évite qu'un joueur fasse faillite puis attende la suite de cette même partie. **Limite :** elle n'empêche pas un joueur de se sentir battu avant sa faillite. Standard et Grand District conservent l'élimination individuelle. La faillite volontaire, le sacrifice d'un joueur et les échanges de complaisance peuvent influencer le résultat Blitz : ce format est amical et non récompensé.

**Différé :** restructuration finie, statut social après élimination et départ avec récompenses garanties. Les récompenses n'existent pas encore.

### 4. Hasard : deux ressources identiques pour tous

**Livré :** deux jetons Mobilité par joueur dans les formats proposés. Après le lancer, tant qu'il reste un jeton, trois destinations sont présentées avec les coûts connus : trajet normal gratuit, −1 case ou +1 case contre un jeton. Les dés ne sont pas relancés. Les conséquences ne sont appliquées qu'après le choix. Une fois les jetons épuisés, le déplacement redevient automatique. Ils ne s'achètent pas et ne se rechargent pas.

Le choix repose sur des coûts visibles ; un événement inconnu reste inconnu. Les IA utilisent la même ressource et ne consultent pas la graine pour choisir. **Hypothèse à éprouver :** le surcroît de contrôle vaut le temps de décision ajouté. Pas de garantie que le hasard soit devenu secondaire ou que l'équilibrage soit meilleur.

### 5. Enchères : ne pas remplacer l'attente par un concours de latence

Les enchères au tour par tour de 0.2 restent actives après un refus d'achat. La proposition de six secondes simultanées est **différée**. Elle demande une horloge d'autorité, un traitement des égalités, une politique de latence, une accessibilité clavier et une règle en cas de reconnexion. Afficher un compteur local ne suffit pas.

### 6. Négociation : mécanisme majeur livré, sans figer la table

**Livré :** un panneau non modal pour proposer terrains et crédits, accepter, refuser, annuler et contre-proposer. La préparation d'une offre ne bloque pas les autres joueurs et les saisies sont conservées lors des mises à jour du plateau. Les transactions peuvent être soumises et acceptées hors de son tour, aux phases précédant le lancer et de gestion de fin de tour.

Les déplacements, achats et enchères suspendent la conclusion d'une transaction : on ne peut pas changer le propriétaire ou le prix d'une case pendant sa résolution. Les deux parties doivent fournir quelque chose et au moins un terrain doit circuler. Seuls les quartiers sans bâtiments et les terrains non hypothéqués sont échangeables. Les biens et crédits sont revérifiés à l'acceptation et transférés ensemble ou pas du tout.

Une offre ouverte par joueur, trois propositions par tour actif, expiration après un cycle de table compté en fins de tour, annulation des offres devenues impossibles : ces limites cherchent à réduire le spam sans imposer un délai de lecture de quelques secondes. L'offre ne réserve pas les crédits. Une contre-offre remplace l'ancienne seulement si elle est valide.

**Limites assumées :** les offres sont publiques, non secrètes ; pas de prêt, de promesse différée, de partenariat ni d'exemption de loyer. Les IA acceptent/refusent selon une heuristique de valeur visible et de réserve de trésorerie ; elles ne créent pas spontanément d'offres et ne sont pas des arbitres d'équité. Interdire les cadeaux entièrement unilatéraux n'empêche pas la collusion.

### 7. Règles maison : un socle lisible plutôt qu'un catalogue

Les trois formats sont partagés aux invités dans le salon puis fixés dans l'état de partie. C'est un premier niveau de personnalisation, **pas** un éditeur complet de règles communautaires. Les classements, lorsqu'ils existeront, devront distinguer les variantes ; pas de bonus d'XP qui incite à exploiter une variante courte.

### 8. Fin de partie : urgence annoncée, sans modifier les contrats

**Livré :** un signal visuel annonce les deux dernières manches et rappelle le départage au patrimoine. Les choix et échanges restent utilisables selon leurs règles habituelles.

Nous n'intégrons pas les loyers +15 % et les événements aléatoires supplémentaires proposés dans l'étude : ils pourraient renforcer les grands propriétaires ou invalider des calculs faits jusque-là. Un signal de fin n'est pas encore un endgame « explosif ». Son intérêt doit être testé plutôt qu'affirmé.

### 9. Fiabilité numérique : priorité de production, non résolue par ce lot

L'infrastructure existante détecte certaines divergences et suspend une partie lors d'une perte de joueur. **Elle ne rétablit pas une connexion après rafraîchissement et ne migre pas l'hôte.** Cette limite interdit de qualifier le produit de prêt pour une audience publique importante.

Le lot ajoute la synchronisation des offres, leurs validations et le traitement des réponses concurrentes : une acceptation d'offre encore valable n'est pas jetée simplement parce qu'une autre commande a augmenté la révision. Identité, partie, offre et conditions économiques sont toujours vérifiées. Les commandes ordinaires gardent la contrainte de révision exacte.

Prochain critère de livraison réseau : reprise du même siège avec un jeton limité au salon, récupération des commandes manquantes, absence de double action, grâce en cas de suspension d'onglet, puis migration d'hôte testée contre partitions et états contradictoires. Ne pas déclarer ces étapes faites avant leurs essais.

### 10. Positionnement : une promesse à démontrer

Notre proposition : **la tension sociale et la construction d'un empire, avec moins d'attente subie et davantage de choix lisibles**. Elle ne dépend pas de l'affirmation que tout le monde déteste Monopoly. Préserver les sensations positives identifiées dans l'étude est aussi important que supprimer les irritants. Une belle interface et davantage de mécanismes ne prouvent pas une meilleure rétention.

## Exigences et preuves de livraison

| ID | Besoin | Lot / état | Critère d'acceptation |
| --- | --- | --- | --- |
| FEED-01 | Fin annoncée | 0.3 livré | Formats 6/12/18 identiques dans le salon et l'état ; pas de promesse de minutes |
| FEED-02 | Pas d'attente après faillite en Blitz | 0.3 livré | Première insolvabilité conclut la partie pour tous, offres fermées, pas d'action suivante |
| FEED-03 | Contrôle limité après les dés | 0.3 livré | ±1 consomme un jeton ; 0 non ; pas de loyer avant choix ; sauvegarde et replay cohérents |
| FEED-04 | Deals sans verrouiller le jeu | 0.3 livré | Offre/acceptation/contre-offre hors tour en WebRTC, panneau non modal, brouillon conservé |
| FEED-05 | Aucune transaction partielle | 0.3 livré | Pas de double acceptation/vente, crédits ou biens obsolètes refusés, réponses concurrentes validées |
| FEED-06 | Fin compréhensible | 0.3 livré | Deux dernières manches signalées, règles économiques inchangées |
| FEED-07 | Retour après perte réseau | Priorité production, à faire | Reprise identique après coupure/rechargement, idempotence, test sur réseaux différents |
| FEED-08 | Horloges équitables / AFK | À concevoir et tester | Pas d'expulsion pendant une négociation active, grâce et accessibilité vérifiées |
| FEED-09 | Retour stratégique après retard | Expérimental, à faire | Aucune boucle de dette/bonus ; effet mesuré sur agence et équité |
| FEED-10 | Personnalisation communautaire | À faire | Contrat de règles versionné, visible avant admission, distinction des classements |

Voir `tests/feedback.test.mjs` pour les invariants et simulations, `tests/browser.py` pour les parcours visuels et WebRTC. Un test de validité ne prouve ni le plaisir ni l'équilibre.

## Plan de validation utilisateur et de collecte

**Prochaine expérience proposée, non exécutée :** comparer 0.2 et 0.3 avec des groupes d'amis, des joueurs occasionnels sur mobile et des habitués de jeux de plateau, en alternant l'ordre des versions. D'abord vérifier la compréhension sans explication du développeur, puis observer des parties complètes. Séparer les impressions sur les commandes, le rythme et l'équité de celles sur la direction artistique.

Mesurer durée médiane/p90, intervalle entre décisions significatives, délai de réponse aux offres, usage des jetons, abandons avant fin, volonté de revanche et perception du contrôle. Ne pas compter chaque clic comme une décision. Étudier la position du meneur à mi-partie et la mobilité du classement sans transformer une simulation de bots en prévision de victoire humaine. Comparer Blitz et Standard séparément : leur condition de fin diffère.

Les cibles de durée de l'étude restent provisoires. Fixer les seuils de succès avant une expérience suffisamment dimensionnée, conserver la satisfaction du gagnant comme celle du perdant, et rejeter une variante qui réduit le temps au prix d'un sentiment d'arbitraire accru. Les mesures proposées ne sont **pas** une télémétrie déjà activée ; aucun nouvel envoi analytique n'est introduit.

Pour constituer un vrai corpus : conserver pour chaque avis l'URL/identifiant, édition, plateforme, date, langue, filtre d'acquisition, appréciation et codes de thèmes ; distinguer avis positifs/négatifs et bugs anciens/corrigés. Dédupliquer, enregistrer les dénominateurs, double-coder un sous-échantillon et publier la méthode ainsi que ses limites. La [documentation officielle de l'API d'avis Steam](https://partner.steamgames.com/doc/store/getreviews) décrit notamment la pagination et les filtres. Éviter de republier les textes intégraux ou les profils des auteurs. Aucun avis ni fichier de l'utilisateur ne doit être envoyé à un service externe pour l'analyse sans nécessité.
