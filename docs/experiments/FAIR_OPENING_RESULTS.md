# Départ compensé — résultats de la campagne 0.6

## Décision et portée

La variante **comp-60** réduit le biais entre sièges dans les deux scénarios confirmés à **quatre bots Équilibrés / 12 manches** : sans négociation, puis avec échanges réciproques automatisés. Elle ne démontre pas une égalité parfaite, n'est pas une correction universelle et n'a pas encore été validée par des personnes.

Elle est proposée **en option expérimentale**, annoncée au salon ; le réglage par défaut reste **Classique**. À quatre places, capitaux de départ : **1 800 / 1 860 / 1 920 / 1 980 crédits**. Le bonus compte dans le patrimoine : une partie de son effet est une compensation du score, pas nécessairement une suppression de l'avantage structurel d'acquisition. Le résultat à deux joueurs est moins bon ; ne pas généraliser cette option aux autres effectifs/formats. Les bots savent désormais initier certains échanges réciproques ; cela n'imite pas toute une conversation humaine.

## Plan et choix effectués avant confirmation

[Plan](FAIR_OPENING_PLAN.md), commit `0819004bf773b03d77b8705b428af8884a0b2a4a` ; [choix verrouillé](FAIR_OPENING_SELECTION.md), commit `07a3cfcd0e2b1a47d72cc64aec42d74891782fd7`.

Six conditions de développement, 800 graines chacune : classique, ordre inversé une manche sur deux, bonus de 20/40/60/80 par rang. Comp-60 a le plus petit écart observé (3,875 points), de peu devant l'ordre alterné (4,125). Aucun test ne prouve la supériorité de comp-60 sur l'ordre alterné. Le critère annoncé a choisi comp-60 et aucune autre variante n'a été sélectionnée après consultation du corpus réservé.

**19 800 trajectoires terminées, zéro échec** : 4 800 pour le développement, 15 000 pour la confirmation et la robustesse. **6 800 graines distinctes**, dont 6 000 hors développement. A/B et rotations sont corrélés ; ils ne multiplient pas le nombre d'observations indépendantes. Le script vérifie les intersections : **zéro graine commune** entre les campagnes et avec le développement.

Empreinte moteur/politiques/lab : `fe8a0627785df7a65be9ed6da1215f4e5c98d555d1d4b4311c6a57889a485171` ; moteur v5, politiques v3, lab v2. Les mesures ont été exécutées avec Node 22.16.0. Elles concernent ce code et ces politiques, pas des résultats de rétention.

## Confirmation principale : 2 000 graines nouvelles

| Siège | Classique | Comp-60 |
| --- | ---: | ---: |
| 1 | 32,300 % | 25,125 % |
| 2 | 25,125 % | 23,025 % |
| 3 | 23,725 % | 24,600 % |
| 4 | 18,850 % | 27,250 % |

Victoires ex æquo partagées. L'écart **maximum–minimum** passe de **13,450 à 4,225 points**, soit une réduction de **68,6 %**. Ce n'est pas la différence premier–dernier dans la variante : le quatrième devient le plus favorisé, et le deuxième le moins favorisé. L'intervalle approximatif à 95 % de la réduction est **+4,149 à +13,276 points**.

Les quatre conditions prévues passent : au moins 50 % de réduction de l'écart, borne inférieure positive, absence de hausse de plus de cinq points des parties avec faillite, constructions moyennes au moins égales à 75 % de la référence. Parties avec une faillite : **0,25 % → 0,20 %** ; niveaux finaux : **5,2375 → 5,4605**. Les 2 000 parties de chaque condition finissent au plafond de manches. L'effet sur la victoire au patrimoine domine donc ce scénario ; on ne mesure pas ici une durée humaine.

## Négociation : 1 000 autres graines

