# Essais humains — départ classique contre départ compensé

**Statut au moment de la livraison : aucun essai humain recueilli.** Les captures et traces des tests `playtest_browser.py` ont des commandes automatisées. Elles vérifient le logiciel, pas les sensations de personnes.

Les sessions avec les anciennes règles v5 ne doivent pas être mélangées aux nouvelles sessions v6. Les fichiers historiques restent archivés ; le protocole ci-dessous concerne désormais des déplacements automatiques.

## Objectif du pilote

Comparer le sentiment d'équité, la compréhension du bonus, les acquisitions et les négociations sous deux règles : A **Classique**, B **compensation de 60 crédits par rang**. Ne pas présenter B comme « équilibré » ou « meilleur » aux participants. Les deux versions gardent les mêmes loyers, prix, revenus de passage et règles de négociation.

Quatre personnes, aucun bot, format **Standard 12 manches**, déplacement automatique (moteur v6), casino désactivé. Capital A : 1 800 chacun. Capital B : 1 800 / 1 860 / 1 920 / 1 980 dans l'ordre de départ. Le bonus reste dans le patrimoine servant au score. Il n'est pas achetable et disparaît avec la partie.

Un groupe de quatre sur huit sessions est un **pilote d'utilisabilité**, pas un effectif statistiquement garanti. Pour étudier l'équité entre joueurs, prévoir plusieurs groupes indépendants et une taille d'échantillon décidée à partir de la variabilité du pilote, avant d'observer la campagne de confirmation. Ne pas traiter les quatre personnes d'une table ou les sessions répétées comme indépendantes.

## Installation et connexion

```sh
npm run dev
# jeu http://127.0.0.1:4173 ; lab http://127.0.0.1:4173/lab.html
```

Le serveur fourni est réservé au développement. Il ne suffit pas de donner cette URL locale à des amis sur un autre réseau. Pour plusieurs appareils, utiliser un environnement de test HTTPS avec signalisation accessible et, si nécessaire, TURN ; aucune infrastructure de production n'est déployée par ce protocole. Vérifier d'abord la connexion sans consommer une session d'étude. Une partie interrompue par une connexion doit être conservée comme interrompue, pas effacée des observations.

La personne occupant le premier siège crée le salon ; les autres rejoignent dans l'ordre prévu. Le code de salon ne doit pas apparaître dans les fichiers partagés publiquement. La liste doit comporter quatre humains avant le lancement. Changer l'ordre nécessite une nouvelle session avec le bon hôte/ordre d'arrivée ; le jeu ne permute pas automatiquement les personnes d'après la fiche.

## Consentement et enregistrement local

Obtenir l'accord de toutes les personnes sur les données recueillies et leur partage. Ne pas enregistrer voix, noms ou conversation privée dans la fiche. Chaque personne peut arrêter l'essai ; aucune récompense n'est conditionnée à la participation.

Dans le salon de l'hôte, ouvrir **Préparer un essai enregistré**, cocher l'accord pour la **prochaine partie**, revenir au salon et lancer. L'option ne vaut que pour cette session à démarrer. Elle est désactivée par défaut, sans envoi automatique et sans enregistrement dans un compte.

La trace conserve en mémoire les sièges pseudonymisés, les règles, les commandes, les délais écoulés et les empreintes. Elle retire les noms, identifiants de joueurs et code de salon. **Recharger ou fermer l'onglet détruit la trace non exportée.** À la fin, utiliser **Exporter la trace pseudonymisée** ; lors d'une interruption, l'export est disponible dans les réglages. Une lacune de commandes est marquée `discontinuous`, jamais prétendue complète.

Le bouton **Désactiver et effacer la trace** efface la copie en mémoire ; il ne peut pas supprimer un JSON déjà téléchargé ou déjà partagé. Conserver les fichiers dans un espace de test contrôlé et les supprimer à la fin de l'analyse selon l'accord donné. Ne pas publier les comptes rendus personnels dans une issue publique.

## Ordre contrebalancé proposé

Attribuer quatre identifiants **P1 à P4** localement sans exporter une table de correspondance nominative. L'ordre ci-dessous fait passer chaque participant à chaque siège une fois sous A et une fois sous B. Pour un deuxième groupe, inverser A et B, en gardant les sièges. Cela réduit certains effets d'apprentissage, sans prétendre tous les éliminer.

| Session | Règle | Siège 1 / hôte | Siège 2 | Siège 3 | Siège 4 |
| --- | --- | --- | --- | --- | --- |
| 1 | A | P1 | P2 | P3 | P4 |
| 2 | B | P2 | P3 | P4 | P1 |
| 3 | B | P3 | P4 | P1 | P2 |
| 4 | A | P4 | P1 | P2 | P3 |
| 5 | B | P1 | P2 | P3 | P4 |
| 6 | A | P2 | P3 | P4 | P1 |
| 7 | A | P3 | P4 | P1 | P2 |
| 8 | B | P4 | P1 | P2 | P3 |

Faire une courte initiation non comptée pour apprendre à lancer, acheter, proposer, refuser et faire une contre-offre. Pendant les sessions mesurées, les négociations sont **libres** : ne pas imposer un échange favorable ou obliger quelqu'un à accepter pour satisfaire un test. Un zéro échange accepté est aussi une observation. Ne pas réutiliser des graines connues des joueurs ni leur révéler les dés futurs.

## Fiche à compléter après chaque partie

Noter groupe pseudonyme, numéro de session, règle A/B, sièges, fichier de trace, terminée/interrompue et raison technique éventuelle. Relever séparément pour chacun, avant une discussion collective :

- Équité perçue du départ : 1 (très injuste) à 5 (très juste).
- Compréhension de l'effet du capital initial sur les achats **et le score** : oui / non / incertain.
- Liberté de décision et intérêt de la négociation : chacun sur 1 à 5.
- Une remarque libre sans donnée personnelle : moment de frustration, échange refusé ou choix marquant.

Indiquer si les participants avaient déjà joué et dans quel ordre les variantes ont été essayées, sans collecter d'âge ou d'autres renseignements non nécessaires. Ne pas transformer un délai entre clics en durée de réflexion exacte : discussions, pauses et soucis techniques peuvent l'influencer.

## Vérifier et analyser

```sh
npm run playtest:verify -- chemin/trace.json
```

Le lab propose **Importer un essai local pseudonymisé** pour parcourir la trace commande par commande, y compris en 3D. Cet import ne mélange jamais le résultat aux statistiques simulées A/B. Une trace valide prouve seulement qu'un enchaînement respecte le moteur : **elle ne certifie ni que des humains ont joué, ni l'honnêteté de l'hôte**. Le champ `humanParticipationVerified` reste donc `false` ; l'organisateur documente la participation réelle séparément, sans changer artificiellement ce champ.

Analyser les sièges, capitaux, loyers et patrimoines, mais aussi propositions, contre-offres, acceptations, refus et parties interrompues. Agréger à l'échelle des groupes/sessions appariées, pas en traitant les rotations comme de nouveaux joueurs. Présenter les opinions recueillies à côté des données du moteur ; n'attribuer aucun résultat de rétention à ce pilote.

La règle Classique reste disponible et par défaut. Ne promouvoir comp-60 comme réglage général qu'après cette étape et une réévaluation des scénarios non confirmés. Aucune XP, monnaie persistante ou récompense n'est attribuée à partir de ces fichiers.
