# -*- coding: utf-8 -*-
"""Где лежат кадры справочника и на какие хосты они могут ссылаться.

Бинарники вынесены из репозитория с кодом в соседний `fittracker-exercise-media`:
приложение читает адрес из `exercises.media_url` и скачивает кадр оттуда, поэтому
перевыпуск картинки больше не касается проекта приложения. Прежний путь
`data/exercises/` остаётся последней попыткой — он работает до тех пор, пока папку
не удалили из проекта (и он же остаётся единственным вариантом, если репозиторий
с медиа не склонирован рядом).

Порядок поиска: FT_MEDIA_ROOT → ../fittracker-exercise-media/exercises →
<репозиторий>/data/exercises.
"""
import os

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MEDIA_REPO_NAME = 'fittracker-exercise-media'

# Новый хост и прежний: строки справочника могут указывать на любой из них,
# пока не выложена миграция переезда.
OUR_HOST_MARKS = ('Alrondar/%s' % MEDIA_REPO_NAME, 'Alrondar/fittracker-rn')
UPSTREAM_MARK = 'yuhonas/free-exercise-db'


def candidates():
    env = os.environ.get('FT_MEDIA_ROOT')
    if env:
        yield os.path.abspath(env)
    yield os.path.abspath(os.path.join(REPO_ROOT, '..', MEDIA_REPO_NAME, 'exercises'))
    yield os.path.join(REPO_ROOT, 'data', 'exercises')


def media_root(required=True):
    """Первый существующий корень с кадрами; required=False вернёт предполагаемый."""
    for path in candidates():
        if os.path.isdir(path):
            return path
    if not required:
        return next(iter(candidates()))
    raise SystemExit(
        'папка с кадрами не найдена; склонируйте ../%s или укажите FT_MEDIA_ROOT '
        '(искали: %s)' % (MEDIA_REPO_NAME, ', '.join(candidates()))
    )


def is_our_host(url):
    return bool(url) and any(mark in url for mark in OUR_HOST_MARKS)


def frames_relpath(url):
    """`…/exercises/<Папка>/00f.jpg` → `(Папка, 00f.jpg)`; None, если адрес не наш."""
    if not url:
        return None
    marker = '/exercises/'
    index = url.find(marker)
    if index < 0:
        return None
    parts = url[index + len(marker):].split('?')[0].split('/')
    return tuple(parts) if len(parts) >= 2 else None


def frame_path(url, root=None):
    """Полный путь к файлу кадра по его адресу (или None, если адрес не читается)."""
    rel = frames_relpath(url)
    if not rel:
        return None
    return os.path.join(root or media_root(), *rel)
