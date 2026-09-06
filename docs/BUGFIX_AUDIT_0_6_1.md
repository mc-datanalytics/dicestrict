# Audit correctif 0.6.1 — 6 septembre 2026

Base auditée : `b12332c211875ad08cc2918b3ce3be64008e8b11`, PR #5. Le code de cette PR est distinct de la branche principale 0.5 et des branches graphiques ; aucune branche d'assets n'a été écrasée.

## Défauts reproduits et corrigés

| Défaut | Correction et contrôle |
| --- | --- |
| Un essai enregistré restait disponible après une revanche non enregistrée ; ses résultats proposaient l'export de l'ancienne partie. | Le changement de partie supprime l'ancien enregistreur ; consentement à usage unique. Le bouton et la méthode d'export exigent aussi le même identifiant de partie. Tests unitaires et parcours navigateur. Exporter avant de recommencer. |
| Une nouvelle copie de l'état final fermait la fenêtre de résultats sans la rouvrir. | Fermer les fenêtres de salon/résultats uniquement lors d'un changement de partie. Annuler l'ancien minuteur de résultats, vérifier l'identifiant dans son callback. |
| `send` abandonnait silencieusement un message quand `bufferedAmount` atteignait 128 000. | File FIFO bornée : au plus 256 messages et 262 144 octets UTF-8 en attente. Reprise au seuil bas et au heartbeat, reprise des `OperationError`, erreur explicite/pause si saturation ou erreur fatale. Tests d'ordre, compteurs, bornes, envoi impossible et fermeture. |
| Un invité ignorait le message `ready` de l'hôte ; un premier message manqué pouvait bloquer la disponibilité. | Réponse au challenge de l'hôte et relance du handshake incomplet par le heartbeat existant. Un test WebRTC supprime volontairement les deux premières salutations, sans neutraliser ICE ni les limites réseau. |
| Une disponibilité ancienne permettait de tenter le lancement avec un canal déjà fermé. | Vérifier aussi l'ouverture effective du canal de chaque invité avant le départ. |
| La suspension locale d'une session n'avertissait pas immédiatement les autres joueurs. | Fermer les canaux lors d'une suspension terminale, après avoir marqué la session suspendue. Les autres pairs constatent la fermeture ; aucune fausse victoire, reprise ou migration d'hôte n'est fabriquée. |
| Un snapshot ancien d'une même partie pouvait faire régresser un invité. | Ignorer les révisions inférieures à l'état local. Les fixtures contrôlées du test navigateur utilisent une révision suivante, pas un retour arrière. |
| Des callbacks différés pouvaient encore appliquer des données à une session quittée. | Ignorer les messages de sessions fermées et des canaux remplacés ; vider la file à la fermeture. |
| Une action dépassant la limite de fréquence ne donnait aucun retour à l'invité. | Message de refus explicite ; quota inchangé, aucun contournement de sa limite. |
| Certains identifiants invalides passaient la validation des sauvegardes : identifiant numérique de joueur coerçable par RegExp, identifiant de partie vide. | Types string explicites et identifiant de partie non vide/borné à la création et à la lecture. Pas de changement des montants ou de la distribution des dés. |

La mention « À propos » indique aussi la version 0.6.1 plutôt que l'ancienne 0.4. Ce dernier point est cosmétique.

## Preuves de non-régression

Les 11 premiers tests ciblés échouent sur la base non modifiée, puis passent après correction. La suite a été portée de **97 à 118 tests Node**, tous réussis localement et lors de la matérialisation GitHub. Les contrôles statiques couvrent **48 fichiers JavaScript** ; les compilations jeu et lab produisent leurs HTML autonomes. Les assertions de WebGL2, de convergence réseau et de parties complètes ne sont pas supprimées.

Une comparaison distincte de **200 trajectoires / 29 196 commandes**, Classique et comp-60, avec/sans négociation, a confronté l'ancien et le nouveau `runGame` : enregistrements et replays exactement identiques sur ce corpus. C'est un contrôle de non-régression, pas une nouvelle étude d'équilibrage. Les 19 800 trajectoires historiques restent attachées à leur ancienne empreinte source ; aucune preuve de participation humaine n'est ajoutée.

Pour reproduire les suites :

```sh
npm run check && npm test && npm run build
python tests/browser.py
npm run build:lab
python tests/lab_browser.py
python tests/playtest_browser.py
```

Les nouveaux tests unitaires résident dans `tests/bug-audit.test.mjs` et `tests/outbox.test.mjs`. Les nouveaux parcours navigateur couvrent le cycle consentement/revanche, les résultats après snapshot final, le handshake avec salutations perdues et la propagation d'une suspension.

## CI et limites

La CI précédente `34055490314` échouait dans la connexion de la deuxième table à quatre pairs. Le nouveau diagnostic conserve l'état du salon, des canaux et des files en cas d'échec, avant leur fermeture. Les régressions de handshake sont reproduites séparément ; cela ne prouve pas qu'elles constituaient l'unique cause de l'intermittence.

Les résultats de recette courants sont consignés dans `docs/VALIDATION.md`. Le navigateur local de rédaction interdit la navigation de test : aucun contournement ; les parcours réels sont exécutés sur GitHub Actions avec Chromium/SwiftShader. Il s'agit de WebGL2 effectif sur GPU logiciel et de pairs sur le même runner, pas de téléphones ni de tests TURN inter-réseaux.

Pas de changement des règles/protocole v5, lab v2 ou politiques v3. Le départ classique reste le réglage par défaut ; le casino ne manipule que des crédits de partie. Pas d'anti-triche serveur, récompense permanente, connexion de production, test utilisateur humain ou publication CrazyGames. La reconnexion après perte d'hôte reste absente.

Référence technique : https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel/bufferedAmount et https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel/bufferedamountlow_event.
