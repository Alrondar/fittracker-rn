# -*- coding: utf-8 -*-
"""Страница 2: все НЕ легаси изображения справочника (срез 12.10, актуализирована 21.10).

Источник имён и мышц — локальный манифест `illustrations-manifest.json` (снимок прода 08.10)
плюс `EXTRA` ниже для позиций, заведённых после манифеста; статусы и занятость — прод 14.10
строкой `PROD` (счётчик ссылок на наш хост сверен 21.10: те же 49 строк), файлы кадров — зеркало
репозитория медиа (`media_root()`, с 25.10 это `../fittracker-exercise-media/exercises`). Легаси-строки (772 ссылки на yuhonas/free-exercise-db) сюда не попадают
намеренно: они на странице 1, `image-debt.html`.
"""
import json
import os
from media_root import media_root

HOST = "https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/"
MEDIA = media_root(required=False)
MANIFEST = "spark-output/export/illustrations-manifest.json"
OUT = "spark-output/export/qc/our-illustrations.html"

# folder:status:slots — прод 14.10, все строки с media_url на нашем хосте (49)
PROD = ("Alternating_Lateral_Raise_with_Pause:needs_review:0, B-Stance_Dumbbell_Romanian_Deadlift:needs_review:0, "
        "Band_Good_Morning:approved:0, Band_Hip_Abduction:approved:6, Barbell_Bench_Press_-_Medium_Grip:approved:49, "
        "Barbell_Hip_Thrust:approved:38, Barbell_Squat:approved:50, Bent_Over_Barbell_Row:approved:61, "
        "Bent-Over_T-Raise:needs_review:0, Cable_Crossover:approved:18, Cable_Glute_Kickback_On_Bench:needs_review:0, "
        "Cable_Hip_Extension_at_45_Degrees:needs_review:0, Clamshell:needs_review:0, "
        "Close-Grip_Standing_Barbell_Curl:approved:40, Crane_Single-Leg_Glute_Hinge:approved:8, "
        "Cross_Over_-_With_Bands:approved:0, Dumbbell_Bench_Press:approved:18, Dumbbell_Bicep_Curl:approved:28, "
        "Dumbbell_Fly:approved:9, Dumbbell_Hip_Thrust:needs_review:0, Dumbbell_Lunges:approved:25, "
        "Dumbbell_Romanian_Deadlift:needs_review:0, Dumbbell_Squat:approved:8, Hammer_Curls:needs_review:26, "
        "Incline_Y-Raise:needs_review:0, Incline_Y-T-W-L_Raise:approved:0, Leg_Press:approved:52, "
        "Low_Cable_Hip_Abduction:needs_review:12, Machine_Hip_Thrust:needs_review:4, Machine_Row:approved:4, "
        "One-Arm_Cable_Lateral_Raise:needs_review:0, One-Arm_Dumbbell_Row:approved:31, Pullups:approved:11, "
        "Pushups:approved:6, Reverse_Grip_Bent-Over_Rows:approved:0, Romanian_Deadlift:needs_review:52, "
        "Rotational_Romanian_Deadlift:needs_review:0, Seated_Barbell_Overhead_Triceps_Extension:approved:16, "
        "Single-Leg_Hip_Thrust:needs_review:0, Smith_Machine_Bulgarian_Split_Squat:approved:0, "
        "Smith_Machine_Hip_Thrust:needs_review:0, Split_Squat_with_Dumbbells:approved:29, "
        "Standing_Biceps_Cable_Curl:needs_review:3, Standing_One-Arm_Cable_Curl:needs_review:0, "
        "Straight-Arm_Pulldown:approved:12, Triceps_Pushdown_-_Straight_Bar:approved:12, "
        "Wide_Stance_Stiff_Legs:approved:12, Wide-Grip_Barbell_Upright_Row:needs_review:1, "
        "Wide-Grip_Lat_Pulldown:approved:67")

prod = {}
for chunk in PROD.split(", "):
    folder, status, slots = chunk.rsplit(":", 2)
    prod[folder] = (status, int(slots))

man = {i["folder"]: i for i in json.load(open(MANIFEST, encoding="utf-8"))["items"]}

