# Ville vivante et casino — alpha 0.4

## La ville représente la partie

`deriveCity(state)` projette les propriétaires, niveaux et hypothèques vers seize parcelles 3D, placées à l'intérieur des cases correspondantes. Le parcellaire est vide et planté au départ. Un achat ouvre un petit commerce ; les trois niveaux augmentent les volumes, terrasses, annexes et tours. La couleur du quartier reste sur la façade et celle du propriétaire marque la parcelle. Une hypothèque ferme visuellement les vitrines et réduit l'activité ; elle ne détruit pas un bien. Les reventes et faillites sont reflétées lors de la prochaine projection.

Les achats/constructions déclenchent une grue pendant six secondes d'animation locale. Un quartier complet déclenche une brève célébration. Les volumes économiques sont mis à jour immédiatement : ce n'est pas encore une simulation détaillée de chantier. Le premier chargement ou la nouvelle partie n'invente pas de cérémonie pour les biens déjà présents.

Deux routes reçoivent des voitures et deux bus. Les voitures ralentissent visuellement dans les zones plus actives. Les piétons font de petites boucles locales autour des parcelles ; leur nombre dépend de l'activité. Le parc central inclut une fontaine, des terrasses, une petite mairie, un casino identifiable, des lampadaires, des abribus, des passages piétons et une courte ligne de métro de surface. Une ambulance traverse occasionnellement la scène, sans sirène audio ni stroboscope. Les enseignes sont fictives et animées : aucun appel publicitaire ni traqueur.

L'ambiance alterne jour et nuit sur quatre minutes d'animation active. Les fenêtres s'éclairent progressivement ; une pluie légère apparaît ponctuellement. Ces effets ne changent jamais les revenus, loyers, déplacements ou résultats du casino. Les joueurs peuvent avoir une ambiance différente sans désynchroniser la partie.

## Coût de rendu et accessibilité

Aucune position de piéton, de voiture ou de goutte n'est envoyée sur le réseau. Aucun hasard visuel n'utilise les générateurs du moteur. La géométrie des parcelles ne se reconstruit que lorsque l'économie change ; les voitures et passants réutilisent leurs maillages. Les petits objets emploient des blocs à 36 sommets, au lieu des boîtes arrondies plus coûteuses. Le nombre de voitures est plafonné à 18 (6 en qualité légère), les passants à 48 (12 en qualité légère), les gouttes à 24 (aucune en qualité légère).

Le rendu actif est plafonné à 30 images/s, ce qui est une limite de soumission, **pas une fréquence minimale garantie**. Les petits objets mobiles ne projettent pas d'ombres. Qualité légère retire les ombres et réduit la résolution. L'onglet masqué ne soumet plus de rendu et son temps visuel ne rattrape pas artificiellement toute l'absence. « Ville vivante : figée » et les mouvements réduits arrêtent les animations ambiantes ; une scène immobile ne soumet plus de nouvelles images. Jour fixe / nuit fixe / cycle automatique et météo sont réglables indépendamment. Le mode sans WebGL conserve le jeu et le casino via le DOM, pas une ville animée.

Ce rendu est procédural, stylisé et beaucoup plus simple que la maquette illustrative : pas d'assets photoréalistes, simulation de circulation, rig de piéton ou éclairage global. La fluidité sur de vrais téléphones reste à mesurer.

## Casino : les règles sont explicites

Une seule activité est livrée : roulette rouge/noir. Le casino est facultatif et peut être désactivé avant la partie, par l'hôte ou dans le choix de la nouvelle partie locale. La règle est montrée aux invités puis verrouillée. Les formats d'interface l'activent par défaut ; l'API moteur brute reste désactivée par défaut.

- Mises fixes de 20, 40 ou 60 crédits **de la partie**, avec confirmation avant chaque envoi.
- Une mise maximum par joueur et par manche, hors de son tour, seulement aux phases `roll` et `end`.
- Réserve d'au moins 200 crédits après déduction de la mise. Pas de crédit, relance automatique ou recharge contre publicité.
- 37 numéros : 18 rouges, 18 noirs et zéro vert. Bonne couleur : retour brut de deux fois la mise (gain net d'une mise). Sinon, mise perdue. Le zéro fait perdre les deux couleurs. La règle mathématique nominale est défavorable au joueur ; aucun gain n'est promis.
- Le gain ou la perte modifie le même capital qui sert à acheter les terrains : ce n'est **pas** « sans impact sur le plateau ».
- Aucun achat de crédits, aucune conversion/revente/retrait, aucune attribution d'XP ou de monnaie de compte. La revanche repart avec les crédits initiaux.

Le panneau est non modal, ne suspend pas le tour d'un autre joueur et se ferme lorsque le participant doit jouer. Les choix n'engendrent aucune requête avant la confirmation. Le résultat expose mise, retour brut, gain/perte nette et manche. Les bots ne misent pas au casino dans cette version ; ils restent concentrés sur le plateau. Machines à sous, duel de dés et visite physique du pion ne sont pas implémentés.

## Réseau et sécurité

Une commande `CASINO_BET` contient la mise, la couleur et la manche, jamais un résultat ou un montant de gain. L'hôte attribue l'acteur à la connexion et revalide les règles. Les demandes concurrentes de la même partie sont revérifiées, y compris la manche et le quota. L'identifiant de requête évite un doublon transport ; la règle d'une mise par manche protège également contre une nouvelle requête identique. Le débit réseau reste limité.

Le casino emploie un flux pseudo-aléatoire séparé pour ne pas consommer les futurs dés/cartes du plateau. **Ce flux reste déterministe et visible aux clients : on peut prédire les numéros et un hôte modifié peut tricher.** La relecture synchronisée est une protection contre les divergences, pas contre un hôte malveillant. Il n'existe ni récompense persistante ni classement récompensé pour ces parties. Un éventuel mode compétitif exigerait une autorité et un aléatoire serveur fiables ; cacher l'état dans l'interface ne suffirait pas.

Version moteur, réseau et sauvegarde : 4. Les sauvegardes v3 restent sous leur ancienne clé et ne sont pas importées. Un mélange v3/v4 est refusé. La disponibilité du casino sur CrazyGames, les classifications d'âge et toute conformité commerciale restent à faire examiner avant distribution : les limites techniques ne constituent pas une validation juridique ou une approbation de la plateforme.
