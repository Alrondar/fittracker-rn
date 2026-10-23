# Промпты для Qwen · остаток партии «Легаси-1» (12.10)

Десять кадров = десять промптов. Один промпт = один кадр, каждый самодостаточный:
обычный Qwen не держит контекст между вызовами, поэтому камера, персонаж, локи и негативный
список повторяются в каждом промпте дословно, а не ссылкой «как в предыдущем».

| № | Позиция | id строки | Кадр | Файл после генерации |
|---|---|---|---|---|
| 1 | Разгибание рук на верхнем блоке (прямая рукоять) | `bb1fbbb4` | женщина, старт | `Triceps_Pushdown_-_Straight_Bar_start.png` |
| 2 | Разгибание рук на верхнем блоке (прямая рукоять) | `bb1fbbb4` | женщина, финиш | `Triceps_Pushdown_-_Straight_Bar_finish.png` |
| 3 | Разгибание рук на верхнем блоке (прямая рукоять) | `bb1fbbb4` | мужчина, старт | `Triceps_Pushdown_-_Straight_Bar_start_m.png` |
| 4 | Разгибание рук на верхнем блоке (прямая рукоять) | `bb1fbbb4` | мужчина, финиш | `Triceps_Pushdown_-_Straight_Bar_finish_m.png` |
| 5 | Отведение ноги в сторону с резинкой | `437b6328` | мужчина, старт | `Band_Hip_Abduction_start_m.png` |
| 6 | Отведение ноги в сторону с резинкой | `437b6328` | мужчина, финиш | `Band_Hip_Abduction_finish_m.png` |
| 7 | Болгарские выпады в Смите | `1d20086e` | мужчина, старт | `Smith_Machine_Bulgarian_Split_Squat_start_m.png` |
| 8 | Болгарские выпады в Смите | `1d20086e` | мужчина, финиш | `Smith_Machine_Bulgarian_Split_Squat_finish_m.png` |
| 9 | Подъёмы Y-T-W-L на наклонной скамье (положение W) | `8839d193` | мужчина, старт | `Incline_Y-T-W-L_Raise_start_m.png` |
| 10 | Подъёмы Y-T-W-L на наклонной скамье (положение W) | `8839d193` | мужчина, финиш | `Incline_Y-T-W-L_Raise_finish_m.png` |

Позиции 1–4 (разгибание на блоке) рисуются заново целиком: женская пара отклонена владельцем,
старые файлы убраны в `vibe_images/rejected-2026-10-12/`, папки `data/exercises/Triceps_Pushdown_-_Straight_Bar/`
больше нет. Позиции 5–10 — мужские пары к уже принятым женским: камера, дистанция, разворот и
доля кадра взяты с принятых женских кадров и замерены по десятичной сетке (`spark-output/export/qc/grid/`),
меняется только блок `CHARACTER LOCK`.

Исходник: 3:2, например 1536×1024. Полный силуэт, воздух сверху и снизу — кадр живёт в боксе
330×183 под `object-fit: cover`.

**Порядок блоков важнее их количества (вердикт по двум прогонам 12.10).** Первый кадр разгибания,
собранный из длинной версии промпта, вышел тягой с пола; второй — «модель к нам лицом, не в полный
рост, выделены не те мышцы». Во всех случаях Qwen выполнил то, что стояло в первых абзацах, и молча
уронил хвост: `CAMERA`, `FRAMING LOCK` и `HIGHLIGHT` были в конце. Поэтому промпты разгибания
пересобраны короткими (~700 слов против 1250) и с приоритетом сверху вниз: `STYLE` → `VIEWPOINT`
(спина к камере, лицо не видно) → `FRAMING` (оба стопы в кадре, 85 % высоты) → `EXERCISE` (не тяга)
→ `THE BAR` → `POSE` → `CHARACTER` → `HIGHLIGHT` → `BACKGROUND` → `FORBIDDEN`. Промпты остальных
позиций пока в длинной форме — если Qwen и там уронит хвост, их пересобирать тем же порядком.

---

## 1. Разгибание рук на блоке · женщина · старт

> **Фактическая версия промпта — v3 (12.10, профиль).** Ниже в файле лежит базовая форма v2; в v3 в
> неё добавлено три блока, и именно они дали приемлемый кадр: `TWO FISTS LOCK` (ближний кулак +
> костяшки дальнего рядом, «single-grip handle with only one fist» внесён в `FORBIDDEN` первым
> пунктом), `CABLE TAUT` (одна прямая натянутая линия от ролика до карабина, без провисания и петли —
> провис давал финиш v2) и `TORSO UPRIGHT LOCK` в финишном кадре («chest stays directly above her
> hips, shoulder line above hip line, the arms go down, the body does not» — без него финиш v2
> складывался в наклон 45°). Черновики: `Triceps_Pushdown_-_Straight_Bar_start_v3.png`,
> `..._finish_v3.png`; v2 с вариантом C и предыдущие отклонённые — в `vibe_images/rejected-2026-10-12/`.
> Ракурс позиции 4 по вердикту владельца — **чистый профиль 90°**, блок у левого края.

Что должно быть: стоит лицом к верхнему блоку, корпус наклонён вперёд на 10°, плечи опущены,
локти прижаты к корпусу, предплечья подняты так, что рукоять у нижних рёбер и вынесена вперёд.
Рукоять — короткая прямая планка, кисти на ней по обе стороны от центра, трос цепляется ровно
посередине между кистей и держит её на весу.
Камера — **вариант C, три-четверти спереди ~40°** (вердикт владельца 12.10 после пяти прогонов с
видом со спины). Причина: при виде сзади предплечья, вынесенные к блоку, смотрят от камеры, и хват,
карабин между кистей и сама планка физически не могут быть видны — то есть именно та геометрия, из-за
которой позиция не принималась, при варианте A не показуема в принципе. Плата за это — подсветка:
трицепс описан как полоса по заднему краю плеча на внешнем контуре руки, что мягко нарушает правило
«светим обращённой к камере стороной».
Что ломалось: в восьми прошлых прогонов — трос крепился к краю планки; обе кисти уходили на один
конец планки; планка рисовалась в профиль, когда корпус в три-четверти; одна кисть отрывалась от
тела и висела в воздухе. В пяти прогонах Qwen — разворот (вставала лицом к камере при камере со спины),
кадрирование (стопы обрезаны, уходила в полуприсед), сторона подсветки (свет лез на дельту и трапецию),
длина планки (торчала длинными концами) и **поза старта** (руки висели вниз — модель рисовала финиш).
Отсюда приоритетный порядок блоков: разворот, сторона и кадрирование стоят в промпте раньше самого
упражнения, а поза названа буквой — «arms form a clear LETTER L».

