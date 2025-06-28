const { execSync } = require('child_process');

console.log('Building for Vercel deployment...');

try {
  // Only run TypeScript type checking - no bundling needed for serverless
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('TypeScript check passed - ready for deployment');
} catch (error) {
  console.error('TypeScript check failed:', error.message);
  process.exit(1);
}