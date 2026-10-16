# Спека · «Журавлик» (`Crane Single-Leg Glute Hinge`) — 4 кадра

Собрана по `illustration-style-lock.md §1.2` из блоков §1, §2 и §2.1. Строка каталога заведена 11.10 (`ca48c18f-8614-4a7a-8602-4fb47d625b4d`, `status = needs_review`), `media_url` пустой.

**Ревизия после первого прогона (референс владельца 11.10).** Первая версия промптов дала выпад вместо наклона. Причины — четыре, все мои: свободная нога в старте описана касающейся пола носком (отсюда разъехавшаяся стойка и «присед» вместо шара), таз не был пристёгнут над опорной стопой, гантель была запрещена во второй руке через `PROPS LOCK`, а в финише отведённое бедро не было поднято до горизонта. Ниже — исправленные промпты; правки зеркалированы в скилл (§2.1, `SUPPORT-SIDE BINDING`).

## Разбор по шагам §1.2

| Шаг | Значение |
|---|---|
| 1. Строка | `primary` — большая ягодичная; `secondary` — бицепс бедра, средняя ягодичная, разгибатели спины, прямая мышца живота; снаряжение — гантели; `settings`: гантели в руках, стопа опорной ноги полностью на полу, вес на пятке, амплитуда до параллели корпуса, 2–3 × 6–8 на ногу |
| 2. Плоскость | сагиттальная: корпус и свободная нога идут вперёд-назад вокруг фронтальной оси таза |
| 3. Сторона мышцы | зад (большая ягодичная опорной ноги) |
| 4. Камера | вид с её левой стороны, чуть со спины (~60° от плоскости спины): профиль читается как на референсе, но стоящая ягодица с подсветкой остаётся видимой |
| 5. Фазы | **0** — стойка на одной ноге, корпус вертикален, свободная нога согнута и поднята («стол»: колено ~90°, стопа в воздухе у колена опорной). **1** — наклон: таз ушёл назад, корпус ~80–85° от вертикали, свободная нога выпрямлена и поднята назад до горизонта. Обе фазы — таз над опорной стопой, ноги не расставлены |
| 6. Блокировки | `CAMERA`, `SCALE LOCK`, `SINGLE FRAME`, `ORIENTATION LOCK`; `STANCE LOCK` (против выпада); `SUPPORT-SIDE MUSCLE LOCK`; `HEAD AND CHIN LOCK`; `DEPTH ORDER` для гантелей |
| 7. Приёмка | восемь признаков §1.2 + четыре специальных в конце файла |
| 8. Биомеханика | целевая мышца на **стоящей** ноге, поднятая нога — балансир. Для этого класса дискриминатор тот же, что для тросовых отведений: нога без веса не касается пола ни в одной фазе |

## Класс «опорная = рабочая»

У отведения в блоке поднятая нога и есть рабочая; здесь инверсия — **светится ягодица стоящей ноги**, а поднятая не подсвечена вообще. Дискриминатор: «светящаяся ягодица и нога НА ПОЛУ — с одного бедра». Привязка ставится ПЕРВЫМ блоком, до персонажа, камеры и позы.

Свободная нога при этом ведёт себя как в тросовых отведениях: **её стопа не касается пола ни в одной фазе**. Именно касание носком в старте превращает кадр в выпад — модель честно ставит ногу на опору и разводит стойку.

## Порядок блоков

`STYLE LOCK` → `COMPOSITION RULE` (первым) → `SINGLE FRAME` → `SUBJECT` → `CAMERA` → `APPARATUS` + `DEPTH ORDER` → `STANCE LOCK` → `POSE` (по суставам) → `HEAD AND CHIN LOCK` → `MUSCLE SIDE LOCK` → `ORIENTATION LOCK` → `SCALE LOCK` → `FORBIDDEN` → `ENVIRONMENT`.

---

## 1 · женщина, слайд 0 (старт, «стол»)

