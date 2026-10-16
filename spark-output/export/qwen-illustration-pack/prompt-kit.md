# Промпт-кит · скелет и библиотека блокировок

## Скелет промпта (порядок блоков не менять)

```
[1] STYLE LOCK            — стилевой блок из style-lock.md, всегда первым
[2] SINGLE FRAME          — один сюжет в одном холсте
[3] COMPOSITION RULE      — только для односторонних движений: какая нога/рука
                            ближняя, какая на опоре (см. HIP-BINDING RULE ниже)
[4] SUBJECT               — персонаж и одежда (style-lock.md)
[5] CAMERA                — абсолютный ракурс: угол + высота + дистанция в метрах
                            + линза + доля кадра
[6] APPARATUS             — снаряд В КАДРЕ И В РАБОТЕ, одной строкой
[7] POSE                  — фаза: конкретные углы в суставах + что зафиксировано
[8]support / working      — опорная и рабочая конечность по отдельности
[9] *_LOCK из библиотеки  — только те, что относятся к классу движения
[10] MUSCLE HIGHLIGHT     — целевая мышца + явно перечислить, что остаётся тёмным
[11] FORBIDDEN            — список брака этого класса
[12] SCALE LOCK           — в оба кадра пары одинаково
[13] ENVIRONMENT          — блок фона из style-lock.md
```

## Как выбрать ракурс (два шага, не на глаз)

**Шаг 1. Плоскость движения** — по тому, куда смещается дистальный конец рабочей конечности:

| Смещение | Плоскость | Что читается в кадре |
|---|---|---|
| назад / вперёд (тяги, жимы, присед, румынка, отведение назад) | сагиттальная | амплитуда ноги или руки видна сбоку |
| в сторону (отведения и приведения бедра, разведения, махи) | фронтальная | угол раскрытия виден спереди или сзади |
| вокруг вертикальной оси (доворот, дровосек, работа одной рукой) | трансверсальная | разворот плеч относительно таза — три-четверти |
| без смещения (планка, удержание мостика, стретчинг) | изо-статика | форма тела — перпендикулярно плоскости тела |

**Шаг 2. Сторона целевой мышцы.** Передняя — грудь, бицепс, передняя дельта, квадрицепс, прямая живота. Задняя — спина, трицепс, бицепс бедра, большая и средняя ягодичные, икроножная. Боковая — средняя ягодичная, широчайшая в разведении, косые.

**Камера = пересечение.** Приоритет у мышцы: амплитуда жертвуется мышцей, а не наоборот. Румынка, отведения, задняя цепь — три-четверти со спины; бицепс, жимы, передняя дельта — три-четверти спереди; тяга верхнего блока и Y/T-подъёмы — со спины.

## Библиотека блокировок (готовые английские блоки, класть дословно)

### CAMERA — абсолютный ракурс

```
CAMERA (absolute, identical for both frames of this pair): three-quarter REAR view
from her LEFT side, about 40 degrees off the plane of her back, lens at hip height,
about 2.8 metres away, 50 mm. The athlete occupies about 62 percent of frame height.
```

Угол, высота, дистанция и доля кадра задаются ЧИСЛАМИ в оба промпта пары. Формулировка «как в парном кадре» не работает: соседний кадр модель не видит.

### SCALE LOCK — дистанция в паре

```
SCALE LOCK: the camera does not move between the two frames of this pair — same
position, same height, same lens. One metre of the athlete's body and every prop
(bench, machine column, dumbbell) must occupy exactly the same number of pixels in
both frames. Do not zoom in, do not step closer, keep the same floor line and the
same headroom.
```

### FRAMING LOCK — когда SCALE LOCK не спасает (крупный снаряд)

```
FRAMING LOCK (both frames identical): the athlete and the whole machine sit in the
middle 70 percent of the frame width, with clear empty floor around the base of the
machine and generous headroom; from the top of her head to the floor is exactly 55
percent of frame height in both frames. Do not move closer.
```

### SINGLE FRAME — против коллажа

