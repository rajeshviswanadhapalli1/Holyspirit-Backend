'use strict';

/**
 * buffer-equal-constant-time (via jwa/jws/jsonwebtoken) references SlowBuffer,
 * which was removed in Node.js 25+. Patch all installed copies after npm install.
 */
const fs = require('fs');
const path = require('path');

const PATCH_MARKER = 'NODE25_SLOWBUFFER_PATCH';

const PATCHED_SOURCE = `/*jshint node:true */
'use strict';
/* ${PATCH_MARKER} */
var Buffer = require('buffer').Buffer;
var SlowBuffer = require('buffer').SlowBuffer;

module.exports = bufferEq;

function bufferEq(a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  var c = 0;
  for (var i = 0; i < a.length; i++) {
    c |= a[i] ^ b[i];
  }
  return c === 0;
}

bufferEq.install = function () {
  Buffer.prototype.equal = function equal(that) {
    return bufferEq(this, that);
  };
  if (SlowBuffer && SlowBuffer.prototype) {
    SlowBuffer.prototype.equal = Buffer.prototype.equal;
  }
};

var origBufEqual = Buffer.prototype.equal;
var origSlowBufEqual =
  SlowBuffer && SlowBuffer.prototype ? SlowBuffer.prototype.equal : undefined;
bufferEq.restore = function () {
  Buffer.prototype.equal = origBufEqual;
  if (SlowBuffer && SlowBuffer.prototype) {
    SlowBuffer.prototype.equal = origSlowBufEqual;
  }
};
`;

function findBufferEqualFiles(rootDir) {
  const results = [];

  function walk(dir, depth) {
    if (depth > 6) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.name === 'buffer-equal-constant-time') {
        const indexFile = path.join(full, 'index.js');
        if (fs.existsSync(indexFile)) results.push(indexFile);
      } else if (entry.name === 'node_modules' || depth === 0) {
        walk(full, depth + 1);
      }
    }
  }

  walk(rootDir, 0);
  return results;
}

function patchFile(filePath) {
  const current = fs.readFileSync(filePath, 'utf8');
  if (current.includes(PATCH_MARKER)) return false;
  fs.writeFileSync(filePath, PATCHED_SOURCE, 'utf8');
  return true;
}

const nodeModules = path.join(__dirname, '..', 'node_modules');
const files = findBufferEqualFiles(nodeModules);
let patched = 0;

for (const file of files) {
  if (patchFile(file)) {
    patched += 1;
    console.log(`[postinstall] Patched ${path.relative(nodeModules, file)} for Node.js 25+`);
  }
}

if (patched === 0 && files.length === 0) {
  console.log('[postinstall] buffer-equal-constant-time not found (skipped)');
}
