/**
 * Imports 365 promises JSON into `dailypromises` with generated card images.
 *
 * Input JSON shape (array):
 *   [{ day: 1..365, verse: "Matthew 28:20", english: "...", telugu: "..." }, ...]
 *
 * Generates:
 *   - `date` as YYYY-MM-DD based on the provided year + day-of-year
 *   - English + Telugu professional pastel promise-card images (PNG)
 *   - uploads both images to Cloudinary
 *   - upserts into `dailypromises`
 *
 * Usage:
 *   node scripts/import-365-promises.js "/absolute/path/god-promises.json" 2026
 *
 * Default (if no path): data/promises.json
 *
 * Optional:
 *   LIMIT=10 node scripts/import-365-promises.js "/path/god-promises.json" 2026
 *   SKIP_SHORTEN=1  ... use raw text without shortening
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const DailyPromise = require('../models/dailypromisemodal');
const { generatePromiseCardPng } = require('../utils/promiseCardGenerator');
const { toTeluguReference } = require('../utils/bibleReference');
const { shortenAllPromises } = require('../utils/shortenPromise');

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in environment`);
  return v;
}

function dayToIsoDate(year, day) {
  // day: 1..365/366
  const d = new Date(Date.UTC(Number(year), 0, 1));
  d.setUTCDate(d.getUTCDate() + (Number(day) - 1));
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function prettyDateLabel(iso) {
  // "2026-05-06" -> "MAY 06 2026"
  const [y, m, d] = String(iso).split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
  return `${month} ${String(d).padStart(2, '0')} ${y}`;
}

async function uploadPngBuffer(buffer, publicId) {
  return await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder: 'daily-promises',
        public_id: publicId,
        overwrite: true,
        format: 'png',
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

async function main() {
  const defaultJson = path.resolve(__dirname, '..', 'data', 'promises.json');
  const jsonPath = process.argv[2] || defaultJson;
  const year = Number(process.argv[3] || new Date().getFullYear());
  const limit = process.env.LIMIT ? Number(process.env.LIMIT) : null;
  const skipShorten = process.env.SKIP_SHORTEN === '1';

  if (!fs.existsSync(jsonPath)) {
    console.error(`JSON not found: ${jsonPath}`);
    console.error('Run: cp "/Users/rajesh/Downloads/promises.json" data/promises.json');
    process.exit(1);
  }

  requireEnv('MONGO_URI');
  requireEnv('CLOUDINARY_CLOUD_NAME');
  requireEnv('CLOUDINARY_API_KEY');
  requireEnv('CLOUDINARY_API_SECRET');

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const raw = fs.readFileSync(jsonPath, 'utf8');
  let items = JSON.parse(raw);
  if (!Array.isArray(items)) throw new Error('JSON must be an array');

  if (!skipShorten) {
    items = shortenAllPromises(items);
    console.log(`Using shortened promise text (${items.length} days)`);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const slice = limit ? items.slice(0, limit) : items;
  let ok = 0;
  let failed = 0;

  for (const item of slice) {
    const day = Number(item.day);
    const verseRef = String(item.verse || '').trim();
    const teluguVerseRef = toTeluguReference(verseRef);
    const english = String(item.english || '').trim();
    const telugu = String(item.telugu || '').trim();

    if (!day || !verseRef || !english) {
      failed += 1;
      continue;
    }

    const date = dayToIsoDate(year, day);
    const dateLabel = prettyDateLabel(date);

    const englishPng = await generatePromiseCardPng({
      dateLabel,
      date,
      verseText: english,
      reference: verseRef,
      language: 'english',
    });

    const teluguPng = await generatePromiseCardPng({
      dateLabel,
      date,
      verseText: telugu || english,
      reference: teluguVerseRef || verseRef,
      language: 'telugu',
    });

    const publicBase = `${year}-${String(day).padStart(3, '0')}`;
    const engUpload = await uploadPngBuffer(englishPng, `${publicBase}-en`);
    const telUpload = await uploadPngBuffer(teluguPng, `${publicBase}-te`);

    await DailyPromise.findOneAndUpdate(
      { date },
      {
        date,
        text: english,
        telugu: telugu || '',
        englishReference: verseRef,
        teluguReference: teluguVerseRef || verseRef,
        imageUrlEnglish: engUpload.secure_url,
        imageUrlTelugu: telUpload.secure_url,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    ok += 1;
    if (ok % 10 === 0) {
      console.log(`Imported ${ok}/${slice.length}...`);
    }
  }

  console.log(`Done. Imported=${ok}, failed=${failed}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});

