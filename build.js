#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔨 Construction pour Render...');

// Vérifier que TypeScript est compilé
try {
  console.log('📝 Compilation TypeScript...');
  execSync('npx tsc -p tsconfig.build.json', { stdio: 'inherit' });
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
  
  // Les fichiers sont déjà compilés dans dist/ par TypeScript
  
  console.log('✅ Build terminé avec succès!');
} catch (error) {
  console.error('❌ Erreur lors de la copie des fichiers:', error.message);
  process.exit(1);
}