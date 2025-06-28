#!/usr/bin/env node

// Custom build script for Vercel deployment
// Bypasses the problematic vite build command

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Vercel build for anime-sama API...');

try {
  // Create necessary directories
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist', { recursive: true });
  }

  // TypeScript type checking only (no compilation needed for serverless)
  console.log('📝 Running TypeScript type check...');
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  
  console.log('✅ Build completed successfully!');
  console.log('📦 API functions are ready for serverless deployment');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}