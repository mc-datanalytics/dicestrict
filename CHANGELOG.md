# 0.5.0 — Balance Lab

- Laboratoire facultatif dans `/lab.html` et HTML autonome : A/B, graines partagées, permutations, quatre profils, visualisation et export des résultats.
- CLI reproductible, métriques issues des commandes du vrai moteur, bootstrap de blocs de graines, échecs conservés et dénominateurs explicites.
- Replays vérifiés commande par commande, lecteur 3D et mode textuel ; aucune sauvegarde de jeu ni récompense utilisée.
- Bots : levée d’hypothèque avec réserve suffisante. Rendu : passage aux mouvements réduits corrigé en cours de déplacement, invalidation de taille dédupliquée.
- Connexion WebRTC : initialisation des canaux déjà ouverts et attente du message de disponibilité du pair avant le départ.
- Bundles séparés : le lab n'est pas distribué dans le jeu ordinaire ou la cible CrazyGames. Empreintes SHA-256 des sources expérimentales.
- 83 tests Node au moment de la livraison ; les vérifications navigateur sont conservées dans les artefacts de CI.

# 0.4.0 — Living city / match-only casino

- Sixteen state-driven city parcels; purchases, levels, owner colors and mortgages affect geometry and activity.
- Pooled cars/pedestrians/buses, local road density, temporary cranes and district celebrations; fountain, surface metro and occasional ambulance.
- Gradual day/night windows, light rain and original fictional signs. Frozen-city/reduced-motion/low-quality controls; no ambient network traffic.
- Optional match-credit-only red/black roulette; explicit confirmation, one fixed 20/40/60 stake per round, 200-credit reserve, safe off-turn phases. No payments, account currency, advertising recharge or persistent rewards.
- Separate casual casino PRNG; all clients replay settlements. Public predictable randomness is explicitly NOT an anti-cheat boundary.
- Protocol/save v4; old local data not deleted. 64 Node tests and expanded strict WebGL/WebRTC browser scenarios.
- Non-moving off-turn actions no longer restart a pawn path or skip its existing animation wait.

# Changelog

## 0.3.0 — 2026-09-06 — Retour des joueurs

- Analyse critique et traçabilité avis → exigences dans `docs/research/PLAYER_FEEDBACK.md` ; séparation faits, hypothèses et fonctionnalités livrées.
- Offres publiques terrains/crédits, acceptation/refus/annulation/contre-offre hors tour, panneau non modal, brouillon conservé, validation atomique et invalidation automatique.
- Quotas d'offres, expiration en fins de tour et réponses concurrentes contrôlées en WebRTC ; IA capables de répondre aux propositions.
- Deux jetons Mobilité par joueur : choix après lancer, trajet normal ou ±1 case ; aperçu des coûts connus, pas de relance des dés.
- Formats Blitz 6 / Standard 12 / Grand District 18 annoncés dans le salon et verrouillés au départ. Blitz termine pour tous dès la première faillite.
- Signal visuel des deux dernières manches ; pas de modification surprise de l'économie.
- Moteur/protocole v3, nouvelle clé de sauvegarde sans suppression de la v2. Pas de migration des anciennes parties.
- 52 tests Node, 800 parties synthétiques rejouées ; couverture navigateur enrichie pour les règles annoncées, choix de mobilité, transactions, contre-offres, mobile et bundle autonome.
- Pas de reconnexion après rafraîchissement, migration d'hôte, minuterie AFK, restructuration, économie de compte ou nouveau service déployé.


## 0.2.0

Import complet du prototype dans un projet reproductible. Ajout des enchères, stratégies de bots, protocole v2 avec identifiant de partie, garde contre le redémarrage d'une partie en cours, correction de la fermeture du classement lors d'une revanche et des flux d'invitation. Amélioration du rendu GPU au repos. Ajout des tests moteur, protocole, serveur local, simulations/replays et navigateur CI. Adaptateur CrazyGames enrichi, build statique et HTML autonome. Récompenses permanentes toujours désactivées.

## 0.1.0

Prototype local : plateau original, ville procédurale WebGL2, achat/construction/hypothèque, IA et premier transport WebRTC. Le rendu 3D et les connexions réelles n'avaient pas été validés.
