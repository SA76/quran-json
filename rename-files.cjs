#!/usr/bin/env node
/**
 * Rename surah JSON files to include zero-padded number prefix
 * e.g., al-fatihah.json -> 001-al-fatihah.json
 */

const fs = require('fs');
const path = require('path');

const dataDir = './data';

// Get all JSON files
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

console.log(`Found ${files.length} JSON files to rename...\n`);

let renamed = 0;

files.forEach(file => {
  // Skip if already has number prefix
  if (/^\d{3}-/.test(file)) {
    console.log(`  Skip: ${file} (already has prefix)`);
    return;
  }
  
  const filepath = path.join(dataDir, file);
  
  try {
    const content = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    const surahId = content.surah?.id;
    
    if (surahId) {
      const paddedId = String(surahId).padStart(3, '0');
      const newFilename = `${paddedId}-${file}`;
      const newPath = path.join(dataDir, newFilename);
      
      fs.renameSync(filepath, newPath);
      console.log(`  ✓ ${file} -> ${newFilename}`);
      renamed++;
    } else {
      console.log(`  ✗ ${file} - No surah ID found`);
    }
  } catch (err) {
    console.log(`  ✗ ${file} - Error: ${err.message}`);
  }
});

console.log(`\n✓ Done! Renamed ${renamed} files.`);
