/**
 * Shorten verse text for daily promise cards (readable on 1080x1080 images).
 */

const MAX_ENGLISH = 72;
const MAX_TELUGU = 88;

function normalizeSpaces(s) {
  return String(s || '').trim().replace(/\s+/g, ' ');
}

function firstSentence(text) {
  const t = normalizeSpaces(text);
  if (!t) return '';

  // English / mixed punctuation
  const enMatch = t.match(/^[^.!?]+[.!?]?/);
  if (enMatch && enMatch[0].length >= 12) {
    return enMatch[0].replace(/[.!?]+$/, '').trim();
  }

  // Telugu often ends with । or .
  const teMatch = t.match(/^[^।.]+[।.]?/);
  if (teMatch && teMatch[0].length >= 8) {
    return teMatch[0].replace(/[।.]+$/, '').trim();
  }

  return t;
}

function truncateAtWord(text, maxLen) {
  const t = normalizeSpaces(text);
  if (t.length <= maxLen) return t;
  const cut = t.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > 20 ? cut.slice(0, lastSpace) : cut;
  return `${base}…`;
}

function shortenText(text, maxLen) {
  let s = firstSentence(text);
  if (!s) return '';
  if (s.length > maxLen) {
    s = truncateAtWord(s, maxLen);
  }
  return s;
}

function shortenPromiseItem(item) {
  const english = shortenText(item.english, MAX_ENGLISH);
  const telugu = shortenText(item.telugu, MAX_TELUGU);
  const verse = normalizeSpaces(item.verse).replace(/\s+/g, ' ');

  return {
    day: Number(item.day),
    verse,
    english: english || shortenText(item.english, MAX_ENGLISH + 20),
    telugu: telugu || shortenText(item.telugu, MAX_TELUGU + 20),
  };
}

function shortenAllPromises(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map(shortenPromiseItem)
    .filter((x) => x.day && x.verse && (x.english || x.telugu))
    .sort((a, b) => a.day - b.day);
}

module.exports = {
  shortenPromiseItem,
  shortenAllPromises,
  MAX_ENGLISH,
  MAX_TELUGU,
};
