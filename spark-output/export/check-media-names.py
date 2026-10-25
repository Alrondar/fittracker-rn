# -*- coding: utf-8 -*-
"""Проверка соответствия name_eng ↔ папка ↔ media_url ↔ HTTP для кадров справочника.

Зачем: картинка в каталоге привязана механически — `media_url` =
`.../exercises/<name_eng с «_»>/0.jpg`, а вторую рамку достраивает `parseMediaUrls`.
Значит любое расхождение имени, незакоммиченный кадр или непушнутый коммит дают
пустой серый бокс в карточке (класс дефекта MEDIA-1). Этот скрипт ловит это ДО
миграции и ДО прогона на устройстве.

Запуск:
    python spark-output/export/check-media-names.py            # локальные проверки
    python spark-output/export/check-media-names.py --http     # + HEAD по нашим URL
    python spark-output/export/check-media-names.py --http --upstream-sample 60
    python spark-output/export/check-media-names.py --ids Clamshell,Bent-Over_T-Raise

Код возврата: 0 — проблем нет; 1 — есть жёсткие (битый хост/нет кадра/битый формат);
2 — только предупреждения (расхождения имён, 404 upstream).
"""
import argparse
import json
import os
from media_root import media_root
import random
import re
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DATA = media_root()  # ../fittracker-exercise-media/exercises, см. media_root.py
MANIFEST = os.path.join(ROOT, 'spark-output', 'export', 'illustrations-manifest.json')
WANT = (850, 567)          # 3:2 — формат каталога, при котором pickMediaFit оставляет cover
MAX_KB = 120               # наш кадр ~45 КБ; больше — значит не ужали
MIN_KB = 8                 # меньше — подозрение на пустой/битый файл


def load_items(path=MANIFEST):
    if not os.path.exists(path):
        sys.exit('нет манифеста: сначала python spark-output/export/build-illustration-manifest.py')
    return json.load(open(path, encoding='utf-8'))['items']


def head(url, timeout=20):
    req = urllib.request.Request(url, method='HEAD', headers={'User-Agent': 'fittracker-check'})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return 0


def probe_urls(it):
    """Адреса, которые по этому media_url реально запросит рендер.

    Набор рамок диктует имя в URL, а не содержимое папки (src/utils/mediaScheme.ts
    достраивает вторую рамку из него). Хвост `?v=N` — часть ключа кэша, пробуем его
    ровно так, как он записан в строке базы.
    """
    url = it.get('media_url') or ''
    path, _, query = url.partition('?')
    name = path.rsplit('/', 1)[-1].lower()
    if not name:
        return []
    ext = name.rsplit('.', 1)[-1]
    prefix = path.rsplit('/', 1)[0]
    if re.match(r'00[fm]\.(jpg|jpeg|png|webp)$', name):
        # Гендерная схема: обе пары — мужская обязательна по инварианту данных,
        # иначе профиль «мужчина» упрётся в 404.
        names = ['00f', '01f', '00m', '01m']
    elif re.match(r'\d\.(jpg|jpeg|png|webp)$', name):
        names = ['0', '1']
    else:
        names = [name.rsplit('.', 1)[0]]
    tail = ('?' + query) if query else ''
    return ['%s/%s.%s%s' % (prefix, n, ext, tail) for n in names]


