# -*- coding: utf-8 -*-
"""Страница предпросмотра кадров справочника в реальной геометрии карточки.

Зачем: оценить кадр нужно в том же боксе, где его увидит пользователь
(330x183, object-fit: cover, автоплей 3 с), а не в оригинальном размере 850x567 —
вчерашний дефект «срезанные стопы» и «серый второй кадр» ловились только так.
Страница не требует логина в приложение и открывается напрямую из репозитория.

Показывает обе схемы имён: легаси CAT-1 (0.jpg/1.jpg) и новую (00f/01f/00m/01m),
с переключателем пола там, где мужская пара уже есть.

Запуск:  python spark-output/export/build-preview-page.py
Результат: spark-output/export/preview.html
"""
import json
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DATA = os.path.join(ROOT, 'data', 'exercises')
OUT = os.path.join(ROOT, 'spark-output', 'export', 'preview.html')
SNAPSHOT = os.path.join(ROOT, 'spark-output', 'export', 'illustrations-manifest.json')

# Позиции, по которым кадры генерировались в этой волне (папка -> русское имя)
NEW = {
    'Close-Grip_Standing_Barbell_Curl': 'Подъем штанги на бицепс стоя',
    'Dumbbell_Bicep_Curl': 'Подъем гантелей на бицепс стоя',
    'Hammer_Curls': 'Сгибание рук на бицепс (молот)',
    'Standing_Biceps_Cable_Curl': 'Сгибание рук на бицепс в кроссовере стоя',
    'Standing_One-Arm_Cable_Curl': 'Сгибание руки на бицепс в кроссовере (одной рукой)',
    'Romanian_Deadlift': 'Румынская становая тяга (румынка)',
    'Cable_Glute_Kickback_On_Bench': 'Отведение ноги назад в кроссовере на лавке',
    # партия 5 (10.10): две хинжи + семья жимов лёжа
    'Band_Good_Morning': 'Наклоны с фитнес-резинкой стоя (гуд морнинг)',
    'Wide_Stance_Stiff_Legs': 'Становая тяга на прямых ногах с широкой постановкой стоп',
    'Barbell_Bench_Press_-_Medium_Grip': 'Жим штанги лежа на горизонтальной скамье',
    'Dumbbell_Bench_Press': 'Жим гантелей лежа на горизонтальной скамье',
    'Dumbbell_Fly': 'Разводка гантелей лежа',
    # партия 6 (10.10): три позиции груди + штанговый мостик и присед
    'Cable_Crossover': 'Разводка в кроссовере (сведение рук)',
    'Cross_Over_-_With_Bands': 'Сведение рук с резинками (Кроссовер)',
    'Pushups': 'Отжимания от пола',
    'Barbell_Hip_Thrust': 'Ягодичный мостик со штангой',
    'Barbell_Squat': 'Приседания со штангой на плечах',
    # партия 7 (10.10): тяги на широчайшие
    'Wide-Grip_Lat_Pulldown': 'Тяга верхнего блока к груди широким хватом',
    'Bent_Over_Barbell_Row': 'Тяга штанги в наклоне',
    'One-Arm_Dumbbell_Row': 'Тяга гантели одной рукой в наклоне',
    'Pullups': 'Подтягивания',
    'Straight-Arm_Pulldown': 'Пуловер в блоке (Straight-Arm Pulldown)',
    'Reverse_Grip_Bent-Over_Rows': 'Тяга штанги в наклоне обратным хватом',
}
# 16 позиций CAT-1 — те же, что в миграции media_url
CAT1 = [
    'Smith Machine Hip Thrust', 'Dumbbell Hip Thrust', 'Single-Leg Hip Thrust', 'Machine Hip Thrust',
    'Low Cable Hip Abduction', 'Cable Hip Extension at 45 Degrees',
    'Clamshell', 'Dumbbell Romanian Deadlift', 'B-Stance Dumbbell Romanian Deadlift',
    'Rotational Romanian Deadlift', 'Wide-Grip Barbell Upright Row', 'One-Arm Cable Lateral Raise',
    'Alternating Lateral Raise with Pause', 'Incline Y-Raise', 'Bent-Over T-Raise',
]
RU = {}
if os.path.exists(SNAPSHOT):
    # Манифест пересобирается из прода и содержит русское имя у каждой позиции;
    # catalog-snapshot снимался без колонки name — на нём заголовки выходили null.
    for r in json.load(open(SNAPSHOT, encoding='utf-8'))['items']:
        if r.get('name_eng') and r.get('name'):
            RU[r['name_eng']] = r['name']


def frames(folder):
    d = os.path.join(DATA, folder)
    if not os.path.isdir(d):
        return None
    have = {f for f in os.listdir(d) if f.endswith('.jpg')}
    if {'00f.jpg', '01f.jpg'} <= have:
        return {'f': ['00f.jpg', '01f.jpg'], 'm': ['00m.jpg', '01m.jpg'] if {'00m.jpg', '01m.jpg'} <= have else None}
    if {'0.jpg', '1.jpg'} <= have:
        return {'f': ['0.jpg', '1.jpg'], 'm': None}
    return None


def scheme_tag(fr):
    """Тег берём по фактическим файлам, а не по списку: CAT-1 позиции,
    переснятые в новую схему, должны показываться как 00f/01f."""
    return 'новая схема (00f/01f/00m/01m)' if fr['f'][0] == '00f.jpg' else 'легаси (0.jpg/1.jpg)'