```
STYLE — READ FIRST AND OBEY: a stylized CGI 3D render in the visual language of a
modern fitness app illustration, semi-realistic but unmistakably RENDERED: smooth
matte shading over skin and muscle, slightly idealized anatomy, clean painted
surfaces. THIS IS NOT A PHOTOGRAPH — no camera grain, no photographic skin pores,
no real gym, no lens depth of field; not a cartoon, not a line icon.

COMPOSITION RULE — THE ONLY THING THAT DECIDES IF THIS IMAGE IS CORRECT: the athlete
stands on her own anatomical LEFT leg, and the STANDING leg is the working side — it
carries her entire body weight. The red glow is on the LEFT GLUTEUS MAXIMUS, the
buttock of the leg planted on the floor. Her RIGHT leg is the FREE leg: it carries no
weight, no muscle of it glows, and ITS FOOT IS IN THE AIR AND TOUCHES NOTHING — in this
frame and in the companion frame. Only ONE foot is on the floor in the whole exercise:
the left one. The camera is on her LEFT side, so the standing left leg is the NEAR leg,
drawn largest and in front, and the free right leg is seen beyond it.

SINGLE FRAME: one continuous scene filling the whole canvas — no collage, no split
panels, no inset, no duplicated figure.

SUBJECT: one adult athletic woman — dark-blonde hair in a ponytail falling toward her
left shoulder, black sports bra, black mid-thigh shorts, black sneakers with white
soles, neutral focused expression. Full body in frame: both legs, both feet, both hands
and both dumbbells fully visible, nothing cut off by the edge.

CAMERA (absolute, identical for both frames of this pair): side view from her LEFT side,
seen slightly from behind, about 60 degrees off the plane of her back, lens at hip
height, about 2.4 metres away, 50 mm. Her left profile faces the lens and her standing
left buttock is visible. The athlete occupies about 62 percent of frame height.

APPARATUS: two black hex dumbbells, one in each hand, arms long and hanging straight
down under the shoulders. DEPTH ORDER from the camera: (1) the near hand and its
dumbbell, (2) her body, (3) the far arm and its dumbbell partly hidden behind her thigh
— dumbbells are never drawn behind her back, never merged into one, never replaced by a
barbell, a kettlebell, a plate stack, a machine or a cable.

STANCE LOCK — THIS IS NOT A LUNGE AND NOT A SPLIT SQUAT: her pelvis is stacked directly
over the standing foot; the left foot sits under the hip, it is NOT stepped forward; the
free right leg tracks in the same sagittal plane behind the standing leg, one knee
behind the other; the feet are NOT spread front-to-back and NOT spread apart sideways.
The standing leg carries everything, the body looks like a single vertical column.

POSE — STARTING POSITION, standing tall on one leg with the free knee lifted. Joint by
joint:
1. SUPPORT LEFT FOOT: entirely flat on the floor directly under her hip, whole sole in
   contact, toes pointing forward in line with the body, weight spread across the foot
   with the pressure biased to the heel.
2. SUPPORT LEFT KNEE: soft, bent about 10–15 degrees, NOT locked, kneecap pointing
   straight forward over the second toe, not caving inward. Shin vertical.
3. SUPPORT LEFT HIP: stacked over the foot, neutral, thigh vertical.
4. FREE RIGHT LEG — IN THE AIR: the hip is flexed so the right THIGH points DOWN and
   slightly forward, about parallel to the left thigh, the KNEE is bent about 90 degrees
   and lifted to roughly the height of her own hip, the SHIN folds back and up so the
   heel comes toward the buttock, the instep faces the camera and the pointed toe aims
   down-back. The right foot is clearly off the floor, at about the height of the
   standing knee. The knee of the free leg turns forward-down, NOT out to the side.
5. PELVIS: level and square — both hip joints at the same height, facing forward, no
   side tilt, no rotation, no drop on the free side.
6. SPINE: neutral, one straight line from tailbone to crown; ribcage closed down; lower
   back neither rounded nor over-arched; abdomen braced. Torso upright — no more than
   5 degrees forward of vertical.
7. SHOULDERS AND ARMS: shoulders down and back, blades flat. BOTH arms hang long and
   straight down at the sides, elbows soft, each hand gripping one dumbbell at about
   mid-thigh height directly under its shoulder. Neither arm is raised out for balance,
   neither hand touches the legs, the hips or anything else.
8. HEAD AND NECK: continuation of the spine, chin drawn slightly in, neck long.

HEAD AND CHIN LOCK (quoted from the position settings — «взгляд в пол, шея в
продолжении позвоночника»): she looks DOWN at the floor about 1.5 metres in front of her
feet; the head is neither lifted toward the horizon nor dropped onto the chest.
Identical in both frames of the pair.

MUSCLE SIDE LOCK (SUPPORT-SIDE variant): the translucent warm-red X-ray glow is on the
GLUTEUS MAXIMUS OF THE STANDING LEFT LEG — the loaded side, the buttock above the foot
that is on the floor — a soft, muted patch seen through the skin, following the contour
of the muscle from the sacrum to the outer hip. The RIGHT glute, the lifted free leg,
both hamstrings, quadriceps, calves and the lower back keep their natural colour and
stay completely unlit. Never light the free hip.

ORIENTATION LOCK: she faces the LEFT edge of the frame, the standing foot under her in
the centre, the lifted free leg toward the RIGHT edge. Identical in both frames — never
mirrored.

SCALE LOCK: the camera does not move between the two frames of this pair — same
position, same height, same lens. One metre of the athlete's body and of the dumbbells
must occupy exactly the same number of pixels in both frames. Do not zoom in, do not
step closer, keep the same floor line and the same headroom.

FORBIDDEN: a lunge, a split stance or a step forward with the standing foot; the free
right foot touching the floor, resting on the toe, or hanging limp; weight shared
between the legs; the free knee pointing out to the side; a glow on the right glute or
anywhere on the free leg; the torso already hinged forward; the support knee locked
straight or deeply bent; a dropped, rotated or open pelvis; a rounded or hyperextended
spine; arms raised out for balance; one dumbbell instead of two; a barbell, kettlebell,
machine or cable; a second person; text, logos, watermarks; head, hands or feet cut off
by the frame edge.

ENVIRONMENT: seamless desaturated cool blue-grey studio background with soft gradient
and gentle vignette, soft floor shadow under the athlete and the dumbbells, matte
dark-grey metal equipment, no logos, no text, no numbers, generous air margin above the
head and below the feet, 3:2 landscape composition.
```

