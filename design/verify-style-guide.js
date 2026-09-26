// Проверка: design/style-guide.html повторяет значения из кода 1-в-1.
// Запуск: node design/verify-style-guide.js
const fs = require('fs');

const strip = (s) => s.replace(/\s+as\s+\w+/g, '');
const obj = (body) => eval('({' + strip(body) + '\n})'); // принимает ТЕЛО объекта без внешних скобок

const ts = fs.readFileSync('src/constants/theme.ts', 'utf8');
const html = fs.readFileSync('design/style-guide.html', 'utf8');

let diffs = 0,
  checked = 0;
const bad = (msg) => {
  console.log(msg);
  diffs++;
};

/* ---------- 1. темы из кода ---------- */
const code = {};
for (const m of ts.matchAll(/export const (\w+):\s*Theme\s*=\s*\{[\s\S]*?\n\};/g)) {
  code[m[1]] = {
    name: m[0].match(/name:\s*'([^']*)'/)[1],
    colors: obj(m[0].match(/colors:\s*\{([\s\S]*?)\n\s*\},/)[1]),
    gradients: obj(m[0].match(/gradients:\s*\{([\s\S]*?)\n\s*\},/)[1]),
  };
}

/* ---------- 2. темы из гайда ---------- */
const guide = obj(html.match(/const THEMES = \{([\s\S]*?)\n\};/)[1]);

const alias = {
  'purple-light': 'purpleLightTheme',
  'purple-dark': 'purpleDarkTheme',
  'orange-light': 'orangeLightTheme',
  'orange-dark': 'orangeDarkTheme',
  'blue-light': 'blueLightTheme',
  'blue-dark': 'blueDarkTheme',
  'neon-light': 'neonLightTheme',
  'neon-dark': 'neonDarkTheme',
  'pink-light': 'pinkLightTheme',
  'pink-dark': 'pinkDarkTheme',
};

for (const [key, themeKey] of Object.entries(alias)) {
  const src = code[themeKey],
    g = guide[key];
  if (!g) {
    bad('MISSING in guide: ' + key);
    continue;
  }
  if (src.name !== g.name) bad(`NAME ${key}: code="${src.name}" guide="${g.name}"`);
  for (const [k, v] of Object.entries(src.colors)) {
    checked++;
    if (!(k in g.colors)) bad(`COLOR ${key}.${k}: отсутствует в гайде`);
    else if (g.colors[k].toLowerCase() !== v.toLowerCase())
      bad(`COLOR ${key}.${k}: code="${v}" guide="${g.colors[k]}"`);
  }
  for (const k of Object.keys(g.colors)) if (!(k in src.colors)) bad(`EXTRA ${key}.${k}`);
  for (const [k, v] of Object.entries(src.gradients)) {
    checked++;
    const gv = g.gradients[k];
    if (!gv || gv.join(',').toLowerCase() !== v.join(',').toLowerCase())
      bad(`GRAD ${key}.${k}: code=${v} guide=${gv}`);
  }
  for (const k of Object.keys(g.gradients))
    if (!(k in src.gradients)) bad(`EXTRA grad ${key}.${k}`);
}

/* ---------- 3. типографика ---------- */
const typoSrcFile = fs.readFileSync('src/styles/typography.ts', 'utf8');
const FONT_FAMILIES = obj(
  fs
    .readFileSync('src/constants/fonts.ts', 'utf8')
    .match(/export const FONT_FAMILIES = \{([\s\S]*?)\n\} as const;/)[1]
);
const typo = obj(typoSrcFile.match(/export const typography = \{([\s\S]*?)\n\};/)[1]);
const typeRows = html.match(/const TYPE = \[([\s\S]*?)\n\];/)[1];
for (const [k, v] of Object.entries(typo)) {
  checked += 2;
  const r = typeRows.match(new RegExp(`\\['${k}',\\s*(\\d+),\\s*(\\d+|null)`));
  if (!r) {
    bad(`TYPE ${k}: строка отсутствует в гайде`);
    continue;
  }
  if (Number(r[1]) !== v.fontSize) bad(`TYPE ${k}.fontSize: code=${v.fontSize} guide=${r[1]}`);
  const glh = r[2] === 'null' ? null : Number(r[2]);
  const clh = v.lineHeight === undefined ? null : v.lineHeight;
  if (glh !== clh) bad(`TYPE ${k}.lineHeight: code=${clh} guide=${glh}`);
}

