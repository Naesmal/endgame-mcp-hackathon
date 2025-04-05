# Tests Unitaires pour Masa Subnet 42 MCP Server

Ce répertoire contient les tests unitaires pour le projet Masa Subnet 42 MCP Server.

## Structure

```
tests/
├── mocks/              # Mocks pour les dépendances externes
├── services/           # Tests pour les services (MasaService, BittensorService, etc.)
├── tools/              # Tests pour les outils MCP (Twitter, Data Indexing, Bittensor, etc.)
├── utils/              # Tests pour les utilitaires (helpers, logger, etc.)
├── server/             # Tests pour les composants du serveur
└── resources/          # Tests pour les ressources MCP
```

## Exécution des tests

### Exécuter tous les tests

```bash
npm test
```

### Exécuter les tests avec surveillance des modifications

```bash
npm run test:watch
```

### Exécuter les tests avec rapport de couverture

```bash
npm run test:coverage
```

Le rapport de couverture sera généré dans le répertoire `coverage/`.

## Configuration

La configuration des tests se trouve dans le fichier `jest.config.js` à la racine du projet.

## Mocks

Nous utilisons des mocks pour simuler les dépendances externes comme l'environnement, le logger, et les services externes. Les fichiers de mock se trouvent dans le répertoire `tests/mocks/`.

## Astuces pour écrire des tests

1. **Isoler les tests** : Chaque test doit être indépendant des autres.
2. **Mock les dépendances externes** : Utilisez `jest.mock()` pour simuler les dépendances externes.
3. **Tester les cas d'erreur** : Assurez-vous de tester les cas où des erreurs se produisent.
4. **Utiliser `beforeEach` et `afterEach`** : Pour réinitialiser l'état entre les tests.
5. **Limiter la portée des tests** : Chaque test doit tester une seule chose à la fois.

## Exemples

Consultez les tests existants pour des exemples sur la façon d'écrire des tests pour différents types de composants.