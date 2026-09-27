// UX-4: аудит оставшихся TouchableOpacity — почему codemod их пропустил
const fs = require('fs');
const path = require('path');

const SUPPORTED = new Set([
  'onPress',
  'onLongPress',
  'delayLongPress',
  'disabled',
  'style',
  'accessibilityRole',
  'accessibilityLabel',
  'accessibilityState',
  'accessibilityHint',
  'hitSlop',
  'activeOpacity',
]);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.tsx')) out.push(p);
  }
  return out;
}

const files = [...walk('app'), ...walk('src/components')].filter(
  (f) => !/SheetShell|PressableScale/.test(f)
);
const reasons = {};
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    if (!/<TouchableOpacity[\s>]/.test(line)) return;
    // собираем атрибуты до '>' или '/>'
    let attrs = [];
    let j = i;
    let depth = 0;
    let buf = '';
    while (j < lines.length && j < i + 25) {
      buf += lines[j];
      if (/>/.test(lines[j]) && !/="[^"]*$/.test(lines[j])) break;
      j++;
    }
    const re = /([A-Za-z][\w:]*)=|(\{)[^]*?\}/g;
    const m = buf.match(/\s([a-zA-Z][\w]*)=/g) || [];
    attrs = m.map((s) => s.trim().slice(0, -1));
    const bad = attrs.filter((a) => !SUPPORTED.has(a));
    const backdrop = /activeOpacity=\{1\}/.test(buf);
    const key = backdrop ? 'backdrop (activeOpacity=1)' : bad.join(',') || '???';
    (reasons[key] = reasons[key] || []).push(`${f}:${i + 1} [${attrs.join(' ')}]`);
  });
}
for (const [k, v] of Object.entries(reasons)) {
  console.log(`\n== ${k}: ${v.length}`);
  v.slice(0, 40).forEach((x) => console.log('  ' + x));
}