/* ---------- 4. spacing / radius / shadows ---------- */
const spacing = obj(ts.match(/export const SPACING = \{([\s\S]*?)\n\};/)[1]);
const radius = obj(ts.match(/export const BORDER_RADIUS = \{([\s\S]*?)\n\};/)[1]);
const shadowsRaw = obj(ts.match(/export const SHADOWS = \{([\s\S]*?)\n\} as const;/)[1]);
const shadows = Object.fromEntries(
  Object.entries(shadowsRaw).map(([k, s]) => [
    k,
    {
      offset: [s.shadowOffset.width, s.shadowOffset.height],
      opacity: s.shadowOpacity,
      radius: s.shadowRadius,
      elevation: s.elevation,
    },
  ])
);

const gSpacing = obj(html.match(/const SPACING = \{([\s\S]*?)\};/)[1]);
const gRadius = obj(html.match(/const RADIUS = \{([\s\S]*?)\};/)[1]);
const gShadows = obj(html.match(/const SHADOWS = \{([\s\S]*?)\n\};/)[1]);

for (const [k, v] of Object.entries(spacing)) {
  checked++;
  if (gSpacing[k] !== v) bad(`SPACING ${k}: code=${v} guide=${gSpacing[k]}`);
}
for (const [k, v] of Object.entries(radius)) {
  checked++;
  if (gRadius[k] !== v) bad(`RADIUS ${k}: code=${v} guide=${gRadius[k]}`);
}
for (const [k, v] of Object.entries(shadows)) {
  checked += 4;
  const g = gShadows[k];
  if (!g) {
    bad(`SHADOW ${k}: отсутствует`);
    continue;
  }
  if (String(g.offset) !== String(v.offset))
    bad(`SHADOW ${k}.offset code=${v.offset} guide=${g.offset}`);
  if (g.opacity !== v.opacity) bad(`SHADOW ${k}.opacity code=${v.opacity} guide=${g.opacity}`);
  if (g.radius !== v.radius) bad(`SHADOW ${k}.radius code=${v.radius} guide=${g.radius}`);
  if (g.elevation !== v.elevation)
    bad(`SHADOW ${k}.elevation code=${v.elevation} guide=${g.elevation}`);
}

/* ---------- 5. семантические цвета ---------- */
const semSrc = fs.readFileSync('src/constants/semanticColors.ts', 'utf8');
const flat = new Set();
for (const g of Object.values(obj(html.match(/const SEMANTIC = \{([\s\S]*?)\n\};/)[1])))
  for (const v of Object.values(g)) flat.add(String(v).toLowerCase());

const semBodies = [
  ...semSrc.matchAll(/(?:export )?const \w+(?::[^=]*)?\s*=\s*\{([\s\S]*?)\n\}(?: as const)?;/g),
];
const seenValues = new Set();
for (const m of semBodies) {
  let map;
  try {
    map = obj(m[1]);
  } catch {
    continue;
  }
  for (const [k, v] of Object.entries(map)) {
    if (typeof v !== 'string' || seenValues.has(v)) continue; // повторы (грудь/большая/…) — считаем один раз
    seenValues.add(v);
    checked++;
    if (!flat.has(v.toLowerCase())) bad(`SEM ${k}=${v}: нет в гайде`);
  }
}

