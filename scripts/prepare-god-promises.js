/**
 * Reads God Promises.json, creates short promise text, writes data/god-promises.json
 *
 * Usage:
 *   node scripts/prepare-god-promises.js "/Users/rajesh/Downloads/promises.json"
 */

const fs = require('fs');
const path = require('path');
const { shortenAllPromises } = require('../utils/shortenPromise');

const inputPath =
  process.argv[2] || '/Users/rajesh/Downloads/promises.json';
const outDir = path.resolve(__dirname, '..', 'data');
const outPath = path.join(outDir, 'promises.json');

function main() {
  if (!fs.existsSync(inputPath)) {
    console.error(`File not found: ${inputPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(inputPath, 'utf8');
  const items = JSON.parse(raw);
  const shortened = shortenAllPromises(items);

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(shortened, null, 2), 'utf8');

  console.log(`Wrote ${shortened.length} short promises -> ${outPath}`);
}

main();
