# Гоблет-приседания · промпты для генерации вне основной сессии

Позиция: `Goblet Squat` — «Приседания с гантелями… гирей» в каталоге, `name_eng = Goblet Squat`, `status = approved`, входит в 3 готовые программы. Папка кадров: `data/exercises/Goblet_Squat/`, там же сейчас лежат апстримные `0.jpg`/`1.jpg`, на которые указывает `media_url`.

Источник истины — `technique` строки (10.11, прод): «Встаньте со стопами примерно на ширине плеч и удерживайте гирю перед грудью обеими руками. Согните колени и тазобедренные суставы, опускаясь в присед и сохраняя корпус стабильным. Оттолкнитесь всей стопой и вернитесь в исходное положение». `settings`: «Гиря удерживается у груди, **локти направлены вниз**. Стопы устанавливаются примерно на ширине плеч». Целевая мышца — квадрицепс (вторые: икроножная, большая ягодичная, бицепс бедра, дельтовидные — не светим).

Камера выбрана по правилу «целевая мышца спереди — показываем спереди» и по принятому в этом семействе `Barbell_Squat`: три-четверти спереди ~35–45°.

## Что сделать после генерации

1. Сохранить четыре файла в `vibe_images/` строго с такими именами (без суффикса `_f` — женский черновик матчится как `<Id>_start`, иначе не раскладывается):
   - `Goblet_Squat_start.png`, `Goblet_Squat_finish.png`
   - `Goblet_Squat_start_m.png`, `Goblet_Squat_finish_m.png`
2. Разложить: `python spark-output/export/build-illustrations.py --ids Goblet_Squat` (на выходе 850×567, JPEG q88, имена `00f/01f/00m/01m`).
3. Проверить: `python spark-output/export/detect-panel-seams.py --ids Goblet_Squat` и `python spark-output/export/build-qc-sheet.py --ids Goblet_Squat`.
4. Смотреть увеличенным фрагментом зоны гири и колен — на общем плане мелкий брак не виден.

Требования к исходнику: соотношение 3:2 (горизонтальный кадр), например 1536×1024. Полный силуэт, воздух сверху и снизу — кадр живёт в боксе 330×183 с `object-fit: cover`.

---

## Кадр 0 — женщина, старт

