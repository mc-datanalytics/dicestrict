# Choix verrouillé avant confirmation

Plan : FAIR_OPENING_PLAN.md, enregistré avant les simulations.

Développement : 800 graines issues de la base 0x31415926, quatre bots Équilibrés, 12 manches, 2 jetons, sans casino ni négociation. Six conditions (référence comprise), 4 800 trajectoires terminées sans échec.

| Ouverture | Parts de victoire sièges 1 / 2 / 3 / 4 | Écart max–min |
| --- | --- | --- |
| Classique | 34,50 / 25,125 / 20,8125 / 19,5625 % | 14,9375 points |
| Ordre alterné | 24,75 / 27,125 / 23,00 / 25,125 % | 4,125 points |
| +20 par rang | 29,75 / 24,25 / 22,75 / 23,25 % | 7,00 points |
| +40 par rang | 27,75 / 23,75 / 23,00 / 25,50 % | 4,75 points |
| +60 par rang | 25,75 / 23,1875 / 24,00 / 27,0625 % | 3,875 points |
| +80 par rang | 23,25 / 22,00 / 25,00 / 29,75 % | 7,75 points |

Choix selon le critère prévu : **comp-60**. Capital initial : 1 800 / 1 860 / 1 920 / 1 980 à quatre joueurs. Ce capital contribue aussi au score ; pas de prétention à neutralité économique. L'écart avec l'ordre alterné est faible : seule la confirmation décidera si cette correction réduit suffisamment le biais, sans démontrer qu'elle serait la meilleure possible.

Empreinte SHA-256 moteur/politiques/lab : `fe8a0627785df7a65be9ed6da1215f4e5c98d555d1d4b4311c6a57889a485171`.
Empreinte du fichier selection.json : `ce3a45d222976d2168841a568db06f471e241b351f52d513057e7a7ab219061b`.

La confirmation n'a pas encore été exécutée au moment de ce commit. Aucun autre candidat ne sera choisi à partir de son résultat.

## Corpus suivants fixés

- Principal : 2 000 graines, base 0x27182818, quatre bots identiques.
- Deux joueurs : 1 000 graines, base 0x16180339.
- Trois joueurs : 1 000 graines, base 0x14142135.
- Négociation réciproque à quatre : 1 000 graines, base 0x17320508.
- Profils mixtes : 250 graines × quatre rotations, base 0x22360679.
- Profils mixtes avec négociation : 250 graines × quatre rotations, base 0x24494897.
- Casino, quatre bots identiques : 500 graines, base 0x26457513.

Chaque campagne compare A classique et B comp-60 sur les mêmes graines. Le programme refuse tout recouvrement avec le développement ou entre ces campagnes. Les négociations utilisent OFFER_DEAL/ACCEPT_DEAL/DECLINE_DEAL du vrai moteur, mais restent automatisées. La validation humaine n'est pas encore réalisée.