# имена и мышцы для позиций, заведённых после манифеста 08.10 (в манифесте их нет)
EXTRA = {
 "Seated_Barbell_Overhead_Triceps_Extension": ("Французский жим сидя", "aefdc8dc", "трицепс (длинная головка)", 16),
 "Triceps_Pushdown_-_Straight_Bar": ("Разгибание рук на верхнем блоке (прямая рукоять)", "bb1fbbb4", "трицепс", 12),
 "Band_Hip_Abduction": ("Отведение ноги в сторону с резинкой", "437b6328", "средняя ягодичная", 6),
 "Smith_Machine_Bulgarian_Split_Squat": ("Болгарские выпады в Смите", "1d20086e", "квадрицепс", 0),
 "Incline_Y-T-W-L_Raise": ("Подъёмы Y-T-W-L на наклонной скамье", "8839d193", "задняя дельта, трапеция, ротаторная манжета", 0),
 "Machine_Row": ("Тяга в тренажере (Row)", "7a3ccbdf", "широчайшие, средняя часть спины", 4),
 "Crane_Single-Leg_Glute_Hinge": ("Журавлик", "ca48c18f", "большая ягодичная, бицепс бедра", 8),
 "Rendl_Barbell_Row": ("Тяга Рынделя", "216243c9", "широчайшие", 0),
 "Bent-Over_One-Arm_Cable_Rear_Delt_Raise": ("Махи в кроссовере одной рукой с наклоном (задняя дельта)",
                                             "026fe9a4", "задняя дельта", 0),
 "Hack_Squat_Machine_Calf_Raise": ("Подъем на носки в гакк-тренажере", "a8a977d2", "икроножная", 0),
 "Cable_Lateral_Raise": ("Махи в кроссовере на среднюю дельту", "4e36cf74", "средняя дельта", 2),
 "Smith_Machine_Lunge": ("Выпады в Смите", "cb22b47b", "квадрицепс, большая ягодичная", 0),
 "Dead_Bug": ("Мёртвый жук", "47e3f7b4", "прямая мышца живота", 37),
 "Bodyweight_Sissy_Squat": ("Сисси-приседания", "10a3fed1", "прямая мышца бедра", 0),
}

# приняты владельцем 15.10 и лежат на хосте (коммит 1ee3f12), но media_url ещё апстримный
PENDING_15 = {"Rendl_Barbell_Row", "Bent-Over_One-Arm_Cable_Rear_Delt_Raise",
              "Hack_Squat_Machine_Calf_Raise"}

# партия 3: разложены в data/exercises 21.10, после пуша уедут на наш хост; ссылки ещё не переключены
PENDING_21 = {"Cable_Lateral_Raise", "Smith_Machine_Lunge", "Dead_Bug", "Bodyweight_Sissy_Squat"}
PENDING = PENDING_15 | PENDING_21

# легаси-файлы в папке, которые не удаляем, пока ссылка апстримная
KEEP_LEGACY = {
 "Dead_Bug": "легаси `0.jpg`/`1.jpg` в этой папке — ровно те файлы, на которые сейчас смотрит "
             "`media_url` строки (апстримный путь `Dead_Bug/0.jpg`), до переключения ссылки не вычищать",
}

# нюанс по осиротевшим апстримным копиям (замер продом 21.10: по одной ссылке на каждую)
NOTES = {
 "Rendl_Barbell_Row": "апстримная копия <code>Bent_Over_Barbell_Row</code> осиротеет, но на нашем "
                      "хосте папка с таким же именем остаётся — её держит «Тяга штанги в наклоне» "
                      "(<code>efa318ff</code>, ссылка на <code>00f.jpg</code>)",
 "Bent-Over_One-Arm_Cable_Rear_Delt_Raise": "апстримная папка <code>Bent_Over_One-Arm_Long_Bar_Row</code> "
                                            "осиротеет: хозяина в каталоге нет",
 "Hack_Squat_Machine_Calf_Raise": "апстримная папка <code>Narrow_Stance_Hack_Squats</code> осиротеет: "
                                  "хозяина в каталоге нет",
}

# ближайшее: позиции, у которых промпты уже написаны (полная очередь — на странице долгов)
NEXTUP = [
 ("Ягодичный мостик на полу", "5f214a11", "4 слота / 4 истории",
  "prompts/Butt_Lift_(Bridge)_start.txt, …_finish.txt и обе мужские …_m.txt",
  "мостик без штанги (на старом кадре штанга — это другая строка, переименование запрещено); "
  "папка повторяет name_eng со скобками, URL после пуша проверять отдельным запросом"),
 ("Пуловер в Смите", "f24044ec", "0 слотов / 0 истории",
  "prompts/Smith_Machine_Pullover_*.txt (написаны 21.10)",
  "лёжа поперёк горизонтальной скамьи, гриф в прямых руках, дуга за голову; на прежнем кадре жим "
  "вниз головой — другое движение"),
 ("Французский жим обратным хватом", "c557b192", "0 слотов / 0 истории",
  "prompts/Reverse-Grip_Barbell_Lying_Triceps_Extension_*.txt (написаны 21.10)",
  "лёжа на скамье, EZ-гриф обратным хватом, локти вверх; строка `needs_review` — править свободно"),
]

