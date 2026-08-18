import { readdirSync, readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'C:/projects/fittracker-rn/src/assets/equipment-icons';
const SKIP = new Set(['mat.svg']);
const BACKUP = `${DIR}.bak`;
const TAGS = ['path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse'];

mkdirSync(BACKUP, { recursive: true });

let fixed = 0, ok = 0;

for (const f of readdirSync(DIR).filter((x) => x.endsWith('.svg')).sort()) {
  const file = join(DIR, f);
  copyFileSync(file, join(BACKUP, f)); // бэкап всего, включая mat.svg
  if (SKIP.has(f)) { console.log(`⏭ ${f} — пропуск`); continue; }

  let svg = readFileSync(file, 'utf8');
  if (/style="/.test(svg)) console.warn(`⚠ ${f}: есть style="", проверь вручную`);
  const before = svg;

  for (const tag of TAGS) {
    svg = svg.replace(new RegExp(`<${tag}(?:\\s[^>]*?)?\\/?>`, 'g'), fixElement);
  }

  if (svg !== before) {
    writeFileSync(file, svg);
    fixed++;
    console.log(`🔧 ${f}`);
  } else {
    ok++;
    console.log(`✔ ${f} — уже без хардкода`);
  }
}

console.log(`\nИтог: исправлено ${fixed}, уже ок ${ok}. Бэкап: ${BACKUP}`);

function fixElement(el) {
  // Убираем хардкод-цвета, КРОМЕ none (оно структурное)
  let out = el
    .replace(/\sfill="(?!none")[^"]*"/gi, '')
    .replace(/\sstroke="(?!none")[^"]*"/gi, '');

  // Линейным элементам (со stroke-width) нужен явный fill="none",
  // иначе fill={iconColor} от EquipmentIcon зальёт фигуру
  if (/stroke-width\s*=/i.test(out) && !/fill\s*=\s*"none"/i.test(out)) {
    out = out.replace(/\s*(\/?)>$/, (_, slash) => ` fill="none"${slash}>`);
  }
  return out;
}