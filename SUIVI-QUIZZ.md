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

## Ajustements des quiz anglais, des options et du contre-la-montre

- [x] Vérifier le sens des quiz anglais : county vers chef-lieu, puis chef-lieu vers county.
- [x] Rendre les options du quiz visibles dans un panneau distinct et les placer sous le choix du format.
- [x] Ajouter les cartes de counties, de chefs-lieux, de villes anglaises, de communes françaises, de régions et de départements.
- [x] Compléter les points cartographiques des communes régionales et départementales, y compris outre-mer.
- [x] Gérer le cas où Londres est le chef-lieu de deux counties sur la carte.
- [x] Distinguer « Chronométré » (durée totale) de « Contre-la-montre » (15 secondes par question).
- [x] Terminer le quiz comme perdu à expiration et remettre le compteur à 15 secondes à chaque question.
- [x] Ajouter les tests unitaires de couverture des cartes et les tests d’intégration de leurs interactions.
- [x] Relancer lint, tests unitaires, tests d’intégration et build après ces ajustements.

## Cadrage de la carte des grandes communes

- [x] Garder les contours de la France métropolitaine comme référence de projection au lieu de laisser les points ultramarins déformer l’échelle.
- [x] Afficher les communes métropolitaines sur le fond des départements et isoler les réponses ultramarines dans des vignettes cartographiques.
- [x] Rendre les points de ville plus visibles et vérifier leur étendue sur une partie de 50 questions.
- [x] Relancer lint, tests unitaires, tests d’intégration et build.

## Zoom fluide au trackpad

- [x] Rendre les petits deltas du geste de pincement du trackpad perceptibles sans accélération excessive sur une molette classique.
- [x] Ancrer le zoom sur le pointeur pour faciliter la sélection de villes proches.
- [x] Vérifier qu’un scroll classique ne déclenche pas le zoom et tester les incréments de pincement.
- [x] Relancer lint, tests unitaires, tests d’intégration et build.
- [x] Intercepter le pincement avec un écouteur non passif sur la carte pour empêcher le zoom global de la page.
- [x] Relancer lint, tests unitaires, tests d’intégration et build après le blocage du zoom de page.

## Taille des marqueurs pendant le zoom

- [x] Contre-échelonner les points de ville pour préserver leur taille et leur cible de sélection lors du zoom cartographique.
- [x] Tester que la géométrie des points reste constante tandis que la carte zoome.
- [x] Relancer lint, tests unitaires, tests d’intégration et build.

## Retour sur les sélections cartographiques

- [x] Afficher un retour textuel et coloré immédiatement identifiable après une bonne ou une mauvaise sélection.
- [x] Colorer distinctement le marqueur ou la zone sélectionnée selon le résultat.
- [x] Après deux erreurs, révéler visuellement la zone attendue et donner son nom dans le message.
- [x] Relancer lint, tests unitaires, tests d’intégration et build.
