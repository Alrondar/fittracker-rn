// Сборщик офлайн-проверок: запускает каждый scripts/check-*.ts отдельным
// процессом и отдаёт ненулевой код возврата, если хоть одна упала.
// Запуск из корня: npm test
import { spawnSync } from 'child_process';
import { readdirSync } from 'fs';
import { resolve } from 'path';

const TSX_CLI = resolve('node_modules/tsx/dist/cli.mjs');

const scripts = readdirSync('scripts')
  .filter((file) => /^check-.+\.ts$/.test(file))
  .sort();

if (scripts.length === 0) {
  console.error('В scripts/ нет ни одного check-*.ts — запускать нечего.');
  process.exit(1);
}

const failed: string[] = [];

for (const script of scripts) {
  const started = Date.now();
  const result = spawnSync(process.execPath, [TSX_CLI, resolve('scripts', script)], {
    stdio: 'inherit',
  });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const ok = result.status === 0;
  if (!ok) failed.push(script);
  console.log(`${ok ? 'ЗЕЛЁНАЯ' : 'ПАДЕНИЕ'}  ${script}  (${seconds} с)\n`);
}

console.log(`Файлов проверок: ${scripts.length}, упавших: ${failed.length}`);
if (failed.length > 0) {
  console.error('Упало: ' + failed.join(', '));
  process.exit(1);
}
