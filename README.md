# DICESTRICT

**Roll. Build. Rule.** Une ville miniature, quatre ambitions, un lancer à la fois.

Jeu de stratégie immobilière original en 3D pour navigateur, préparé pour une future distribution sur CrazyGames. Ville : **Aurora**. Interface française, direction crème / vert profond / quartiers pastel. Alpha **0.2.0**, pas une sortie commerciale.

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

## Validation

La suite Node contient **27 tests** et simule **500 parties complètes**, puis rejoue leurs **44 337 actions** à l'identique. Elle vérifie également les frontières du protocole et le serveur de signalisation sur de vraies connexions WebSocket locales.

`tests/browser.py` couvre le rendu WebGL2, la sauvegarde, les enchères, deux contextes Chromium reliés en WebRTC, la revanche, la perte de l'hôte, le mobile et le mode de secours. Le résultat navigateur effectif est fourni par **GitHub Actions**, avec captures d'écran dans l'artefact `dicestrict-build-and-browser-report`. L'existence des tests ne signifie pas que tous les appareils et réseaux ont été validés.

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

Pas encore de matchmaking public, reprise après rafraîchissement en multijoueur, migration de l'hôte, échanges négociés, comptes persistants, boutique, publicités ou classement serveur. Le réglage et la connexion réels au SDK restent à recetter dans le portail CrazyGames. La capacité à accueillir des millions de parties n'a pas été mesurée.

Le code et les éléments visuels sont originaux ; aucun plateau, texte de cartes ou élément graphique de Monopoly n'est repris. Le nom DICESTRICT est un nom de travail : sa disponibilité commerciale reste à vérifier.

Copyright © 2026 M&G Group. Tous droits réservés. Aucune licence open source n'est accordée.
