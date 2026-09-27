// WEB-1 codemod: `Alert.alert` -> `feedback.alert` (см. src/lib/feedback.ts).
//
// Что делает с каждым файлом:
// 1) убирает `Alert` из импорта 'react-native' (однострочный и многострочный);
// 2) вставляет `import { feedback } from '<rel>/lib/feedback';` сразу после него;
// 3) заменяет вызовы `Alert.alert(` на `feedback.alert(`.
// Логика вызовов не меняется: сигнатура feedback.alert 1-в-1 с Alert.alert.
//
// Запуск: node scripts/web-alert-codemod.js [--dry]
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DRY = process.argv.includes('--dry');
const SELF = 'src/lib/feedback.ts';

const files = cp
  .execSync('grep -rl "Alert\\.alert(" src app', { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((f) => f.replace(/\\/g, '/'))
  .filter((f) => f !== SELF);

const IMP_RE = /import\s*\{([^}]*)\}\s*from\s*'react-native';/;
let totalCalls = 0;
const report = [];

for (const rel of files) {
  const abs = path.join(ROOT, rel);
  let src = fs.readFileSync(abs, 'utf8');
  const before = src;
  const calls = (src.match(/Alert\.alert\(/g) || []).length;
  totalCalls += calls;

  // 0) зачистка пустых `import { } from 'react-native'` (след предыдущего прогона)
  src = src.replace(/^import\s*\{\s*\}\s*from\s*'react-native';\n/gm, '');
  src = src.replace(/^import\s*\{\s*\n\s*\}\s*from\s*'react-native';\n/gm, '');

  // 1) + 2) импорт react-native: убрать Alert, добавить feedback
  const m = src.match(IMP_RE);
  let anchorEnd = -1;
  if (m && /(^|[\s,{])Alert([\s,}]|$)/.test(m[1])) {
    const specs = m[1]
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && s !== 'Alert');
    const multiline = m[0].includes('\n');
    const rebuilt =
      specs.length === 0
        ? ''
        : multiline
          ? `import {\n${specs.map((s) => `  ${s},`).join('\n')}\n} from 'react-native';`
          : `import { ${specs.join(', ')} } from 'react-native';`;
    src = src.replace(IMP_RE, rebuilt);
    anchorEnd = rebuilt ? src.indexOf(rebuilt) + rebuilt.length : -1;
    if (!rebuilt) {
      // импорт удалён целиком — строку feedback вставим в начало (см. ниже)
      anchorEnd = -1;
    }
  }

  if (!/from '[^']*lib\/feedback'/.test(src)) {
    const fromDir = path.posix.dirname(rel);
    const spec = path.posix.relative(fromDir, 'src/lib/feedback');
    const line = `import { feedback } from '${spec.startsWith('.') ? spec : './' + spec}';`;
    if (anchorEnd >= 0) {
      const nl = src.indexOf('\n', anchorEnd);
      src = src.slice(0, nl + 1) + line + '\n' + src.slice(nl + 1);
    } else {
      const first = src.match(/^import[^\n]*\n/m);
      const at = first ? first.index + first[0].length : 0;
      src = src.slice(0, at) + line + '\n' + src.slice(at);
    }
  }

  // 3) вызовы
  src = src.replace(/Alert\.alert\(/g, 'feedback.alert(');

  if (src === before) {
    report.push(`${rel}: NO CHANGE (calls=${calls})`);
    continue;
  }
  if (!DRY) fs.writeFileSync(abs, src);
  report.push(`${DRY ? 'dry ' : ''}${rel}: calls=${calls}`);
}

console.log(report.join('\n'));
console.log(`\nфайлов: ${files.length}, вызовов Alert.alert: ${totalCalls}`);
