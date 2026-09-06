# Sécurité et limites de confiance

Ne jamais déployer de clés privées, service-role Supabase, secrets de signature, jetons de compte ou identifiants TURN permanents dans `config.js`, les sources publiques ou les logs.

Le mode amical est arbitré par le navigateur hôte. Sa graine aléatoire est visible, les dés futurs sont prédictibles et un hôte modifié peut altérer ses snapshots. Le checksum n'est pas une signature. Ces parties n'émettent aucune récompense persistante.

Les commandes sont bornées, versionnées et liées à la partie, à sa révision et à l'identité de connexion. Les résultats et snapshots sont validés structurellement. Ces contrôles réduisent les erreurs et certains abus entre invités ; ils ne rendent pas l'hôte fiable.

Le serveur de développement est volontairement limité, sans authentification de compte ni relais TURN, et ne doit pas être exposé comme service de production. Sa terminaison ferme les salons. Ne pas envoyer de véritables jetons utilisateurs vers ce serveur.

Une vulnérabilité contenant un secret ne doit pas être publiée dans une issue publique. Utiliser un canal privé du propriétaire du dépôt ; aucun canal de divulgation externe n'est fourni par ce prototype.

## Offres publiques (0.3)

Les négociations sont visibles par tous les pairs : ne pas les présenter comme secrètes. Elles ne réservent pas les fonds. Une réponse concurrente sur une ancienne révision est revalidée contre l'offre et l'état actuels ; l'identité et l'identifiant de partie restent obligatoires. Les identifiants d'offres ne sont pas réutilisés dans une même partie.

Les restrictions sur les cadeaux, hypothèques et constructions ne constituent pas une défense suffisante contre la collusion ou les échanges économiquement absurdes. Blitz peut être influencé par une faillite volontaire. Aucun classement ni gain persistant n'est associé à ces formats. Les jetons Mobilité sont des ressources gratuites de partie, sans achat.

## Casino amical (0.4)

Le casino ne manipule que le capital fictif de la partie, sans achat, conversion, retrait, publicité récompensée, XP ou monnaie de compte. Les mises ne sont pas des preuves de gains. Son générateur séparé protège la séquence des dés du plateau, mais il est public et prédictible. Les quotas, réserves et vérifications réseau ne rendent pas un hôte fiable et ne suffisent pas pour un classement ou une récompense. Voir `docs/LIVING_CITY.md` pour les règles et limites.

## Ouverture et traces locales (0.6)

La compensation de siège est un paramètre versionné et annoncé, en crédits de partie. Aucun droit à des récompenses persistantes. Les messages v4 ne sont pas acceptés par v5.

L'enregistrement d'essai est volontaire, désactivé par défaut, en mémoire et sans envoi automatique. L'export retire les identifiants/noms/code de salon, mais il reste un fichier à partager avec l'accord des participants. Le vérificateur rejoue les commandes et refuse les incohérences ; un fichier fabriqué légalement peut cependant passer. `humanParticipationVerified: false` est obligatoire : aucune trace ne prouve une participation humaine ni l'honnêteté de l'hôte et ne doit créditer XP/monnaie/classement.
