# Premières mesures — Balance Lab 0.5

Campagnes locales réellement exécutées le 6 septembre 2026 avec Node 22.16.0, moteur v4, politiques v2, lab v1. **10 000 trajectoires terminées, zéro échec**. Ce sont des parties synthétiques, pas des parties de joueurs ni des mesures de rétention.

Empreinte des sources moteur/politiques/lab :
`a42df272a7c51e6d4b8e82a02dd1543ac232cf12d2f5a9b7e45d1418c92b635a`.

Les sorties `*-summary.json` de la CLI conservent les paramètres exacts, les empreintes de fichiers et les intervalles. Les rapports complets, résumés et CSV sont reproductibles avec les commandes ci-dessous.

## Protocole

| Expérience | Graines | Rotations | Trajectoires A + B | Comparaison |
| --- | ---: | ---: | ---: | --- |
| Sièges | 1 000 | 1 | 2 000 | Quatre bots Équilibrés, A = B |
| Casino | 500 | 4 | 4 000 | Désactivé / tous misent 60 crédits lorsque légal |
| Mobilité | 500 | 4 | 4 000 | 0 / 2 jetons, casino désactivé |

Toutes les conditions durent au maximum 12 manches, à quatre joueurs, sans clôture commune à la première faillite. Casino et Mobilité font tourner les quatre profils entre les sièges. Le contrôle Sièges exécute deux fois chaque graine identique : **2 000 exécutions ne sont que 1 000 observations**, pas un doublement de la précision. Les autres expériences ont chacune 500 blocs de graines ; leurs rotations sont corrélées.

## 1. L’ordre de passage demande une correction à tester

| Siège | Part de victoire | Intervalle approximatif 95 % |
| --- | ---: | ---: |
| 1 | 31,85 % | 29,30–34,80 % |
| 2 | 26,90 % | 24,40–29,50 % |
| 3 | 22,65 % | 20,05–25,40 % |
| 4 | 18,60 % | 16,40–20,80 % |

Ex æquo partagés. Le repère symétrique serait 25 %. L’écart observé entre premier et dernier siège est de **13,25 points** avec des politiques identiques. Cela justifie un chantier sur l’ouverture de partie ; cela ne mesure pas encore le biais chez des humains qui négocient. Toutes ces parties atteignent 48 lancers ; aucune faillite n’est observée dans ce corpus. La victoire au patrimoine à la limite de manches domine donc ce scénario.

Pistes à comparer, **non activées dans le jeu** : bonus de départ compensatoire, ordre alterné, phase d’acquisition initiale symétrique. Tirer au sort le premier joueur répartirait l’avantage entre les participants, mais n’effacerait pas l’avantage du siège. Chaque correction doit être retestée sur une graine maîtresse réservée, puis avec des humains.

## 2. Le casino reste secondaire, sans être économiquement neutre

Dans la variante B, on observe en moyenne **47,88 mises** et un résultat net total de **−44,25 crédits par partie** (intervalle −83,04 à −11,54), pour les quatre joueurs réunis. Le patrimoine final moyen par joueur passe de 2 547,48 à 2 536,46 crédits : différence appariée −11,03, intervalle −20,88 à −2,67.

Les niveaux construits passent de 4,048 à 4,016 : différence −0,032, intervalle **−0,100 à +0,030**. Ce corpus ne permet pas de conclure à une modification nette du nombre final de constructions. La part du patrimoine détenue par le meneur augmente en moyenne de **0,624 point**, intervalle +0,447 à +0,783. Le casino ajoute donc de la dispersion et n’est pas une simple décoration.

Ne pas confondre un résultat net moyen sur ces graines avec l’espérance théorique du pari, ni déduire un engagement accru. Les bots misent mécaniquement selon une politique fixe ; aucune monnaie n’est achetable ou persistante. Le casino reste facultatif et les limites existantes sont inchangées.

## 3. Les jetons Mobilité favorisent ici le développement

Le nombre moyen de niveaux construits à la fin passe de **3,007 à 4,362**, soit +1,355 niveau, intervalle **+0,946 à +1,716**. Le patrimoine final moyen augmente de **101,63 crédits par joueur**, intervalle +91,40 à +112,84. Le nombre de lancers reste 48 dans les deux conditions : aucune durée humaine en minutes n’en est déduite.

Ces résultats soutiennent le maintien des deux jetons comme hypothèse de design pour les prochains essais. Ils ne démontrent ni une expérience plus plaisante ni un meilleur équilibre entre stratégies. Les bots partagent une heuristique de déplacement ; aucun n’initie de négociation.

## Reproduire

```sh
npm run balance -- --config docs/experiments/seats.json --out lab-results/seats
npm run balance -- --config docs/experiments/casino.json --out lab-results/casino
npm run balance -- --config docs/experiments/mobility.json --out lab-results/mobility
```

Empreintes SHA-256 des rapports JSON complets (octets UTF-8 de sortie de la CLI, sans modifications) :

| Rapport | SHA-256 |
| --- | --- |
| `seats.json` | `40788b85f42a14ab927f5db1ca200205f8c84b993154654dfedf64033aecb478` |
| `casino.json` | `c9a62ffdc2aaaacf85c8a9d1ca280133afa71787eca2348f1eca1083033e4d6b` |
| `mobility.json` | `69966931b3eb9e280397782e7bbe6f6806c6cf12c75bd675f148281090a74876` |

Les intervalles utilisent 600 rééchantillonnages par blocs de graines, sans correction pour comparaisons multiples. Le même corpus ne doit pas servir indéfiniment à choisir puis à « valider » une correction. Aucun changement automatique des règles n’a été effectué à partir de ces mesures.
