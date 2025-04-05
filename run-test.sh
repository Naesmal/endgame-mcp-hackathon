#!/bin/bash

# Script pour exécuter les tests unitaires

# S'assurer que le répertoire des tests existe
mkdir -p tests/mocks
mkdir -p tests/services
mkdir -p tests/tools
mkdir -p tests/utils
mkdir -p tests/server
mkdir -p tests/resources

# Installer les dépendances si nécessaire
if [ ! -d "node_modules" ]; then
  echo "Installation des dépendances..."
  npm install
fi

# Exécuter les tests
echo "Exécution des tests..."
npm test

# Si vous souhaitez afficher le rapport de couverture détaillé
# Décommentez la ligne suivante
# npm run test:coverage

# Si le test s'est terminé avec succès, afficher un message
if [ $? -eq 0 ]; then
  echo "✅ Tous les tests ont été exécutés avec succès !"
else
  echo "❌ Certains tests ont échoué. Vérifiez les erreurs ci-dessus."
fi