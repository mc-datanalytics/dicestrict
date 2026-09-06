# Sécurité et limites de confiance

Ne jamais déployer de clés privées, service-role Supabase, secrets de signature, jetons de compte ou identifiants TURN permanents dans `config.js`, les sources publiques ou les logs.

Le mode amical est arbitré par le navigateur hôte. Sa graine aléatoire est visible, les dés futurs sont prédictibles et un hôte modifié peut altérer ses snapshots. Le checksum n'est pas une signature. Ces parties n'émettent aucune récompense persistante.

Les commandes sont bornées, versionnées et liées à la partie, à sa révision et à l'identité de connexion. Les résultats et snapshots sont validés structurellement. Ces contrôles réduisent les erreurs et certains abus entre invités ; ils ne rendent pas l'hôte fiable.

Le serveur de développement est volontairement limité, sans authentification de compte ni relais TURN, et ne doit pas être exposé comme service de production. Sa terminaison ferme les salons. Ne pas envoyer de véritables jetons utilisateurs vers ce serveur.

Une vulnérabilité contenant un secret ne doit pas être publiée dans une issue publique. Utiliser un canal privé du propriétaire du dépôt ; aucun canal de divulgation externe n'est fourni par ce prototype.
