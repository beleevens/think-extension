#!/usr/bin/env node

/**
 * Package Think Extension for distribution
 * Creates a ZIP file ready for Chrome Web Store or manual installation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { createReadStream } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pipelineAsync = promisify(pipeline);

// Configuration
const DIST_DIR = path.resolve(__dirname, '../dist');
const PACKAGE_DIR = path.resolve(__dirname, '../packages');
const MANIFEST_PATH = path.join(DIST_DIR, 'manifest.json');

// Read version from manifest
let version = '0.1.0';
try {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  version = manifest.version;
} catch (err) {
  console.warn('⚠️  Could not read version from manifest.json, using default:', version);
}

const ZIP_NAME = `think-better-extension-v${version}.zip`;
const ZIP_PATH = path.join(PACKAGE_DIR, ZIP_NAME);

console.log('📦 Packaging Think Extension');
console.log('=====================================\n');

// Check if dist exists
if (!fs.existsSync(DIST_DIR)) {
  console.error('❌ Error: dist directory not found. Run "npm run build" first.');
  process.exit(1);
}

// Create packages directory
if (!fs.existsSync(PACKAGE_DIR)) {
  fs.mkdirSync(PACKAGE_DIR, { recursive: true });
  console.log('✓ Created packages directory');
}

// Create ZIP using native Node.js archiving (no dependencies needed)
async function createZip() {
  console.log(`📝 Creating ZIP archive: ${ZIP_NAME}`);

  // Use a simple approach: we'll create a zip using the built-in zip command
  // This works on macOS and Linux
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  try {
    // Remove old zip if exists
    if (fs.existsSync(ZIP_PATH)) {
      fs.unlinkSync(ZIP_PATH);
      console.log('✓ Removed old package');
    }

    // Create zip using system command (works on macOS/Linux)
    const command = `cd "${DIST_DIR}" && zip -r "${ZIP_PATH}" . -x "*.DS_Store" -x "__MACOSX/*"`;
    await execAsync(command);

    const stats = fs.statSync(ZIP_PATH);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log('\n✅ Package created successfully!');
    console.log('================================\n');
    console.log(`📦 Package: ${ZIP_NAME}`);
    console.log(`📍 Location: ${ZIP_PATH}`);
    console.log(`📊 Size: ${sizeMB} MB`);
    console.log(`🎯 Version: ${version}\n`);
    console.log('Next steps:');
    console.log('1. Test: Load the dist/ folder in Chrome to verify');
    console.log('2. Publish: Upload the ZIP to Chrome Web Store');
    console.log('3. Share: Send the ZIP to users for manual installation\n');

  } catch (error) {
    console.error('❌ Error creating package:', error.message);
    console.log('\nFallback: You can manually create a ZIP:');
    console.log(`1. Navigate to: ${DIST_DIR}`);
    console.log(`2. Select all files (not the dist folder itself)`);
    console.log(`3. Right-click → Compress`);
    console.log(`4. Rename to: ${ZIP_NAME}`);
    process.exit(1);
  }
}

// Run packaging
createZip().catch(error => {
  console.error('❌ Packaging failed:', error);
  process.exit(1);
});