## 2 · женщина, слайд 1 (финиш, наклон) — полный промпт

```
STYLE — READ FIRST AND OBEY: a stylized CGI 3D render in the visual language of a
modern fitness app illustration, semi-realistic but unmistakably RENDERED: smooth
matte shading over skin and muscle, slightly idealized anatomy, clean painted
surfaces. THIS IS NOT A PHOTOGRAPH — no camera grain, no photographic skin pores,
no real gym, no lens depth of field; not a cartoon, not a line icon.

COMPOSITION RULE — THE ONLY THING THAT DECIDES IF THIS IMAGE IS CORRECT: the athlete
stands on her own anatomical LEFT leg, and the STANDING leg is the working side — it
carries her entire body weight and its gluteus is the muscle being stretched. The red
glow is on the LEFT GLUTEUS MAXIMUS, the buttock of the leg planted on the floor. Her
RIGHT leg is the FREE leg: it carries no weight, no muscle of it glows, and ITS FOOT IS
IN THE AIR AND TOUCHES NOTHING — in this frame and in the companion frame. Only ONE foot
is on the floor in the whole exercise: the left one. The camera is on her LEFT side, so
the standing left leg is the NEAR leg, drawn largest and in front, and the free right
leg is seen beyond it.

SINGLE FRAME: one continuous scene filling the whole canvas — no collage, no split
panels, no inset, no duplicated figure.

SUBJECT: the same adult athletic woman — dark-blonde hair in a ponytail falling toward
her left shoulder, black sports bra, black mid-thigh shorts, black sneakers with white
soles, neutral focused expression. Full body in frame: both legs, both feet, both hands
and both dumbbells fully visible, nothing cut off by the edge.

CAMERA (absolute, identical for both frames of this pair): side view from her LEFT side,
seen slightly from behind, about 60 degrees off the plane of her back, lens at hip
height, about 2.4 metres away, 50 mm. Her left profile faces the lens and her standing
left buttock is visible. The athlete occupies about 62 percent of frame height.

APPARATUS: two black hex dumbbells, one in each hand, arms long and hanging straight
down under the shoulders. DEPTH ORDER from the camera: (1) the near hand and its
dumbbell, (2) her body, (3) the far arm and its dumbbell partly hidden behind her thigh
— dumbbells are never drawn behind her back, never merged into one, never replaced by a
barbell, a kettlebell, a plate stack, a machine or a cable.

STANCE LOCK — THIS IS NOT A LUNGE AND NOT A SPLIT SQUAT: her pelvis is stacked directly
over the standing foot; the left foot sits under the hip, it is NOT stepped forward; the
free right leg tracks in the same sagittal plane behind the standing leg, one knee
behind the other; the feet are NOT spread front-to-back and NOT spread apart sideways.

POSE — FINISHED POSITION, single-leg hinge, the classic "swallow" line. Joint by joint:
1. THE HINGE: the movement is hip extension — the LEFT hip has travelled BACKWARD and
   the pelvis sits back over the standing foot; the angle between torso and left thigh
   has opened to about 90–95 degrees. The spine did NOT round to reach this position.
2. TORSO: hinged forward to about 80–85 degrees from vertical — nearly parallel to the
   floor; back flat; the shoulder line, the hip and the lifted foot on one horizon;
   ribcage closed down; lower back neutral with its small natural curve, neither
   cat-rounded nor hollow-arched.
3. SUPPORT LEFT FOOT: unchanged from the starting frame — whole sole flat on the floor
   under the hip, toes forward, weight over mid-foot and heel. It has not turned,
   lifted, slid or stepped.
4. SUPPORT LEFT KNEE: still soft at the SAME 10–15 degrees as at the start; because the
   hips moved back, the shin now leans forward about 5–10 degrees and the knee sits
   slightly ahead of the ankle but NOT past the toes; kneecap straight forward, not
   caving inward.
5. SUPPORT LEFT HIP: extended, thigh roughly vertical under the pelvis; the buttock of
   this side is lengthened and loaded — the stretched position.
6. FREE RIGHT LEG — IN THE AIR, RAISED: driven BACK and UP by hip extension until the
   thigh is roughly HORIZONTAL and in one straight line with the torso; the knee nearly
   straight with only 5–10 degrees of bend, not locked; the foot pointed with the top of
   the shoe toward the camera and the toe aimed back-down, NOT pressed up toward the
   sky; kneecap facing the floor, the leg NOT turned outward. The right foot stays well
   above the floor.
7. PELVIS: square and level — both hip joints at the same height, pointing forward, NOT
   opened or rotated toward the raised leg, no hike of the right hip.
8. SHOULDERS: level, blades flat and down, chest turned toward the floor, not rolled to
   one side.
9. ARMS: BOTH arms hang straight DOWN under the shoulders, elbows soft, each hand
   holding one dumbbell; the dumbbells hang toward the floor about 20–30 cm above it,
   vertically below the shoulders, not swung forward, not touching the legs. No
   counterbalance arm reaching out.
10. HEAD: the continuation of the spine, the crown leading the line of the back.

UNCHANGED FROM THE STARTING FRAME: the camera and the floor line, the standing left foot
and its angle, the support knee angle, the height of the pelvis over the standing leg,
both hands holding one dumbbell each, clothing, hair, body proportions and the size of
the figure in frame. The only things that changed are the torso angle and the free leg —
which went from a lifted bent knee to a straight line raised behind her.

HEAD AND CHIN LOCK (quoted from the position settings — «взгляд в пол, шея в
продолжении позвоночника»): she looks DOWN at the floor just ahead of her standing foot;
the head is NOT lifted to look at the horizon and NOT hanging loose; the chin stays
drawn in. Identical in both frames of the pair.

MUSCLE SIDE LOCK (SUPPORT-SIDE variant): the translucent warm-red X-ray glow is on the
GLUTEUS MAXIMUS OF THE STANDING LEFT LEG — the loaded side, the buttock above the foot
that is on the floor, lengthened in the stretch — a soft, muted patch seen through the
skin, following the contour of the muscle from the sacrum to the outer hip. The RIGHT
glute, the lifted free leg, both hamstrings, quadriceps, calves and the lower back keep
their natural colour and stay completely unlit. Never light the free hip.

ORIENTATION LOCK: she faces the LEFT edge of the frame, the standing foot under her in
the centre, the lifted free leg toward the RIGHT edge. Identical in both frames — never
mirrored.

SCALE LOCK: the camera does not move between the two frames of this pair — same
position, same height, same lens. One metre of the athlete's body and of the dumbbells
must occupy exactly the same number of pixels in both frames. Do not zoom in, do not
step closer, keep the same floor line and the same headroom.

FORBIDDEN: the free right leg touching the floor or resting on its toe; the left leg
raised or unloaded; the torso upright or only slightly tilted (this frame is hinged to
near-parallel); a lunge or a split stance; a rounded or hollow back; a pelvis dropped,
rotated or opened toward the raised leg; the raised leg turned outward with the knee
pointing sideways; the raised foot above the line of the back; the support knee locked
straight or pushed past the toes; arms out for balance; one dumbbell instead of two; a
barbell, kettlebell, machine or cable; a glow on the free leg or the right glute; a
second person; text, logos, watermarks; the lifted foot or the head cut off by the
frame edge.

ENVIRONMENT: seamless desaturated cool blue-grey studio background with soft gradient
and gentle vignette, soft floor shadow under the athlete and the dumbbells, matte
dark-grey metal equipment, no logos, no text, no numbers, generous air margin above the
head and below the feet, 3:2 landscape composition.
```