```
STYLE — READ FIRST AND OBEY: a stylized CGI 3D render in the visual language of a modern fitness app illustration, semi-realistic but unmistakably RENDERED: smooth matte shading over skin and muscle, slightly idealized anatomy, clean painted surfaces. THIS IS NOT A PHOTOGRAPH — no camera grain, no photographic skin pores, no real gym, no lens depth of field; not a cartoon, not a line icon.

KETTLEBELL HOLD LOCK — READ SECOND AND OBEY, THIS IS THE DEFINING FEATURE OF THE EXERCISE: she holds ONE kettlebell against her CHEST with BOTH hands. Her hands are wrapped around the ball and handle of the same kettlebell, one on each side, and her ELBOWS POINT STRAIGHT DOWN along her ribs. The kettlebell sits in front of her sternum and its whole outline reads against the background — it is never merged into her torso, never hidden behind her arms, never held out on straight arms, never resting on her belly or her thighs.

SCENE: GOBLET SQUAT, START of the rep — standing position. A woman stands tall with feet about shoulder-width apart, toes turned out slightly, holding the kettlebell at her chest as described above, knees straight but soft, chest up, eyes forward.

KETTLEBELL COUNT LOCK: exactly ONE kettlebell in the whole scene, held in both hands at her chest. The floor is EMPTY — no dumbbells, no barbell, no rack, no bench, no second kettlebell.
STANCE LOCK: feet shoulder-width, toes turned out 10–15°, identical in both frames.
HEELS DOWN LOCK: the whole sole of every foot is flat on the floor in both frames — no lifted heels.
TORSO UPRIGHT LOCK: her spine is vertical within 10° in both frames; she stands tall here, chest lifted toward the camera.
HEAD AND CHIN LOCK: eyes forward, chin level, neck in the continuation of the spine.

CAMERA: three-quarter FRONT view, about 35° off straight-on, at chest height, 2.7 m away. We see the FRONT of her torso, the kettlebell held at her chest, and the front of both thighs; her body faces the camera with her right side turned slightly toward it.
SCALE LOCK: the camera does not move between the two frames of this pair — same position, same height, same lens. One metre of her body and the kettlebell must occupy exactly the same number of pixels in both frames. Do not zoom in.
FRAMING LOCK: full body with generous air above her head and below her shoes; from the top of her head to the sole of her shoes she fills about 88 percent of the frame height; nothing cropped.
SINGLE FRAME: one continuous scene filling the whole canvas — no collage, no split panels, no inset, no duplicated figure.

CHARACTER LOCK: athletic woman in her late 20s, LEAN and athletic, NOT bulky, dark-blonde hair tied in a ponytail, black sports bra, black shorts, black sneakers with white soles, neutral focused expression. SLIM athletic build, thin biceps, flat trapezius, no bodybuilder mass. Exactly this one woman, no other person.

HIGHLIGHT: a soft, semi-transparent warm-red X-ray glow visible through her body over the QUADRICEPS OF BOTH LEGS — the front of the thigh from the hip down to just above the kneecap, following the real muscle contour, tapering at both ends, NOT a bright circle or oval blob. Glutes, hamstrings, calves, shoulders and front deltoids stay completely unlit and dark; the kettlebell and her arms stay dark.
BACKGROUND: seamless desaturated cool blue-grey studio backdrop with soft gradient and gentle vignette, soft floor shadow under her feet, matte dark-grey metal kettlebell with a black handle, no logos, no text, no watermark, no mirrors.

FORBIDDEN: a squat pose in this frame (she must be standing); two kettlebells; a dumbbell or a barbell instead of the kettlebell; the kettlebell held on straight arms away from the chest; the kettlebell resting on her belly or thighs; elbows flared out to the sides; heels lifted; knees caving inward; a photograph; a different body type — no bulky muscles. 3:2 landscape composition.
```

## Кадр 1 — женщина, финиш