```
SINGLE FRAME: one continuous scene filling the whole canvas — no collage, no split
panels, no inset, no duplicated figure.
```

### ORIENTATION LOCK — один разворот на пару и на партию

```
ORIENTATION LOCK: head and hands toward the LEFT edge of the frame, working leg
toward the RIGHT edge. Identical in both frames — never mirrored.
```

Внутри одной партии все позиции держат одно направление: голова и руки к левому краю, ноги к правому; снаряд, за который держатся руками, — слева; опора под задней ногой — справа.

### HIP-BINDING RULE — главное для односторонних движений

Ни подпись стороны («левая нога»), ни указание «ближняя к камере» не работают: у модели держится связка «ближняя нога несёт вес», и отведение назад она рисует дальней ногой, честно перенося манжету на поднятую. Ногу задают через бедро:

```
COMPOSITION RULE — READ BEFORE ANYTHING ELSE: this is a side view of a woman seen
from her LEFT side, so her LEFT leg is the leg NEAREST the camera. Her LEFT leg is
the WORKING leg: it carries the black ankle cuff, it comes out of the glowing left
buttock, it is drawn IN FRONT of her body, and it is OFF the floor. Her RIGHT leg is
the FAR leg: it is the only foot standing on the floor, its thigh is hidden behind
her left thigh, and it is never lifted. The red glow is on the LEFT buttock — the
buttock of the airborne leg. Where the two legs cross, the working leg covers the
support leg.
```

Проверка пары сводится к одному признаку: **светящаяся ягодица и поднятая нога — с одного бедра.** Для этого класса камера почти профильная (~75–85° от плоскости спины), иначе обе ноги встают на одну линию и бедро не разобрать.

### Рабочая стопа в воздухе в обеих фазах

Пока в старте рабочая нога стоит на полу, старт и финиш различаются только тем, «какая из двух ног сзади», и стороны путаются. Рабочая стопа не касается пола НИ в одной фазе: в старте нога согнута и поднята пяткой к ягодице, в финише отведена назад почти прямой.

### CABLE TENSION LOCK / CABLE ROUTE LOCK

```
CABLE TENSION LOCK: the cable is UNDER LOAD, therefore a PERFECTLY STRAIGHT taut
segment from the pulley axle to the cuff — no sag, no curve, no catenary, no slack
loop, no bend where it crosses the bench.
```

```
CABLE ROUTE LOCK: exactly ONE cable in the frame; it passes on the SAME side of the
support leg in both frames — never switching from front to behind; no second cable,
no extra handle.
```

### MUSCLE SIDE LOCK

```
MUSCLE SIDE LOCK: the glow is on the gluteus maximus of the WORKING leg — the one
that carries the cuff; the glute of the SUPPORTING leg stays completely unlit and
dark. Never light the support hip.
```

### FOOT LOCK / HAND LOCK / HEAD AND CHIN LOCK

```
FOOT LOCK: the working foot is rotated at the hip so the knee points down-and-out
and the TOE points OUTWARD with the sole angled toward the camera; the toe never
points straight down at the floor.
```

Фиксацию из текста позиции переносить дословно, цитатой. Фиксации модель съедает первой: «подбородок прижат», «вторая рука на поясе», «взгляд в пол» — каждое отдельным блоком.

### PROPS LOCK и GEOMETRY LOCK (снаряд)

```
PROPS LOCK: one dumbbell standing VERTICAL on the crease of her hips, narrow end
down, both hands resting on it — no barbell, no plate stack, no weight belt.
```

```
BENCH GEOMETRY LOCK: the bench is perpendicular to her torso and parallel to the
bar, her upper back rests on its edge.
```

Снаряд обязан быть узнаваем и нагружен: `bar attached to the carriage`, `plates on the bar`, `cable running from the low pulley to the ankle cuff`. Иначе модель рисует свободный гриф «на фоне стоек».

## Приёмка перед раскладкой

См. `acceptance.md` — восемь признаков пары и таблица «симптом → что менять».
