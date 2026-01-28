#!/usr/bin/env node

/**
 * MVP Functional Check Script
 * Verifies that the UI-only MVP has all required files and structure.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

const errors = [];
const warnings = [];

function checkFile(path, description) {
  const fullPath = join(ROOT_DIR, path);
  if (!existsSync(fullPath)) {
    errors.push(`Missing required file: ${path} (${description})`);
    return false;
  }
  return true;
}

function checkFileContent(path, searchText, description) {
  const fullPath = join(ROOT_DIR, path);
  if (!existsSync(fullPath)) {
    errors.push(`Missing file for content check: ${path}`);
    return false;
  }
  
  try {
    const content = readFileSync(fullPath, 'utf-8');
    if (!content.includes(searchText)) {
      errors.push(`File ${path} does not contain expected content: ${description}`);
      return false;
    }
    return true;
  } catch (err) {
    errors.push(`Error reading ${path}: ${err.message}`);
    return false;
  }
}

function checkRoute(pattern, description) {
  const fullPath = join(ROOT_DIR, pattern);
  if (existsSync(fullPath)) {
    return true;
  }
  errors.push(`Missing route: ${pattern} (${description})`);
  return false;
}

// Check routes (support both App Router and Pages Router patterns)
console.log('Checking routes...');
const route1Found = checkRoute('app/import/page.tsx', '/import route (App Router)') ||
                    checkRoute('pages/import/index.tsx', '/import route (Pages Router)');
if (!route1Found) {
  errors.push('Route /import not found in either app/import/page.tsx or pages/import/index.tsx');
}

const route2Found = checkRoute('app/import/new/page.tsx', '/import/new route (App Router)') ||
                    checkRoute('pages/import/new/index.tsx', '/import/new route (Pages Router)');
if (!route2Found) {
  errors.push('Route /import/new not found in either app/import/new/page.tsx or pages/import/new/index.tsx');
}

const route3Found = checkRoute('app/import/new/[id]/page.tsx', '/import/new/[id] route (App Router)') ||
                    checkRoute('pages/import/new/[id].tsx', '/import/new/[id] route (Pages Router)');
if (!route3Found) {
  errors.push('Route /import/new/[id] not found in either app/import/new/[id]/page.tsx or pages/import/new/[id].tsx');
}

// Check core files
console.log('Checking core files...');
checkFile('lib/store.ts', 'Zustand store with localStorage persistence');
checkFile('types/product.ts', 'Product type definitions');
checkFile('lib/fake-data.ts', 'Fake data generator');

// Check store.ts has localStorage key
console.log('Checking store configuration...');
checkFileContent(
  'lib/store.ts',
  'product-import-store-v2',
  'localStorage key "product-import-store-v2"'
);

// Check types/product.ts has status enum with required values
console.log('Checking product status types...');
if (checkFile('types/product.ts', 'Product type definitions')) {
  const content = readFileSync(join(ROOT_DIR, 'types/product.ts'), 'utf-8');
  const requiredStatuses = ['RAW', 'DRAFT', 'READY', 'PUSHED'];
  const missingStatuses = requiredStatuses.filter(status => !content.includes(status));
  
  if (missingStatuses.length > 0) {
    errors.push(`ProductStatus type missing required values: ${missingStatuses.join(', ')}`);
  }
}

// Check fake-data.ts exists (already checked above, but verify it's referenced)
if (checkFile('lib/fake-data.ts', 'Fake data generator')) {
  try {
    const storeContent = readFileSync(join(ROOT_DIR, 'lib/store.ts'), 'utf-8');
    if (!storeContent.includes('fake-data') && !storeContent.includes('generateFakeProducts')) {
      warnings.push('lib/store.ts may not reference lib/fake-data.ts (check if generateFakeProducts is imported)');
    }
  } catch (err) {
    // Already checked store.ts exists above
  }
}

// Report results
console.log('\n' + '='.repeat(60));
if (errors.length === 0) {
  console.log('✅ MVP Verification: PASSED');
  console.log('\nAll required files and structure are present:');
  console.log('  ✓ Routes: /import, /import/new, /import/new/[id]');
  console.log('  ✓ Store: lib/store.ts with localStorage key "product-import-store-v2"');
  console.log('  ✓ Types: types/product.ts with RAW, DRAFT, READY, PUSHED statuses');
  console.log('  ✓ Fake data: lib/fake-data.ts');
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(w => console.log(`  - ${w}`));
  }
  
  process.exit(0);
} else {
  console.log('❌ MVP Verification: FAILED');
  console.log('\nErrors found:');
  errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(w => console.log(`  - ${w}`));
  }
  
  process.exit(1);
}

