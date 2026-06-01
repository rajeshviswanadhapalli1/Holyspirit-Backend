const BOOK_MAP_EN_TO_TE = {
  // OT
  Deuteronomy: 'ద్వితీయోపదేశము',
  Joshua: 'యెహోషువ',
  Psalm: 'కీర్తన',
  Psalms: 'కీర్తన',
  Proverbs: 'సామెతలు',
  Isaiah: 'యెషయా',
  Jeremiah: 'యిర్మియా',
  Nahum: 'నహూము',

  // Gospels
  Matthew: 'మత్తయి',
  Mark: 'మార్కు',
  Luke: 'లూకా',
  John: 'యోహాను',

  // Letters (common)
  Hebrews: 'హెబ్రీయులకు',
  James: 'యాకోబు',
  '1 Peter': '1 పేతురు',
  '2 Peter': '2 పేతురు',
  '1 John': '1 యోహాను',
  '2 John': '2 యోహాను',
  '3 John': '3 యోహాను',
  Jude: 'యూదా',

  // Paul
  Romans: 'రోమీయులకు',
  '1 Corinthians': '1 కొరింథీయులకు',
  '2 Corinthians': '2 కొరింథీయులకు',
  Galatians: 'గలతీయులకు',
  Ephesians: 'ఎఫెసీయులకు',
  Philippians: 'ఫిలిప్పీయులకు',
  Colossians: 'కొలొస్సయులకు',
  '1 Thessalonians': '1 థెస్సలొనీకయులకు',
  '2 Thessalonians': '2 థెస్సలొనీకయులకు',
  '1 Timothy': '1 తిమోతికి',
  '2 Timothy': '2 తిమోతికి',
  Titus: 'తీతుకు',
  Philemon: 'ఫిలేమోనుకు',
};

function normalizeSpaces(s) {
  return String(s || '').trim().replace(/\s+/g, ' ');
}

function toTeluguReference(englishRef) {
  const ref = normalizeSpaces(englishRef);
  if (!ref) return '';

  // Try to split: "<Book> <Chapter:Verse>"
  const m = ref.match(/^(.+?)\s+(\d+:\d+(?:-\d+)?)$/);
  if (!m) return ref;

  let book = normalizeSpaces(m[1]);
  if (book === 'Psalm') book = 'Psalms';
  const cv = m[2];
  const teBook = BOOK_MAP_EN_TO_TE[book] || BOOK_MAP_EN_TO_TE[book.replace(/s$/, '')];
  if (!teBook) return ref;

  return `${teBook} ${cv}`;
}

module.exports = { toTeluguReference, BOOK_MAP_EN_TO_TE };