```

STYLE - READ FIRST: a stylized CGI 3D render made for a fitness app, semi-realistic but unmistakably rendered, smooth matte shading, clean painted surfaces. NOT a photograph, not a cartoon, no camera grain. No text, no numbers, no logos, no watermark.

VIEWPOINT - READ SECOND, THIS IS THE MOST COMMON MISTAKE: a clean SIDE VIEW, the camera exactly 90 degrees to the side of the athlete, at chest height, 3 metres away. Her body is seen in PROFILE, facing the LEFT edge of the frame where the cable machine stands; we see one side of the athlete from the top of the head to the sole of the shoe. Her face is in profile, chin slightly down, eyes on the bar. This is NOT a front view, NOT a back view and NOT a three-quarter view.

ORIENTATION LOCK: the machine tower is at the LEFT edge of the frame and the athlete faces it, so her head, chest and knees point LEFT and her back and buttocks point RIGHT. The machine is never on the right, the body never faces the camera.

FRAMING - READ THIRD: the FULL BODY in profile is inside the picture. Both shoes with their soles visible and a clear margin of empty floor below them, empty space in front of her face and above her head, the base of the machine standing on the floor at the left. Nothing is cropped - not the shoes, not the head, not the bar. The athlete occupies about 85 percent of the frame height and the camera does not zoom in.

EXERCISE: STANDING CABLE TRICEPS PUSHDOWN. She stands tall in profile, hips high under her shoulders, knees barely bent, thighs vertical, torso tilted forward only 10 degrees. This is NOT a bent-over row, NOT a deadlift, NOT a squat - nothing is lifted off the floor.

THE BAR, SEEN END ON - READ THIS CAREFULLY: her hands hold a short straight cable attachment whose axis points straight at the camera, so in this side view the bar reads as a SHORT STUB about the width of one fist, NOT as a long rod lying across the frame. NO weight plates, no rotating sleeves, no dumbbell ends, no kinks - a straight flat rod. It HANGS IN THE AIR from one cable that carries its weight, and her hands push it DOWN. The cable runs down in a straight taut diagonal from the pulley housing at the top of the machine to a single carabiner at the MIDDLE of the stub, and that carabiner sits exactly between the two fists: the near fist is closest to the camera, the far fist is directly behind it and partly hidden. Two fists, two forearms, one cable - never a hand with no arm behind it, never a bar lying sideways across the picture.

POSE, START of the rep - her arm forms a clear LETTER L in this profile: her upper arm points straight down along her ribs and is hidden by her torso except for its outer edge, her elbow is bent at exactly 90 degrees at the level of her waist, and her FOREARM IS HORIZONTAL, sticking straight forward toward the machine at the left, with the bar held in front of her lower chest about 40 cm away from her belly, lifted up by the cable. The bar is HIGH in this frame, at the level of the lower ribs - never at the thigh, never near the floor. Wrists straight, feet hip-width apart, both soles flat on the floor, one foot slightly ahead of the other.

DEPTH ORDER: from the camera - her near shoulder, arm and forearm first, then the bar stub in her hands, then her torso and head behind them, then the cable rising to the pulley, then the machine tower at the left edge. her far arm is behind her near arm and is only partly visible.

SINGLE FRAME: one continuous scene filling the whole canvas - no collage, no split panels, no inset, no duplicated figure, no second view of the same exercise.

CHARACTER: one athletic woman in her late 20s, lean, NOT bulky, dark-blonde hair in a ponytail, black sports bra, black shorts, black sneakers with white soles, neutral focused expression. Exactly this one person, nobody else in the frame.

HIGHLIGHT: a soft, semi-transparent warm-red X-ray glow on the TRICEPS of the working upper arm. In this profile the triceps reads as a strip down the BACK edge of the upper arm - the contour of the arm behind the elbow line, from the armpit to the elbow crease - and the same strip on the far arm shows just past her torso. It stays on the arm: never on the shoulder cap, the deltoid, the neck, the chest, the stomach or the back, and never down the forearm.

BACKGROUND: seamless cool blue-grey studio background with soft gradient and gentle vignette, soft floor shadow under the feet and under the machine, matte dark-grey metal and black pads. The cable machine is the only equipment in the room - no dumbbell rack, no loose weight plates, no bench. The machine has exactly ONE working cable, the one attached to the bar in the athlete's hands; no second cable, no spare handle, rope or bar hanging on the frame.

FORBIDDEN: a bar lying sideways across the frame or seen from its end as a long rod; a FRONT view or a BACK view of the athlete; the machine tower on the right side of the picture; a bent EZ-curl bar; a rope or a V-bar attachment; the cable clipped to the end of the bar instead of its middle; only one fist where two belong; a hand with no forearm behind it; a plate-loaded barbell with weight plates; a second handle or a second cable on the machine frame; a bent-over row, deadlift or squat posture; heels lifted; cropped or missing feet; a glow on the shoulder, the chest or the forearm; the arm hanging straight down with the bar at the thigh (that is the FINISH frame, a different picture); a second person; a photograph; a collage. 3:2 landscape composition, one single image.
```

## 2. Разгибание рук на блоке · женщина · финиш

Тот же кадр, та же камера, но предплечья развернулись вниз: руки почти выпрямлены, рукоять у бедер.
Локти не ушли вперёд и не оторвались от корпуса; трос стал короче, путь тот же; кисти по-прежнему
по обе стороны от крепления.

```

STYLE - READ FIRST: a stylized CGI 3D render made for a fitness app, semi-realistic but unmistakably rendered, smooth matte shading, clean painted surfaces. NOT a photograph, not a cartoon, no camera grain. No text, no numbers, no logos, no watermark.

VIEWPOINT - READ SECOND, THIS IS THE MOST COMMON MISTAKE: a clean SIDE VIEW, the camera exactly 90 degrees to the side of the athlete, at chest height, 3 metres away. Her body is seen in PROFILE, facing the LEFT edge of the frame where the cable machine stands; we see one side of the athlete from the top of the head to the sole of the shoe. Her face is in profile, chin slightly down, eyes on the bar. This is NOT a front view, NOT a back view and NOT a three-quarter view.

ORIENTATION LOCK: the machine tower is at the LEFT edge of the frame and the athlete faces it, so her head, chest and knees point LEFT and her back and buttocks point RIGHT. The machine is never on the right, the body never faces the camera.

FRAMING - READ THIRD: the FULL BODY in profile is inside the picture. Both shoes with their soles visible and a clear margin of empty floor below them, empty space in front of her face and above her head, the base of the machine standing on the floor at the left. Nothing is cropped - not the shoes, not the head, not the bar. The athlete occupies about 85 percent of the frame height and the camera does not zoom in.

EXERCISE: STANDING CABLE TRICEPS PUSHDOWN. She stands tall in profile, hips high under her shoulders, knees barely bent, thighs vertical, torso tilted forward only 10 degrees. This is NOT a bent-over row, NOT a deadlift, NOT a squat - nothing is lifted off the floor.

THE BAR, SEEN END ON - READ THIS CAREFULLY: her hands hold a short straight cable attachment whose axis points straight at the camera, so in this side view the bar reads as a SHORT STUB about the width of one fist, NOT as a long rod lying across the frame. NO weight plates, no rotating sleeves, no dumbbell ends, no kinks - a straight flat rod. It HANGS IN THE AIR from one cable that carries its weight, and her hands push it DOWN. The cable runs down in a straight taut diagonal from the pulley housing at the top of the machine to a single carabiner at the MIDDLE of the stub, and that carabiner sits exactly between the two fists: the near fist is closest to the camera, the far fist is directly behind it and partly hidden. Two fists, two forearms, one cable - never a hand with no arm behind it, never a bar lying sideways across the picture.

POSE, FINISHED position - the BOTTOM of the movement, seen in profile: her forearm has rotated DOWN from the horizontal start until the arm is almost straight and vertical, her elbow stays tucked at her ribs and does not travel forward, and the bar now hangs in front of her thigh at hip level. The visible part of the cable is shorter and steeper than at the start. The torso kept the same 10 degrees of tilt, her shoulders did not drop and her head still looks down at the bar. Feet hip-width apart, both soles flat on the floor.

DEPTH ORDER: from the camera - her near shoulder, arm and forearm first, then the bar stub in her hands, then her torso and head behind them, then the cable rising to the pulley, then the machine tower at the left edge. her far arm is behind her near arm and is only partly visible.

SINGLE FRAME: one continuous scene filling the whole canvas - no collage, no split panels, no inset, no duplicated figure, no second view of the same exercise.

CHARACTER: one athletic woman in her late 20s, lean, NOT bulky, dark-blonde hair in a ponytail, black sports bra, black shorts, black sneakers with white soles, neutral focused expression. Exactly this one person, nobody else in the frame.

HIGHLIGHT: a soft, semi-transparent warm-red X-ray glow on the TRICEPS of the working upper arm. In this profile the triceps reads as a strip down the BACK edge of the upper arm - the contour of the arm behind the elbow line, from the armpit to the elbow crease - and the same strip on the far arm shows just past her torso. It stays on the arm: never on the shoulder cap, the deltoid, the neck, the chest, the stomach or the back, and never down the forearm. The muscle is fully contracted in this frame, so the glow is at its brightest.

BACKGROUND: seamless cool blue-grey studio background with soft gradient and gentle vignette, soft floor shadow under the feet and under the machine, matte dark-grey metal and black pads. The cable machine is the only equipment in the room - no dumbbell rack, no loose weight plates, no bench. The machine has exactly ONE working cable, the one attached to the bar in the athlete's hands; no second cable, no spare handle, rope or bar hanging on the frame.

FORBIDDEN: a bar lying sideways across the frame or seen from its end as a long rod; a FRONT view or a BACK view of the athlete; the machine tower on the right side of the picture; a bent EZ-curl bar; a rope or a V-bar attachment; the cable clipped to the end of the bar instead of its middle; only one fist where two belong; a hand with no forearm behind it; a plate-loaded barbell with weight plates; a second handle or a second cable on the machine frame; a bent-over row, deadlift or squat posture; heels lifted; cropped or missing feet; a glow on the shoulder, the chest or the forearm; the forearm still horizontal with the bar at the chest (that is the START frame, a different picture); a second person; a photograph; a collage. 3:2 landscape composition, one single image.
```