def check_local(it, hard, warn):
    fid = it['folder']
    # Рендер ходит в папку из URL, а не в папку по name_eng: у 54 позиций они
    # расходятся, и проверка по name_eng давала бы ложное «папки нет → 404».
    rd = os.path.join(DATA, it.get('url_folder') or fid) if (it.get('url_folder') or fid) else None
    d = rd
    if not d or not os.path.isdir(d):
        # Для чужих кадров это не беда, если папка из её же URL на месте: расхождение
        # имени отдельной строкой отчёта (mismatch). Тревога — только когда кадра нет нигде.
        if it['media_host'] == 'ours':
            hard.append('%-44s наш кадр, а папки %s нет → 404 в карточке'
                        % (fid or '<нет name_eng>', os.path.basename(rd or '')))
        elif it['ref'] == 'none':
            warn.append('%-44s кадра нет ни по name_eng, ни по URL' % (fid or '<нет name_eng>'))
        return
    # Две схемы имён: легаси 0/1 и новая 00f/01f (+ 00m/01m). Проверяем тот набор,
    # который реально лежит в папке, иначе каждая переснятая позиция даёт ложное
    # «нет 0.jpg» (поймано на Cable_Glute_Kickback_On_Bench 09.10).
    # Набор обязательных рамок диктует media_url, а не содержимое папки: вторую рамку
    # код строит из имени в URL (src/utils/mediaScheme.ts), поэтому позиция, где URL
    # ещё ссылается на 0.jpg, обязана держать и легаси — даже когда рядом уже лежат
    # 00f/01f. Прежняя логика «проверяем тот набор, который реально лежит в папке»
    # скрывала ровно этот класс: девять карточек остались с битым URL после того, как
    # легаси сняли до миграции (10.10). Кадр отдаём мы или upstream — тоже из URL:
    # чужие файлы на наш рендер не влияют.
    # Номер версии в хвосте адреса (`?v=3`) — часть ключа кэша, а не имени файла:
    # на диске кадр лежит без хвоста, см. src/utils/mediaScheme.ts.
    url_name = (it.get('media_url') or '').split('?', 1)[0].rsplit('/', 1)[-1].lower()
    if it['media_host'] != 'ours':
        names = []
        authored = False
    elif re.match(r'00[fm]\.(jpg|jpeg|png|webp)$', url_name):
        # Гендерная схема: обе пары обязательны, иначе профиль «мужчина» уйдёт в 404.
        names = ['00f.jpg', '01f.jpg', '00m.jpg', '01m.jpg']
        authored = True
    elif re.match(r'\d\.(jpg|jpeg|png|webp)$', url_name):
        names = ['0.jpg', '1.jpg']
        # Легаси-имена на нашем хосте — зеркало чужой рисовки (переехало 25.10 вместе
        # с адресами). existence проверяем, нормы 850×567 и 8–120 КБ к ней не
        # применяются: они про наши иллюстрации, а не про чужие файлы.
        authored = False
    else:
        names = [url_name] if url_name else []
        authored = False
    if os.path.exists(os.path.join(rd, '00f.jpg')) and not os.path.exists(os.path.join(rd, '00m.jpg')):
        warn.append('%s: женская пара есть, мужской нет (00m/01m) — на новую схему не переводить' % fid)
    for nm in names:
        p = os.path.join(rd, nm)
        if not os.path.exists(p):
            hard.append('%s: нет %s в %s, а media_url ведёт на неё' % (fid, nm, os.path.basename(rd)))
            continue
        if not authored:
            continue
        kb = os.path.getsize(p) / 1024
        try:
            from PIL import Image
            with Image.open(p) as im:
                wh = im.size
        except Exception as e:
            hard.append('%s/%s не читается: %s' % (fid, nm, e))
            continue
        if wh != WANT:
            hard.append('%s/%s размер %dx%d, надо %dx%d' % (fid, nm, wh[0], wh[1], *WANT))
        if not (MIN_KB <= kb <= MAX_KB):
            hard.append('%s/%s вес %.0f КБ (норма %d–%d)' % (fid, nm, kb, MIN_KB, MAX_KB))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--http', action='store_true', help='HEAD-проба наших URL')
    ap.add_argument('--upstream-sample', type=int, default=0, help='пробовать N upstream-URL (MEDIA-1)')
    ap.add_argument('--ids', help='проверить только эти папки (через запятую)')
    ap.add_argument('--manifest', default=MANIFEST, help='другой манифест (для тестов)')
    a = ap.parse_args()

    items = load_items(a.manifest)
    if a.ids:
        want = {s.strip() for s in a.ids.split(',') if s.strip()}
        items = [i for i in items if i['folder'] in want]
        missing = want - {i['folder'] for i in items}
        for m in sorted(missing):
            print('ВНИМАНИЕ: %s нет в манифесте (опечатка в имени или позиция удалена)' % m)

    hard, warn = [], []
    ours = [i for i in items if i['media_host'] == 'ours']
    for it in items:
        check_local(it, hard, warn)

    mismatch = [i for i in items if i['folder_mismatch']]
    noderive = [i for i in items if i['name_eng_derived']]
    nocover = [i for i in items if i['ref'] == 'none']

    if a.http and ours:
        probes = [u for it in ours for u in probe_urls(it)]
        with ThreadPoolExecutor(max_workers=8) as ex:
            codes = list(ex.map(head, probes))
        for (p, c) in zip(probes, codes):
            if c != 200:
                hard.append('HTTP %s — %s' % (c or 'ERR', p.split('/exercises/')[-1]))

    if a.upstream_sample:
        up = [i for i in items if i['media_host'] == 'upstream' and i.get('media_url')]
        sample = random.sample(up, min(a.upstream_sample, len(up)))
        # media_url УЖЕ указывает на .../<Folder>/0.jpg (вторую рамку достраивает
        # parseMediaUrls) — дописывать к нему "/0.jpg" нельзя, получится 404-артефакт.
        probes = [i['media_url'] for i in sample]
        with ThreadPoolExecutor(max_workers=8) as ex:
            codes = list(ex.map(head, probes))
        dead = [(i, c) for i, c in zip(sample, codes) if c != 200]
        for i, c in dead:
            warn.append('upstream HTTP %s — %s (класс MEDIA-1)' % (c or 'ERR', i['url_folder']))
        print('upstream-выборка: %d URL, живых %d, мёртвых %d (%.1f %%)'
              % (len(sample), len(sample) - len(dead), len(dead), 100 * len(dead) / max(len(sample), 1)))

    print('проверено позиций: %d (на нашем хосте %d)' % (len(items), len(ours)))
    print('расхождений name_eng ↔ папка URL: %d | name_eng выведен из URL: %d | без референса: %d'
          % (len(mismatch), len(noderive), len(nocover)))
    if mismatch:
        print('\nТОП расхождений (при переводе на свой хост папку заводить по name_eng):')
        for i in mismatch[:12]:
            print('  %-42s ↔ %s' % (i['folder'], i['url_folder']))
    if hard:
        print('\nЖЁСТКИЕ ПРОБЛЕМЫ (%d):' % len(hard))
        [print('  ', h) for h in hard]
    if warn:
        print('\nПРЕДУПРЕЖДЕНИЯ (%d):' % len(warn))
        [print('  ', w) for w in warn[:25]]
    if not hard and not warn:
        print('\nчисто')
    return 1 if hard else (2 if warn else 0)


if __name__ == '__main__':
    sys.exit(main())
