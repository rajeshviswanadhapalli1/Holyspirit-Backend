const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

const ASSETS = path.resolve(__dirname, '..', 'assets');

const COLORS = {
  gold: '#c9a227',
  goldDark: '#9a7b2e',
  goldLight: '#e8d49a',
  maroon: '#6b1f2a',
  maroonDark: '#4a1219',
  cream: '#faf6ee',
  creamDark: '#f0e6d4',
  brown: '#4a3728',
  textDark: '#1a1a1a',
  white: '#ffffff',
};

let FONTS_REGISTERED = false;
function registerCardFonts() {
  if (FONTS_REGISTERED) return;
  const fontsDir = path.resolve(__dirname, '..', 'fonts');
  try {
    const telugu = path.join(fontsDir, 'NotoSansTelugu-Regular.ttf');
    if (fs.existsSync(telugu)) registerFont(telugu, { family: 'NotoSansTelugu' });
  } catch (_) {}
  try {
    const playfair = path.join(fontsDir, 'PlayfairDisplay-Italic.ttf');
    if (fs.existsSync(playfair)) registerFont(playfair, { family: 'PlayfairDisplay' });
  } catch (_) {}
  FONTS_REGISTERED = true;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function roundedRect(ctx, x, y, w, h, r) {
  const radius = clamp(r, 0, Math.min(w, h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

async function tryLoadImage(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  try {
    return await loadImage(filePath);
  } catch (_) {
    return null;
  }
}

async function loadCardImages(extraPath) {
  let hero = extraPath ? await tryLoadImage(extraPath) : null;
  if (!hero) hero = await tryLoadImage(path.join(ASSETS, 'jesus.jpg'));
  let accent = await tryLoadImage(path.join(ASSETS, 'jesus2.jpg'));
  if (!accent) accent = await tryLoadImage(path.join(ASSETS, 'jesus2.jpeg'));
  if (!hero && accent) hero = accent;
  return { hero, accent };
}

function drawImageCover(ctx, img, x, y, w, h) {
  const iw = img.width;
  const ih = img.height;
  if (!iw || !ih) return;
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function drawPortraitPanel(ctx, img, x, y, w, h) {
  const iw = img.width;
  const ih = img.height;
  const srcX = Math.round(iw * 0.08);
  const srcY = Math.round(ih * 0.02);
  const srcW = Math.round(iw * 0.84);
  const srcH = Math.round(ih * 0.88);
  const scale = Math.min(w / srcW, h / srcH) * 0.92;
  const dw = srcW * scale;
  const dh = srcH * scale;
  ctx.drawImage(img, srcX, srcY, srcW, srcH, x + (w - dw) / 2, y + (h - dh) * 0.06, dw, dh);
}

function wrapTextWords(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) line = test;
    else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function wrapTextTelugu(ctx, text, maxWidth) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) line = test;
    else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function wrapText(ctx, text, maxWidth, lang) {
  const t = String(text || '').trim();
  if (!t) return [];
  return lang === 'telugu' ? wrapTextTelugu(ctx, t, maxWidth) : wrapTextWords(ctx, t, maxWidth);
}

function fitTextBlock(ctx, text, maxW, maxH, lang, startSize, minSize, lineMul) {
  const fontFamily = lang === 'telugu' ? 'NotoSansTelugu' : 'PlayfairDisplay, Georgia, serif';
  const weight = lang === 'english' ? 'italic' : 'normal';
  let size = startSize;
  while (size >= minSize) {
    ctx.font = `${weight} ${size}px ${fontFamily}`;
    const lines = wrapText(ctx, text, maxW, lang);
    const lh = size * lineMul;
    const blockH = lines.length * lh;
    if (blockH <= maxH && lines.every((l) => ctx.measureText(l).width <= maxW)) {
      return { fontFamily, weight, size, lines, lineHeight: lh, blockH };
    }
    size -= 2;
  }
  ctx.font = `${weight} ${minSize}px ${fontFamily}`;
  const lines = wrapText(ctx, text, maxW, lang);
  return { fontFamily, weight, size: minSize, lines, lineHeight: minSize * lineMul, blockH: lines.length * minSize * lineMul };
}

function drawSunburst(ctx, cx, cy, radius) {
  const g = ctx.createRadialGradient(cx, cy, radius * 0.05, cx, cy, radius);
  g.addColorStop(0, 'rgba(255,240,200,0.95)');
  g.addColorStop(0.35, 'rgba(232,190,100,0.55)');
  g.addColorStop(0.7, 'rgba(180,130,60,0.25)');
  g.addColorStop(1, 'rgba(80,50,30,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawCornerFlourish(ctx, x, y, w, h, corner) {
  const s = Math.min(w, h) * 0.08;
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (corner === 'tl') {
    ctx.moveTo(x, y + s);
    ctx.quadraticCurveTo(x, y, x + s, y);
    ctx.moveTo(x + s * 0.3, y);
    ctx.lineTo(x + s, y + s * 0.2);
  } else if (corner === 'tr') {
    ctx.moveTo(x + w - s, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + s);
    ctx.moveTo(x + w - s * 0.2, y);
    ctx.lineTo(x + w - s, y + s * 0.3);
  } else if (corner === 'bl') {
    ctx.moveTo(x, y + h - s);
    ctx.quadraticCurveTo(x, y + h, x + s, y + h);
    ctx.moveTo(x, y + h - s * 0.3);
    ctx.lineTo(x + s * 0.2, y + h - s);
  } else if (corner === 'br') {
    ctx.moveTo(x + w, y + h - s);
    ctx.quadraticCurveTo(x + w, y + h, x + w - s, y + h);
    ctx.moveTo(x + w, y + h - s * 0.2);
    ctx.lineTo(x + w - s * 0.3, y + h - s);
  }
  ctx.stroke();
}

function drawGoldOuterFrame(ctx, x, y, w, h) {
  const pad = 6;
  ctx.strokeStyle = COLORS.goldDark;
  ctx.lineWidth = 5;
  roundedRect(ctx, x, y, w, h, 14);
  ctx.stroke();
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2;
  roundedRect(ctx, x + pad, y + pad, w - pad * 2, h - pad * 2, 10);
  ctx.stroke();
  drawCornerFlourish(ctx, x, y, w, h, 'tl');
  drawCornerFlourish(ctx, x, y, w, h, 'tr');
  drawCornerFlourish(ctx, x, y, w, h, 'bl');
  drawCornerFlourish(ctx, x, y, w, h, 'br');
}

function drawCross(ctx, cx, cy, size) {
  ctx.fillStyle = COLORS.gold;
  ctx.fillRect(cx - size * 0.08, cy - size * 0.45, size * 0.16, size * 0.9);
  ctx.fillRect(cx - size * 0.38, cy - size * 0.28, size * 0.76, size * 0.18);
}

function drawHeart(ctx, cx, cy, size) {
  ctx.fillStyle = COLORS.gold;
  ctx.beginPath();
  ctx.moveTo(cx, cy + size * 0.35);
  ctx.bezierCurveTo(cx, cy, cx - size * 0.5, cy - size * 0.2, cx - size * 0.5, cy + size * 0.05);
  ctx.bezierCurveTo(cx - size * 0.5, cy + size * 0.45, cx, cy + size * 0.75, cx, cy + size * 0.95);
  ctx.bezierCurveTo(cx, cy + size * 0.75, cx + size * 0.5, cy + size * 0.45, cx + size * 0.5, cy + size * 0.05);
  ctx.bezierCurveTo(cx + size * 0.5, cy - size * 0.2, cx, cy, cx, cy + size * 0.35);
  ctx.fill();
}

function drawLeftPanel(ctx, images, x, y, w, h) {
  const warm = ctx.createLinearGradient(x, y, x + w, y + h);
  warm.addColorStop(0, '#3d2818');
  warm.addColorStop(0.5, '#5c3d22');
  warm.addColorStop(1, '#2a1810');
  ctx.fillStyle = warm;
  ctx.fillRect(x, y, w, h);

  drawSunburst(ctx, x + w * 0.52, y + h * 0.38, Math.min(w, h) * 0.55);

  if (images.hero) {
    drawPortraitPanel(ctx, images.hero, x, y, w, h);
  }

  // jesus2 — small seal top-right (not bottom; avoids lily overlap)
  if (images.accent) {
    const sealR = Math.min(w, h) * 0.11;
    const sealX = x + w - sealR - w * 0.05;
    const sealY = y + h * 0.06;
    ctx.save();
    ctx.beginPath();
    ctx.arc(sealX, sealY, sealR + 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sealX, sealY, sealR, 0, Math.PI * 2);
    ctx.clip();
    drawImageCover(ctx, images.accent, sealX - sealR, sealY - sealR, sealR * 2, sealR * 2);
    ctx.restore();
  }

  const fade = ctx.createLinearGradient(x + w * 0.7, y, x + w, y);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(250,246,238,0.35)');
  ctx.fillStyle = fade;
  ctx.fillRect(x, y, w, h);
}

function drawParchmentPanel(ctx, x, y, w, h) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#fffdf8');
  g.addColorStop(0.5, COLORS.cream);
  g.addColorStop(1, COLORS.creamDark);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);

  const inset = Math.min(w, h) * 0.04;
  ctx.strokeStyle = 'rgba(201,162,39,0.35)';
  ctx.lineWidth = 1.5;
  roundedRect(ctx, x + inset, y + inset, w - inset * 2, h - inset * 2, 8);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(201,162,39,0.2)';
  roundedRect(ctx, x + inset * 1.8, y + inset * 1.8, w - inset * 3.6, h - inset * 3.6, 6);
  ctx.stroke();
}

function drawSubtitleLine(ctx, cx, y, w, text, font, color) {
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tw = ctx.measureText(text).width;
  const lineW = (w - tw - 40) / 2;
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 1;
  const ly = y;
  ctx.beginPath();
  ctx.moveTo(cx - tw / 2 - 18 - lineW, ly);
  ctx.lineTo(cx - tw / 2 - 18, ly);
  ctx.moveTo(cx + tw / 2 + 18, ly);
  ctx.lineTo(cx + tw / 2 + 18 + lineW, ly);
  ctx.stroke();
  ctx.fillText(text, cx, ly);
}

function parseDateLabel(dateLabel, isoDate) {
  const iso = String(isoDate || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const d = new Date(`${iso}T12:00:00Z`);
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = months[d.getUTCMonth()];
    const day = String(d.getUTCDate()).padStart(2, '0');
    const year = String(d.getUTCFullYear());
    return { month, day, year, display: `${month} ${day}, ${year}` };
  }
  const label = String(dateLabel || '').trim().toUpperCase();
  const m = label.match(/^([A-Z]{3})\s+(\d{1,2})\s+(\d{4})$/);
  if (m) return { month: m[1], day: m[2].padStart(2, '0'), year: m[3], display: `${m[1]} ${m[2].padStart(2, '0')}, ${m[3]}` };
  return { month: '', day: '', year: '', display: label || 'TODAY' };
}

function drawDateBadge(ctx, cx, y, panelW, parts, lang) {
  const monthText = parts.month || 'JAN';
  const dayText = parts.day || '01';
  const yearText = parts.year || String(new Date().getFullYear());

  const monthSize = Math.round(panelW * 0.034);
  const daySize = Math.round(panelW * 0.088);
  const yearSize = Math.round(panelW * 0.032);
  const padV = panelW * 0.022;
  const padH = panelW * 0.08;

  const boxW = panelW * 0.52;
  const boxH = padV * 2 + monthSize * 1.3 + daySize * 1.15 + yearSize * 1.35;
  const bx = cx - boxW / 2;
  const by = y;

  roundedRect(ctx, bx, by, boxW, boxH, boxH * 0.28);
  ctx.fillStyle = 'rgba(255,252,245,0.95)';
  ctx.fill();
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  let dy = by + padV;
  ctx.fillStyle = COLORS.maroon;
  ctx.font = `600 ${monthSize}px Arial`;
  ctx.fillText(monthText, cx, dy);
  dy += monthSize * 1.35;

  ctx.font = `bold ${daySize}px Georgia`;
  ctx.fillText(dayText, cx, dy);
  dy += daySize * 1.1;

  ctx.fillStyle = COLORS.goldDark;
  ctx.font = `600 ${yearSize}px Arial`;
  ctx.fillText(yearText, cx, dy);

  return boxH;
}

function drawBottomBanner(ctx, cx, y, w, bannerH, text, lang) {
  const font = lang === 'telugu' ? 'NotoSansTelugu' : 'Georgia';
  const padX = 28;
  const h = bannerH;
  ctx.font = `600 ${Math.round(h * 0.42)}px ${font}`;
  let fontSize = Math.round(h * 0.42);
  while (ctx.measureText(text).width > w - padX * 2 && fontSize > 10) {
    fontSize -= 1;
    ctx.font = `600 ${fontSize}px ${font}`;
  }
  const tw = ctx.measureText(text).width + padX * 2;
  const bx = cx - tw / 2;
  const bh = h;
  const by = y - bh / 2;

  ctx.fillStyle = COLORS.maroonDark;
  roundedRect(ctx, bx, by, tw, bh, bh / 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = COLORS.white;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, y);
}

async function generatePromiseCardPng(args) {
  registerCardFonts();
  const width = Number(args.width || args.size || 1200);
  const height = Number(args.height || Math.round(width * 0.58));
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const lang = args.language === 'telugu' ? 'telugu' : 'english';

  const labels =
    lang === 'telugu'
      ? {
          title: 'దేవుని వాగ్ధానం',
          subtitle: 'ఈ రోజు మీ కోసం',
          tagline: 'దేవుడు ప్రతి అడుగున మీతో ఉన్నాడు. ఆయన వాగ్ధానంపై నమ్మకంతో ఉండండి.',
          footer: 'పరిశుద్ధ ఆత్మ',
        }
      : {
          title: "GOD'S PROMISE",
          subtitle: 'FOR YOU TODAY',
          tagline: 'God is with you in every step. Trust His faithful promise today.',
          footer: 'Holy Spirit',
        };

  const outerPad = width * 0.025;
  const cardX = outerPad;
  const cardY = outerPad;
  const cardW = width - outerPad * 2;
  const cardH = height - outerPad * 2;

  const vignette = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.2,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.75
  );
  vignette.addColorStop(0, '#4a3020');
  vignette.addColorStop(1, '#1a1008');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = width * 0.03;
  ctx.shadowOffsetY = width * 0.008;
  roundedRect(ctx, cardX, cardY, cardW, cardH, 12);
  ctx.fillStyle = COLORS.cream;
  ctx.fill();
  ctx.restore();

  drawGoldOuterFrame(ctx, cardX, cardY, cardW, cardH);

  const innerPad = cardW * 0.018;
  const contentX = cardX + innerPad;
  const contentY = cardY + innerPad;
  const contentW = cardW - innerPad * 2;
  const contentH = cardH - innerPad * 2;

  const leftW = contentW * 0.42;
  const rightX = contentX + leftW;
  const rightW = contentW - leftW;

  const images = await loadCardImages(args.jesusImagePath);
  drawLeftPanel(ctx, images, contentX, contentY, leftW, contentH);
  drawParchmentPanel(ctx, rightX, contentY, rightW, contentH);

  ctx.strokeStyle = 'rgba(201,162,39,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(rightX, contentY + 12);
  ctx.lineTo(rightX, contentY + contentH - 12);
  ctx.stroke();

  const rcx = rightX + rightW / 2;
  const pad = rightW * 0.08;
  const textW = rightW - pad * 2;
  let ty = contentY + contentH * 0.07;

  drawCross(ctx, rcx, ty, rightW * 0.06);
  ty += rightW * 0.09;

  const titleFont = lang === 'telugu' ? 'NotoSansTelugu' : 'Georgia';
  const subFont = lang === 'telugu' ? 'NotoSansTelugu' : 'Arial';
  const titleSize = Math.round(rightW * (lang === 'telugu' ? 0.072 : 0.082));
  const subSize = Math.round(rightW * 0.026);

  ctx.fillStyle = COLORS.maroon;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `bold ${titleSize}px ${titleFont}`;
  ctx.fillText(labels.title, rcx, ty);
  ty += titleSize * 1.55;

  ctx.fillStyle = COLORS.brown;
  ctx.font = `600 ${subSize}px ${subFont}`;
  const subLineH = subSize * 1.4;
  drawSubtitleLine(
    ctx,
    rcx,
    ty + subLineH / 2,
    textW,
    labels.subtitle,
    `600 ${subSize}px ${subFont}`,
    COLORS.brown
  );
  ty += subLineH + rightW * 0.035;

  const dateLabel = String(args.dateLabel || '').trim().toUpperCase();
  const dateParts = parseDateLabel(dateLabel, args.date);
  const dateBoxH = drawDateBadge(ctx, rcx, ty, rightW, dateParts, lang);
  ty += dateBoxH + rightW * 0.04;

  const verse = String(args.verseText || '').trim();
  const quote = lang === 'english' ? `"${verse}"` : verse;
  const quoteMaxH = contentH * 0.24;
  const quoteBlock = fitTextBlock(ctx, quote, textW, quoteMaxH, lang, Math.round(rightW * 0.052), 22, 1.35);

  ctx.fillStyle = COLORS.textDark;
  ctx.textAlign = 'center';
  ctx.font = `${quoteBlock.weight} ${quoteBlock.size}px ${quoteBlock.fontFamily}`;
  for (const line of quoteBlock.lines) {
    ctx.fillText(line, rcx, ty);
    ty += quoteBlock.lineHeight;
  }
  ty += rightW * 0.03;

  const ref = String(args.reference || '').trim();
  const refLabel = ref.startsWith('—') ? ref : `— ${ref} —`;
  ctx.fillStyle = COLORS.maroon;
  ctx.font = `600 ${Math.round(rightW * 0.032)}px ${titleFont}`;
  ctx.fillText(refLabel, rcx, ty);
  ty += rightW * 0.1;

  drawHeart(ctx, rcx, ty, rightW * 0.035);
  ty += rightW * 0.07;

  const bannerH = contentH * 0.09;
  const bannerY = contentY + contentH - bannerH * 0.55;
  const taglineMaxH = Math.max(bannerY - ty - rightW * 0.03, contentH * 0.06);

  const taglineBlock = fitTextBlock(
    ctx,
    labels.tagline,
    textW,
    taglineMaxH,
    lang,
    Math.round(rightW * 0.032),
    14,
    1.4
  );
  ctx.fillStyle = COLORS.brown;
  ctx.font = `${taglineBlock.weight} ${taglineBlock.size}px ${taglineBlock.fontFamily}`;
  for (const line of taglineBlock.lines) {
    ctx.fillText(line, rcx, ty);
    ty += taglineBlock.lineHeight;
  }

  const bannerDate = dateParts.display || dateLabel || 'TODAY';
  const bannerText =
    lang === 'telugu'
      ? `${bannerDate}  ·  ${labels.footer}`
      : `${bannerDate}  ·  ${labels.footer.toUpperCase()}`;

  drawBottomBanner(ctx, rcx, bannerY, textW * 0.95, bannerH, bannerText, lang);

  ctx.textAlign = 'left';
  return canvas.toBuffer('image/png');
}

module.exports = { generatePromiseCardPng };
