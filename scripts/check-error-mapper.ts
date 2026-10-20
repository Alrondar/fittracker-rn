// Офлайн-проверка mapError (SEC-9 / EDGE-12: пользователю не показываем сырой текст вендора).
// Запуск из корня: npx tsx scripts/check-error-mapper.ts (tsx — devDependency, jest в проекте нет).
// Смысл отдельного харнеса: PostgREST переформулирует сообщения между версиями, и словарь
// маппера устаревает молча — так утёк «Cannot coerce the result to a single JSON object».
import { mapError } from '../src/utils/errorMapper';

const cases: [string, unknown, string][] = [
  [
    'свежая формулировка 406',
    { message: 'Cannot coerce the result to a single JSON object', code: 'PGRST116' },
    'Данные не найдены',
  ],
  [
    'та же без кода (только текст)',
    { message: 'Cannot coerce the result to a single JSON object' },
    'Данные не найдены',
  ],
  [
    'старая формулировка 406',
    { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' },
    'Данные не найдены',
  ],
  [
    'код PGRST116 при чужом тексте',
    { message: 'some future vendor wording', code: 'PGRST116' },
    'Данные не найдены',
  ],
  [
    'RLS',
    { message: 'new row violates row-level security policy', code: '42501' },
    'Недостаточно прав',
  ],
  [
    'чужие строки — сырьё не светим',
    { message: 'column x does not exist', code: '42703' },
    'Сервис временно недоступен',
  ],
  ['сеть', { message: 'Fetch failed' }, 'Нет связи'],
  ['пустая ошибка', null, 'неизвестная ошибка'],
  ['дружелюбное текст проходит насквозь', 'Слишком короткий пароль', 'Слишком короткий пароль'],
];

let fail = 0;
for (const [name, input, expect] of cases) {
  const got = mapError(input);
  const ok = got.includes(expect);
  if (!ok) fail++;
  console.log(`${ok ? 'ок  ' : 'ВАЛ'} ${name} → ${got}`);
}
console.log(
  fail === 0 ? `Итог: ${cases.length} из ${cases.length} зелёные` : `Итог: провалов ${fail}`
);
process.exit(fail === 0 ? 0 : 1);
