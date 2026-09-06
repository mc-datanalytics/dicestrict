# Rythme et envie de rejouer — 0.7 (proposition non fusionnée)

Base examinée : `main` / `887d1548d7d451552ec9e12e0e4778a0fad2acf3` (0.6.1).
Les branches `feat/district-assets-phase2` et `feat/civic-promenade-phase3`
sont des travaux graphiques parallèles : elles ne sont ni remplacées ni
intégrées dans cette tranche. L'appréciation visuelle concerne la base, pas
une capture de la future ville.

## Appréciation de conception, pas une mesure de rétention

| Axe | Base 0.6.1 | Motif |
| --- | --- | --- |
| Envie de rejouer / « addictif » | 5,5 / 10 | La progression de la ville et la revanche fournissent une base, mais le prochain objectif est peu visible et le bilan dit surtout qui a gagné. |
| Fun pendant une partie | 6,5 / 10 | Mobilité, enchères et négociation ouvrent de vraies décisions. Des boutons d'attente inactifs, des propositions difficiles à préparer et des pauses artificielles les masquent. |

Ce sont des notes subjectives d'audit des règles, de l'interface et des
parcours de test, sans panel humain. Ce ne sont pas des notes moyennes de
joueurs ni une prédiction de rétention D1/D7. Les modèles 3D parallèles, les
sessions avec de vrais négociateurs et la fiabilité inter-réseaux pourront
changer cette évaluation. Cible de conception après cette tranche : environ
7/10 d'envie de rejouer et 7,5/10 de fun, **à vérifier**, sans promettre un gain
mesuré. Un jeu sans bugs n'est pas automatiquement un jeu captivant.

## Changements implémentés

- Un cap contextuel expose la prochaine adresse, un investissement légal ou
  un échange réciproque. Trois étapes de partie (acquérir, réunir, bâtir)
  rendent la progression lisible. Ce ne sont ni quêtes rémunérées ni une
  nouvelle monnaie. L'inspection ne dépense rien.
- Une proposition réciproque peut être préparée d'un clic, même hors tour
  aux phases autorisées. Le formulaire demeure éditable ; **seul son envoi
  explicite crée une offre**. Les coûts sont des valeurs nominales, pas
  une garantie d'équité ; le moteur revérifie l'opération. Un bouton devenu
  obsolète ne remplace pas le brouillon courant.
- En solo, une offre destinée au joueur laisse les IA attendre sa réponse,
  sans compte à rebours. « Continuer sans répondre » libère cette pause
  locale, sans envoyer REFUS ni ACCEPTATION. Les offres gardent leurs quotas
  et leur expiration en fins de tour. Une partie réseau n'est jamais
  suspendue par cette aide locale.
- Rythme Dynamique / Détendu du solo : 280 / 750 ms entre les décisions des
  IA lorsque les mouvements réduits ne sont pas activés. Le délai de
  déplacement 3D n'est pas changé. Les réglages réseau gardent le délai
  antérieur ; les décisions humaines ne sont jamais exécutées à leur place.
  La baisse de 62,7 % ne concerne que cette attente programmée, pas la durée
  totale d'une partie ni le temps de réflexion humain.
- Une rivalité lisible utilise le patrimoine réel, les égalités et l'écart
  avec la tête. Les derniers tours affichent ce qui reste à rattraper,
  sans prétendre qu'un achat ou une construction crée du score instantané.
- Les temps forts et le bilan comptent achats, niveaux construits, accords
  acceptés et loyers effectivement encaissés depuis les commandes observées.
  Les sessions rechargées/incomplètes sont signalées comme partielles ; les
  doublons de révision ne comptent pas deux fois. Six temps forts au maximum
  sont gardés en mémoire et effacés à la revanche. Aucun envoi de télémétrie.
  On peut relancer, changer de format ou faire une pause sans départ automatique.

## Limites et garde-fous

Pas de changement dans `src/game/`, `src/network/`, `src/scene/` ou `src/lab/`.
Mêmes schémas v5, mêmes bots/politiques v3, mêmes montants et mêmes dés.
Empreinte économique du lab inchangée :
`c9a114cc1a346369760d5c6ff10ea9f2bb3efd55eddb34c9338e6e85981ca9aa`.

La pause solo donne du temps au joueur ; elle n'est pas un nouvel équilibrage
statistique. Les bots du lab ne sont pas ralentis et leurs résultats restent
comparables. Les recommandations consultent uniquement les biens, crédits,
phases et offres publics : ni RNG du plateau ni RNG du casino. Bâtir échange
du capital contre un actif au même montant ; seuls les effets ultérieurs
peuvent creuser l'écart. La compensation de siège reste facultative.

Pas de série quotidienne punitive, faux compte à rebours, recharge casino,
récompense achetable, achat d'XP, auto-revanche ou faux retour de joueur.
L'envie de rejouer doit venir des décisions, de la lisibilité et de la
progression de la ville. Les références externes ci-dessous sont des repères
de conception, pas une validation du jeu par ces plateformes.

## Validation et essai humain à réaliser

`tests/momentum.test.mjs` vérifie les égalités, les propositions hors tour,
les restrictions, l'absence d'accès aux RNG, l'absence de mutation du moteur,
les compteurs, les reprises partielles, la mémoire bornée et les deux rythmes.
Quarante trajectoires complètes sont rejouées avec l'observateur et les aides,
et chaque empreinte après commande doit rester celle du moteur.

`tests/engagement_browser.py` ajoute les parcours du formulaire prérempli,
de l'attente réelle des IA et de sa libération, du bilan et de la revanche,
du réglage de rythme, du 390 px, du HTML autonome et du repli sans WebGL.
Les fixtures contrôlées ne sont pas des essais humains. Les résultats
exécutés seront consignés séparément avec leur révision et leur rapport.

Pour un petit pilote : faire essayer A (0.6.1) et B (cette branche), avec un
ordre A/B inversé entre les groupes. Observer le premier quartier réuni,
le nombre d'offres envoyées/traitées et les demandes d'aide ; demander
séparément « ai-je eu des choix intéressants ? », « y a-t-il eu des temps
morts ? » et « ai-je envie de rejouer ? ». Conserver la possibilité de
s'arrêter ; pas de relance imposée. Les minutes issues de scripts et la
fréquence des clics ne remplacent pas ces retours. Un petit pilote ne suffit
pas à établir une rétention ou à résoudre l'équilibrage humain de l'issue #4.

Références de conception consultées le 6 septembre 2026 :
- CrazyGames, Basic Launch Guide — objectifs clairs, boucle de jeu et rythme :
  https://docs.crazygames.com/resources/basic-launch-metrics/
- Microsoft, XAG 116 — éviter les limites de temps inutiles dans l'interface :
  https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/116
