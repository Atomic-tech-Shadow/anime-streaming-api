#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Construction pour Render...');

// Vérifier que TypeScript est compilé
try {
  console.log('📝 Compilation TypeScript...');
  execSync('npx tsc', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Erreur de compilation TypeScript');
  process.exit(1);
}

// Copier les fichiers API compilés
try {
  console.log('📁 Copie des fichiers API...');
  
  // Créer le dossier dist/api s'il n'existe pas
  if (!fs.existsSync('dist/api')) {
    fs.mkdirSync('dist/api', { recursive: true });
  }
  
  // Copier récursivement le dossier api compilé
  execSync('cp -r api/* dist/api/', { stdio: 'inherit' });
  
  console.log('✅ Build terminé avec succès!');
} catch (error) {
  console.error('❌ Erreur lors de la copie des fichiers:', error.message);
  process.exit(1);
}