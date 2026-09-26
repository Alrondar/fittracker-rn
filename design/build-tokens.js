// Генерирует design/tokens.json — мост из кода в Figma (Tokens Studio / любой W3C-совместимый импортёр).
// Значения берутся из кода, руками не повторяются.
// Запуск: node design/build-tokens.js   (пересобира после правок theme.ts / typography.ts)
const fs = require('fs');

const strip = (s) => s.replace(/\s+as\s+\w+/g, '');
const obj = (body) => eval('({' + strip(body) + '\n})');

const ts = fs.readFileSync('src/constants/theme.ts', 'utf8');
const typoSrc = fs.readFileSync('src/styles/typography.ts', 'utf8');
const semSrc = fs.readFileSync('src/constants/semanticColors.ts', 'utf8');
const fontsSrc = fs.readFileSync('src/constants/fonts.ts', 'utf8');

/* ---------------- источник: код ---------------- */
const themes = {};
for (const m of ts.matchAll(/export const (\w+):\s*Theme\s*=\s*\{[\s\S]*?\n\};/g)) {
  themes[m[1]] = {
    name: m[0].match(/name:\s*'([^']*)'/)[1],
    mode: m[0].match(/mode:\s*'(\w+)'/)[1],
    accent: m[0].match(/accent:\s*'(\w+)'/)[1],
    colors: obj(m[0].match(/colors:\s*\{([\s\S]*?)\n\s*\},/)[1]),
    gradients: obj(m[0].match(/gradients:\s*\{([\s\S]*?)\n\s*\},/)[1]),
  };
}
const spacing = obj(ts.match(/export const SPACING = \{([\s\S]*?)\n\};/)[1]);
const radius = obj(ts.match(/export const BORDER_RADIUS = \{([\s\S]*?)\n\};/)[1]);
const shadows = obj(ts.match(/export const SHADOWS = \{([\s\S]*?)\n\} as const;/)[1]);
const staticGradients = obj(ts.match(/export const GRADIENTS = \{([\s\S]*?)\n\};/)[1]);
const families = obj(fontsSrc.match(/export const FONT_FAMILIES = \{([\s\S]*?)\n\} as const;/)[1]);
globalThis.FONT_FAMILIES = families; // typography.ts ссылается на FONT_FAMILIES.*
const typo = obj(typoSrc.match(/export const typography = \{([\s\S]*?)\n\};/)[1]);
const sem = {};
for (const m of semSrc.matchAll(
  /export const (\w+)(?::[^=]*)?\s*=\s*\{([\s\S]*?)\n\}(?: as const)?;/g
))
  sem[m[1]] = obj(m[2]);
const muscle = obj(semSrc.match(/const MUSCLE_GROUP_COLORS[^=]*=\s*\{([\s\S]*?)\n\};/)[1]);

/* ---------------- helpers ---------------- */
const themeList = Object.values(themes);
const colorKeys = Object.keys(themeList[0].colors);
const gradKeys = Object.keys(themeList[0].gradients);
const modeName = (t) => `${t.accent}-${t.mode}`; // 'purple-dark' — имя Figma-mode
const color = (v, description) => ({
  $type: 'color',
  $value: v,
  ...(description && { $description: description }),
});
const dim = (v, description) => ({
  $type: 'dimension',
  $value: `${v}px`,
  ...(description && { $description: description }),
});
const num = (v, description) => ({
  $type: 'number',
  $value: v,
  ...(description && { $description: description }),
});
const str = (v, description) => ({
  $type: 'other',
  $value: v,
  ...(description && { $description: description }),
});
// multi-mode: $value = { '<accent>-<mode>': '#hex', ... } — читается Tokens Studio как темасет
const multi = (pick, description) => ({
  $type: 'color',
  $value: Object.fromEntries(themeList.map((t) => [modeName(t), pick(t)])),
  ...(description && { $description: description }),
});

