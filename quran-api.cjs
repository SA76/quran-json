#!/usr/bin/env node

/**
 * Quran API CLI Tool
 * 
 * A command-line utility to download and collect Quran resources from the Quran.com API.
 * Downloads each surah as a JSON file with comprehensive data including:
 * - Surah info (name, revelation place, manzil, etc.)
 * - Ayah text in Arabic (simple/imlaei and uthmani/tajweed)
 * - Word-by-word translations (English and Indonesian)
 * - Full translations (English and Indonesian)
 * 
 * Usage: node quran-api.js [options]
 * node quran-api.cjs download --all --output ./data
 * 
 * @author Quran JSON Downloader CLI
 * @version 1.0.0
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_BASE_URL = 'https://api.quran.com/api/v4';

// Translation IDs from Quran.com API
const TRANSLATION_IDS = {
  indonesian: 33,  // Indonesian Islamic Affairs Ministry
  english: 20,     // Saheeh International (reliable across all surahs)
};

// Color codes for CLI output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Print colored text to console
 */
function colorLog(color, message) {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

/**
 * Print a section header
 */
function printHeader(title) {
  const line = '═'.repeat(60);
  console.log();
  colorLog('cyan', line);
  colorLog('cyan', `  ${title}`);
  colorLog('cyan', line);
}

/**
 * Make an HTTP/HTTPS GET request
 */
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
        }
      });
    }).on('error', (err) => {
      reject(new Error(`HTTP request failed for ${url}: ${err.message}`));
    });
  });
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sanitize filename (remove special characters)
 */
