#!/usr/bin/env node

// Override build script to bypass Vite for API-only Vercel deployment
console.log('📦 Preparing API for Vercel serverless deployment...');
console.log('✅ Build completed - Vercel will handle TypeScript compilation automatically');