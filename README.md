# GeoLearner

GeoLearner est un espace personnel pour apprendre la géographie avec des quiz
et suivre ses résultats. Le catalogue et les données géographiques sont rendus
côté serveur ; une fois un quiz lancé, les questions, les réponses et la
progression sont gérées localement dans le navigateur, sans requête réseau.
L’historique reste enregistré sur l’appareil. Il n’y a pas de création de
compte.

## Technologies

- **Next.js App Router** : rendu serveur, routes et endpoints d’authentification.
- **React** : interface adaptative et interactions.
- **TypeScript** : typage statique.
- **Git** : dépôt local initialisé sur la branche `main`.

## Démarrer en développement

Prérequis : Node.js et npm.

```bash
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

## Configurer la connexion mono-utilisateur

La connexion n’accepte qu’une adresse e-mail et un mot de passe définis côté
serveur. Aucun secret ne doit être ajouté au code ni exposé avec le préfixe
`NEXT_PUBLIC_`.

Crée un fichier `.env.local` à la racine du projet :

```dotenv
GEOLEARNER_EMAIL=toi@example.com
GEOLEARNER_PASSWORD=remplace-par-un-mot-de-passe-unique
GEOLEARNER_SESSION_SECRET=remplace-par-une-cle-aleatoire-de-32-caracteres-minimum
```

Génère une clé de session avec `openssl rand -base64 32`. Utilise un mot de passe
long et unique, et configure ces trois variables dans l’environnement de
l’hébergeur avant de déployer. La connexion reste désactivée si les variables
manquent ou si la clé de session fait moins de 32 caractères.

Les sessions sont signées côté serveur, stockées dans un cookie `HttpOnly` avec
une durée maximale de 14 jours et invalidées si la configuration de session
change. En production, le cookie est `Secure` : le site doit être servi en
HTTPS. Il n’existe pas de récupération de mot de passe ni d’inscription.

## Quiz et données

Le catalogue regroupe les quiz par zone géographique. Chaque thème propose un
quiz classique, une liste à compléter (« Saisir ») et, lorsque les données
géographiques le permettent, une carte interactive. La saisie se fait dans un
champ unique et range chaque réponse correcte à sa place dans une liste triée.
Les cartes de départements, préfectures, régions, communes françaises, counties
et villes anglaises, ainsi que les cartes du monde, sont embarquées dans
l’application : aucune donnée n’est chargée par API pendant une partie. La
carte des grandes communes cadre la France métropolitaine sur ses contours et
place les réponses ultramarines dans des vignettes dédiées. Les cartes peuvent
être agrandies par pincement du trackpad ou avec Ctrl + molette, puis déplacées
avec le clic droit maintenu. Le zoom suit la position du pointeur, et le zoom
global de la page est bloqué pendant le geste effectué sur la carte.
Les marqueurs des villes gardent leur taille à l’écran pendant le zoom afin de
rester faciles à sélectionner.
Chaque sélection sur une carte reçoit un retour visuel et textuel distinct
selon qu’elle est correcte ou incorrecte ; après deux erreurs, la bonne zone
est également mise en évidence.
Les départements peuvent être identifiés par leur nom ou leur numéro ; le quiz
des préfectures fait retrouver le département correspondant.

Trois rythmes sont proposés : « À mon rythme », « Chronométré » (durée totale
visible, sans limite) et « Contre-la-montre » (15 secondes par question, puis
défaite si le délai expire). Le format « Saisir » n’est pas proposé en
contre-la-montre.

Sources des instantanés de données :

- [API Découpage administratif de l’État](https://geo.api.gouv.fr/) pour les
  départements, préfectures, régions, populations et coordonnées communales
  françaises.
- [France GeoJSON](https://github.com/gregoiredavid/france-geojson) pour les
  contours simplifiés des départements et régions, issus des données IGN sous
  Licence Ouverte.
- [GeoNames](https://www.geonames.org/) pour les localités anglaises (données
  sous licence CC BY 4.0).
- [Ordnance Survey Boundary-Line](https://www.ordnancesurvey.co.uk/products/boundary-line)
  et les limites des autorités locales publiées par l’[ONS](https://geoportal.statistics.gov.uk/)
  pour les contours anglais embarqués, adaptés aux counties traditionnels du
  quiz.
- [Banque mondiale](https://data.worldbank.org/indicator/SP.POP.TOTL) pour la
  population des pays (données 2023), et
  [REST Countries](https://restcountries.com/) pour leurs superficies et noms.
- Les counties anglais et leurs chefs-lieux traditionnels forment une
  correspondance géographique de référence ; le terme « chef-lieu » n’a pas de
  définition administrative uniforme au Royaume-Uni.
- [Natural Earth](https://www.naturalearthdata.com/) pour les contours des pays
  sur la carte du monde (données du domaine public).

## Historique et confidentialité

Les résultats des tests sont conservés dans le stockage local du navigateur.
Ils restent disponibles sur cet appareil, mais ne sont pas synchronisés entre
plusieurs appareils ni sauvegardés sur le serveur. Pendant une partie, aucune
requête n’est envoyée au serveur. La question suivante s’affiche au plus tard
100 ms après la résolution d’une réponse ; un test mesure aussi cette latence
et vérifie qu’elle reste sous 200 ms.

## Progressive Web App

GeoLearner fournit un manifeste Web, une icône et un service worker. Depuis un
navigateur mobile compatible, ouvre le menu du navigateur puis choisis
« Ajouter à l’écran d’accueil » ou « Installer l’application ». L’installation
et le fonctionnement hors connexion nécessitent HTTPS en production (ou
`localhost` en développement). Les pages authentifiées ne sont pas mises en
cache hors connexion.

## Vérifier et construire

```bash
npm run lint
npm test
npm run test:unit
npm run test:integration
npm run build
npm run start
```

Les tests unitaires sont dans `tests/unit` et couvrent le moteur des quiz,
l’historique, l’authentification et le manifeste. Les tests d’intégration sont
dans `tests/integration` et vérifient les pages de connexion et du tableau de
bord, le déroulement local des quiz, ainsi que les routes d’authentification.

Configure un dépôt distant uniquement lorsque tu choisiras ton hébergeur :

```bash
git remote add origin <url-du-depot>
git push -u origin main
```
