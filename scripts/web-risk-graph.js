// WEB-1 spike: импорт-граф экранов + карта веб-рисков.
// Временный инструмент спайка: считает transitive closure импортов для каждого
// роута app/** и помечает файлы с API, которые на react-native-web работают
// иначе или не работают. Запуск: node scripts/web-risk-graph.js
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EXT = ['.tsx', '.ts', '.js', '.jsx'];

// Категория -> [regex, вес сложности]
const RISKS = {
  alertNoop: [/Alert\.alert\(/, 3], // RNW: static alert() {} — без обратной связи
  draggable: [/react-native-draggable-flatlist/, 4], // нет веба, нужен заменитель
  flashList: [/@shopify\/flash-list/, 2], // веб экспериментальный
  panResponder: [/PanResponder/, 2],
  backHandler: [/BackHandler/, 1],
  share: [/\bShare\./, 1],
  layoutAnimation: [/LayoutAnimation/, 1],
  shadowProps: [/shadowOpacity|shadowColor|shadowRadius|shadowOffset/, 1],
  elevation: [/elevation:/, 1],
  pointerEventsProp: [/pointerEvents=/, 1],
  modal: [/\bModal\b.*react-native|<Modal/, 1],
  keyboardAvoiding: [/KeyboardAvoidingView/, 1],
  dimensionsGet: [/Dimensions\.get/, 1],
  animatedCore: [/from ['"]react-native['"][\s\S]*Animated|\bAnimated\./, 1],
  svgCharts: [/react-native-svg/, 2],
};

function resolve(spec, fromFile) {
  if (!spec.startsWith('.') && !spec.startsWith('@/') && !spec.startsWith('src/')) return null;
  let base;
  if (spec.startsWith('@/')) base = path.join(ROOT, 'src', spec.slice(2));
  else if (spec.startsWith('src/')) base = path.join(ROOT, spec);
  else base = path.resolve(path.dirname(fromFile), spec);
  const cands = [
    base,
    ...EXT.map((e) => base + e),
    ...EXT.map((e) => path.join(base, 'index' + e)),
  ];
  for (const c of cands) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  return null;
}

const cache = new Map();
function analyze(file) {
  if (cache.has(file)) return cache.get(file);
  cache.set(file, { hits: {}, visited: true });
  const src = fs.readFileSync(file, 'utf8');
  const hits = {};
  for (const [k, [re, w]] of Object.entries(RISKS)) if (re.test(src)) hits[k] = w;
  const specs = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
  const own = { hits, deps: [] };
  cache.set(file, own);
  for (const s of specs) {
    const r = resolve(s, file);
    if (!r) continue;
    own.deps.push(r);
    // guard от циклов
    if (!cache.has(r)) analyze(r);
  }
  return own;
}

function closure(entry) {
  const seen = new Set();
  const stack = [entry];
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    const node = analyze(f);
    for (const d of node.deps) if (!seen.has(d)) stack.push(d);
  }
  return seen;
}

function routes(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) routes(p, acc);
    else if (/\.(tsx|ts)$/.test(e.name) && !e.name.startsWith('+')) acc.push(p);
    else if (/\.(tsx|ts)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

const files = routes(path.join(ROOT, 'app'));
const rows = [];
for (const r of files) {
  const set = closure(r);
  const agg = {};
  let score = 0;
  const where = {};
  for (const f of set) {
    const node = analyze(f);
    for (const [k, weight] of Object.entries(node.hits || {})) {
      agg[k] = (agg[k] || 0) + 1;
      score += weight || 0;
      (where[k] = where[k] || []).push(path.relative(ROOT, f));
    }
  }
  rows.push({
    route: path.relative(ROOT, r).replace(/\\/g, '/'),
    files: set.size,
    score,
    risks: Object.entries(agg)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}:${v}`)
      .join(' '),
    alertFiles: (where.alertNoop || []).length,
    svgFiles: (where.svgCharts || []).length,
  });
}
rows.sort((a, b) => b.score - a.score);
const w = (s, n) => (s.length >= n ? s : s + ' '.repeat(n - s.length));
console.log(w('route', 34), w('files', 7), w('score', 7), w('alertF', 7), w('svgF', 6), 'risks');
for (const r of rows)
  console.log(
    w(r.route, 34),
    w(String(r.files), 7),
    w(String(r.score), 7),
    w(String(r.alertFiles), 7),
    w(String(r.svgFiles), 6),
    r.risks
  );

const all = new Set();
for (const r of rows) closure(path.join(ROOT, r.route)).forEach((f) => all.add(f));
console.log('\nИтого охвачено файлов графом:', all.size, 'из', files.length, 'роутов');
