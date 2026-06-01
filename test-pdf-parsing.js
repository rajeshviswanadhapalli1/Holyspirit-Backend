const fs = require('fs');
const pdf = require('pdf-parse');

function getDateFromDay(day) {
  const start = new Date('2025-01-01');
  start.setDate(start.getDate() + day - 1);
  return start.toISOString().split('T')[0];
}

async function testPDFParsing() {
  try {
    console.log('📄 Reading PDF file...');
    const dataBuffer = fs.readFileSync('365Promises.pdf');
    const data = await pdf(dataBuffer);
    const lines = data.text.split('\n').map(l => l.trim()).filter(Boolean);

    console.log('📄 Total lines in PDF:', lines.length);
    console.log('📄 First 10 lines:');
    lines.slice(0, 10).forEach((line, index) => {
      console.log(`${index + 1}: "${line}"`);
    });

    let currentPromise = { day: 0, english: '', telugu: '' };
    let dayCount = 0;
    const result = [];

    console.log('\n🔍 Parsing promises...');
    for (let line of lines) {
      const match = line.match(/^[A-Z]+\s+\d+\s*-\s*PROMISE\s*#?(\d+)\s*(.*)$/i);
      if (match) {
        if (currentPromise.day !== 0) {
          currentPromise.english = currentPromise.english.trim();
          if (currentPromise.english) {
            result.push({...currentPromise});
          }
        }
        dayCount++;
        currentPromise = {
          day: dayCount,
          date: getDateFromDay(dayCount),
          english: match[2].trim(),
          telugu: ''
        };
        console.log(`✅ Found Promise #${dayCount}: "${match[2].trim()}"`);
      } else if (currentPromise.day !== 0) {
        currentPromise.english += ' ' + line;
      }
    }

    // Add the last promise
    if (currentPromise.day !== 0) {
      currentPromise.english = currentPromise.english.trim();
      if (currentPromise.english) {
        result.push({...currentPromise});
      }
    }

    console.log(`\n📊 Parsing Results:`);
    console.log(`✅ Total promises parsed: ${result.length}`);
    
    if (result.length > 0) {
      console.log('\n📝 Sample promises:');
      result.slice(0, 3).forEach(promise => {
        console.log(`Day ${promise.day} (${promise.date}): "${promise.english.substring(0, 100)}..."`);
      });
    }

    if (result.length === 0) {
      console.log('❌ No promises were parsed. Check the PDF format.');
      console.log('Expected format: "PROMISE #1 [text]" or "PROMISE 1 [text]"');
    }

  } catch (error) {
    console.error('❌ Error parsing PDF:', error);
  }
}

testPDFParsing(); 