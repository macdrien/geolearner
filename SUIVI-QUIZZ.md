# Suivi de remise à plat des quiz

## Quiz classique

- [x] Conserver l’interface, les réponses proposées et les règles du quiz classique ; seule l’optimisation générale du délai de passage s’applique.
- [x] Vérifier que les optimisations de performance ne changent pas ses règles de jeu.

## Quiz de liste — « Saisir »

- [x] Renommer le format en « Saisir » dans la configuration et les résultats.
- [x] Remplacer les champs par réponse par un seul champ de saisie.
- [x] Afficher les réponses attendues dans une grille triée alphanumériquement, avec une case par réponse.
- [x] Adapter la grille en plusieurs colonnes quand la liste est longue.
- [x] Accepter les accents de façon insensible, compléter la bonne case, vider le champ et y conserver le focus après chaque bonne réponse.
- [x] Corriger et afficher le résultat final sans perdre les réponses trouvées.

## Quiz sur carte

- [x] Donner à la carte la plus grande place disponible.
- [x] Ajouter le zoom avec Ctrl + molette.
- [x] Ajouter le déplacement par glisser avec le bouton droit quand la carte est zoomée.
- [x] Proposer les quiz cartographiques pour chaque thème ayant des contours cartographiques adaptés.
- [x] Séparer les modes d’identification disponibles, notamment départements par nom et par numéro, et préfectures par département.
- [x] Vérifier la prise en charge de l’Angleterre et noter les thèmes impossibles à cartographier faute de données de contours adaptées.

## Performance et résultats

- [x] Garder la génération, les réponses et la progression du quiz côté client, sans requête réseau par réponse.
- [ ] Envoyer uniquement le résultat final au serveur (différé : choix « historique local uniquement » ; aucune persistance serveur n’existe).
- [x] Réduire à moins de 200 ms le délai entre une réponse résolue et l’affichage de la suivante.
- [x] Ajouter un test de performance qui mesure ce délai et des tests vérifiant l’absence d’échanges réseau pendant la partie.

## Validation

- [x] Ajouter/adapter les tests unitaires et d’intégration pour les comportements modifiés.
- [x] Exécuter `npm run lint`, `npm run test:unit` et `npm run test:integration`.
- [x] Vérifier le build de production.

> Décision : l’historique reste local jusqu’à ce qu’une persistance serveur soit demandée et choisie. Le dépôt ne contient pas de base de données ni de stockage serveur durable pour les résultats.