/* ---------------- 1. Цвета тем: один токен = 10 значений по режима ---------------- */
const themeColorTokens = {};
for (const k of colorKeys) {
  themeColorTokens[k] = multi((t) => t.colors[k], `ThemeColors.${k}`);
}
const themeGradientTokens = {};
for (const k of gradKeys) {
  themeGradientTokens[k] = {
    $type: 'color',
    $value: Object.fromEntries(themeList.map((t) => [modeName(t), t.gradients[k].join(', ')])),
    $description: `ThemeGradients.${k} — linear-gradient(180deg, …), 2 stopа`,
  };
}

/* ---------------- 2. Плоская копия: по токену на каждую из 10 тем ---------------- */
// Нужна, если импортёр не понимает multi-mode: тогда это 230 отдельных переменных
// с префиксом темы, а режимы в Фигме собираются вручную из них.
const flatThemeTokens = {};
for (const t of themeList) {
  const bag = { $description: `${t.name} · режим ${modeName(t)}` };
  for (const k of colorKeys) bag[k] = color(t.colors[k]);
  for (const k of gradKeys)
    bag[`gradient-${k}`] = str(t.gradients[k].join(' → '), 'linear-gradient(180deg)');
  flatThemeTokens[modeName(t)] = bag;
}

/* ---------------- 3. Типографика ---------------- */
const typographyTokens = {};
for (const [k, v] of Object.entries(typo)) {
  typographyTokens[k] = {
    fontFamily: str(
      v.fontFamily,
      'имя семейства в RN (@expo-google-fonts) — в Figma: ' +
        v.fontFamily.replace(/_/g, ' ').replace(/\d+$/, '')
    ),
    fontSize: dim(v.fontSize),
    ...(v.lineHeight ? { lineHeight: dim(v.lineHeight) } : {}),
    fontWeight: num(
      v.fontWeight === 'bold' ? 700 : v.fontWeight === 'normal' ? 400 : Number(v.fontWeight)
    ),
    ...(v.letterSpacing ? { letterSpacing: dim(v.letterSpacing) } : {}),
    ...(v.textTransform ? { textCase: str(v.textTransform) } : {}),
  };
}
const fontFamilies = Object.fromEntries(Object.entries(families).map(([k, v]) => [k, str(v)]));

/* ---------------- 4. Spacing / radius / shadow ---------------- */
const spaceTokens = Object.fromEntries(Object.entries(spacing).map(([k, v]) => [k, dim(v)]));
const radiusTokens = Object.fromEntries(
  Object.entries(radius).map(([k, v]) => [
    k,
    dim(v > 100 ? 9999 : v, k === 'full' ? 'BORDER_RADIUS.full → corner radius 9999' : undefined),
  ])
);
const shadowTokens = Object.fromEntries(
  Object.entries(shadows).map(([k, s]) => [
    k,
    {
      $type: 'shadow',
      $value: {
        color: s.shadowColor,
        offsetX: `${s.shadowOffset.width}px`,
        offsetY: `${s.shadowOffset.height}px`,
        blur: `${s.shadowRadius}px`,
        spread: '0px',
      },
      $description: `SHADOWS.${k} · opacity ${s.shadowOpacity} · elevation(Android) ${s.elevation} · единственный владелец теней, инлайн-копии запрещены`,
    },
  ])
);

/* ---------------- 5. Категориальные цвета (вне тем, mid-tone) ---------------- */
const categorical = {};
for (const [name, map] of Object.entries(sem)) {
  const bag = { $description: `${name} — одинаковы во всех темах` };
  for (const [k, v] of Object.entries(map))
    bag[k] =
      typeof v === 'string' ? color(v) : str(Array.isArray(v) ? v.join(', ') : JSON.stringify(v));
  if (Object.keys(bag).length > 1) categorical[name] = bag;
}
// массивы-as-const (не ловятся регуляркой выше) — отдельным токеном
const chartLines = semSrc.match(/export const (CHART_LINE_COLORS) = \[([^\]]*)\]/);
if (chartLines) {
  const vals = chartLines[2].match(/'[^']+'/g).map((s) => s.replace(/'/g, ''));
  categorical[chartLines[1]] = {
    $description: 'Палитра линий графиков, до 3 серий на график',
    ...Object.fromEntries(vals.map((v, i) => [`series${i + 1}`, color(v)])),
  };
}
const muscleFirstLabel = {};
for (const [k, v] of Object.entries(muscle)) if (!(v in muscleFirstLabel)) muscleFirstLabel[v] = k;
categorical.MUSCLE_GROUP_COLORS = {
  $description:
    'getMuscleColor(): поиск по ключевым словам названия мышцы, fallback = colors.primary',
  ...Object.fromEntries(
    Object.entries(muscleFirstLabel).map(([hex, label]) => [label, color(hex)])
  ),
};

