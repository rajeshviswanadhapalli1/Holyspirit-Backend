/**
 * Import a full Bible (books/chapters/verses) into MongoDB.
 *
 * This script DOES NOT scrape websites. You must provide a JSON file you are licensed to use.
 *
 * Expected JSON format:
 * {
 *   "language": { "name": "English", "code": "en" },
 *   "books": [
 *     {
 *       "name": "Genesis",
 *       "chapters": [
 *         ["In the beginning...", "And the earth was...", "..."],   // chapter 1 verses (index 1..n)
 *         ["Thus the heavens...", "..."]                            // chapter 2
 *       ]
 *     }
 *   ]
 * }
 *
 * Usage:
 *   node scripts/import-bible-json.js "/abs/path/kjv.json"
 *   node scripts/import-bible-json.js "/abs/path/telugu.json"
 *
 * Optional:
 *   BATCH=10 node scripts/import-bible-json.js "/abs/path/kjv.json"
 */

require('dotenv').config();
const fs = require('fs');
const mongoose = require('mongoose');

const Language = require('../models/languagemodal');
const Testament = require('../models/testamentmodal');
const Book = require('../models/bookmodal');
const Verse = require('../models/verseModal');

const { BOOK_TO_TESTAMENT } = require('../utils/bibleBooks');

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in environment`);
  return v;
}

function normalizeSpaces(s) {
  return String(s || '').trim().replace(/\s+/g, ' ');
}

async function upsertLanguage({ name, code }) {
  const nm = normalizeSpaces(name);
  const cd = normalizeSpaces(code).toLowerCase();
  if (!nm || !cd) throw new Error('language.name and language.code are required');
  return await Language.findOneAndUpdate(
    { code: cd },
    { name: nm, code: cd, active: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function upsertTestament({ name, languageId }) {
  const nm = normalizeSpaces(name);
  return await Testament.findOneAndUpdate(
    { name: nm, languageId },
    { name: nm, languageId, active: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function upsertBook({ name, languageId, testamentId, chapterCount }) {
  const nm = normalizeSpaces(name);
  return await Book.findOneAndUpdate(
    { name: nm, languageId, testamentId },
    { name: nm, languageId, testamentId, chapterCount, active: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function upsertChapterVerses({
  languageId,
  testamentId,
  bookId,
  chapterIndex,
  versesArray,
}) {
  const verseCount = versesArray.length;
  const verses = versesArray.map((t, idx) => ({
    index: idx + 1,
    text: String(t || '').trim(),
  }));

  const chapterName = `Chapter ${chapterIndex}`;

  return await Verse.findOneAndUpdate(
    { languageId, testamentId, bookId, chapterIndex },
    { languageId, testamentId, bookId, chapterName, chapterIndex, verseCount, verses },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error('Usage: node scripts/import-bible-json.js "/abs/path/bible.json"');
    process.exit(1);
  }

  requireEnv('MONGO_URI');

  const batch = process.env.BATCH ? Number(process.env.BATCH) : 5;

  const raw = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(raw);

  if (!data || typeof data !== 'object') throw new Error('Invalid JSON');
  if (!data.language || !data.books) throw new Error('JSON must include language and books');
  if (!Array.isArray(data.books)) throw new Error('books must be an array');

  await mongoose.connect(process.env.MONGO_URI);

  const language = await upsertLanguage(data.language);
  const testaments = {
    'Old Testament': await upsertTestament({ name: 'Old Testament', languageId: language._id }),
    'New Testament': await upsertTestament({ name: 'New Testament', languageId: language._id }),
  };

  let chapterOps = 0;
  let importedChapters = 0;

  for (const b of data.books) {
    const bookName = normalizeSpaces(b.name);
    const chapters = b.chapters;
    if (!bookName || !Array.isArray(chapters) || chapters.length === 0) continue;

    const testamentName = BOOK_TO_TESTAMENT[bookName] || 'Old Testament';
    const testamentId = testaments[testamentName]._id;

    const bookDoc = await upsertBook({
      name: bookName,
      languageId: language._id,
      testamentId,
      chapterCount: chapters.length,
    });

    for (let i = 0; i < chapters.length; i++) {
      const chapterIndex = i + 1;
      const versesArray = chapters[i];
      if (!Array.isArray(versesArray)) continue;

      await upsertChapterVerses({
        languageId: language._id,
        testamentId,
        bookId: bookDoc._id,
        chapterIndex,
        versesArray,
      });

      importedChapters += 1;
      chapterOps += 1;
      if (chapterOps >= batch) {
        chapterOps = 0;
        console.log(`Imported chapters: ${importedChapters}`);
      }
    }
  }

  console.log(`Done. Imported chapters: ${importedChapters} for language ${language.code}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});

