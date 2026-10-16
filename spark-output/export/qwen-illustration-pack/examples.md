# Два разобранных примера (копиры)

Ниже — готовые промпты, которые прошли приёмку. Первый показывает, как закрывается смена ноги в паре; второй — как удержать снаряд и масштаб в классе «мостики».

---

## Пример 1. Отведение ноги назад под углом в кроссовере

**Строка.** Целевая — большая ягодичная (задняя сторона). Техника: лицом к нижнему блоку, обе руки на стойке, корпус слегка наклонён от тазобедренных, таз горизонтален. Рабочая — левая нога, опорная — правая, всё время на полу.

**Разбор.** Плоскость — сагиттальная, мышца сзади → камера со стороны левой ноги. Класс односторонний → `HIP-BINDING RULE` идёт вторым блоком, сразу после стиля и `SINGLE FRAME`. Камера почти профильная (85°): в 40–50° обе ноги встают на одну линию и бедро не разобрать. Фазы: старт — левая согнута ~90°, бедро чуть вперёд, пятка затянута к ягодице, стопа В ВОЗДУХЕ; финиш — левая отведена назад, колено почти прямое, уровень таза или чуть ниже, стопа в воздухе. Рабочая стопа не касается пола ни в одной фазе — иначе пара различается только «какая нога сзади», и стороны путаются.

### Кадр «старт»

```
STYLE — READ FIRST AND OBEY: a stylized CGI 3D render in the visual language of a
modern fitness app illustration, semi-realistic but unmistakably RENDERED: smooth
matte shading over skin and muscle, slightly idealized anatomy, clean painted
surfaces. THIS IS NOT A PHOTOGRAPH — no camera grain, no photographic skin pores,
no real gym, no lens depth of field; not a cartoon, not a line icon.

SINGLE FRAME: one continuous scene filling the whole canvas — no collage, no split
panels, no inset, no duplicated figure.

COMPOSITION RULE — READ BEFORE ANYTHING ELSE: a side view of a woman seen from her
LEFT side. Her LEFT leg is the NEAR leg and the WORKING leg: it carries the black
ankle cuff, it comes out of the glowing left buttock, it is drawn IN FRONT of her
body, and it is OFF the floor. Her RIGHT leg is the FAR leg: the only foot standing
on the floor, its thigh hidden behind her left thigh, never lifted. Where the two
legs cross, the working leg covers the support leg.

SUBJECT: one adult athletic woman — dark-blonde hair in a ponytail, black sports
bra, black shorts, black sneakers with white soles, neutral focused expression.
Full body in frame: both legs, both feet, both hands, the machine, the low pulley,
the cable and the cuff all fully visible.

CAMERA (identical to the companion frame): side view from her LEFT side, about 85
degrees off the plane of her back, lens at hip height, about 2.4 metres away, 50 mm.
The machine column is at the LEFT of the image, her legs extend toward the RIGHT.

BODY: she faces the upright cable machine column, both hands gripping it at
chest-to-shoulder height, torso hinged slightly forward from the hip joints, spine
neutral, abdomen braced, pelvis level, no rotation. The low pulley sits almost on
the floor at the base of the column. No upper cables, no extra attachment points,
no handles.

FAR RIGHT SUPPORT LEG — BEHIND: standing straight under her, whole sole flat on the
floor, knee slightly bent, identical in both frames of the pair, never leaving the
floor.

NEAR LEFT WORKING LEG — STARTING POSITION, glute stretched: the thigh emerges from
directly under the glowing left buttock and passes in front of her pelvis; the hip
is flexed, the thigh brought slightly forward toward the machine, the KNEE is the
point closest to the camera, bent about 80–100 degrees, pointing forward and a
little down; from that knee the shin folds back and up, the heel drawn toward the
buttock, the sole turned toward the camera. THE LEFT FOOT IS IN THE AIR AND DOES NOT
TOUCH THE FLOOR. This leg is the largest, most detailed limb in the picture.

CABLE: a short metal carabiner joins the black cuff on her LEFT ankle to the cable
of the low pulley; the cable leaves the low roller almost at floor level and is
clearly visible along its whole length up to that cuff, taut, attached to the LEFT
leg only. CABLE TENSION LOCK: the cable is UNDER LOAD, therefore a PERFECTLY
STRAIGHT taut segment from the pulley axle to the cuff — no sag, no curve, no
catenary, no slack loop.

MUSCLE HIGHLIGHT: a translucent warm-red X-ray glow on the LEFT GLUTEUS MAXIMUS
only — the near buttock above the lifted thigh — following the anatomical contour of
the muscle, local and muted. The right glute, the lower back, the hamstrings, the
quadriceps and the calves keep their natural colour and stay unlit.

FORBIDDEN: the straight standing leg being the near one; the bent lifted leg being
the far one; the cuff on the right ankle; the cable running to the right leg or
detached from the low pulley; a glowing right glute; the working foot touching the
ground; a rotated pelvis, an over-arched lower back, a swinging torso; extra cables,
rollers, cuffs or limbs; a mirrored figure; a second person; text, logos, watermarks.

SCALE LOCK: the camera does not move between the two frames of this pair — same
position, same height, same lens; one metre of the athlete's body and of the machine
occupies exactly the same number of pixels in both frames. Do not zoom in, keep the
same floor line and headroom.

ENVIRONMENT: seamless desaturated cool blue-grey studio background with soft
gradient and gentle vignette, soft floor shadow under the athlete and the machine,
matte dark-grey metal with black pads and black weight plates, no logos, no text, no
numbers, no watermark, generous air margin above the head and below the feet, 3:2
landscape composition.
```