```
STYLE — READ FIRST AND OBEY: a stylized CGI 3D render in the visual language of a modern fitness app illustration, semi-realistic but unmistakably RENDERED: smooth matte shading over skin and muscle, slightly idealized anatomy, clean painted surfaces. THIS IS NOT A PHOTOGRAPH — no camera grain, no photographic skin pores, no real gym, no lens depth of field; not a cartoon, not a line icon.

KETTLEBELL HOLD LOCK — READ SECOND AND OBEY, THIS IS THE DEFINING FEATURE OF THE EXERCISE: she still holds the SAME ONE kettlebell against her CHEST with BOTH hands, exactly as in the companion frame — hands wrapped around the ball and handle, ELBOWS POINTING STRAIGHT DOWN along her ribs, the whole outline of the kettlebell visible in front of her sternum. As she descends her elbows pass BETWEEN her knees, and the kettlebell stays at her chest — it never drops toward the floor, never moves onto straight arms, never merges into her torso.

SCENE: GOBLET SQUAT, FINISHED position — the BOTTOM of the squat. A woman has bent her knees and pushed her hips down until her thighs are PARALLEL TO THE FLOOR or slightly below, her torso still upright, the kettlebell still at her chest, elbows between her knees, heels flat.

DEPTH LOCK: hips down until the thigh is at least parallel to the floor — a shallow half-squat is the WRONG image.
KNEE TRACK LOCK: each knee sits over the second-toe line, pushed OUTWARD, never caving toward the midline.
HEELS DOWN LOCK: the whole sole of every foot is flat on the floor — no lifted heels, no toes-only stance.
TORSO UPRIGHT LOCK: her spine stays vertical within 10° — she is NOT folded forward over the kettlebell; chest up, shoulder blades set, the weight does not pull her down.
HEAD AND CHIN LOCK: eyes forward and slightly down, chin level, neck in the continuation of the spine.
KETTLEBELL COUNT LOCK: exactly ONE kettlebell in the whole scene, held in both hands at her chest. The floor is EMPTY.

CAMERA: three-quarter FRONT view, about 35° off straight-on, at chest height, 2.7 m away — the SAME camera as the companion frame. We see the FRONT of her torso, the kettlebell at her chest and the front of both thighs; her body faces the camera with her right side turned slightly toward it.
SCALE LOCK: the camera does not move between the two frames of this pair — same position, same height, same lens. One metre of her body and the kettlebell must occupy exactly the same number of pixels in both frames. Do not zoom in.
FRAMING LOCK: full body with generous air above her head and below her shoes; from the top of her head to the sole of her shoes she fills about 80 percent of the frame height; nothing cropped.
SINGLE FRAME: one continuous scene filling the whole canvas — no collage, no split panels, no inset, no duplicated figure.

CHARACTER LOCK: athletic woman in her late 20s, LEAN and athletic, NOT bulky, dark-blonde hair tied in a ponytail, black sports bra, black shorts, black sneakers with white soles, neutral focused expression. SLIM athletic build, thin biceps, flat trapezius, no bodybuilder mass. Exactly this one woman, no other person.

HIGHLIGHT: a soft, semi-transparent warm-red X-ray glow visible through her body over the QUADRICEPS OF BOTH LEGS — the front of the thigh from the hip down to just above the kneecap, following the real muscle contour, tapering at both ends, NOT a bright circle or oval blob. Glutes, hamstrings, calves, shoulders and front deltoids stay completely unlit and dark; the kettlebell and her arms stay dark.
BACKGROUND: seamless desaturated cool blue-grey studio backdrop with soft gradient and gentle vignette, soft floor shadow under her feet, matte dark-grey metal kettlebell with a black handle, no logos, no text, no watermark, no mirrors.

FORBIDDEN: standing upright as in the companion frame; a shallow half-squat; elbows outside the knees or flared wide; the kettlebell lowered toward the floor or held on straight arms; a barbell or dumbbells; knees caving inward; heels lifted; a torso folded forward at 45°; a round lower back; a photograph; a different body type — no bulky muscles. 3:2 landscape composition.
```

---

## Мужская пара

Меняется ОДНА строка промпта — блок `CHARACTER LOCK`. Камера, локи, фазы, подсветка и фон остаются дословно те же, что в женских кадрах выше: одна позиция снимается с одной камеры для обоих полов. Файлы: `Goblet_Squat_start_m.png`, `Goblet_Squat_finish_m.png`.

Заменить блок `CHARACTER LOCK` на:

```
CHARACTER LOCK: athletic man in his late 20s, LEAN and athletic, NOT bulky, short dark-brown hair cropped at the sides, clean-shaven, black fitted short-sleeve athletic t-shirt, black shorts, black sneakers with white soles, neutral focused expression. Exactly this one man, no other person.
```

И в блоке `HIGHLIGHT` добавить «through his shirt», а в `FORBIDDEN` — «a different body type — no bulky wide-shouldered bodybuilder».

---

## Чек-лист приёмки (те же восемь признаков, что в основном конвейере)

1. Движение угадывается без подписи: гиря у груди, локти вниз, присед.
2. Снаряд узнаваем и в работе: одна гиря, обе руки, полный контур против фона.
3. Угол и дистанция внутри пары совпадают (старт 88 % высоты кадра, финиш 80 %).
4. Взгляд и разворот головы совпадают.
5. Обе ноги — те же, светятся обе (движение симметричное).
6. Подсветка на квадрицепсах и на обращённой к камере стороне.
7. Пятки прижаты, колени по линии носков, бёдра не выше параллели в финише.
8. В кадре один сюжет, ничего не срезано краем бокса.

Известные грабли этой семьи, на которые смотреть в первую очередь: (а) снаряд «влезает» в тело — у гири это слияние с торсом, лечится формулировкой «полный контур против фона», а не «он спереди»; (б) в финише корпус доразгибается до вертикали — держим «the same forward lean as in the companion frame»; (в) локти разворачиваются наружу и кадр начинает выглядеть как фронтальный присед со штангой.