# позиции, чей media_url переведён на свою папку 13–14.10 (был чужой кадр из апстрима)
CLOSED_14 = {"Seated_Barbell_Overhead_Triceps_Extension", "Triceps_Pushdown_-_Straight_Bar",
             "Band_Hip_Abduction", "Smith_Machine_Bulgarian_Split_Squat",
             "Incline_Y-T-W-L_Raise", "Machine_Row"}

folders = sorted(d for d in os.listdir(MEDIA) if os.path.isdir(os.path.join(MEDIA, d))
                 and any(f.startswith(("00", "01")) for f in os.listdir(os.path.join(MEDIA, d))))

STYLE = """
body{background:#0f1115;color:#e6e8ee;font:14px/1.5 -apple-system,'Segoe UI',Roboto,sans-serif;margin:0;padding:24px}
h1{font-size:20px;margin:0 0 6px}h2{font-size:15px;margin:32px 0 12px;color:#9fb0c8}
.meta{color:#8b93a5;margin-bottom:16px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:18px}
.card{background:#171a21;border:1px solid #232733;border-radius:14px;padding:12px}
.shot{width:330px;height:183px;border-radius:10px;overflow:hidden;background:#0b0d11;position:relative}
.shot img{width:100%;height:100%;object-fit:cover;display:block}
.pair{display:flex;gap:8px}.pair .shot{width:161px;height:89px}
.cap{font-size:11px;color:#7f8899;margin:3px 0 8px}
.name{font-weight:600;margin:10px 0 2px}.eng{color:#8b93a5;font-size:12px}
.row{color:#9aa3b2;font-size:12px;margin-top:6px}
a{color:#7fb3ff;text-decoration:none}a:hover{text-decoration:underline}
.badge{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;margin-right:6px}
.ok{background:#16351f;color:#8fe0a6}.warn{background:#3a2f13;color:#ffd7a0}.new{background:#16293a;color:#8fc7ff}
.note{color:#8b93a5;font-size:12px;margin-top:8px;border-top:1px solid #232733;padding-top:8px}
ol.q{margin:10px 0 0;padding-left:20px;max-width:1180px}ol.q li{margin-bottom:9px}
.q b{color:#eef1f6}.qp{color:#8fc7ff}
.hint{color:#9aa3b2;font-size:12.5px;margin:8px 0 0;max-width:1180px}
"""

