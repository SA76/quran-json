# Quran JSON Data

Complete Quran data in JSON format with Arabic text, word-by-word translations, and full translations in English and Indonesian.

## 📦 Data Structure

Each surah file (e.g., `001-al-fatihah.json`) contains:

```json
{
  "meta": {
    "source": "Quran.com API v4",
    "downloaded_at": "2025-12-09T...",
    "translation_ids": { "indonesian": 33, "english": 20 }
  },
  "surah": {
    "id": 1,
    "name_simple": "Al-Fatihah",
    "name_arabic": "الفاتحة",
    "revelation_place": "makkah",
    "verses_count": 7
  },
  "ayahs": [
    {
      "verse_number": 1,
      "verse_key": "1:1",
      "text_arabic_simple": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
      "text_arabic_uthmani": "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ",
      "text_arabic_tajweed": "<tajweed>...</tajweed>",
      "words": {
        "en": [
          { "text_code": "بِسْمِ", "translation": { "text": "In (the) name" } }
        ],
        "id": [
          { "text_code": "بِسْمِ", "translation": { "text": "dengan nama" } }
        ]
      },
      "translations": {
        "en": "In the name of Allah, the Entirely Merciful...",
        "id": "Dengan nama Allah Yang Maha Pengasih..."
      }
    }
  ]
}
```

## 🌐 CDN Access

Access files directly via **jsDelivr CDN**:

```
https://cdn.jsdelivr.net/gh/YOUR_USERNAME/quran-json@main/data/001-al-fatihah.json
```

### JavaScript Example

```javascript
const CDN_BASE =
  "https://cdn.jsdelivr.net/gh/YOUR_USERNAME/quran-json@main/data";

async function getSurah(surahId) {
  const paddedId = String(surahId).padStart(3, "0");
  const response = await fetch(`${CDN_BASE}/${paddedId}-${surahName}.json`);
  return response.json();
}

// Or use the chapters.json index
const chapters = await fetch(`${CDN_BASE}/../chapters.json`).then((r) =>
  r.json()
);
```

## 📁 Files

| File            | Description                        |
| --------------- | ---------------------------------- |
| `data/*.json`   | 114 surah files with complete data |
| `chapters.json` | Index of all surahs with metadata  |
| `quran-api.cjs` | CLI tool to download/refresh data  |

## 🛠️ CLI Tool

Use the included CLI tool to download or refresh the data:

```bash
# Install no dependencies needed - uses only Node.js built-in modules

# Show help
node quran-api.cjs help

# List all surahs
node quran-api.cjs list

# Download a single surah
node quran-api.cjs download --surah 1 --output ./data

# Download all surahs
node quran-api.cjs download --all --output ./data

# Download a range
node quran-api.cjs download --from 1 --to 10 --output ./data

# List available translations
node quran-api.cjs translations --language indonesian
```

## 📊 Data Contents

Each ayah includes:

| Field                 | Description                                     |
| --------------------- | ----------------------------------------------- |
| `text_arabic_simple`  | Imlaei script (modern Arabic spelling)          |
| `text_arabic_uthmani` | Uthmani script (traditional Quranic)            |
| `text_arabic_tajweed` | With `<tajweed>` tags for color-coded rules     |
| `words.en`            | Word-by-word English translation                |
| `words.id`            | Word-by-word Indonesian translation             |
| `translations.en`     | Full English translation (Saheeh International) |
| `translations.id`     | Full Indonesian translation                     |

Position metadata: `juz_number`, `hizb_number`, `manzil_number`, `page_number`, `ruku_number`

## 📜 License

- **Quran text**: Public domain (religious scripture)
- **Translations**: Sourced from [Quran.com API v4](https://api.quran.com)
- **CLI tool**: MIT License

## 🙏 Credits

- Data source: [Quran.com API](https://quran.com)
- Translations: Saheeh International (EN), Indonesian Islamic Affairs Ministry (ID)

---

_بسم الله الرحمن الرحيم_
