#!/bin/bash
echo "Building anime-sama API for Vercel..."

# Create dist directory
mkdir -p dist

# TypeScript check
npx tsc --noEmit

# Build server with esbuild
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js

echo "Build completed successfully!"