def card(folder):
    d = os.path.join(MEDIA, folder)
    files = sorted(f for f in os.listdir(d) if f.endswith(".jpg"))
    ours = [f for f in files if f.startswith(("00", "01"))]
    legacy = [f for f in files if f in ("0.jpg", "1.jpg")]
    m = man.get(folder, {})
    name = m.get("name") or EXTRA.get(folder, (folder,))[0]
    eng = m.get("name_eng") or folder.replace("_", " ")
    musc = m.get("primary") or EXTRA.get(folder, ("", "", ""))[2]
    if folder in prod:
        status, slots = prod[folder]
        badge = ("<span class='badge ok'>approved</span>" if status == "approved"
                 else "<span class='badge warn'>needs_review</span>")
        link = "<a href='%s%s/00f.jpg'>%s</a>" % (HOST, folder, folder)
    else:
        _, sid, musc, slots = EXTRA.get(folder, (folder, "—", "—", 0))
        badge = ("<span class='badge new'>кадры приняты · ссылка ещё апстримная</span>"
                 if folder in PENDING
                 else "<span class='badge new'>не прописан в media_url</span>")
        link = "%s (id %s…)" % (folder, sid)
    shots = ""
    for label, group in (("женский: старт / финиш", ["00f.jpg", "01f.jpg"]),
                         ("мужской: старт / финиш", ["00m.jpg", "01m.jpg"])):
        have = [f for f in group if f in ours]
        if not have:
            continue
        imgs = "".join("<div class='shot'><img loading='lazy' src='../../../%s/%s' alt=''></div>" % (d, f) for f in have)
        shots += "<div class='pair'>%s</div><div class='cap'>%s</div>" % (imgs, label)
    note = ""
    tips = []
    if legacy:
        tips.append(KEEP_LEGACY.get(folder)
                    or "в папке остались легаси `0.jpg`/`1.jpg` (%d) — на них никто не ссылается, "
                       "можно вычищать" % len(legacy))
    if folder in prod and prod[folder][0] == "needs_review":
        tips.append("статус `needs_review` при принятом кадре — кандидата на поднятие до approved")
    if folder not in prod:
        tips.append("кадры лежат, но в `media_url` ещё не заведены" if folder not in PENDING else
                    "строка всё ещё ссылается на апстримную папку — в приложении и на вебе "
                    "виден старый кадр; подробно — в группе «hosted» на "
                    "<a href='image-debt.html'>странице долгов</a>")
    if folder in CLOSED_14:
        tips.append("переехала на свою папку 14.10 (миграция `20261014090000`), до этого кадр "
                    "был чужим из апстрима — проверь в приложении после свежего прогона")
    if folder in PENDING_15:
        tips.append("миграция собрана и лежит в "
                    "`supabase/migrations/20261021120000_repoint_three_accepted_frames.sql` "
                    "(реверс построчный, счётчики 49 → 52 и 772 → 769) — не выложена до твоего слова")
        if folder in NOTES:
            tips.append(NOTES[folder])
    if folder in PENDING_21:
        tips.append("миграции на переключение ещё нет — она пишется после этой тройки+одной "
                    "(49 → 52 у партии 15.10, затем 52 → 56) и ложится отдельным файлом; "
                    "до неё в приложении виден старый апстримный кадр")
        if folder == "Dead_Bug":
            tips.append("самый заметный пункт очереди: 37 слотов и 51 строка истории — после "
                        "переключения ссылки кадр увидят все, кто его уже делает")
    if slots == 0:
        tips.append("0 слотов в программах — правка безопасна")
    if tips:
        note = "<div class='note'>%s</div>" % "<br>".join("· " + t for t in tips)
    return ("<div class='card'>%s<div class='name'>%s</div><div class='eng'>%s</div>"
            "<div class='row'>%s<span class='row'> · %s · слотов: %d</span></div>"
            "<div class='row'>папка: %s</div>%s</div>"
            % (shots, name, eng, badge, musc or "—", slots, link, note))

groups = [("Прописаны в media_url и живут на хосте", [f for f in folders if f in prod]),
          ("Кадры приняты и лежат на хосте, но ссылки у строк ещё апстримные", [f for f in folders if f not in prod])]

out = ["<!doctype html><html lang='ru'><meta charset='utf-8'><title>Наши иллюстрации справочника · 21.10</title>",
       "<style>%s</style>" % STYLE,
       "<h1>Не легаси: все наши иллюстрации справочника</h1>",
       "<div class='meta'>Каталог 826 строк. Ссылки <code>media_url</code> на нашем хосте — %d строк "
       "(было 42 на 12.10), ещё %d позиции приняты владельцем, кадры на хосте, но ссылки у строк "
       "пока апстримные. Легаси (772 ссылки на yuhonas/free-exercise-db) — на странице "
       "<a href='image-debt.html'>долгов</a>. Каждый кадр показан в боксе 330×183 с object-fit: cover, "
       "как его рисует приложение; ниже — мужская пара.</div>"
       % (len([f for f in folders if f in prod]), len([f for f in folders if f not in prod]))]
out.append("<h2>Берём следующими · %d</h2>" % len(NEXTUP))
out.append("<div class='hint'>Промпты по этим двум уже написаны — генерация ничем не заблокирована. "
           "Отдельный шаг по группе ниже: переключение ссылок у трёх принятых кадров (миграция "
           "собрана, ждёт твоего слова). Полный список очереди — на странице долгов, "
           "<a href='image-debt.html'>«Очередь генерации»</a>.</div>")
out.append("<ol class='q'>")
for _nm, _sid, _occ, _pf, _must in NEXTUP:
    out.append("<li><b>%s</b> · id %s… · %s<br><span class='qp'>промпты:</span> <code>%s</code><br>%s</li>"
               % (_nm, _sid, _occ, _pf, _must))
out.append("</ol>")
for title, lst in groups:
    if not lst:
        continue
    out.append("<h2>%s · %d</h2><div class='grid'>" % (title, len(lst)))
    for f in sorted(lst, key=lambda x: (man.get(x, {}).get("name") or "").lower()):
        out.append(card(f))
    out.append("</div>")
out.append("</html>")
open(OUT, "w", encoding="utf-8").write("\n".join(out))
print(OUT, os.path.getsize(OUT), "байт | строк:", sum(len(g[1]) for g in groups))
