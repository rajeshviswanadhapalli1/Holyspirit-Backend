/**
 * Extracts Jesus + boy (full illustration) from poster → assets/jesus-gift-only.png
 */
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

function drawContain(ctx, img, x, y, w, h) {
  const iw = img.width;
  const ih = img.height;
  const scale = Math.min(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

async function main() {
  const src = path.resolve(__dirname, '..', 'assets', 'jesus-hero.png');
  const out = path.resolve(__dirname, '..', 'assets', 'jesus-gift-only.png');
  const img = await loadImage(src);
  const iw = img.width;
  const ih = img.height;

  // Center of left circle — Jesus + boy + gift only (no teal arc, logo, or preacher)
  const srcX = Math.round(iw * 0.1);
  const srcY = Math.round(ih * 0.4);
  const srcW = Math.round(iw * 0.32);
  const srcH = Math.round(ih * 0.36);

  const outW = 960;
  const outH = 720;
  const canvas = createCanvas(outW, outH);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outW, outH);

  const tmp = createCanvas(srcW, srcH);
  const tctx = tmp.getContext('2d');
  tctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
  drawContain(ctx, tmp, 0, 0, outW, outH);

  fs.writeFileSync(out, canvas.toBuffer('image/png'));
  console.log('Saved', out);
}

main().catch(console.error);
