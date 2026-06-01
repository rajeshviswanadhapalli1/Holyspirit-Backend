const Fuse = require('fuse.js');
const mongoose = require('mongoose');
const Book = require('../models/bookmodal');
const Language = require('../models/languagemodal');
const Testament = require('../models/testamentmodal');

function normalizeQuery(raw) {
  return String(raw || '')
    .trim()
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseBookAndChapter(normalized) {
  // Find first number token (1..999)
  const m = normalized.match(/^(.*?)(?:\s+(\d{1,3}))?$/);
  const bookText = String(m?.[1] || '').trim();
  const chapterNumber = m?.[2] ? Number(m[2]) : 1;
  return {
    bookText,
    chapterNumber: Number.isFinite(chapterNumber) && chapterNumber > 0 ? chapterNumber : 1,
  };
}

function normalizeInputLanguage(v) {
  const s = String(v || '').toLowerCase();
  if (s === 'english' || s === 'en' || s === 'eng') return 'english';
  if (s === 'telugu' || s === 'te' || s === 'tel') return 'telugu';
  return null;
}

async function resolveLanguageId({ languageId, inputLanguage }) {
  if (languageId && mongoose.Types.ObjectId.isValid(languageId)) return languageId;
  const lang = normalizeInputLanguage(inputLanguage);
  if (!lang) return null;
  const code = lang === 'telugu' ? 'TEL' : 'ENG';
  const doc = await Language.findOne({ code }).select('_id').lean();
  return doc ? String(doc._id) : null;
}

function toScore(fuseScore) {
  // Fuse score: 0 best; threshold ~0.4 bad
  const s = typeof fuseScore === 'number' ? fuseScore : 1;
  return Math.max(0, Math.min(1, 1 - s));
}

function matchTypeFor(query, bookName, score) {
  const q = String(query || '').toLowerCase();
  const n = String(bookName || '').toLowerCase();
  if (!q || !n) return 'fuzzy';
  if (q === n) return 'name';
  if (n.startsWith(q)) return 'alias';
  if (score >= 0.92) return 'name';
  if (score >= 0.82) return 'alias';
  return 'fuzzy';
}

exports.voiceSearch = async (req, res) => {
  try {
    const { query, inputLanguage, languageId, limit } = req.body || {};

    if (!query || !String(query).trim()) {
      return res.status(400).json({ status: 'Error', message: 'query is required' });
    }

    const normalizedLang = normalizeInputLanguage(inputLanguage);
    if (!normalizedLang) {
      return res.status(400).json({ status: 'Error', message: 'inputLanguage must be english or telugu' });
    }

    const normalizedQuery = normalizeQuery(query);
    const parsed = parseBookAndChapter(normalizedQuery);

    const resolvedLanguageId = await resolveLanguageId({ languageId, inputLanguage: normalizedLang });

    const maxLimit = Math.min(20, Math.max(1, Number(limit || 10)));

    // Some existing Book docs may not have `active` set. Treat missing as active.
    const filter = { active: { $ne: false } };
    if (resolvedLanguageId) filter.languageId = resolvedLanguageId;

    const books = await Book.find(filter).select('_id name testamentId languageId chapterCount').lean();
    if (!books.length) {
      return res.status(404).json({
        status: 'Error',
        message: 'No matches found',
        data: {
          query,
          inputLanguage: normalizedLang,
          normalizedQuery,
          parsed,
          results: [],
        },
      });
    }

    const fuse = new Fuse(books, {
      keys: ['name'],
      includeScore: true,
      threshold: 0.4,
      ignoreLocation: true,
      minMatchCharLength: 1,
    });

    const needle = parsed.bookText || normalizedQuery;
    const fuseResults = fuse.search(needle).slice(0, maxLimit);

    const testamentIds = Array.from(new Set(fuseResults.map(r => String(r.item.testamentId))));
    const testaments = await Testament.find({ _id: { $in: testamentIds } }).select('_id name').lean();
    const testamentNameById = new Map(testaments.map(t => [String(t._id), t.name]));

    const results = fuseResults
      .map((r) => {
        const score = toScore(r.score);
        const chapterOk = parsed.chapterNumber <= Number(r.item.chapterCount || 0);
        const finalScore = chapterOk ? score : score * 0.6;
        const matchType = matchTypeFor(needle, r.item.name, finalScore);
        return {
          score: Number(finalScore.toFixed(4)),
          matchType,
          bookId: String(r.item._id),
          bookName: r.item.name,
          testamentId: String(r.item.testamentId),
          testamentName: testamentNameById.get(String(r.item.testamentId)) || '',
          languageId: String(r.item.languageId),
          chapterNumber: parsed.chapterNumber,
          chapterCount: Number(r.item.chapterCount || 0),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, maxLimit);

    if (!results.length || results[0].score < 0.35) {
      return res.status(404).json({
        status: 'Error',
        message: 'No matches found',
        data: {
          query,
          inputLanguage: normalizedLang,
          normalizedQuery,
          parsed,
          results: [],
        },
      });
    }

    const best = results[0];
    return res.status(200).json({
      status: 'Success',
      message: 'Matches found',
      data: {
        query,
        inputLanguage: normalizedLang,
        normalizedQuery,
        parsed: {
          bookText: parsed.bookText,
          chapterNumber: parsed.chapterNumber,
        },
        results,
        bestMatch: {
          bookId: best.bookId,
          bookName: best.bookName,
          testamentId: best.testamentId,
          languageId: best.languageId,
          chapterNumber: best.chapterNumber,
        },
      },
    });
  } catch (err) {
    console.error('voiceSearch error:', err);
    res.status(500).json({ status: 'Error', message: 'Internal server error' });
  }
};

