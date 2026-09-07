# Un lancer, un déplacement — 0.6.2

Décision du propriétaire : supprimer complètement Mobilité pour une prise en main grand public. Base : `b5f547c97ce8387f1c31b25bef3a29952d0a94a7` (main avec la ville artistique déjà fusionnée). Les branches `feat/city-harmony-phase4`, `feat/phase4-visual-finish` et `feat/engagement-rhythm-0-7` restent intactes. La phase 4 n’est pas annoncée terminée et la 0.7 n’est pas intégrée automatiquement.

## Nouvelle boucle

**Lancer → déplacement automatique du total des dés → effet de la case.** Aucun choix −1/0/+1, aucun jeton, aucun bouton secondaire ou confirmation supplémentaire. Un terrain libre propose toujours son achat ou son enchère ; les loyers et effets des cases restent automatiques. La stratégie demeure dans les achats, constructions et échanges.

Suppression dans le moteur, les bots, les formats, le salon, l’aide, les contrôles CSS, le simulateur et ses préréglages. `MOVE` et `choose` ne sont plus des commandes/phases valides. Les deux cases anciennement appelées Mobilité deviennent **Métro** pour éviter de confondre le transport urbain et la règle supprimée. Leur revenu de 60 crédits et leurs modèles restent identiques. Les prix, loyers et autres montants ne changent pas. Casino toujours limité aux crédits de partie.

## Versions et données existantes

Moteur/snapshots/réseau **v6**, lab **v3**, politiques **v4**. Un ancien paquet, une commande MOVE, un état contenant des jetons ou une configuration de lab contenant `mobility` est refusé explicitement, y compris `mobility: 0`. Il n’existe pas de paramètre caché réactivant la mécanique.

La clé locale devient `dicestrict:casual:v6`. La clé v5 et ses octets ne sont ni supprimés ni réécrits. En présence d’une ancienne partie, une nouvelle partie v6 est créée et un message l’explique. Une partie ancienne suspendue dans le choix de destination n’est pas transformée en décision prise à la place du joueur. Les préférences de son, caméra et qualité sont conservées.

Les anciens replays et traces restent lisibles avec leur version archivée, pas avec les règles v6. Les études historiques et leurs rapports sont conservés. `balance:opening` refuse de rejouer sous v6 le protocole historique avec Mobilité ; utiliser la révision archivée indiquée pour le reproduire. La commande actuelle est `npm run balance:automatic`.

## Nouveau diagnostic, sans réajuster l’économie

Deux corpus de **1 000 graines chacun**, quatre bots Équilibrés, 12 manches, casino désactivé. Comparaison fixe Classique / comp-60, sans sélection d’un nouveau bonus. Le second corpus permet les échanges réciproques. Le script vérifie l’absence de recouvrement avec le corpus de sélection et les sept campagnes 0.6, et entre les deux nouveaux corpus. **4 000 trajectoires terminées, zéro échec ; 2 000 graines indépendantes**, pas 4 000 observations indépendantes.

| Scénario v6 | Écart max–min Classique | Écart comp-60 | Intervalle approximatif de la réduction |
| --- | ---: | ---: | ---: |
| Sans négociation | 18,20 points | 4,20 points | +9,10 à +16,35 points |
| Échanges réciproques | 15,40 points | 4,65 points | +6,85 à +12,95 points |

Les niveaux finaux moyens sont 4,082 / 4,267 sans négociation et 11,382 / 12,039 avec négociation (Classique / comp-60). Les 2 000 parties négociées comprennent 1 959 accords acceptés. Ces mesures conditionnelles aux bots ne mesurent ni plaisir, simplicité humaine ou rétention, ni équivalence exacte entre sièges. Les intervalles sont 600 bootstraps appariés par graine du max–min lui-même, sans correction pour comparaisons multiples.

**Classique reste le défaut.** La compensation demeure expérimentale et facultative : elle n’est ni supprimée ni généralisée par ce changement. Ne pas comparer directement ces chiffres aux corpus précédents comme s’il s’agissait d’un A/B avec/sans Mobilité ; les graines et les règles diffèrent. Le nouveau résumé machine contient la configuration exacte, les empreintes du code et des rapports : [AUTOMATIC_V6_SUMMARY.json](experiments/AUTOMATIC_V6_SUMMARY.json).

## Recette

Les tests de l’ancienne mécanique sont remplacés par ses exigences inverses : arrivée immédiate, total des dés exact, règlement unique, commandes retirées impossibles. Les contrôles d’achats, enchères, faillites, négociation, sauvegarde, WebRTC, lab, WebGL et modèles sont conservés. Le fixture `tests/fixtures/legacy-choice-v5.json` est une vraie sortie de l’ancien moteur et sert à vérifier que la v6 n’altère pas sa sauvegarde.

Le premier essai navigateur local est bloqué par `ERR_BLOCKED_BY_ADMINISTRATOR` ; aucune restriction n’est contournée. La recette navigateur doit être exécutée sur GitHub Actions, incluant les deux sessions quatre-pairs Classique/comp-60 sur des runners séparés. Conclusions, captures et rapports seront attachés à la PR ; la présence d’un ZIP ne suffit pas à prouver une réussite. Aucune validation sur téléphone physique, Safari/iOS, TURN inter-réseaux ou panel humain n’est revendiquée.

## Compatibilité avec la branche 0.7 non fusionnée

Avant une future intégration de `feat/engagement-rhythm-0-7`, conserver la clé v6 et les changements du dock, de l’aide et des formats ; ne pas réintroduire MOVE ou les jetons lors de la résolution des conflits. Son observateur doit compter une arrivée sur chaque ROLL et abandonner sa branche dédiée à MOVE. Adapter ses fixtures et ses tests aux règles v6 avant de les relancer. Ses sources actuelles ne sont pas modifiées ici.