function sanitizeFilename(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch all chapters (surahs) list
 */
async function fetchChapters(baseUrl) {
  const url = `${baseUrl}/chapters`;
  colorLog('dim', `  → Fetching chapters list...`);
  return await fetchJSON(url);
}

/**
 * Fetch chapter info
 */
async function fetchChapterInfo(baseUrl, chapterId) {
  const url = `${baseUrl}/chapters/${chapterId}?language=en`;
  return await fetchJSON(url);
}

/**
 * Fetch verses with words and translations
 * Note: Use `language` param (not word_translation_language) to get proper Indonesian word-by-word
 */
async function fetchVersesWithWords(baseUrl, chapterId, wordLang = 'en', translationIds = []) {
  const translations = translationIds.join(',');
  // Use 'language' parameter - this is what controls word-by-word translation language
  // word_fields includes the translation data we need
  const url = `${baseUrl}/verses/by_chapter/${chapterId}?language=${wordLang}&words=true&word_fields=text_uthmani,translation,transliteration&translations=${translations}&per_page=300`;
  return await fetchJSON(url);
}

/**
 * Fetch Arabic text (Uthmani script - tajweed style)
 */
async function fetchUthmaniText(baseUrl, chapterId) {
  const url = `${baseUrl}/quran/verses/uthmani?chapter_number=${chapterId}`;
  return await fetchJSON(url);
}

/**
 * Fetch Arabic text (Imlaei script - simple style)
 */
async function fetchImlaeiText(baseUrl, chapterId) {
  const url = `${baseUrl}/quran/verses/imlaei?chapter_number=${chapterId}`;
  return await fetchJSON(url);
}

/**
 * Fetch Arabic text (Uthmani Tajweed - with color-coded tajweed rules)
 * This contains HTML-like <tajweed> tags for styling
 */
async function fetchUthmaniTajweedText(baseUrl, chapterId) {
  const url = `${baseUrl}/quran/verses/uthmani_tajweed?chapter_number=${chapterId}`;
  return await fetchJSON(url);
}

/**
 * Build complete surah data object
 */
async function buildSurahData(baseUrl, chapter, options = {}) {
  const chapterId = chapter.id;
  
  colorLog('dim', `  → Fetching Arabic text (Uthmani)...`);
  const uthmaniData = await fetchUthmaniText(baseUrl, chapterId);
  await sleep(100);
  
  colorLog('dim', `  → Fetching Arabic text (Imlaei/Simple)...`);
  const imlaeiData = await fetchImlaeiText(baseUrl, chapterId);
  await sleep(100);
  
  colorLog('dim', `  → Fetching Arabic text (Uthmani Tajweed)...`);
  const tajweedData = await fetchUthmaniTajweedText(baseUrl, chapterId);
  await sleep(100);
  
  colorLog('dim', `  → Fetching verses with English word translations...`);
  const versesEnData = await fetchVersesWithWords(
    baseUrl, 
    chapterId, 
    'en', 
    [TRANSLATION_IDS.english, TRANSLATION_IDS.indonesian]
  );
  await sleep(100);
  
  // Note: Indonesian word-by-word might not be available, API falls back to English
  colorLog('dim', `  → Fetching verses with Indonesian word translations...`);
  const versesIdData = await fetchVersesWithWords(
    baseUrl, 
    chapterId, 
    'id', 
    [TRANSLATION_IDS.english, TRANSLATION_IDS.indonesian]
  );
  await sleep(100);
  
  // Build the ayahs array
  const ayahs = [];
  const versesEn = versesEnData.verses || [];
  const versesId = versesIdData.verses || [];
  const uthmaniVerses = uthmaniData.verses || [];
  const imlaeiVerses = imlaeiData.verses || [];
  const tajweedVerses = tajweedData.verses || [];
  
  for (let i = 0; i < versesEn.length; i++) {
    const verseEn = versesEn[i];
    const verseId = versesId[i] || verseEn;
    const uthmani = uthmaniVerses[i];
    const imlaei = imlaeiVerses[i];
    const tajweed = tajweedVerses[i];
    
    // Build word-by-word data
    const wordsEn = (verseEn.words || [])
      .filter(w => w.char_type_name === 'word')
      .map(w => ({
        position: w.position,
        text_code: w.code_v1 || w.text,
        audio_url: w.audio_url,
        translation: {
          text: w.translation?.text || '',
          language: 'en'
        },
        transliteration: w.transliteration?.text || ''
      }));
    
    const wordsId = (verseId.words || [])
      .filter(w => w.char_type_name === 'word')
      .map(w => ({
        position: w.position,
        text_code: w.code_v1 || w.text,
        audio_url: w.audio_url,
        translation: {
          text: w.translation?.text || '',
          language: w.translation?.language_name === 'indonesian' ? 'id' : 'en'
        },
        transliteration: w.transliteration?.text || ''
      }));
    
    // Extract translations
    const translationsEn = verseEn.translations || [];
    const translationEn = translationsEn.find(t => t.resource_id === TRANSLATION_IDS.english);
    const translationId = translationsEn.find(t => t.resource_id === TRANSLATION_IDS.indonesian);
    
    ayahs.push({
      id: verseEn.id,
      verse_number: verseEn.verse_number,
      verse_key: verseEn.verse_key,
      
      // Position info
      juz_number: verseEn.juz_number,
      hizb_number: verseEn.hizb_number,
      rub_el_hizb_number: verseEn.rub_el_hizb_number,
      manzil_number: verseEn.manzil_number,
      ruku_number: verseEn.ruku_number,
      page_number: verseEn.page_number,
      sajdah_number: verseEn.sajdah_number,
      
      // Arabic text
      text_arabic_simple: imlaei?.text_imlaei || '',
      text_arabic_uthmani: uthmani?.text_uthmani || '',
      text_arabic_tajweed: tajweed?.text_uthmani_tajweed || '',
      
      // Word-by-word
      words: {
        en: wordsEn,
        id: wordsId
      },
      
      // Translations
      translations: {
        en: translationEn?.text || '',
        id: translationId?.text || ''
      }
    });
  }
  
  // Build complete surah object
  return {
    // Metadata
    meta: {
      source: 'Quran.com API v4',
      base_url: baseUrl,
      downloaded_at: new Date().toISOString(),
      translation_ids: TRANSLATION_IDS
    },
    
    // Surah info
    surah: {
      id: chapter.id,
      name_simple: chapter.name_simple,
      name_complex: chapter.name_complex,
      name_arabic: chapter.name_arabic,
      translated_name: chapter.translated_name,
      revelation_place: chapter.revelation_place,
      revelation_order: chapter.revelation_order,
      bismillah_pre: chapter.bismillah_pre,
      verses_count: chapter.verses_count,
      pages: chapter.pages
    },
    
    // Ayahs
    ayahs: ayahs,
    
    // Summary stats
    stats: {
      total_ayahs: ayahs.length,
      total_words_en: ayahs.reduce((sum, a) => sum + a.words.en.length, 0),
      total_words_id: ayahs.reduce((sum, a) => sum + a.words.id.length, 0)
    }
  };
}

// ============================================================================
// CLI Commands
// ============================================================================

/**
 * Download a single surah
 */
async function downloadSurah(baseUrl, outputDir, surahId) {
  const chaptersData = await fetchChapters(baseUrl);
  const chapter = chaptersData.chapters.find(c => c.id === surahId);
  
  if (!chapter) {
    throw new Error(`Surah with ID ${surahId} not found`);
  }
  
  printHeader(`Downloading: ${chapter.name_simple} (${chapter.name_arabic})`);
  console.log(`  Surah #${chapter.id} | ${chapter.verses_count} verses | ${chapter.revelation_place}`);
  console.log();
  
  const surahData = await buildSurahData(baseUrl, chapter);
  
  // Save to file - use zero-padded number prefix for proper sorting
  const paddedId = String(chapter.id).padStart(3, '0');
  const filename = `${paddedId}-${sanitizeFilename(chapter.name_simple)}.json`;
  const filepath = path.join(outputDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(surahData, null, 2), 'utf8');
  
  colorLog('green', `  ✓ Saved to: ${filepath}`);
  console.log(`    → ${surahData.stats.total_ayahs} ayahs`);
  console.log(`    → ${surahData.stats.total_words_en} words (EN)`);
  console.log(`    → ${surahData.stats.total_words_id} words (ID)`);
  
  return surahData;
}

/**
 * Download all surahs
 */
async function downloadAllSurahs(baseUrl, outputDir, startFrom = 1, endAt = 114) {
  const chaptersData = await fetchChapters(baseUrl);
  const chapters = chaptersData.chapters.filter(c => c.id >= startFrom && c.id <= endAt);
  
  printHeader(`Downloading ${chapters.length} Surahs`);
  console.log(`  From: Surah ${startFrom} to Surah ${endAt}`);
  console.log(`  Output: ${outputDir}`);
  console.log();
  
  for (const chapter of chapters) {
    try {
      colorLog('blue', `\n[${chapter.id}/114] ${chapter.name_simple} (${chapter.name_arabic})`);
      
      const surahData = await buildSurahData(baseUrl, chapter);
      
      // Use zero-padded number prefix for proper sorting
      const paddedId = String(chapter.id).padStart(3, '0');
      const filename = `${paddedId}-${sanitizeFilename(chapter.name_simple)}.json`;
      const filepath = path.join(outputDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(surahData, null, 2), 'utf8');
      
      colorLog('green', `  ✓ ${filename} (${surahData.stats.total_ayahs} ayahs)`);
      
      // Add delay to avoid rate limiting
      await sleep(500);
    } catch (error) {
      colorLog('red', `  ✗ Error: ${error.message}`);
    }
  }
  
  colorLog('green', `\n✓ Download complete!`);
}

/**
 * List all surahs
 */
async function listSurahs(baseUrl) {
  const chaptersData = await fetchChapters(baseUrl);
  
  printHeader('All Surahs (114 Chapters)');
  
  console.log();
  console.log('  ID   Name                     Arabic           Verses  Place');
  console.log('  ─────────────────────────────────────────────────────────────');
  
  for (const ch of chaptersData.chapters) {
    const id = String(ch.id).padStart(3, ' ');
    const name = ch.name_simple.padEnd(24, ' ');
    const arabic = ch.name_arabic.padEnd(16, ' ');
    const verses = String(ch.verses_count).padStart(3, ' ');
    const place = ch.revelation_place;
    
    console.log(`  ${id}  ${name} ${arabic} ${verses}    ${place}`);
  }
  
  console.log();
}

/**
 * Fetch from a custom URL path
 */
async function fetchCustom(baseUrl, urlPath, params = {}) {
  let url = `${baseUrl}${urlPath}`;
  
  const queryParams = Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  
  if (queryParams) {
    url += (url.includes('?') ? '&' : '?') + queryParams;
  }
  
  printHeader('Custom API Request');
  colorLog('dim', `  URL: ${url}`);
  console.log();
  
  const data = await fetchJSON(url);
  console.log(JSON.stringify(data, null, 2));
  
  return data;
}

/**
 * Show available translations
 */
async function listTranslations(baseUrl, language = '') {
  const url = `${baseUrl}/resources/translations`;
  const data = await fetchJSON(url);
  
  printHeader('Available Translations');
  
  let translations = data.translations || [];
  
  if (language) {
    translations = translations.filter(t => 
      t.language_name.toLowerCase().includes(language.toLowerCase())
    );
    console.log(`  Filtered by language: "${language}"`);
  }
  
  console.log();
  console.log('  ID    Language             Name');
  console.log('  ───────────────────────────────────────────────────────────');
  
  for (const t of translations) {
    const id = String(t.id).padStart(4, ' ');
    const lang = t.language_name.padEnd(20, ' ');
    console.log(`  ${id}  ${lang} ${t.name}`);
  }
  
  console.log();
  colorLog('dim', `  Total: ${translations.length} translations`);
}

// ============================================================================
// CLI Parser
// ============================================================================

function printHelp() {
  console.log(`
${COLORS.cyan}╔══════════════════════════════════════════════════════════════════════════════╗
║                          QURAN API CLI TOOL                                    ║
╚══════════════════════════════════════════════════════════════════════════════╝${COLORS.reset}

${COLORS.bright}DESCRIPTION${COLORS.reset}
  A command-line utility to download and collect Quran resources from the 
  Quran.com API (or any compatible API). Downloads each surah as a JSON file 
  with comprehensive data.

${COLORS.bright}USAGE${COLORS.reset}
  node quran-api.js [command] [options]

${COLORS.bright}COMMANDS${COLORS.reset}
  ${COLORS.green}download${COLORS.reset}         Download a specific surah or all surahs
  ${COLORS.green}list${COLORS.reset}             List all 114 surahs
  ${COLORS.green}translations${COLORS.reset}     List available translations
  ${COLORS.green}fetch${COLORS.reset}            Fetch data from a custom API path
  ${COLORS.green}help${COLORS.reset}             Show this help message

${COLORS.bright}OPTIONS${COLORS.reset}
  --base-url       API base URL (default: ${DEFAULT_BASE_URL})
  --output, -o     Output directory for downloaded files (default: ./data)
  --surah, -s      Surah ID to download (1-114)
  --all            Download all surahs
  --from           Start downloading from this surah ID
  --to             Stop downloading at this surah ID
  --path           Custom API path for 'fetch' command
  --param          Query parameter in format key=value (can be repeated)
  --language       Filter translations by language

${COLORS.bright}EXAMPLES${COLORS.reset}
  ${COLORS.dim}# Download a single surah (Al-Fatihah)${COLORS.reset}
  node quran-api.js download --surah 1

  ${COLORS.dim}# Download all surahs${COLORS.reset}
  node quran-api.js download --all

  ${COLORS.dim}# Download surahs 1-10${COLORS.reset}
  node quran-api.js download --from 1 --to 10

  ${COLORS.dim}# Download to custom directory${COLORS.reset}
  node quran-api.js download --all --output ./quran-data

  ${COLORS.dim}# List all surahs${COLORS.reset}
  node quran-api.js list

  ${COLORS.dim}# List Indonesian translations${COLORS.reset}
  node quran-api.js translations --language indonesian

  ${COLORS.dim}# Fetch from custom API path${COLORS.reset}
  node quran-api.js fetch --path /chapters/1

  ${COLORS.dim}# Fetch with parameters${COLORS.reset}
  node quran-api.js fetch --path /verses/by_chapter/1 --param words=true --param translations=33

  ${COLORS.dim}# Use custom base URL${COLORS.reset}
  node quran-api.js list --base-url https://your-api.com/api/v4

${COLORS.bright}OUTPUT FORMAT${COLORS.reset}
  Each surah JSON file contains:
  - ${COLORS.cyan}meta${COLORS.reset}: Source info, download timestamp
  - ${COLORS.cyan}surah${COLORS.reset}: Surah info (id, names, revelation place, manzil, etc.)
  - ${COLORS.cyan}ayahs${COLORS.reset}: Array of verses with:
      - text_arabic_simple: Arabic text (Imlaei script)
      - text_arabic_uthmani: Arabic text (Uthmani/Tajweed script)
      - words.en: Word-by-word translation (English)
      - words.id: Word-by-word translation (Indonesian)
      - translations.en: Full translation (English)
      - translations.id: Full translation (Indonesian)
  - ${COLORS.cyan}stats${COLORS.reset}: Summary statistics

${COLORS.bright}NOTES${COLORS.reset}
  - The API is public and does not require authentication
  - Rate limiting: ~500ms delay between requests to avoid throttling
  - Indonesian word-by-word may fall back to English if not available
  - Translation IDs: Indonesian=33, English=20 (Saheeh International)

`);
}

function parseArgs(args) {
  const parsed = {
    command: null,
    baseUrl: DEFAULT_BASE_URL,
    output: './data',
    surah: null,
    all: false,
    from: 1,
    to: 114,
    path: null,
    params: {},
    language: ''
  };
  
  let i = 0;
  
  // First non-option argument is the command
  if (args[0] && !args[0].startsWith('-')) {
    parsed.command = args[0];
    i = 1;
  }
  
  while (i < args.length) {
    const arg = args[i];
    
    if (arg === '--base-url') {
      parsed.baseUrl = args[++i];
    } else if (arg === '--output' || arg === '-o') {
      parsed.output = args[++i];
    } else if (arg === '--surah' || arg === '-s') {
      parsed.surah = parseInt(args[++i], 10);
    } else if (arg === '--all') {
      parsed.all = true;
    } else if (arg === '--from') {
      parsed.from = parseInt(args[++i], 10);
    } else if (arg === '--to') {
      parsed.to = parseInt(args[++i], 10);
    } else if (arg === '--path') {
      let pathValue = args[++i];
      // Fix for Git Bash MSYS path conversion (e.g., /chapters/1 becomes C:/Program Files/Git/chapters/1)
      if (pathValue && pathValue.includes(':/') && pathValue.includes('/chapters')) {
        pathValue = pathValue.substring(pathValue.indexOf('/chapters'));
      } else if (pathValue && pathValue.includes(':/') && pathValue.includes('/verses')) {
        pathValue = pathValue.substring(pathValue.indexOf('/verses'));
      } else if (pathValue && pathValue.includes(':/') && pathValue.includes('/quran')) {
        pathValue = pathValue.substring(pathValue.indexOf('/quran'));
      } else if (pathValue && pathValue.includes(':/') && pathValue.includes('/resources')) {
        pathValue = pathValue.substring(pathValue.indexOf('/resources'));
      }
      parsed.path = pathValue;
    } else if (arg === '--param') {
      const paramValue = args[++i];
      const [key, value] = paramValue.split('=');
      if (key) {
        parsed.params[key] = value || '';
      }
    } else if (arg === '--language') {
      parsed.language = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      parsed.command = 'help';
    }
    
    i++;
  }
  
  return parsed;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    printHelp();
    return;
  }
  
  const options = parseArgs(args);
  
  // Ensure base URL doesn't have trailing slash
  options.baseUrl = options.baseUrl.replace(/\/$/, '');
  
  // Ensure output directory exists
  if (!fs.existsSync(options.output)) {
    fs.mkdirSync(options.output, { recursive: true });
  }
  
  try {
    switch (options.command) {
      case 'help':
        printHelp();
        break;
        
      case 'list':
        await listSurahs(options.baseUrl);
        break;
        
      case 'translations':
        await listTranslations(options.baseUrl, options.language);
        break;
        
      case 'download':
        if (options.surah) {
          await downloadSurah(options.baseUrl, options.output, options.surah);
        } else if (options.all || options.from || options.to) {
          await downloadAllSurahs(options.baseUrl, options.output, options.from, options.to);
        } else {
          colorLog('red', 'Error: Please specify --surah <id> or --all');
          colorLog('dim', 'Run "node quran-api.js help" for usage information');
        }
        break;
        
      case 'fetch':
        if (!options.path) {
          colorLog('red', 'Error: Please specify --path <api-path>');
          colorLog('dim', 'Example: node quran-api.js fetch --path /chapters/1');
        } else {
          await fetchCustom(options.baseUrl, options.path, options.params);
        }
        break;
        
      default:
        colorLog('red', `Unknown command: ${options.command}`);
        colorLog('dim', 'Run "node quran-api.js help" for usage information');
    }
  } catch (error) {
    colorLog('red', `\n✗ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