## 3. Разгибание рук на блоке · мужчина · старт

От кадра 1 отличается только блок `CHARACTER` и местоимения; разворот, кадрирование, геометрия
рукояти, подсветка и негативный список — те же, иначе пара распадётся.

```

STYLE - READ FIRST: a stylized CGI 3D render made for a fitness app, semi-realistic but unmistakably rendered, smooth matte shading, clean painted surfaces. NOT a photograph, not a cartoon, no camera grain. No text, no numbers, no logos, no watermark.

VIEWPOINT - READ SECOND, THIS IS THE MOST COMMON MISTAKE: a clean SIDE VIEW, the camera exactly 90 degrees to the side of the athlete, at chest height, 3 metres away. His body is seen in PROFILE, facing the LEFT edge of the frame where the cable machine stands; we see one side of the athlete from the top of the head to the sole of the shoe. His face is in profile, chin slightly down, eyes on the bar. This is NOT a front view, NOT a back view and NOT a three-quarter view.

ORIENTATION LOCK: the machine tower is at the LEFT edge of the frame and the athlete faces it, so his head, chest and knees point LEFT and his back and buttocks point RIGHT. The machine is never on the right, the body never faces the camera.

FRAMING - READ THIRD: the FULL BODY in profile is inside the picture. Both shoes with their soles visible and a clear margin of empty floor below them, empty space in front of his face and above his head, the base of the machine standing on the floor at the left. Nothing is cropped - not the shoes, not the head, not the bar. The athlete occupies about 85 percent of the frame height and the camera does not zoom in.

EXERCISE: STANDING CABLE TRICEPS PUSHDOWN. He stands tall in profile, hips high under his shoulders, knees barely bent, thighs vertical, torso tilted forward only 10 degrees. This is NOT a bent-over row, NOT a deadlift, NOT a squat - nothing is lifted off the floor.

THE BAR, SEEN END ON - READ THIS CAREFULLY: his hands hold a short straight cable attachment whose axis points straight at the camera, so in this side view the bar reads as a SHORT STUB about the width of one fist, NOT as a long rod lying across the frame. NO weight plates, no rotating sleeves, no dumbbell ends, no kinks - a straight flat rod. It HANGS IN THE AIR from one cable that carries its weight, and his hands push it DOWN. The cable runs down in a straight taut diagonal from the pulley housing at the top of the machine to a single carabiner at the MIDDLE of the stub, and that carabiner sits exactly between the two fists: the near fist is closest to the camera, the far fist is directly behind it and partly hidden. Two fists, two forearms, one cable - never a hand with no arm behind it, never a bar lying sideways across the picture.

POSE, START of the rep - his arm forms a clear LETTER L in this profile: his upper arm points straight down along his ribs and is hidden by his torso except for its outer edge, his elbow is bent at exactly 90 degrees at the level of his waist, and his FOREARM IS HORIZONTAL, sticking straight forward toward the machine at the left, with the bar held in front of his lower chest about 40 cm away from his belly, lifted up by the cable. The bar is HIGH in this frame, at the level of the lower ribs - never at the thigh, never near the floor. Wrists straight, feet hip-width apart, both soles flat on the floor, one foot slightly ahead of the other.

DEPTH ORDER: from the camera - his near shoulder, arm and forearm first, then the bar stub in his hands, then his torso and head behind them, then the cable rising to the pulley, then the machine tower at the left edge. his far arm is behind his near arm and is only partly visible.

SINGLE FRAME: one continuous scene filling the whole canvas - no collage, no split panels, no inset, no duplicated figure, no second view of the same exercise.

CHARACTER: one athletic man in his late 20s, lean, NOT bulky, short dark-brown hair cropped at the sides, clean-shaven, black sleeveless training top, black shorts, black sneakers with white soles, neutral focused expression. Exactly this one person, nobody else in the frame.

HIGHLIGHT: a soft, semi-transparent warm-red X-ray glow on the TRICEPS of the working upper arm. In this profile the triceps reads as a strip down the BACK edge of the upper arm - the contour of the arm behind the elbow line, from the armpit to the elbow crease - and the same strip on the far arm shows just past his torso. It stays on the arm: never on the shoulder cap, the deltoid, the neck, the chest, the stomach or the back, and never down the forearm.

BACKGROUND: seamless cool blue-grey studio background with soft gradient and gentle vignette, soft floor shadow under the feet and under the machine, matte dark-grey metal and black pads. The cable machine is the only equipment in the room - no dumbbell rack, no loose weight plates, no bench. The machine has exactly ONE working cable, the one attached to the bar in the athlete's hands; no second cable, no spare handle, rope or bar hanging on the frame.

FORBIDDEN: a bar lying sideways across the frame or seen from its end as a long rod; a FRONT view or a BACK view of the athlete; the machine tower on the right side of the picture; a bent EZ-curl bar; a rope or a V-bar attachment; the cable clipped to the end of the bar instead of its middle; only one fist where two belong; a hand with no forearm behind it; a plate-loaded barbell with weight plates; a second handle or a second cable on the machine frame; a bent-over row, deadlift or squat posture; heels lifted; cropped or missing feet; a glow on the shoulder, the chest or the forearm; the arm hanging straight down with the bar at the thigh (that is the FINISH frame, a different picture); a second person; a photograph; a collage. 3:2 landscape composition, one single image.
```

## 4. Разгибание рук на блоке · мужчина · финиш

Зеркало кадра 2: те же разворот, кадрирование и геометрия рукояти, другие `CHARACTER` и местоимения.

