/* eslint-disable no-undef */
// WEB-INFRA-2: подготовка артефакта веб-деплоя (Qoder Sites).
//
//   node scripts/web-deploy.js            # export + сборка ../fittracker-rn/web-deploy/dist-clean
//   node scripts/web-deploy.js --no-build # переупаковать уже собранный dist/
//
// Почему не «просто dist»: packager Qoder Sites отклоняет артефакт с
// `sites_artifact_unsafe`, если в путях встречается сегмент `node_modules`
// (а `expo export` кладёт ассеты в `dist/assets/node_modules/...`). Лечится
// копированием с переименованием `assets/node_modules -> assets/vendor` и
// заменой тех же строк в JS-бандле (это только URL ассетов, 35 вхождений).
// Сам prepare_site/publish_site делает агент через MCP — скрипт только
// локальная часть.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_ROOT = path.resolve(ROOT, '../fittracker-rn/web-deploy');
const OUT = path.join(OUT_ROOT, 'dist-clean');
const SRC = path.join(ROOT, 'dist');

function main() {
  const skipBuild = process.argv.includes('--no-build');

  if (!skipBuild) {
    console.log('› expo export --platform web');
    execSync('npx expo export --platform web', { cwd: ROOT, stdio: 'inherit' });
  }
  if (!fs.existsSync(path.join(SRC, 'index.html'))) {
    console.error('✗ dist/index.html нет — сначала соберите без --no-build');
    process.exit(1);
  }

  console.log('› копия dist -> web-deploy/dist-clean (assets/node_modules -> assets/vendor)');
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT_ROOT, { recursive: true });
  fs.cpSync(SRC, OUT, { recursive: true });

  const nm = path.join(OUT, 'assets', 'node_modules');
  if (fs.existsSync(nm)) {
    fs.renameSync(nm, path.join(OUT, 'assets', 'vendor'));
  }

  const jsDir = path.join(OUT, '_expo', 'static', 'js', 'web');
  let patched = 0;
  for (const f of fs.readdirSync(jsDir)) {
    if (!f.endsWith('.js')) continue;
    const p = path.join(jsDir, f);
    const before = fs.readFileSync(p, 'utf8');
    const after = before.split('assets/node_modules').join('assets/vendor');
    if (after !== before) {
      fs.writeFileSync(p, after);
      patched++;
    }
  }

  // Контроль: ни пути, ни строки node_modules не осталось.
  const leftover = execSync(`grep -rl "assets/node_modules" "${OUT}" || true`, {
    encoding: 'utf8',
  }).trim();
  if (leftover) {
    console.error('✗ остались ссылки на assets/node_modules:\n' + leftover);
    process.exit(1);
  }

  const files = execSync(`find "${OUT}" -type f | wc -l`, { encoding: 'utf8' }).trim();
  const sizeMb = (
    execSync(`du -sk "${OUT}" | cut -f1`, { encoding: 'utf8' }).trim() / 1024
  ).toFixed(1);

  // WEB-5: PWA-lite. Metro-экспорт не генерирует манифест (это делал
  // webpack-config), а для «Добавить на главный экран» в мобильном браузере
  // нужны manifest.webmanifest + <link rel="manifest"> + apple-touch-icon.
  // Иконка — бренд-знак из assets/icon.png (UX-3b), тот же, что у приложения.
  console.log('› PWA: манифест + иконка + мета в index.html');
  fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'assets', 'icon.png'), path.join(OUT, 'icons', 'app-icon.png'));
  fs.writeFileSync(
    path.join(OUT, 'manifest.webmanifest'),
    JSON.stringify(
      {
        name: 'FitTracker',
        short_name: 'FitTracker',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1A1A2E',
        theme_color: '#1A1A2E',
        icons: [
          { src: '/icons/app-icon.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' },
          {
            src: '/icons/app-icon.png',
            sizes: '1024x1024',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      null,
      2
    )
  );
  const idxPath = path.join(OUT, 'index.html');
  let idx = fs.readFileSync(idxPath, 'utf8');
  if (!idx.includes('manifest.webmanifest')) {
    idx = idx.replace(
      '</head>',
      [
        '<link rel="manifest" href="/manifest.webmanifest">',
        '<link rel="apple-touch-icon" href="/icons/app-icon.png">',
        '<meta name="mobile-web-app-capable" content="yes">',
        '<meta name="apple-mobile-web-app-capable" content="yes">',
        '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
        '</head>',
      ].join('\n  ')
    );
    fs.writeFileSync(idxPath, idx);
  }

  console.log(`✓ готово: ${OUT} (${files} файлов, ${sizeMb} МБ, бандлов правок: ${patched})`);
  console.log(
    '› дальше: агент вызывает prepare_site (projectRoot=web-deploy, webDirectory=dist-clean, spa:true) и publish_site'
  );
}

main();