## 3–4 · мужская пара

Меняется ровно один блок — `SUBJECT` (и местоимения в нём); всё остальное дословно то же,
что в женских кадрах 1 и 2: одна позиция снимается с одной камеры для обоих полов.

```
SUBJECT: one adult athletic man — short dark-blonde hair, black sleeveless training top
with a wide armhole, black mid-thigh shorts, black sneakers with white soles, neutral
focused expression. Clearly male build: broad shoulders, narrow hips, visible arm and
shoulder musculature — not a woman. Full body in frame: both legs, both feet, both hands
and both dumbbells fully visible, nothing cut off by the edge.
```

В `FORBIDDEN` мужских кадров первым пунктом стоит `a female athlete` — общий топ и шорты
иначе возвращают модель к женскому силуэту.

## Именование и приёмка

Файлы: `Crane_Single-Leg_Glute_Hinge_start` / `_finish` (жен), `..._start_m` /
`..._finish_m` (муж) — `build-illustrations.py` разложит их в `00f/01f/00m/01m` сам.
Имя с дефисом — **13.10**: папка и черновики переименованы под `name_eng`
(«Crane Single-Leg Glute Hinge»), чтобы `check-media-names.py` сходился; в
`20261011180000_add_crane_single_leg_glute_hinge.sql` осталась старая запись в комментарии —
это история применённой миграции, её не правим.

Сверх восьми признаков §1.2 проверяется четыре, по порядку важности:

1. **Не выпад.** Таз над опорной стопой, ноги в одной плоскости, между стопами по полу — ноль расстояния, потому что свободная стопа в воздухе в обеих фазах.
2. **Свободная нога не касается пола ни в 0, ни в 1.** В 0 — колено поднято, стопа у колена опорной; в 1 — прямая нога на уровне горизонта.
3. **Светящаяся ягодица и нога на полу — с одного бедра**, поднятая нога без подсветки вообще.
4. **Две гантели, обе руки висят вертикально**, кисти не разведены в стороны для баланса.