```

STYLE - READ FIRST: a stylized CGI 3D render made for a fitness app, semi-realistic but unmistakably rendered, smooth matte shading, clean painted surfaces. NOT a photograph, not a cartoon, no camera grain. No text, no numbers, no logos, no watermark.

VIEWPOINT - READ SECOND, THIS IS THE MOST COMMON MISTAKE: a clean SIDE VIEW, the camera exactly 90 degrees to the side of the athlete, at chest height, 3 metres away. His body is seen in PROFILE, facing the LEFT edge of the frame where the cable machine stands; we see one side of the athlete from the top of the head to the sole of the shoe. His face is in profile, chin slightly down, eyes on the bar. This is NOT a front view, NOT a back view and NOT a three-quarter view.

ORIENTATION LOCK: the machine tower is at the LEFT edge of the frame and the athlete faces it, so his head, chest and knees point LEFT and his back and buttocks point RIGHT. The machine is never on the right, the body never faces the camera.

FRAMING - READ THIRD: the FULL BODY in profile is inside the picture. Both shoes with their soles visible and a clear margin of empty floor below them, empty space in front of his face and above his head, the base of the machine standing on the floor at the left. Nothing is cropped - not the shoes, not the head, not the bar. The athlete occupies about 85 percent of the frame height and the camera does not zoom in.

EXERCISE: STANDING CABLE TRICEPS PUSHDOWN. He stands tall in profile, hips high under his shoulders, knees barely bent, thighs vertical, torso tilted forward only 10 degrees. This is NOT a bent-over row, NOT a deadlift, NOT a squat - nothing is lifted off the floor.

THE BAR, SEEN END ON - READ THIS CAREFULLY: his hands hold a short straight cable attachment whose axis points straight at the camera, so in this side view the bar reads as a SHORT STUB about the width of one fist, NOT as a long rod lying across the frame. NO weight plates, no rotating sleeves, no dumbbell ends, no kinks - a straight flat rod. It HANGS IN THE AIR from one cable that carries its weight, and his hands push it DOWN. The cable runs down in a straight taut diagonal from the pulley housing at the top of the machine to a single carabiner at the MIDDLE of the stub, and that carabiner sits exactly between the two fists: the near fist is closest to the camera, the far fist is directly behind it and partly hidden. Two fists, two forearms, one cable - never a hand with no arm behind it, never a bar lying sideways across the picture.

POSE, FINISHED position - the BOTTOM of the movement, seen in profile: his forearm has rotated DOWN from the horizontal start until the arm is almost straight and vertical, his elbow stays tucked at his ribs and does not travel forward, and the bar now hangs in front of his thigh at hip level. The visible part of the cable is shorter and steeper than at the start. The torso kept the same 10 degrees of tilt, his shoulders did not drop and his head still looks down at the bar. Feet hip-width apart, both soles flat on the floor.

DEPTH ORDER: from the camera - his near shoulder, arm and forearm first, then the bar stub in his hands, then his torso and head behind them, then the cable rising to the pulley, then the machine tower at the left edge. his far arm is behind his near arm and is only partly visible.

SINGLE FRAME: one continuous scene filling the whole canvas - no collage, no split panels, no inset, no duplicated figure, no second view of the same exercise.

CHARACTER: one athletic man in his late 20s, lean, NOT bulky, short dark-brown hair cropped at the sides, clean-shaven, black sleeveless training top, black shorts, black sneakers with white soles, neutral focused expression. Exactly this one person, nobody else in the frame.

HIGHLIGHT: a soft, semi-transparent warm-red X-ray glow on the TRICEPS of the working upper arm. In this profile the triceps reads as a strip down the BACK edge of the upper arm - the contour of the arm behind the elbow line, from the armpit to the elbow crease - and the same strip on the far arm shows just past his torso. It stays on the arm: never on the shoulder cap, the deltoid, the neck, the chest, the stomach or the back, and never down the forearm. The muscle is fully contracted in this frame, so the glow is at its brightest.

BACKGROUND: seamless cool blue-grey studio background with soft gradient and gentle vignette, soft floor shadow under the feet and under the machine, matte dark-grey metal and black pads. The cable machine is the only equipment in the room - no dumbbell rack, no loose weight plates, no bench. The machine has exactly ONE working cable, the one attached to the bar in the athlete's hands; no second cable, no spare handle, rope or bar hanging on the frame.

FORBIDDEN: a bar lying sideways across the frame or seen from its end as a long rod; a FRONT view or a BACK view of the athlete; the machine tower on the right side of the picture; a bent EZ-curl bar; a rope or a V-bar attachment; the cable clipped to the end of the bar instead of its middle; only one fist where two belong; a hand with no forearm behind it; a plate-loaded barbell with weight plates; a second handle or a second cable on the machine frame; a bent-over row, deadlift or squat posture; heels lifted; cropped or missing feet; a glow on the shoulder, the chest or the forearm; the forearm still horizontal with the bar at the chest (that is the START frame, a different picture); a second person; a photograph; a collage. 3:2 landscape composition, one single image.
```

## 5. Отведение ноги с резинкой · мужчина · старт

Женская пара принята в таком составе: опора-столбик у левого края, резинка идёт от него к лодыжке
рабочей ноги, рабочая стопа висит в воздухе в обеих фазах, светится наружная поверхность таза
рабочей ноги. Мужская пара обязана совпасть с ней по камере и доле кадра.

```
STYLE — READ FIRST AND OBEY: a stylized CGI 3D render in the visual language of a modern fitness app illustration, semi-realistic but unmistakably RENDERED: smooth matte shading over skin and muscle, slightly idealized anatomy, clean painted surfaces. THIS IS NOT A PHOTOGRAPH — no camera grain, no photographic skin pores, no real gym, no lens depth of field; not a cartoon, not a line icon.

COMPOSITION RULE — READ SECOND AND OBEY: this exercise is a SIDE LEG RAISE with a resistance band, and only ONE leg works. The glowing hip and the raised foot belong to the SAME leg — the leg on the right side of the frame. The other leg, on the left side of the frame, is the supporting leg: it is straight, its whole sole is flat on the floor, and it carries no band and no glow. If the band and the glow end up on different legs, the image is wrong.

SCENE: STANDING SIDE LEG ABDUCTION WITH A RESISTANCE BAND, START of the rep. A man stands in profile with his LEFT side toward a low anchor post, holding nothing, both arms relaxed at his sides. A flat elastic loop band is fixed around the post at floor level and around his RIGHT ankle. In this starting frame both feet are close together under his hips, his weight on the left leg, and the right toe rests lightly on the floor just behind the left heel. The band is only slightly tensioned — a short straight segment from the post to his right ankle, no sagging loop.

BAND LOCK: exactly ONE flat elastic band loop in the scene, anchored to the low post at floor level on the left and to his right ankle. Straight taut line, no sag, no second band, no handle, no cuff on the other ankle, no band around the knees or thighs.
HIP-BINDING RULE: the glow sits on the OUTER side of the RIGHT hip — the hip the raised leg comes out of. The supporting LEFT buttock is completely dark.
PELVIS LOCK: his pelvis stays square and level, facing forward; it does not tilt up toward the camera and does not roll open toward the band side.
TORSO LOCK: spine vertical, chest up, shoulders over hips; he does not lean away from the band and does not swing his hips.
SUPPORT-LEG LOCK: the left leg is straight, the whole left sole is flat on the floor, the left knee is not bent.
FOOT LOCK: the right toes point forward, in line with the knee; the right foot does not rotate outward.
HEAD LOCK: eyes forward, chin level, head turned away from the camera with the back of the head visible.
ANCHOR LOCK: the anchor is a short dark floor post (a bollard about knee height) at the left edge of the frame with a round base plate on the floor; nothing else in the room.

CAMERA: view from BEHIND and slightly toward his right side, about 25° off straight back, camera at hip height 1.0 m, 3.2 m away. We see his back, both shoulder blades, the back of both legs and the outer side of his right hip; the anchor post stands at the left edge.
ORIENTATION LOCK: anchor post and band to the LEFT, working leg to the RIGHT. Never mirrored.
SCALE LOCK: one metre of his body occupies the same number of pixels as in the companion frame of this pair; the camera does not move, does not zoom, does not change height.
FRAMING LOCK: full body with generous air; the top of his head sits at about 5 percent of the frame height, the sole of his supporting shoe at about 88 percent, the anchor post fully inside the frame, nothing cropped.
SINGLE FRAME: one continuous scene filling the whole canvas — no collage, no split panels, no inset, no duplicated figure, no second view of the same exercise.

CHARACTER LOCK: athletic man in his late 20s, LEAN and athletic, NOT bulky, short dark-brown hair cropped at the sides, clean-shaven, black sleeveless training top, black shorts, black sneakers with white soles, neutral focused expression. Slim athletic build, no bodybuilder mass. Exactly this one man, no other person.

HIGHLIGHT: a soft, semi-transparent warm-red X-ray glow visible through his body over the GLUTEUS MEDIUS ON THE OUTER SIDE OF THE RIGHT HIP, just above the greater trochanter, following the real muscle contour and tapering at both ends. The supporting left hip, the quadriceps, the hamstrings and the calves stay completely unlit and dark. The band and the post stay dark.
BACKGROUND: seamless desaturated cool blue-grey studio backdrop with soft gradient and gentle vignette, soft floor shadow under his feet and under the post, matte dark-grey materials, no logos, no text, no numbers, no watermark, no mirrors.

FORBIDDEN: a band around the knees or thighs instead of the ankle; two bands; a cable machine, a dumbbell, a kettlebell, a bench; the working foot flat on the floor with the body weight on it; a leg kick BACKWARD (hip extension) instead of SIDEWAYS; the pelvis rolled open; the torso leaning away from the band; the supporting heel lifted; a side plank or a clamshell lying pose; a photograph; a different body type — no bulky wide-shouldered bodybuilder. 3:2 landscape composition.
```