### Кадр «финиш» — что меняется

Тот же промпт, три блока другими словами; остальное дословно, включая `COMPOSITION RULE`:

```
NEAR LEFT WORKING LEG — FINISHED POSITION, glute contracted: the thigh emerges from
directly under the glowing left buttock and continues in one unbroken line behind
her; the left thigh is driven BACKWARD by hip extension, the leg raised behind the
body, the knee almost straight but not locked, one natural line from pelvis to ankle
at about the level of the pelvis or slightly lower, NOT above the line of the torso;
THE LEFT FOOT IS IN THE AIR AND DOES NOT TOUCH THE FLOOR, the sole turned toward the
camera.

CABLE: ... the cable now runs diagonally from the low roller almost at floor level
up to that cuff, clearly visible along its whole length, taut, attached to the
lifted near leg only.
```

---

## Пример 2. Ягодичный мостик с гантелью

**Строка.** Целевая — большая ягодичная. Техника: сесть на пол плечом к скамье, верх спины у края опоры, стопы на полу, гантель стоит вертикально на сгибе бёдер и удерживается руками; разогнуть бёдра до линии корпуса.

**Разбор.** Мышца сзади, но класс «мостики» снимается три-четверти **лицом** — решение владельца, оно переопределяет правило подсветки для этого класса: серия мостиков выглядит единообразно, а пятно кладётся на наружный край бедра и приглушается. Главный риск — гантель превращается в штангу на бёдрах, поэтому `PROPS LOCK` и геометрия скамьи кладутся явно.

### Каркас этого класса (слоты вместо полного промпта)

Стиль, `SINGLE FRAME`, персонаж, `ORIENTATION LOCK`, `SCALE LOCK` и `ENVIRONMENT` — те же, что в примере 1. Ниже только блоки, которые в этом классе меняются; два блока `POSE` — это варианты для старта и для финиша, в один промпт кладётся один из них.

```
CAMERA (identical for both frames): three-quarter FRONT view, about 30 degrees off
the frontal plane and from her left, lens low at floor height, about 2.6 metres
away, 50 mm. Her face, chest and abdomen face the lens; the bench is behind her at
the LEFT of the frame.

APPARATUS: one black hex dumbbell standing VERTICAL (upright, narrow end down) on
the crease of her hips, both hands resting on it to hold it in place. A low flat
black bench sits BEHIND her shoulders, its long axis perpendicular to her torso and
parallel to the dumbbell. PROPS LOCK: a single dumbbell standing upright on the hips
— no barbell, no plate stack, no weight belt. BENCH GEOMETRY LOCK: the bench is
perpendicular to her torso, her upper back rests on its edge.

POSE — STARTING POSITION: hips down close to the floor, not touching it, knees bent
about 90 degrees, feet flat, shins vertical, shoulders on the bench edge.

POSE — FINISHED POSITION: hips driven fully up so the torso and thighs form one
straight diagonal line, glutes squeezed hard at the top, spine neutral, ribcage
closed.

HEAD AND CHIN LOCK: chin tucked toward the chest, gaze down toward her own hips,
head NOT hanging back over the bench, neck long.

MUSCLE HIGHLIGHT: a translucent warm-red X-ray glow on the GLUTEUS MAXIMUS only,
both cheeks, muted, sitting on the OUTER rim of the hips at the hip crease — not
surface paint, not covering the hamstrings, not covering the quadriceps.
Quadriceps, hamstrings, calves and abs stay unlit.
```

Если в финише скамья или гантель перерисовались крупнее — менять не «позу», а `SCALE LOCK` на `FRAMING LOCK` с явными процентами высоты кадра и ширины снаряда.
