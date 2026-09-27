// UX-4 codemod: TouchableOpacity -> PressableScale (поэкранно,rules below).
// Запуск: npx jscodeshift --parser=tsx --extensions=tsx -d "" scripts/ux4-codemod.js app src/components
// (dry-run: убрать -d ""; scripts/ исключён из eslint намеренно — Node-инструмент)
// Правила:
//  - пропускаем SheetShell/PressableScale (свои internals);
//  - бэкдропы (activeOpacity={1}) остаются TouchableOpacity;
//  - элементы с нестандартными для PressableScale атрибутами не трогаем;
//  - activeOpacity удаляем; если обработчик уже дёргает Haptics — haptic="none".
const path = require('path');

const SKIP = ['ui/SheetShell.tsx', 'ui/PressableScale.tsx'];
const SUPPORTED = new Set([
  'key',
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

module.exports = function transform(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  const name = file.path.replace(/\\/g, '/');
  if (SKIP.some((s) => name.endsWith(s))) return null;
  if (name.endsWith('PressableScale.tsx')) return null;

  // локальные обработчики, которые сами дёргают Haptics
  const hapticFns = new Set();
  root.findVariableDeclarators().forEach((p) => {
    if (/\bHaptics\s*\./.test(j(p).toSource())) hapticFns.add(p.node.id.name);
  });

  let changed = 0;
  root.findJSXElements('TouchableOpacity').forEach((el) => {
    const attrs = el.node.openingElement.attributes;
    const ao = attrs.find((a) => a.name && a.name.name === 'activeOpacity');
    const isBackdrop =
      ao &&
      ao.value &&
      ao.value.type === 'JSXExpressionContainer' &&
      ao.value.expression &&
      ao.value.expression.value === 1;
    if (isBackdrop) return;
    for (const a of attrs) {
      if (a.type !== 'JSXAttribute') return; // spread — бережно пропускаем
      if (!SUPPORTED.has(a.name.name)) return;
    }
    el.node.openingElement.name = j.jsxIdentifier('PressableScale');
    if (el.node.closingElement) el.node.closingElement.name = j.jsxIdentifier('PressableScale');
    el.node.openingElement.attributes = attrs.filter(
      (a) => !(a.name && a.name.name === 'activeOpacity')
    );
    const op = el.node.openingElement.attributes.find((a) => a.name && a.name.name === 'onPress');
    if (op) {
      const src = j(op).toSource();
      const dup =
        /\bHaptics\s*\./.test(src) ||
        [...hapticFns].some((fn) => new RegExp(`\\b${fn}\\b`).test(src));
      if (dup) {
        el.node.openingElement.attributes.push(
          j.jsxAttribute(j.jsxIdentifier('haptic'), j.stringLiteral('none'))
        );
      }
    }
    changed++;
  });

  if (!changed) return null;

  const remaining = root.findJSXElements('TouchableOpacity').length;
  const rn = root.find(j.ImportDeclaration).filter((p) => p.node.source.value === 'react-native');
  if (rn.length && remaining === 0) {
    const specs = rn.get().node.specifiers;
    const tIdx = specs.findIndex((s) => s.imported && s.imported.name === 'TouchableOpacity');
    if (tIdx >= 0) specs.splice(tIdx, 1);
  }

  const already = root
    .find(j.ImportDeclaration)
    .filter((p) => /ui\/PressableScale$/.test(p.node.source.value)).length;
  if (!already) {
    const from = path.dirname(name);
    let rel = path
      .relative(from, 'src/components/ui/PressableScale')
      .replace(/\\/g, '/')
      .replace(/\.tsx$/, '');
    if (!rel.startsWith('.')) rel = './' + rel;
    const decl = j.importDeclaration(
      [j.importSpecifier(j.identifier('PressableScale'))],
      j.stringLiteral(rel)
    );
    if (rn.length) rn.at(0).insertAfter(decl);
    else root.find(j.ImportDeclaration).at(0).insertBefore(decl);
  }

  return root.toSource({ quote: 'single' });
};