La politique propose un échange de terrains qui complète un quartier pour chacun, avec compensation de différence de prix et réserves de trésorerie. Les commandes `OFFER_DEAL`, `ACCEPT_DEAL` et `DECLINE_DEAL` passent par le véritable moteur ; aucune propriété n'est injectée pour ces campagnes. La politique n'inspecte ni la graine ni les futurs dés.

Parts de victoire : classique **32,10 / 28,85 / 21,70 / 17,35 %** ; comp-60 **24,70 / 27,60 / 25,60 / 22,10 %**. Écart **14,75 → 5,50 points** (−62,7 %) ; intervalle de la réduction **+4,40 à +13,106 points**. **2 441 échanges acceptés** au total : 1,220 par partie classique et 1,221 compensée. Niveaux finaux **14,801 → 15,486**. Les quatre garde-fous passent dans cette condition également.

Ce sont des négociations de bots, avec une heuristique étroite. Les humains peuvent bluffer, refuser, faire une contre-offre, s'allier ou changer de stratégie ; la simulation ne remplace pas ces comportements.

## Résultats défavorables ou non concluants conservés

Écarts et intervalles en points de pourcentage. La dernière colonne est l'intervalle approximatif à 95 % de **écart classique − écart compensé**.

| Campagne | Blocs de graines | Trajectoires A+B | Écart classique | Écart comp-60 | Intervalle de réduction |
| --- | ---: | ---: | ---: | ---: | --- |
| primary | 2000 | 4000 | 13.450 | 4.225 | 4.149 à 13.276 |
| two-players | 1000 | 2000 | 1.100 | 7.600 | -10.400 à 4.903 |
| three-players | 1000 | 2000 | 9.800 | 6.400 | -5.901 à 12.053 |
| negotiation | 1000 | 2000 | 14.750 | 5.500 | 4.400 à 13.106 |
| mixed | 250 | 2000 | 11.500 | 7.300 | -7.920 à 14.800 |
| mixed-negotiation | 250 | 2000 | 10.850 | 5.050 | -3.751 à 11.804 |
| casino | 500 | 1000 | 13.000 | 5.000 | -1.205 à 13.000 |

À **deux joueurs**, l'écart observé augmente (1,1 → 7,6 points) : il n'y a pas de justification pour activer cette compensation. À trois, avec profils mixtes, profils mixtes négociant ou casino, les intervalles incluent zéro : **confirmation insuffisante**, même quand les estimations ponctuelles s'améliorent. Les variantes Blitz/18 manches n'ont pas été évaluées dans ce plan. Aucun de ces résultats n'est masqué ou remplacé par un autre tirage.

## Méthode et reproductibilité

Le maximum–minimum est recalculé dans chacun des **600 bootstraps appariés par graine** ; les rotations sont moyennées dans leur bloc avant le tirage. Les intervalles sont approximatifs et conditionnels aux politiques. Ce n'est pas une preuve d'équivalence à 25 % par siège, ni un contrôle simultané de tous les scénarios de robustesse. Le seul critère principal de sélection est fixé dans le plan ; les autres indicateurs restent des garde-fous et diagnostics.

```sh
npm run balance:opening -- development lab-results/fair-opening
# Le choix historique est déjà enregistré dans FAIR_OPENING_SELECTION.md.
npm run balance:opening -- confirmation lab-results/fair-opening
```

Les sorties complètes contiennent chaque trajectoire, les configurations, graines, agrégats et replays. Le [résumé machine](FAIR_OPENING_SUMMARY.json) contient les empreintes SHA-256 de tous les rapports de confirmation. Modifier un module couvert par l'empreinte impose une nouvelle campagne ; les données historiques restent attachées à leur code.

## Validation humaine : pas encore réalisée

**Zéro participant humain observé dans cette livraison.** Les tests d'interface réseau pilotés par scripts ne changent pas ce nombre. Un [protocole de sessions et un export volontaire](../HUMAN_PLAYTESTS.md) sont fournis pour recueillir les traces et retours. L'issue #4 reste ouverte pour cette étape ; aucune revendication de validation humaine ou d'équilibrage parfait.