## 6. Отведение ноги с резинкой · мужчина · финиш

```
STYLE — READ FIRST AND OBEY: a stylized CGI 3D render in the visual language of a modern fitness app illustration, semi-realistic but unmistakably RENDERED: smooth matte shading over skin and muscle, slightly idealized anatomy, clean painted surfaces. THIS IS NOT A PHOTOGRAPH — no camera grain, no photographic skin pores, no real gym, no lens depth of field; not a cartoon, not a line icon.

COMPOSITION RULE — READ SECOND AND OBEY: this exercise is a SIDE LEG RAISE with a resistance band, and only ONE leg works. The glowing hip and the raised foot belong to the SAME leg — the leg on the right side of the frame. The other leg, on the left side of the frame, is the supporting leg: it is straight, its whole sole is flat on the floor, and it carries no band and no glow. If the band and the glow end up on different legs, the image is wrong.

SCENE: STANDING SIDE LEG ABDUCTION WITH A RESISTANCE BAND, FINISHED position. A man stands in profile with his LEFT side toward a low anchor post, both arms relaxed at his sides, spine vertical. His RIGHT leg is moved OUTWARD TO THE SIDE, away from the post, at an angle of about 35° from vertical. The right leg is nearly straight, the right foot is in the air well above the floor with the toes pointing forward, and the band is stretched into one long straight taut line from the post to his right ankle.

BAND LOCK: exactly ONE flat elastic band loop in the scene, anchored to the low post at floor level on the left and to his right ankle. Because the leg is raised, the band runs as one long straight tensioned line across the lower part of the frame from the post up to the ankle — no sagging loop, no second band, no handle, no cuff on the other ankle, no band around the knees or thighs.
HIP-BINDING RULE: the glow sits on the OUTER side of the RIGHT hip — the hip the raised leg comes out of. The supporting LEFT buttock is completely dark.
PELVIS LOCK: his pelvis stays square and level; it does not tilt up toward the camera and does not roll open toward the raised leg.
TORSO LOCK: spine vertical, chest up, shoulders over hips; he does not lean to the left to counterbalance and does not rotate his shoulders.
SUPPORT-LEG LOCK: the left leg is straight, the whole left sole is flat on the floor, the left knee is not bent.
FOOT LOCK: the right toes point forward, in line with the knee and the direction of movement; the right foot does not hang limp and does not rotate outward.
HEIGHT LOCK: the raised foot is at about half the height of his own body — clearly above the ankle of the supporting leg, clearly below hip level. A low 10° lift is the WRONG image; a leg raised to the shoulder is also wrong.
ANCHOR LOCK: the anchor is a short dark floor post (a bollard about knee height) at the left edge of the frame with a round base plate on the floor; nothing else in the room.

CAMERA: view from BEHIND and slightly toward his right side, about 25° off straight back, camera at hip height 1.0 m, 3.2 m away — the SAME camera as the companion frame. We see his back, both shoulder blades, the back of the supporting leg and the outer side of his right hip; the anchor post stands at the left edge.
ORIENTATION LOCK: anchor post and band to the LEFT, working leg to the RIGHT. Never mirrored.
SCALE LOCK: one metre of his body occupies exactly the same number of pixels as in the companion frame; the camera does not move, does not zoom, does not change height.
FRAMING LOCK: full body with generous air; the top of his head sits at about 6 percent of the frame height, the sole of his supporting shoe at about 90 percent, the raised foot and the anchor post fully inside the frame, nothing cropped.
SINGLE FRAME: one continuous scene filling the whole canvas — no collage, no split panels, no inset, no duplicated figure, no second view of the same exercise.

CHARACTER LOCK: athletic man in his late 20s, LEAN and athletic, NOT bulky, short dark-brown hair cropped at the sides, clean-shaven, black sleeveless training top, black shorts, black sneakers with white soles, neutral focused expression. Slim athletic build, no bodybuilder mass. Exactly this one man, no other person.

HIGHLIGHT: a soft, semi-transparent warm-red X-ray glow visible through his body over the GLUTEUS MEDIUS ON THE OUTER SIDE OF THE RIGHT HIP, just above the greater trochanter, following the real muscle contour and tapering at both ends; the muscle is fully contracted in this frame. The supporting left hip, the quadriceps, the hamstrings and the calves stay completely unlit and dark. The band and the post stay dark.
BACKGROUND: seamless desaturated cool blue-grey studio backdrop with soft gradient and gentle vignette, soft floor shadow under his feet and under the post, matte dark-grey materials, no logos, no text, no numbers, no watermark, no mirrors.

FORBIDDEN: feet together as in the companion frame; a leg kicked backward behind the torso instead of out to the side; a band around the knee; two bands; a cable machine or dumbbell; the working foot touching the floor; the pelvis tilted up; the torso leaning left; the supporting heel lifted; a side-lying clamshell; a photograph; a different body type — no bulky wide-shouldered bodybuilder. 3:2 landscape composition.
```

## 7. Болгарские выпады в Смите · мужчина · старт

Женская пара принята так: Smith-машина, две стойки, блины с обоих торцов, задняя стопа носком на
скамье, светится квадрицепс передней ноги. Камера — три-четверти спереди, передняя нога слева.

