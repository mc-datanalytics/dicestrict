# DICESTRICT

**Roll. Build. Rule.** Une ville miniature, quatre ambitions, un lancer à la fois.

Jeu de stratégie immobilière original en 3D pour navigateur, préparé pour une future distribution sur CrazyGames. Ville : **Aurora**. Interface française, direction crème / vert profond / quartiers pastel. Alpha **0.4.0**, pas une sortie commerciale.

## Jouer et développer

Node.js 22 ou supérieur. Aucune dépendance JavaScript à installer pour développer, tester le moteur ou construire le client.

```sh
git clone https://github.com/mc-datanalytics/dicestrict.git
cd dicestrict
npm run dev
```

Ouvrir **http://127.0.0.1:4173**. La partie locale démarre directement avec trois IA. Pour essayer le multijoueur, ouvrir deux fenêtres, créer un salon dans la première, puis entrer son code dans l'autre. Le serveur fourni sert les fichiers et la signalisation uniquement : les actions de jeu transitent dans des DataChannels WebRTC.

```sh
npm run check   # syntaxe et imports locaux
npm test        # règles, protocole, signalisation et simulations déterministes
npm run build  # dist/ : client statique et démonstration HTML autonome
npm run preview
```

`dist/dicestrict-offline.html` s'ouvre directement dans un navigateur pour le mode local. Le dossier `dist/` peut être hébergé sur un serveur statique ; cela ne déploie PAS la signalisation.

## Ce qui existe

- Plateau original de 28 cases, 16 propriétés réparties en 8 quartiers ; 2 à 4 joueurs.
- Achats, loyers, bonus de quartier complet, constructions équilibrées jusqu'au niveau 3, hypothèques, liquidation automatique, faillite et victoire au patrimoine.
- **Enchères au tour par tour** après un achat refusé, par paliers de 20 crédits. Les IA savent enchérir et se retirer.
- Ville WebGL2 procédurale : bâtiments, végétation, pions, dés animés, ombres, sélection des cases, rotation et zoom. Le rendu GPU s'arrête lorsque la scène est immobile.
- Sauvegarde locale, aide, historique, réglages son/qualité/mouvements réduits, affichage mobile et alternative jouable sans WebGL.
- Salons WebRTC amicals, code d'invitation, synchronisation par commandes, resynchronisation, suspension en cas de déconnexion et revanche dans le même salon.
- Adaptateur CrazyGames v3 : SDK optionnel, informations de salon, invitations, entrée directe en multijoueur, noms de compte et priorité au réglage audio de la plateforme.

## Nouveautés 0.4 — la ville reflète la partie

Les seize parcelles du centre reprennent réellement achats, constructions, couleurs de propriétaire et hypothèques. Commerces, terrasses et tours remplacent progressivement les parcelles libres ; le trafic et les passants sont plus présents dans les quartiers développés. Grues temporaires, célébration de quartier, bus, fontaine, métro de surface, ambulance ponctuelle, enseignes fictives, pluie légère et cycle jour/nuit donnent vie à la scène. Les réglages permettent une ville figée, une météo désactivée ou une nuit fixe. Aucun de ces objets visuels n'est synchronisé sur le réseau.

Le **casino facultatif** propose une roulette rouge/noir, exclusivement avec les crédits de la partie : pas d'achat, conversion, retrait ou récompense de compte. Une mise de 20/40/60 maximum par manche, hors tour, avec confirmation et réserve de 200 crédits. Gains et pertes modifient le capital du plateau. Le panneau ne suspend pas la table et laisse la priorité à votre tour. L'hôte peut désactiver le casino avant le lancement. Ce n'est pas une assurance anti-triche : l'aléatoire P2P est public et prédictible.

Voir [la spécification et les limites de la ville vivante](docs/LIVING_CITY.md). Le protocole et les sauvegardes passent en **v4**, sans import des sauvegardes v3 (non supprimées). Les preuves de validation sont séparées par version dans `docs/VALIDATION.md`.

## Ce que les retours joueurs ont changé en 0.3

Voir l'[analyse critique des avis et les exigences de livraison](docs/research/PLAYER_FEEDBACK.md). Elle distingue les observations, les vérifications externes et les idées à éprouver : ce n'est pas une collecte exhaustive d'avis.

- **Négocier sans arrêter la table** : panneau non modal, offres publiques de terrains et de crédits, acceptation, refus, annulation et contre-offre, y compris hors tour. Conclusion avant le lancer ou en fin de tour ; pas pendant un déplacement, un achat ou une enchère. Les conditions sont revérifiées à l'acceptation, sans transfert partiel.
- **Deux jetons Mobilité identiques pour tous** : après le lancer, trajet normal gratuit ou arrivée à ±1 case contre un jeton. Le hasard n'est pas supprimé. Une fois les jetons épuisés, déplacement automatique. Pas d'achat ni de recharge de jetons.
- **Formats explicites** : Blitz, 6 manches maximum et fin commune dès la première faillite ; Standard, 12 manches ; Grand District, 18 manches. Le nombre de manches est plafonné, pas la durée réelle en minutes. Les invités voient les règles avant le lancement.
- **Clôture annoncée** dans les deux dernières manches, sans hausse surprise de loyer.

