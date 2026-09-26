/* eslint-disable no-undef */
// UX-3b (L-5): генерация иконок приложения из brand-знака (bench-press.svg)
// — марка в круге на градиенте темы. Одноразовый скрипт: node scripts/gen-app-icons.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const svg = fs.readFileSync(
  path.join(__dirname, '../src/assets/equipment-icons/bench-press.svg'),
  'utf8'
);
// вытаскиваем содержимое <svg ...>...</svg> (пути)
const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

const GRAD = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#5b21b6"/>
</linearGradient></defs>`;

// знак по центру круга: viewBox 100 → масштабируем в круг d
function mark(cx, cy, d, color) {
  const s = d / 100;
  return `<g transform="translate(${cx - d / 2} ${cy - d / 2}) scale(${s})" fill="${color}" stroke="${color}" stroke-width="0">${inner}</g>`;
}

function fullIcon(bg) {
  return `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    ${GRAD}
    <rect width="1024" height="1024" rx="225" fill="${bg}"/>
    <circle cx="512" cy="512" r="380" fill="url(#g)"/>
    ${mark(512, 512, 520, '#ffffff')}
  </svg>`;
}

function adaptiveForeground() {
  // безопасная зона adaptive-иконки: круг меньше, поля шире
  return `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    ${GRAD}
    <circle cx="512" cy="512" r="292" fill="url(#g)"/>
    ${mark(512, 512, 400, '#ffffff')}
  </svg>`;
}

function splashIcon() {
  return `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    ${GRAD}
    <circle cx="256" cy="256" r="200" fill="url(#g)"/>
    ${mark(256, 256, 272, '#ffffff')}
  </svg>`;
}

async function main() {
  const out = (f) => path.join(__dirname, '../assets', f);
  await sharp(Buffer.from(fullIcon('#0f172a')))
    .png()
    .resize(1024, 1024)
    .toFile(out('icon.png'));
  await sharp(Buffer.from(adaptiveForeground()))
    .png()
    .resize(1024, 1024)
    .toFile(out('adaptive-icon.png'));
  await sharp(Buffer.from(splashIcon())).png().resize(512, 512).toFile(out('splash-icon.png'));
  console.log('icons generated');
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