/* ---------------- 6. Layout / motion ---------------- */
const layout = {
  baseWidth: dim(
    375,
    'BASE_WIDTH: scale()/fontScale() считаются от неё; portrait зафиксирован в app.json'
  ),
  sheetMaxHeightRatio: num(0.85, 'SheetShell MAX_HEIGHT_RATIO'),
  sheetDragCloseDistance: dim(80, 'SheetShell DRAG_CLOSE_DISTANCE'),
  sheetDragCloseVelocity: num(600, 'SheetShell DRAG_CLOSE_VELOCITY'),
  tapTargetMin: dim(44, 'PillToggle minHeight — минимальная зона нажатия'),
  grabber: str('36×4, radius 2, textTertiary @0.4', 'SheetShell grabber'),
};
const motion = {
  sheetEnter: dim(240, 'withTiming, delay 16'),
  sheetExit: dim(200, 'withTiming'),
  sheetSnapBack: str('damping 28, stiffness 320', 'withSpring'),
  pressSpring: str(
    'damping 20, stiffness 400, mass 0.6',
    'PressableScale PRESS_SPRING (~120 ms туда-обратно)'
  ),
  pressScaleButton: num(0.97, 'AppButton scaleTo'),
  pressScaleCard: num(0.985, 'AppCard scaleTo'),
  tabIconPop: num(1.16, 'CustomTabBar pop при фокусе'),
  sheetCloseGuard: dim(600, 'CLOSE_GUARD_MS — защита от протекающего тапа'),
  hapticPress: str('light', 'ImpactFeedbackStyle.Light на press и смену пилюли'),
};
const statics = {
  gradients: Object.fromEntries(
    Object.entries(staticGradients).map(([k, v]) => [
      k,
      str(v.join(', '), 'GRADIENTS (обратная совместимость) = фиолетовая светлая пара'),
    ])
  ),
  onStaticGradientColor: color(
    '#FFFFFF',
    'ON_STATIC_GRADIENT_COLOR — текст поверх hero; НЕ textInverse'
  ),
};

/* ---------------- сборка ---------------- */
const out = {
  $schema: 'https://design-tokens.github.io/community-group/format/',
  name: 'FitTracker design tokens',
  description:
    'Сгенерировано из кода скриптом design/build-tokens.js. Не править руками: источник правды — src/constants/theme.ts, src/styles/typography.ts, src/constants/fonts.ts, src/constants/semanticColors.ts.',
  $metadata: {
    generator: 'design/build-tokens.js',
    sources: [
      'src/constants/theme.ts',
      'src/styles/typography.ts',
      'src/constants/fonts.ts',
      'src/constants/semanticColors.ts',
    ],
    figmaModes: Object.fromEntries(themeList.map((t) => [modeName(t), t.name])),
    figmaModeOrder: themeList.map(modeName),
    usage:
      'themeColorTokens/gradientTokens — multi-mode ($value = объект по режимам). flatThemes — то же плоским списком по 23 токена на тему, для импортёров без поддержки режимов.',
  },
  theme: {
    color: themeColorTokens,
    gradient: themeGradientTokens,
    typography: typographyTokens,
    fontFamilies,
    space: spaceTokens,
    radius: radiusTokens,
    shadow: shadowTokens,
    layout,
    motion,
  },
  flatThemes: flatThemeTokens,
  categorical,
  statics,
};

fs.writeFileSync('design/tokens.json', JSON.stringify(out, null, 2) + '\n');

console.log(
  `design/tokens.json записан · режимов: ${themeList.length} · токенов цвета темы: ${colorKeys.length} (+${gradKeys.length} градиентов) · типографика: ${Object.keys(typo).length} · семантика: ${Object.keys(categorical).length} групп · байт: ${fs.statSync('design/tokens.json').size}`
);