Les offres n'immobilisent pas les fonds et expirent après un cycle de table compté en fins de tour. Une offre ouverte par joueur, trois propositions par tour actif. Les quartiers construits et terrains hypothéqués ne sont pas échangeables. Chaque partie doit fournir quelque chose. Les IA répondent par une heuristique simple ; aucune promesse d'équité économique ou de résistance à la collusion.

En 0.3, le moteur et le protocole sont passés en **version 3** (historique). Les sauvegardes v2 ne sont pas migrées : elles restent sous leur ancienne clé locale, et la version 0.3 utilise une nouvelle clé. Les clients v2/v3 ne peuvent pas participer à la même session.

## Validation

La suite Node 0.4 contient **64 tests**. Les nouveaux tests couvrent le casino, ses limites, son réseau, la projection économique, les budgets visuels et 100 trajectoires supplémentaires avec casino. Le corpus historique 0.3 contenait 52 tests. Elle simule 500 parties de référence (44 337 actions) et 300 parties avec mobilité et offres (40 889 actions, dont 3 207 propositions), puis vérifie leurs replays identiques. Ces 800 parties synthétiques valident des invariants, pas le plaisir ou la durée de parties humaines. Elle vérifie également les frontières du protocole et le serveur de signalisation sur de vraies connexions WebSocket locales.

`tests/browser.py` couvre le rendu WebGL2, la sauvegarde, les enchères, deux contextes Chromium reliés en WebRTC, la revanche, la perte de l'hôte, le mobile, le mode de secours, les choix de mobilité, les offres/contre-offres en WebRTC et le HTML autonome. Le résultat navigateur effectif est fourni par **GitHub Actions**, avec captures d'écran dans l'artefact `dicestrict-build-and-browser-report`. L'existence des tests ne signifie pas que tous les appareils et réseaux ont été validés.

```sh
python -m pip install playwright==1.57.0
python -m playwright install chromium
python tests/browser.py
```

## Hébergement et récompenses : frontière de sécurité

**Aucune XP ni monnaie permanente n'est attribuée par ce client.** Les crédits du plateau sont fictifs et limités à la partie.

Le navigateur hôte arbitre les parties amicales. Les clients rejouent les commandes pour détecter les divergences, mais le hachage de l'état et le générateur aléatoire déterministe ne constituent pas un dispositif anti-triche. Un hôte modifié peut tricher. Une partie P2P terminée n'est jamais une preuve suffisante pour créditer un compte.

Pour des parties récompensées, il reste à construire un arbitre serveur léger, une authentification vérifiée côté serveur et un registre de récompenses transactionnel/idempotent. Aucun Supabase existant n'a été modifié et aucun service payant n'a été déployé.

## Préparer CrazyGames

```sh
SIGNAL_URL=wss://votre-service.example/signal npm run build -- --crazygames
```

Cette commande active le SDK officiel dans le client statique et refuse de produire une configuration multijoueur sans signalisation. `TURN_CREDENTIALS_URL=https://...` permet de fournir un endpoint de relais à identifiants éphémères. Ne jamais mettre une clé privée ou un secret TURN permanent dans `config.js`.

Le service `scripts/dev.mjs` est **réservé au développement**, avec salons en mémoire et capacité bornée. Il n'est pas une infrastructure de production, ne fournit pas de TURN et ne survit pas à un redémarrage. Par défaut il écoute uniquement sur `127.0.0.1`. Tester les autres appareils exige un hébergement sécurisé ou un environnement HTTPS adapté.

Voir [architecture](docs/ARCHITECTURE.md), [plan de livraison](docs/ROADMAP.md), [validation](docs/VALIDATION.md) et [sécurité](SECURITY.md).

## Limites connues

Pas encore de matchmaking public, reprise après rafraîchissement en multijoueur, migration de l'hôte, minuteurs AFK, éditeur complet de règles, restructuration, comptes persistants, boutique, publicités ou classement serveur. Le réglage et la connexion réels au SDK restent à recetter dans le portail CrazyGames. La capacité à accueillir des millions de parties n'a pas été mesurée.

Le code et les éléments visuels sont originaux ; aucun plateau, texte de cartes ou élément graphique de Monopoly n'est repris. Le nom DICESTRICT est un nom de travail : sa disponibilité commerciale reste à vérifier.

Copyright © 2026 M&G Group. Tous droits réservés. Aucune licence open source n'est accordée.