/* ---------- 6. tokens.json (мост в Figma) ---------- */
if (fs.existsSync('design/tokens.json')) {
  const tok = JSON.parse(fs.readFileSync('design/tokens.json', 'utf8'));
  const modeName = (t) => `${t.accent}-${t.mode}`;
  for (const [key, src] of Object.entries(alias)) {
    const th = code[src];
    for (const [k, v] of Object.entries(th.colors)) {
      checked += 2;
      const mv = tok.theme.color[k] && tok.theme.color[k].$value[key];
      if (!mv) bad(`tokens.json theme.color.${k}.${key}: отсутствует`);
      else if (mv.toLowerCase() !== v.toLowerCase())
        bad(`tokens.json theme.color.${k}.${key}: code="${v}" json="${mv}"`);
      const fv = tok.flatThemes[key] && tok.flatThemes[key][k] && tok.flatThemes[key][k].$value;
      if (!fv) bad(`tokens.json flatThemes.${key}.${k}: отсутствует`);
      else if (fv.toLowerCase() !== v.toLowerCase())
        bad(`tokens.json flatThemes.${key}.${k}: code="${v}" json="${fv}"`);
    }
    for (const [k, v] of Object.entries(th.gradients)) {
      checked++;
      const mv = tok.theme.gradient[k].$value[key];
      if (!mv || mv.toLowerCase() !== v.join(', ').toLowerCase())
        bad(`tokens.json gradient.${k}.${key}: code=${v} json=${mv}`);
    }
  }
  for (const [k, v] of Object.entries(typo)) {
    checked += 3;
    const g = tok.theme.typography[k];
    if (!g) {
      bad(`tokens.json typography.${k}: отсутствует`);
      continue;
    }
    if (parseFloat(g.fontSize.$value) !== v.fontSize)
      bad(`tokens.json ${k}.fontSize: code=${v.fontSize} json=${g.fontSize.$value}`);
    const glh = g.lineHeight ? parseFloat(g.lineHeight.$value) : null;
    if (glh !== (v.lineHeight === undefined ? null : v.lineHeight))
      bad(`tokens.json ${k}.lineHeight: code=${v.lineHeight} json=${glh}`);
    if (g.fontFamily.$value !== v.fontFamily)
      bad(`tokens.json ${k}.fontFamily: code=${v.fontFamily} json=${g.fontFamily.$value}`);
  }
  for (const [k, v] of Object.entries(spacing)) {
    checked++;
    if (parseFloat(tok.theme.space[k].$value) !== v) bad(`tokens.json space.${k}: code=${v}`);
  }
  for (const [k, v] of Object.entries(radius)) {
    checked++;
    if (parseFloat(tok.theme.radius[k].$value) !== v) bad(`tokens.json radius.${k}: code=${v}`);
  }
  for (const [k, v] of Object.entries(shadows)) {
    checked += 4;
    const g = tok.theme.shadow[k].$value;
    if (parseFloat(g.offsetX) !== v.offset[0] || parseFloat(g.offsetY) !== v.offset[1])
      bad(`tokens.json shadow.${k}.offset: code=${v.offset} json=${g.offsetX},${g.offsetY}`);
    if (parseFloat(g.blur) !== v.radius)
      bad(`tokens.json shadow.${k}.blur: code=${v.radius} json=${g.blur}`);
    if (!tok.theme.shadow[k].$description.includes(`opacity ${v.opacity}`))
      bad(`tokens.json shadow.${k}: opacity не в описании (${v.opacity})`);
    if (!tok.theme.shadow[k].$description.includes(`elevation(Android) ${v.elevation}`))
      bad(`tokens.json shadow.${k}: elevation не в описании (${v.elevation})`);
  }
  for (const v of seenValues) {
    checked++;
    const inJson = JSON.stringify(tok.categorical).toLowerCase().includes(String(v).toLowerCase());
    if (!inJson) bad(`tokens.json categorical: ${v} потерян`);
  }
} else {
  console.log('tokens.json не собран — запусти: node design/build-tokens.js');
  diffs++;
}

console.log(`\nПроверено значений: ${checked} · расхождений: ${diffs}`);
process.exit(diffs ? 1 : 0);