```
STYLE — READ FIRST AND OBEY: a stylized CGI 3D render in the visual language of a modern fitness app illustration, semi-realistic but unmistakably RENDERED: smooth matte shading over skin and muscle, slightly idealized anatomy, clean painted surfaces. THIS IS NOT A PHOTOGRAPH — no camera grain, no photographic skin pores, no real gym, no lens depth of field; not a cartoon, not a line icon.

REAR-FOOT RULE — READ SECOND AND OBEY, THIS IS WHAT MAKES THE EXERCISE A BULGARIAN SPLIT SQUAT: the BACK foot does not touch the floor anywhere. Its laces and toe lie on the padded bench seat BEHIND him, with only the shin and the foot visible there, and its knee hangs down near the floor. The FRONT foot is the only foot on the ground, planted flat under him. If both feet are on the floor, the image is wrong — that is an ordinary lunge.

SCENE: BULGARIAN SPLIT SQUAT IN A SMITH MACHINE, START of the rep — standing support. A man stands inside a Smith machine with a barbell resting across his upper back and shoulders, his hands gripping the bar about a hand-width wider than his shoulders on each side. His FRONT (right) leg is nearly straight and his foot is planted flat on the floor under his hips; his BACK (left) foot rests laces-down on the bench seat behind him. His torso is upright, chest lifted, hips high, head level, eyes forward.

SMITH LOCK: the bar sits in the machine and runs between TWO vertical guide posts, one on each side of his body; the bar slides in those posts and the hook-shaped stoppers are visible on the posts. Weight plates are mounted on BOTH ends of the bar, near-side plate and far-side plate both visible. The bar rests on his upper trapezius, not on his neck and not on his rear deltoids.
BARBELL COUNT LOCK: exactly ONE barbell in the scene, loaded with plates on both ends. No dumbbells, no kettlebells, no second bar on the floor.
BENCH LOCK: one flat black padded bench behind him, long axis across the frame, its whole frame and both legs visible, its seat pad at about knee height, the back foot on top of it.
DEPTH ORDER: from the camera — his front leg and torso, then the bar across his shoulders with his hands on it, then the two guide posts, then the bench and his back leg. The near guide post never covers his head.
KNEE TRACK LOCK: the front knee points the same way as the front toes and is not caved inward.
TORSO LOCK: spine vertical within 5°, chest up, shoulders back; the same forward lean in both frames of the pair.
HEAD LOCK: eyes forward, chin level, head turned slightly toward the camera.
GRIP LOCK: both hands visible on the bar, overhand grip, wrists straight, elbows down and back.

CAMERA: three-quarter FRONT view, about 35° off straight-on, camera at chest height 1.4 m, 3.0 m away. We see the FRONT of his torso, the bar across his shoulders, the front of his working thigh, the machine posts on both sides and the bench behind his legs. His front leg is on the LEFT half of the frame, the bench and his back leg on the RIGHT half.
ORIENTATION LOCK: front foot and knee to the LEFT, rear foot and bench to the RIGHT. Never mirrored.
SCALE LOCK: one metre of his body occupies the same number of pixels as in the companion frame of this pair; the camera does not move, does not zoom, does not change height.
FRAMING LOCK: full body with generous air; the top of his head sits at about 5 percent of the frame height, the sole of his front shoe at about 95 percent, both machine posts and both bar ends fully inside the frame, nothing cropped.
SINGLE FRAME: one continuous scene filling the whole canvas — no collage, no split panels, no inset, no duplicated figure, no second view of the same exercise.

CHARACTER LOCK: athletic man in his late 20s, LEAN and athletic, NOT bulky, short dark-brown hair cropped at the sides, clean-shaven, black sleeveless training top, black shorts, black sneakers with white soles, neutral focused expression. Slim athletic build, no bodybuilder mass. Exactly this one man, no other person.

HIGHLIGHT: a soft, semi-transparent warm-red X-ray glow visible through his body over the QUADRICEPS OF THE FRONT LEG — the whole front of that thigh from hip down to the knee, following the real muscle contour and tapering at both ends. The back leg, the hamstrings, the glutes and the shoulders stay completely unlit and dark. The bar, the posts and the bench stay dark.
BACKGROUND: seamless desaturated cool blue-grey studio backdrop with soft gradient and gentle vignette, soft floor shadow under his feet, the machine feet and the bench, matte dark-grey metal with black pads and black weight plates, no logos, no text, no numbers, no watermark, no mirrors.

FORBIDDEN: both feet on the floor; the back foot standing on the ground behind him; the back knee resting on the floor; a free barbell without guide posts; a squat rack with no bar; a barbell held in front on straight arms or at the waist; a deep forward torso lean at 45°; the front heel lifted; a leg press or a hack squat machine; a photograph; a different body type — no bulky wide-shouldered bodybuilder. 3:2 landscape composition.
```

## 8. Болгарские выпады в Смите · мужчина · финиш

```
STYLE — READ FIRST AND OBEY: a stylized CGI 3D render in the visual language of a modern fitness app illustration, semi-realistic but unmistakably RENDERED: smooth matte shading over skin and muscle, slightly idealized anatomy, clean painted surfaces. THIS IS NOT A PHOTOGRAPH — no camera grain, no photographic skin pores, no real gym, no lens depth of field; not a cartoon, not a line icon.

REAR-FOOT RULE — READ SECOND AND OBEY, THIS IS WHAT MAKES THE EXERCISE A BULGARIAN SPLIT SQUAT: the BACK foot does not touch the floor anywhere. Its laces and toe lie on the padded bench seat BEHIND him, with only the shin and the foot visible there, and its knee hangs down close to the floor, almost touching it. The FRONT foot is the only foot on the ground, planted flat under him. If both feet are on the floor, the image is wrong — that is an ordinary lunge.

SCENE: BULGARIAN SPLIT SQUAT IN A SMITH MACHINE, FINISHED position — the BOTTOM of the squat. A man has dropped his hips straight DOWN on his front leg until the front thigh is at least parallel to the floor and the front knee is bent to about 90 degrees over the front toes. The barbell is still across his upper back, his hands still gripping it, his torso still upright. His back knee hangs just above the floor between his legs, the back shin nearly vertical, the back foot still resting on the bench seat.

DEPTH LOCK: the descent is deep — the front thigh reaches at least parallel to the floor. A shallow half-squat with the hips still high is the WRONG image.
SMITH LOCK: the bar sits in the machine and runs between TWO vertical guide posts, one on each side of his body; the bar slides in those posts and the hook-shaped stoppers are visible on the posts. Weight plates are mounted on BOTH ends of the bar, near-side plate and far-side plate both visible. The bar rests on his upper trapezius.
BARBELL COUNT LOCK: exactly ONE barbell in the scene, loaded with plates on both ends. No dumbbells, no second bar on the floor.
BENCH LOCK: one flat black padded bench behind him, long axis across the frame, its whole frame and both legs visible, the back foot on top of its seat pad.
KNEE TRACK LOCK: the front knee travels over the second toe, pushed outward, never caving toward the midline; the front shin stays nearly VERTICAL, the knee does not shoot far past the toes.
HEEL LOCK: the whole sole of the front foot, heel included, is flat on the floor — he drives through the whole foot.
TORSO LOCK: spine vertical within 5°, chest up — the torso does NOT fold forward over the bar and its lean is identical to the companion frame.
HEAD LOCK: eyes forward, chin level, neck in the continuation of the spine.
GRIP LOCK: both hands visible on the bar, overhand grip, wrists straight, elbows down and back.

CAMERA: three-quarter FRONT view, about 35° off straight-on, camera at chest height 1.4 m, 3.0 m away — the SAME camera as the companion frame. We see the FRONT of his torso, the bar across his shoulders, the front of his working thigh, the machine posts on both sides and the bench behind his legs. His front leg is on the LEFT half of the frame, the bench and his back leg on the RIGHT half.
ORIENTATION LOCK: front foot and knee to the LEFT, rear foot and bench to the RIGHT. Never mirrored.
SCALE LOCK: one metre of his body occupies exactly the same number of pixels as in the companion frame; the camera does not move, does not zoom, does not change height. His head sits LOWER in the frame only because his hips have dropped — not because the camera came closer.
FRAMING LOCK: full body with generous air; the top of his head sits at about 18 percent of the frame height, the sole of his front shoe at about 90 percent, both machine posts and both bar ends fully inside the frame, nothing cropped.
SINGLE FRAME: one continuous scene filling the whole canvas — no collage, no split panels, no inset, no duplicated figure, no second view of the same exercise.

CHARACTER LOCK: athletic man in his late 20s, LEAN and athletic, NOT bulky, short dark-brown hair cropped at the sides, clean-shaven, black sleeveless training top, black shorts, black sneakers with white soles, neutral focused expression. Slim athletic build, no bodybuilder mass. Exactly this one man, no other person.

HIGHLIGHT: a soft, semi-transparent warm-red X-ray glow visible through his body over the QUADRICEPS OF THE FRONT LEG — the whole front of that thigh from hip down to the knee, following the real muscle contour and tapering at both ends; the muscle is loaded in this frame. The back leg, the hamstrings, the glutes and the shoulders stay completely unlit and dark. The bar, the posts and the bench stay dark.
BACKGROUND: seamless desaturated cool blue-grey studio backdrop with soft gradient and gentle vignette, soft floor shadow under his feet, the machine feet and the bench, matte dark-grey metal with black pads and black weight plates, no logos, no text, no numbers, no watermark, no mirrors.

FORBIDDEN: standing upright as in the companion frame; a shallow half-squat; both feet on the floor; the back foot on the ground; the back knee slammed onto the floor; a torso folded forward at 45°; the front heel lifted; the front knee caved inward; a free barbell without guide posts; a barbell at the waist or in his hands; a photograph; a different body type — no bulky wide-shouldered bodybuilder. 3:2 landscape composition.
```

