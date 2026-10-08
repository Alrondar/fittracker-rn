# -*- coding: utf-8 -*-
"""CAT-1b · сборка контактного листа пилота иллюстраций.

Читает <dataset>/<Id>/{0,1}.jpg, рендерит self-contained HTML с предпросмотром
в реальном боксе карточки (330x183, cover — см. src/utils/mediaFit.ts) и в
миниатюре 64px. Список EXERCISES пополняется вместе с партией картинок.

Запуск:  python spark-output/export/build-illustration-sheet.py
Вывод:   spark-output/export/exercise-illustrations-pilot.html
"""
import base64
import io
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DS = os.path.join(ROOT, 'data', 'free-exercise-db-main', 'free-exercise-db-main', 'exercises')
OUT = os.path.join(os.path.dirname(__file__), 'exercise-illustrations-pilot.html')

# (id папки датасета, русское название, есть ли пара кадров)
EXERCISES = [
    ('Smith_Machine_Hip_Thrust', u'Ягодичный мостик со штангой в Смите'),
    ('Dumbbell_Hip_Thrust', u'Ягодичный мостик с гантелью'),
    ('Single-Leg_Hip_Thrust', u'Ягодичный мостик одной ногой со скамьёй'),
    ('Machine_Hip_Thrust', u'Ягодичный мостик в тренажёре'),
    ('Low_Cable_Hip_Abduction', u'Отведение ноги в сторону в нижнем блоке'),
    ('High_Cable_Hip_Abduction', u'Отведение ноги в сторону в верхнем блоке'),
    ('Cable_Hip_Extension_at_45_Degrees', u'Отведение ноги назад под углом в кроссовере'),
    ('Clamshell', u'Ягодичная ракушка с резинкой'),
    ('Dumbbell_Romanian_Deadlift', u'Румынская тяга с гантелями'),
    ('B-Stance_Dumbbell_Romanian_Deadlift', u'Румынская тяга коленом на скамье (B-stance)'),
    ('Rotational_Romanian_Deadlift', u'Румынская тяга с гантелью и доворотом корпуса'),
    ('Wide-Grip_Barbell_Upright_Row', u'Тяга штанги к подбородку широким хватом'),
    ('One-Arm_Cable_Lateral_Raise', u'Махи одной рукой в кроссовере на среднюю дельту'),
    ('Alternating_Lateral_Raise_with_Pause', u'Махи гантелями в стороны стоя с чередованием и паузой'),
    ('Incline_Y-Raise', u'Y-подъём с гантелями лёжа на наклонной скамье'),
    ('Bent-Over_T-Raise', u'T-подъём с гантелями в наклоне'),
]
REFERENCE = ('Barbell_Hip_Thrust', u'Barbell_Hip_Thrust/0.jpg — кадр из yuhonas/free-exercise-db')

CSS = """
body{background:#14161a;color:#e8eaf0;font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;margin:0;padding:28px}
h1{font-size:19px;margin:0 0 4px} .sub{color:#9aa3b2;margin-bottom:26px;max-width:920px}
.card{background:#1b1e24;border:1px solid #2a2f38;border-radius:14px;padding:18px;margin-bottom:20px;max-width:1400px}
.t{font-weight:600;margin-bottom:14px}
.row{display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start}
figure{margin:0} figcaption{color:#9aa3b2;font-size:12px;margin-top:6px;max-width:330px}
img{display:block;border-radius:8px;background:#0e1013}
.big{width:330px;height:220px;object-fit:contain}
.cov{width:330px;height:183px;object-fit:cover}
.th{width:64px;height:64px;object-fit:cover;border-radius:6px}
.note{color:#c9a227;font-size:13px;margin-top:12px;max-width:980px}
code{background:#0e1013;padding:1px 5px;border-radius:4px}
"""


def b64(path):
    return 'data:image/jpeg;base64,' + base64.b64encode(io.open(path, 'rb').read()).decode()


def card(ex_id, title):
    frames = []
    for n in (0, 1):
        p = os.path.join(DS, ex_id, '%d.jpg' % n)
        if os.path.exists(p):
            frames.append(b64(p))
    if not frames:
        return ''
    start = frames[0]
    finish = frames[1] if len(frames) > 1 else start
    return (
        '<div class="card"><div class="t">%s · <code>%s</code></div><div class="row">'
        '<figure><img class="big" src="%s"><figcaption>старт · 850×567</figcaption></figure>'
        '<figure><img class="big" src="%s"><figcaption>финиш · 850×567</figcaption></figure>'
        '<figure><img class="cov" src="%s"><figcaption>бокс карточки 330×183, cover — проверяем, не срезаны ли стопы и голова</figcaption></figure>'
        '<figure><img class="th" src="%s"><figcaption>миниатюра 64px</figcaption></figure>'
        '</div></div>'
    ) % (title, ex_id, start, finish, start, start)


def main():
    cards = u''.join(card(i, t) for i, t in EXERCISES)
    ref = b64(os.path.join(DS, REFERENCE[0], '0.jpg'))
    html = (
        u'<!doctype html><meta charset="utf-8"><title>CAT-1b · пилот иллюстраций</title>'
        u'<style>%s</style>'
        u'<h1>Пилот схем-иллюстраций</h1>'
        u'<div class="sub">Файлы: <code>data/free-exercise-db-main/…/exercises/&lt;Id&gt;/0.jpg</code> · '
        u'850×567 (3:2) — как у 93%% кадров каталога, чтобы <code>pickMediaFit</code> оставлял cover без letterbox. '
        u'Контактный лист пересобирается скриптом <code>build-illustration-sheet.py</code>.</div>'
        u'%s'
        u'<div class="card"><div class="t">Для сравнения: текущий каталог — фото, не схема</div><div class="row">'
        u'<figure><img class="big" src="%s"><figcaption>%s</figcaption></figure></div>'
        u'<div class="note">В библиотеке получится смешение 821 фото и схем. Если не устраивает: фотореалистичный '
        u'стиль генерации либо у авторских позиций картинок нет вовсе (media_url NULL карточка переживает).</div></div>'
        u'<div class="card"><div class="t">Хостинг — блокер</div><div class="note">Все 821 <code>media_url</code> ведут на '
        u'<code>raw.githubusercontent.com/yuhonas/free-exercise-db</code> — чужой публичный репозиторий. Локальная папка '
        u'<code>data/…/exercises</code> — checkout этого репозитория и вдобавок в <code>.gitignore</code> (<code>data/*</code>): '
        u'приложение из неё ничего не читает. Нужен свой публичный источник — репозиторий с картинками под тем же паттерном URL '
        u'или public Supabase Storage bucket (сейчас бакетов ноль).</div></div>'
    ) % (CSS, cards, ref, REFERENCE[1])
    io.open(OUT, 'w', encoding='utf-8').write(html)
    print(OUT, os.path.getsize(OUT) // 1024, 'KB')


if __name__ == '__main__':
    main()
