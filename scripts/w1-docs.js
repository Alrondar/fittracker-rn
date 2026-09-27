// WEB-1: правила в документы основного дерева (нативной ветке нужны feedback-инвариант,
// карта и правило worktree). Веб-специфика остаётся в web-port.
// Запуск: AGENTS_SEC=<файл с секцией> node scripts/w1-docs.js
const fs = require('fs');
const T = String.fromCharCode(96);
const NL = String.fromCharCode(10);
const CR = String.fromCharCode(13);

function eol(text, e) {
  return text
    .split(CR + NL)
    .join(NL)
    .split(NL)
    .join(e);
}

function edit(path, fn) {
  const s0 = fs.readFileSync(path, 'utf8');
  const e = s0.indexOf(CR + NL) >= 0 ? CR + NL : NL;
  const s1 = fn(s0, e);
  if (s1 === s0) {
    console.error('NO CHANGE:', path);
    process.exit(1);
  }
  fs.writeFileSync(path, s1);
  console.log('patched', path);
}

edit('CLAUDE.md', (s, e) => {
  const anchor = `- User-facing errors — ${T}mapError/extractMessage${T} или ${T}mapAuthError${T}.`;
  if (!s.includes(anchor)) throw new Error('CLAUDE anchor');
  const add = `- User-facing алерты и подтверждения — только через ${T}src/lib/feedback.ts${T} (${T}feedback.alert${T}); ${T}Alert.alert${T} в коде UI не используется (грабля — INVENTORY.md §10.1).`;
  return s.replace(anchor, anchor + e + add);
});

edit('INVENTORY.md', (s, e) => {
  const rowOld =
    '| Shared UI|src/components/ui/  ( AppButton ,  AppCard ,  SheetShell ,  Skeleton ,  PillToggle , …)|';
  if (!s.includes(rowOld)) throw new Error('INVENTORY row');
  const rowNew =
    '| Shared UI|src/components/ui/  ( AppButton ,  AppCard ,  SheetShell ,  FeedbackDialog ,  Skeleton ,  PillToggle , …)|' +
    e +
    '| Alert/confirm пользователю|${T}src/lib/feedback.ts${T}  ( ${T}feedback.alert${T} ) — не ${T}Alert.alert${T} , см. 10.1|'
      .replace(/\$\{T\}/g, T);
  s = s.replace(rowOld, rowNew);

  const anchor =
    '- WT-2: запись `started_at` идемпотентна (`startedSavedRef`), подтверждение финиша — единственное (confirm-лист), в `saveWorkout` Alert-подтверждения нет.';
  if (!s.includes(anchor)) throw new Error('INVENTORY 10.1');
  const add = eol(
    [
      '- WEB-1: `Alert.alert` напрямую не использовать — в `react-native-web` это заглушка',
      '  (`static alert() {}`), и на вебе подтверждение или ошибка исчезают молча. Весь',
      '  user-facing alert/confirm идёт через `src/lib/feedback.ts` (подпись 1-в-1 с',
      '  `Alert.alert`): на нативных платформах это прямой делегат в `Alert`, на вебе рисует',
      '  `FeedbackDialog` (хост — в `app/_layout.tsx` рядом с `RootLayoutContent`).',
      '  Проверка: `grep -rn "Alert.alert(" src app | grep -v src/lib/feedback.ts` — пусто.',
    ].join(NL),
    e
  );
  return s.replace(anchor, anchor + e + add);
});

edit('AGENTS.md', (s, e) => {
  const anchor = '## Навигация';
  if (!s.includes(anchor)) throw new Error('AGENTS anchor');
  return s.replace(anchor, eol(fs.readFileSync(process.env.AGENTS_SEC, 'utf8'), e) + anchor);
});

edit('STATUS.md', (s, e) => {
  const anchor = '### UX-3 (остаток): PR-момент + брендовый лоадер + тема 26.09.2026';
  if (!s.includes(anchor)) throw new Error('STATUS anchor');
  const sec = eol(
    [
      '### WEB-1: feedback-слой вместо Alert.alert 27.09.2026 (веб-порт — в worktree)',
      '',
      'Веб-версия (мобильный браузер) разрабатывается в git worktree `../fittracker-rn-web`,',
      'ветка `web-port`; правило разведения — `AGENTS.md` (общее делается в `main` и мержится в',
      '`web-port`, чисто вебское живёт только там). От `Alert.alert` в `main` отказались здесь же:',
      'в `react-native-web` это `static alert() {}`, и 77 вызовов в 27 файлах на вебе молчали',
      '(валидация входа и все подтверждения удаления).',
      '',
      '| ID | Пр. | Статус | Что |',
      '|---|---:|---|---|',
      '| WEB-1a | 🔴 | ✅ | `src/lib/feedback.ts`: drop-in замена `Alert.alert` (та же сигнатура), FIFO-очередь диалогов; на нативе — прямой делегат, поведение устройства не меняется |',
      '| WEB-1b | 🔴 | ✅ | `src/components/ui/FeedbackDialog.tsx`: веб-диалог на токенах темы и `AppButton` (destructive → `danger`, cancel → `ghost`, один сильный акцент на блок по PRODUCT.md §3.1); затемнение и Escape закрывают без колбэков (семантика cancelable iOS-алерта); на нативе рендерит `null` |',
      '| WEB-1c | 🔴 | ✅ | Миграция 77 вызовов в 27 файлах (`scripts/web-alert-codemod.js`), логика вызовов не менялась; маунт хоста в `app/_layout.tsx` рядом с `RootLayoutContent` — диалог доступен и в период splash-гейта |',
      '| WEB-1d | 🟠 | ✅ | Проверено в браузере: «Войти» с пустыми полями показывает диалог и закрывается по «ОК»/Escape/тапу по затемнению; подтверждение «Сменить пароль» открывается и отменяется без вызова колбэка; два вызова расходятся по очереди. Device-прогон подтверждений всё ещё нужен (правило пакета) |',
      '',
      'Гейты: `tsc --noEmit` exit 0, `eslint` exit 0 (1 предупреждение — дородовое, `app/workout/create.tsx`).',
      '',
      '---',
      '',
    ].join(NL),
    e
  );
  return s.replace(anchor, sec + anchor);
});
