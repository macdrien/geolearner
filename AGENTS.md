<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Consignes du projet GeoLearner

## Tests obligatoires

- Chaque nouveau travail de développement doit inclure les tests unitaires **et** les tests d’intégration correspondants, même si le prompt ne le demande pas explicitement. Complète ou adapte les tests existants dès qu’un comportement change ; ne reporte pas les tests à une tâche ultérieure.
- Le code doit rester lisible par un humain : noms explicites, responsabilités cohérentes et fichiers, composants, classes ou méthodes d’une taille raisonnable. Préfère une abstraction générique réutilisable lorsque plusieurs comportements suivent le même modèle, sans ajouter de complexité inutile.
- Les tests unitaires vont dans `tests/unit/` et vérifient isolément la logique et les utilitaires.
- Les tests d’intégration vont dans `tests/integration/` et vérifient les interactions entre composants, pages et routes concernées. Pour une modification qui touche plusieurs couches, couvre le parcours utilisateur ou la communication entre ces couches.
- Utilise Vitest et Testing Library selon les conventions de `vitest.config.mts` et des tests existants. Les tests doivent vérifier le comportement observable et les cas d’erreur pertinents, sans dépendre de secrets ni de services externes.
- Si un type de test semble impossible ou sans objet pour un changement donné, explique pourquoi et demande confirmation avant de conclure le travail sans ce test.

## Validation obligatoire

Avant de terminer tout travail de développement, exécute et vérifie la réussite de ces trois commandes :

```bash
npm run lint
npm run test:unit
npm run test:integration
```

Corrige les échecs liés aux changements avant de conclure. Ne remplace pas l’une de ces validations par `npm test` seul ; les suites unitaires et d’intégration doivent être vérifiées explicitement.
