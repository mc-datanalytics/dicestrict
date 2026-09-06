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
