/**
 * Generate preview promise cards (short + lengthy text).
 *
 * Usage: node scripts/preview-promise-cards.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { generatePromiseCardPng } = require('../utils/promiseCardGenerator');
const { toTeluguReference } = require('../utils/bibleReference');

async function main() {
  const outDir = path.resolve(__dirname, '..', 'previews');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const samples = [
    {
      name: 'short-en',
      dateLabel: 'JAN 01 2026',
      date: '2026-01-01',
      language: 'english',
      verseText: 'Call on Me, I will answer you.',
      reference: 'Jeremiah 33:3',
    },
    {
      name: 'long-en',
      dateLabel: 'JAN 01 2026',
      date: '2026-01-01',
      language: 'english',
      verseText:
        'Call unto me, and I will answer thee, and show thee great and mighty things, which thou knowest not. The Lord is near to all who call on Him in truth.',
      reference: 'Jeremiah 33:3',
    },
    {
      name: 'short-te',
      dateLabel: 'JAN 01 2026',
      date: '2026-01-01',
      language: 'telugu',
      verseText: 'నాకు మొఱ్ఱపెట్టుము, నేను ఉత్తరమిచ్చెదను.',
      reference: toTeluguReference('Jeremiah 33:3'),
    },
    {
      name: 'long-te',
      dateLabel: 'JAN 01 2026',
      date: '2026-01-01',
      language: 'telugu',
      verseText:
        'నాకు మొఱ్ఱపెట్టుము, నేను మీకు ఉత్తరమిచ్చి, మీరు తెలియని గొప్ప మరియు అద్భుతమైన విషయాలను మీకు తెలియజేస్తాను. యెహోవా సత్యముగా ఆయనను పిలిచేవారందరికి సమీపముగా ఉండును.',
      reference: toTeluguReference('Jeremiah 33:3'),
    },
  ];

  for (const s of samples) {
    const buf = await generatePromiseCardPng({
      dateLabel: s.dateLabel,
      date: s.date,
      verseText: s.verseText,
      reference: s.reference,
      language: s.language,
    });
    const file = path.join(outDir, `${s.name}.png`);
    fs.writeFileSync(file, buf);
    console.log('Wrote', file);
  }

  console.log('\nPreview folder:', outDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