## 9. Подъёмы Y-T-W-L (W) · мужчина · старт

Женская пара принята так: камера со спины, голова у левого края, ноги уходят вправо, живот и грудь
на подушке наклонной скамьи ~30°, руки висят вниз под плечами, гантели у пола.

```
STYLE — READ FIRST AND OBEY: a stylized CGI 3D render in the visual language of a modern fitness app illustration, semi-realistic but unmistakably RENDERED: smooth matte shading over skin and muscle, slightly idealized anatomy, clean painted surfaces. THIS IS NOT A PHOTOGRAPH — no camera grain, no photographic skin pores, no real gym, no lens depth of field; not a cartoon, not a line icon.

POSE RULE — READ SECOND AND OBEY, THIS IS THE DEFINING FEATURE OF THE EXERCISE: he is LYING FACE DOWN on an inclined bench, chest and belly pressed against the pad, head above the top edge of the pad, and he raises two dumbbells by pulling his shoulder blades together. The bench is set at about 30° — head end up, foot end down. He is not standing, not bent over at the waist and not lying on a flat floor.

SCENE: INCLINE PRONE W-RAISE with dumbbells, START of the rep. A man lies chest-down on the pad of an incline bench, viewed from behind. His hips, thighs and legs run down the slope of the pad to the lower-right corner of the frame, knees slightly bent, the soles of his shoes visible. His arms hang straight DOWN from his shoulders, perpendicular to the floor, triceps alongside his ribs, and he holds one dumbbell in each hand at the lowest point — the dumbbells hang below shoulder level, near the floor. His shoulder blades are relaxed and NOT retracted, his head is above the top edge of the pad, eyes looking down at the bench.

DUMBBELL COUNT LOCK: exactly TWO dumbbells in the whole scene, one in each hand, both hanging below his shoulders. The floor is empty — no rack, no extra dumbbells, no barbell.
ARMS OUTSIDE LOCK: both arms and both dumbbells sit entirely OUTSIDE the silhouette of his body — a strip of background is visible between each dumbbell and the nearest part of his torso or leg. Nothing merges into the bench pad.
BENCH COMPLETENESS LOCK: the whole incline bench is in frame — the pad, the fixed frame under it and both support feet on the floor; the pad is a single flat black cushion at about 30°, no adjustable backrest arm in front of his chest.
DEPTH ORDER: from the camera — his back and shoulders, then the bench pad behind and under him, then his legs down the pad. His body is IN FRONT of the pad, the pad never covers his back.
HEAD AND NECK LOCK: his head is above the upper edge of the pad, neck in the continuation of the spine, chin slightly tucked, not hanging down.
HIP LOCK: hips and pelvis stay on the pad; his lower back does not arch and his hips do not lift off the bench.
SHOULDER LOCK: in this starting frame the shoulders are DOWN and relaxed, the arms fully extended, the dumbbells hanging.

CAMERA: view from BEHIND, slightly toward the head end, about 20° off straight back, camera at 1.3 m height, 2.8 m away. We see his whole back from neck to heels, both shoulder blades, the back of both arms and the incline bench under him. His head and arms are in the LEFT half of the frame, his feet in the RIGHT half.
ORIENTATION LOCK: head and dumbbells to the LEFT, feet to the RIGHT. Never mirrored.
SCALE LOCK: one metre of his body occupies the same number of pixels as in the companion frame of this pair; the camera does not move, does not zoom, does not change height.
FRAMING LOCK: the whole man and the whole bench fill the frame diagonally; his head sits at about 5 percent from the top edge, his heels at about 80 percent, both dumbbells fully inside the frame, nothing cropped.
SINGLE FRAME: one continuous scene filling the whole canvas — no collage, no split panels, no inset, no duplicated figure, no second view of the same exercise.

CHARACTER LOCK: athletic man in his late 20s, LEAN and athletic, NOT bulky, short dark-brown hair cropped at the sides, clean-shaven, black sleeveless training top, black shorts, black sneakers with white soles, neutral focused expression. Slim athletic build, no bodybuilder mass. Exactly this one man, no other person.

HIGHLIGHT: a soft, semi-transparent warm-red X-ray glow visible through his body over the POSTERIOR DELTOIDS and the MID AND LOWER TRAPEZIUS on BOTH sides of his upper back, following the real muscle contours and tapering at the edges. In this starting frame the glow is dim — the muscle is not yet contracted. His neck, lats, lower back and legs stay completely unlit and dark. The dumbbells and the bench stay dark.
BACKGROUND: seamless desaturated cool blue-grey studio backdrop with soft gradient and gentle vignette, soft floor shadow under the bench feet and his shoes, matte dark-grey metal with black pads, hex-shaped black rubber dumbbell ends, no logos, no text, no numbers, no watermark, no mirrors.

FORBIDDEN: a standing or seated position; bent-over rows at the waist without a bench; lying face up on the bench; a flat bench instead of an inclined one; arms raised forward or overhead; elbows bent in this starting frame; dumbbells resting on the pad or on his back; one dumbbell; three or more dumbbells; a barbell; a photograph; a different body type — no bulky wide-shouldered bodybuilder. 3:2 landscape composition.
```

## 10. Подъёмы Y-T-W-L (W) · мужчина · финиш

Ключевое отличие от уже существующих строк «Y-подъём» и «Bent-Over T-Raise» — согнутые локти:
предплечья вертикальны, кисти над локтями, большие пальцы смотрят вверх. Если локти выпрямятся,
кадр снова станет Y или T.

