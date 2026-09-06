# Ouverture équitable — plan fixé avant les mesures

Base : main `00ede3a315df3681d70abfbb17b9c45fbdb2a59c`. Issue #4.

## Hypothèse et séparation des données

Comparer le départ classique à cinq corrections finies : ordre inversé une manche sur deux ; compensation initiale de 20, 40, 60 ou 80 crédits par rang de siège (0, pas, 2×pas, 3×pas à quatre joueurs). Les montants sont de simples crédits de partie, inclus dans le patrimoine comme les autres crédits. Aucune monnaie permanente, achat, retrait ou XP.

Développement : 800 graines, base 0x31415926, quatre bots Équilibrés, 12 manches, 2 jetons Mobilité, sans casino, sans négociation. Retenir une seule correction minimisant l'écart maximum–minimum des parts de victoire ; départager par moindre modification des règles, puis plus petit montant. Ne pas ouvrir le corpus de confirmation avant d'avoir enregistré ce choix et l'empreinte du code.

Confirmation principale : 2 000 nouvelles graines, base 0x27182818, configuration identique. Vérifier explicitement l'absence de graine commune. Succès synthétique préspécifié : réduction d'au moins 50 % de l'écart max–min, borne inférieure du bootstrap apparié de la réduction > 0, hausse de la fréquence de faillite <= 5 points et moyenne des constructions >= 75 % de la référence. Ne pas choisir une autre variante sur la confirmation si cela échoue.

Robustesse distincte : nouveaux corpus à deux et trois joueurs, profils variés permutés, puis négociations initiées/répondues par politiques explicites via les commandes du moteur. Rapporter également patrimoine, développement, fréquence du plafond de manches, propositions et acceptations ; les rotations restent groupées par graine. Échecs conservés, pas de relance silencieuse sur d'autres graines. Aucun résultat de bot ne vaut validation humaine.

## Essais humains

Préparer une option de départ annoncée au salon, une fiche A/B avec rotation des sièges et un enregistrement local volontaire des commandes pseudonymisées. Aucun recrutement, invitation ou prétendu avis humain automatique. Les essais entre navigateurs pilotés par un script seront étiquetés automatisés, même avec WebRTC et de véritables transactions. La validation avec plusieurs personnes reste ouverte tant que des parties et retours humains n'ont pas réellement été recueillis. Pas de changement obligatoire des parties existantes sur la seule base des simulations.