def main():
    items = []
    for folder, ru in NEW.items():
        fr = frames(folder)
        if fr:
            items.append({'folder': folder, 'name': ru, 'frames': fr, 'tag': scheme_tag(fr)})
    for ne in CAT1:
        folder = ne.replace(' ', '_')
        fr = frames(folder)
        if fr:
            items.append({'folder': folder, 'name': RU.get(ne, ne), 'frames': fr, 'tag': scheme_tag(fr)})

    # Свежеснятое — наверх: иначе просмотр пачки тонет в 22 карточках.
    fresh = set(NEW) | {'Rotational_Romanian_Deadlift', 'Dumbbell_Romanian_Deadlift',
                        'Low_Cable_Hip_Abduction', 'Smith_Machine_Hip_Thrust',
                        # партия 4 (10.10): дельты и ракушка — позиции CAT-1,
                        # добавлены сюда, чтобы не дублировать карточкой из CAT1
                        'Incline_Y-Raise', 'Alternating_Lateral_Raise_with_Pause',
                        'One-Arm_Cable_Lateral_Raise', 'Bent-Over_T-Raise', 'Clamshell'}
    items.sort(key=lambda it: 0 if it['folder'] in fresh else 1)

    data = json.dumps(items, ensure_ascii=False)
    html = """<!doctype html><html lang="ru"><head><meta charset="utf-8">
<title>Кадры справочника — предпросмотр в геометрии карточки</title>
<style>
 body{margin:0;background:#f4f5f7;font:14px/1.45 -apple-system,Segoe UI,Roboto,sans-serif;color:#1c1e21}
 header{position:sticky;top:0;background:#fff;border-bottom:1px solid #e3e5e8;padding:14px 20px;z-index:2}
 h1{font-size:17px;margin:0 0 4px} .sub{color:#666;font-size:12.5px}
 .switch{display:inline-flex;border:1px solid #d5d8dc;border-radius:999px;overflow:hidden;margin-left:12px}
 .switch button{border:0;background:#fff;padding:6px 14px;font-size:13px;cursor:pointer}
 .switch button.on{background:#1c1e21;color:#fff}
 main{display:flex;flex-wrap:wrap;gap:18px;padding:20px}
 .card{background:#fff;border:1px solid #e6e8eb;border-radius:12px;padding:12px;width:354px}
 .box{width:330px;height:183px;border-radius:10px;overflow:hidden;position:relative;background:#22262b}
 .box img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .35s}
 .box img.on{opacity:1}
 .dots{position:absolute;bottom:8px;left:0;right:0;display:flex;justify-content:center;gap:5px}
 .dot{height:5px;border-radius:3px;background:rgba(255,255,255,.45);transition:width .22s,background .22s;width:5px}
 .dot.on{width:16px;background:#fff}
 .g{position:absolute;top:8px;left:8px;background:rgba(20,22,25,.62);color:#fff;font-size:11px;
     padding:3px 8px;border-radius:999px}
 .n{font-size:13.5px;margin:9px 0 2px;font-weight:600} .f{font-size:11.5px;color:#8a8f98}
 .miss{color:#b00020}
</style></head><body>
<header><h1>Кадры справочника <span class="sub">бокс 330x183, object-fit: cover, автоплей 3 с — как в карточке</span></h1>
<div class="sub">Кадр смотрим целиком: не должно резать стопы и голову, второй кадр — тот же ракурс и дистанция.
<span class="switch" id="sw"></span></div></header>
<main id="m"></main>
<script>
const DATA=__DATA__;
let gender='f';
const sw=document.getElementById('sw');
function renderSwitch(){sw.innerHTML='';[['f','женский'],['m','мужской']].forEach(([v,t])=>{
  const b=document.createElement('button');b.textContent=t;b.className=gender===v?'on':'';
  if(v==='m'&&!DATA.some(i=>i.frames.m))b.disabled=true;
  b.onclick=()=>{gender=v;render()};sw.appendChild(b);});}
function render(){renderSwitch();const m=document.getElementById('m');m.innerHTML='';
 DATA.forEach(it=>{const use=(gender==='m'&&it.frames.m)?'m':'f';const list=it.frames[use];
  const c=document.createElement('div');c.className='card';
  c.innerHTML='<div class="box"><img class="on" alt=""><img alt=""><div class="dots"><i class="dot on"></i><i class="dot"></i></div>'+
    '<div class="g">'+(use==='m'?'♂':'♀')+(it.frames.m?'':' · только женский')+'</div></div>'+
    '<div class="n">'+it.name+'</div><div class="f'+(list?'':' miss')+'">'+it.folder+' · '+it.tag+'</div>';
  m.appendChild(c);
  if(!list){c.querySelector('.f').textContent=it.folder+' · нет кадров в этой схеме';return;}
  const imgs=[...c.querySelectorAll('img')];imgs.forEach((im,i)=>im.src='../../data/exercises/'+it.folder+'/'+list[i]);
  let k=0;setInterval(()=>{k=(k+1)%imgs.length;imgs.forEach((im,i)=>im.classList.toggle('on',i===k));
    [...c.querySelectorAll('.dot')].forEach((d,i)=>d.classList.toggle('on',i===k));},3000);});}
render();
</script></body></html>""".replace("__DATA__", data)
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(html)
    print('страница:', OUT)
    print('позиций:', len(items), '| с мужской парой:', sum(1 for i in items if i['frames']['m']))


if __name__ == '__main__':
    main()