```
STYLE — READ FIRST AND OBEY: a stylized CGI 3D render in the visual language of a modern fitness app illustration, semi-realistic but unmistakably RENDERED: smooth matte shading over skin and muscle, slightly idealized anatomy, clean painted surfaces. THIS IS NOT A PHOTOGRAPH — no camera grain, no photographic skin pores, no real gym, no lens depth of field; not a cartoon, not a line icon.

POSE RULE — READ SECOND AND OBEY, THIS IS THE DEFINING FEATURE OF THE EXERCISE: he is LIE-ING FACE DOWN on an inclined bench and holds the TOP of a W-RAISE — both elbows bent at exactly 90 degrees and spread wide to the sides at shoulder height, both forearms pointing straight UP at the ceiling, both fists directly above their elbows, thumbs rotated toward the ceiling. Straight arms lifted to the side would be a T-raise and straight arms lifted forward-up would be a Y-raise; BOTH are the WRONG image. The only correct shape here is the letter W.

SCENE: INCLINE PRONE W-RAISE with dumbbells, FINISHED position — the TOP of the movement. A man lies chest-down on the pad of an incline bench, viewed from behind. His shoulder blades are drawn together and downward, his shoulders are pulled UP away from the bench, and both arms are raised into the W shape described above. The dumbbells are at the highest point of the movement, near the top edge of the frame, still outside his body silhouette. His hips, thighs and legs stay down the slope of the pad to the lower-right corner, knees slightly bent, soles of his shoes visible. His head is above the top edge of the pad, eyes looking down.

W SHAPE LOCK: upper arms horizontal and spread wide, elbows bent 90°, forearms vertical, fists above elbows, thumbs up. The angle at the elbow stays 90° — the arms do not straighten and do not fold tighter.
DUMBBELL COUNT LOCK: exactly TWO dumbbells in the whole scene, one in each hand. The floor is empty — no rack, no extra dumbbells, no barbell.
ARMS OUTSIDE LOCK: both forearms and both dumbbells sit entirely OUTSIDE the silhouette of his head, torso and legs — a strip of background is visible between each dumbbell and the nearest part of his body. Nothing merges into the bench pad or into his head.
BENCH COMPLETENESS LOCK: the whole incline bench is in frame — the pad, the fixed frame under it and both support feet on the floor; the pad is a single flat black cushion at about 30°.
DEPTH ORDER: from the camera — his back, shoulders and arms, then the bench pad behind and under him, then his legs down the pad. His body is IN FRONT of the pad.
HEAD AND NECK LOCK: his head stays above the upper edge of the pad, neck long, chin slightly tucked; he does not lift his face toward the ceiling.
HIP LOCK: hips, pelvis and legs stay pressed to the pad; his lower back does not arch and his hips do not lift off the bench.
SHOULDER LOCK: shoulder blades retracted and depressed, shoulders lifted off the pad — this is what moves the load; the elbows do not drift forward.

CAMERA: view from BEHIND, slightly toward the head end, about 20° off straight back, camera at 1.3 m height, 2.8 m away — the SAME camera as the companion frame. We see his whole back from neck to heels, both shoulder blades, the back of both arms and the incline bench under him. His head and arms are in the LEFT half of the frame, his feet in the RIGHT half.
ORIENTATION LOCK: head and dumbbells to the LEFT, feet to the RIGHT. Never mirrored.
SCALE LOCK: one metre of his body occupies exactly the same number of pixels as in the companion frame; the camera does not move, does not zoom, does not change height.
FRAMING LOCK: the whole man and the whole bench fill the frame diagonally; his head sits at about 12 percent from the top edge, his heels at about 82 percent, both dumbbells fully inside the frame with a hand's width of air above them, nothing cropped.
SINGLE FRAME: one continuous scene filling the whole canvas — no collage, no split panels, no inset, no duplicated figure, no second view of the same exercise.

CHARACTER LOCK: athletic man in his late 20s, LEAN and athletic, NOT bulky, short dark-brown hair cropped at the sides, clean-shaven, black sleeveless training top, black shorts, black sneakers with white soles, neutral focused expression. Slim athletic build, no bodybuilder mass. Exactly this one man, no other person.

HIGHLIGHT: a soft, semi-transparent warm-red X-ray glow visible through his body over the POSTERIOR DELTOIDS and the MID AND LOWER TRAPEZIUS on BOTH sides of his upper back, following the real muscle contours and tapering at the edges; the muscle is fully contracted in this frame, so the glow is at its brightest. His neck, lats, lower back and legs stay completely unlit and dark. The dumbbells and the bench stay dark.
BACKGROUND: seamless desaturated cool blue-grey studio backdrop with soft gradient and gentle vignette, soft floor shadow under the bench feet and his shoes, matte dark-grey metal with black pads, hex-shaped black rubber dumbbell ends, no logos, no text, no numbers, no watermark, no mirrors.

FORBIDDEN: straight arms in a Y or a T shape; arms hanging down at the floor as in the companion frame; a standing or seated position; a flat bench; hips lifted off the pad; head hanging below the top edge of the pad; dumbbells resting on the pad; one dumbbell or a barbell; elbows dropped below shoulder level; a photograph; a different body type — no bulky wide-shouldered bodybuilder. 3:2 landscape composition.
```

---

## После генерации

0. Про `newest()` в `build-illustrations.py`: среди подходящих файлов он берёт **последний по
   лексикографическому порядку**, а не самый свежий по времени. Отсюда правило: если в `vibe_images/`
   остался черновик той же позиции и того же пола, его нужно унести в карантин, а не подписывать
   `_v2` — `..._start_v2.png` всегда перешибёт `..._start.png`. Уже убрано 12.10: десять отклонённых
   черновиков разгибания на блоке и непринятый мужской старт отведения (`vibe_images/rejected-2026-10-12/`).

1. Сохранить десять файлов в `vibe_images/` строго с именами из таблицы в начале (мужской черновик
   обязан иметь суффикс `_m`, иначе `build-illustrations.py` положит его в женскую пару):
   `Triceps_Pushdown_-_Straight_Bar_start.png`, `..._finish.png`, `..._start_m.png`, `..._finish_m.png`,
   `Band_Hip_Abduction_start_m.png`, `..._finish_m.png`,
   `Smith_Machine_Bulgarian_Split_Squat_start_m.png`, `..._finish_m.png`,
   `Incline_Y-T-W-L_Raise_start_m.png`, `..._finish_m.png`.
2. Разложить: `python spark-output/export/build-illustrations.py --ids Triceps_Pushdown_-_Straight_Bar,Band_Hip_Abduction,Smith_Machine_Bulgarian_Split_Squat,Incline_Y-T-W-L_Raise`
   (`--ids` принимает список **через запятую**; на выходе 850×567, JPEG q88, имена `00f/01f/00m/01m`).
3. Проверить: `python spark-output/export/detect-panel-seams.py --ids <те же четыре через запятую>` и
   `python spark-output/export/build-qc-sheet.py --ids <те же четыре> --combined --name legacy1-rest`.
4. Смотреть увеличенным фрагментом зону хвата, троса и колен — на общем плане мелкий брак не виден
   (урок 12.10: два ложных вердикта с листа, где кадр уменьшен до 420 px).
5. Отклонённый черновик не переименовывать — уносить в карантинную папку, иначе матчин по `_v\d+`
   подхватит его как валидный.

## Приёмка: на что смотреть в первую очередь

| Позиция | Первый признак брака | Второй |
|---|---|---|
| Разгибание на блоке | вид со спины вместо трёх-четвертей спереди (тогда хват не виден вовсе) | блок ушёл на правый край; стопы обрезаны или ушли в полуприсед |
| Разгибание на блоке | свет на дельте, трапеции или передней поверхности плеча | полоса света не на внешнем контуре руки; планка длиннее спины и торчит концами |
| Разгибание на блоке | крепление троса не между кистей (ушло к краю планки) | обе кисти на одной стороне троса; дальняя рука спрятана за корпусом; кисть без своего предплечья |
| Разгибание на блоке | в стартовом кадре руки висят вниз (модель нарисовала финиш) | азимут старта и финиша разный; в финише рукоять осталась на уровне рёбер |
| Отведение с резинкой | подсветка и петля на разных ногах | резинка на колене; нога уходит назад, а не в сторону |
| Болгарские в Смите | задняя стопа на полу (это обычный выпад) | нет направляющих Смит-машины; глубина — полуприсед |
| Y-T-W-L | локти разогнулись → снова Y или T | гантели слились с силуэтом тела; скамья плоская |

## Что в этих промптах не является догмой

Числа кадра (`CAMERA`, `SCALE LOCK`, проценты `FRAMING LOCK`) сняты с принятых женских пар по
десятичной сетке на `spark-output/export/qc/grid/` и нужны только чтобы мужская пара не «подъехала»
к камере. Если Qwen стабильно режет голову или стойку машины — править проценты `FRAMING LOCK`,
а не убирать блоки `SCALE LOCK` и `SINGLE FRAME`: они лечат два самых частых брака (подъезд камеры
и коллаж из двух ракурсов).

**Два правила, которые дались двумя бракованными прогонами разгибания.** (1) У Qwen вес блока
определяется его местом, а не формулировкой: всё, что после пятого-шестого абзаца, модель честно
игнорирует — поэтому разворот и кадрирование теперь идут до названия упражнения, а `FORBIDDEN`
замыкает список. (2) Длина промпта — не защита: 1250 слов дали три дефекта, 700 слов с приоритетом
сверху — это же самое, но прочитанное. Если и короткая версия уронит разворот, менять надо не текст,
а композицию: камера строго со спины, где корпусу физически некуда развернуться к линзе.
