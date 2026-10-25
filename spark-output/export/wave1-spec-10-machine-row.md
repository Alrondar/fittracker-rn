# Спека «Тяга в тренажере (Row)» · копия формы со SmartWorkout

Строка `7a3ccbdf-8711-4532-a2b4-b841edd4cb90` «Тяга в тренажере (Row)», `name_eng = Machine Row`,
`status = approved`, 4 слота в программах. Сейчас `media_url` ведёт на `Machine_Shoulder_Military_Press`
— кадр про жимовой тренажёр, движение другое.

Референс — [Chest Supported Machine Row · SmartWorkout](https://smartworkout.app/en/exercise-library/back/chest-supported-machine-row),
два кадра (старт и финиш) приложил владелец, они же в `spark-output/export/ref/row/`.
Текст строки этой форме не противоречит: «сядьте в тренажер и плотно прижмите грудь к опорной подушке…
потяните рукояти к корпусу, направляя локти назад и сводя лопатки».

## Чем отличается от соседних строк (проверено продом 13.10)

| Строка | Её снаряд | Почему не дубль |
|---|---|---|
| «Изометрическая тяга в рычажном тренажере» `Leverage_Iso_Row`, 4 слота | два независимых рычага с вертикальными рукоятями, грудь у наклонной подушки | у нас **один** поворотный рычаг с **широким прямым грифом** и двумя блинами на торцах |
| «Тяга нижнего блока к поясу сидя» `Seated_Cable_Rows`, 22 слота | нижний блок, трос, V-рукоять, сиденье на полу, ноги вперёд на платформе | у нас нет троса и нет вытянутых ног: сиденье под корпусом, грудь на подушке, груз — блины на рычаге |

## Машина по узлам (в таком виде и идёт в промпт)

Формулировка «широкий прямой гриф с блином на каждом конце» дала три брака подряд: модель рисовала
штангу поперёк груди, потом ломала её на два огрызка, потом перекраивала раму. Правильное описание —
по узлам, от ближнего конца к дальнему:

1. длинная серая направляющая на полу, идёт по диагонали кадра;
2. прямоугольная чёрная **сидень** на ближнем конце, атлет сидит верхом;
3. две наклонные чёрные **опоры под стопы** сразу перед сиденьем;
4. серая вертикальная **стойка**;
5. наклонная чёрная **грудная подушка** на стойке — прямо перед грудиной, атлет в неё упирается;
6. **два серых рычага**, поднимающихся перед подушкой, каждый кончается **короткой вертикальной
   рукоятью**; рукояти стоят рядом, чуть шире плеч, по одной кисти на каждой, хват нейтральный;
7. **один** загрузочный рог с **одним** чёрным блином, торчит с **левой** стороны атлета.

Ничего больше: ни троса, ни блока, ни каната, ни стека, ни штанги, ни второй рукояти посередине.

Движение: руки идут назад вдоль рёбер, локти сгибаются ~90°, рукояти приезжают к бокам груди перед
подушкой, лопатки сводятся — и за счёт поворота рычагов **блин поднимается от пола до уровня левого
плеча**. Подъём блина — второй кадр опознаётся по нему лучше всего, поэтому он прописан и в фазе,
и в `FORBIDDEN` («the plate still low near the floor»).

Три лока, без которых пара не собиралась:

- `NOTHING ABOUT THE MACHINE MOVES EXCEPT THE LEVERS` — рама, сиденье, опоры, стойка и подушка
  обязаны остаться на тех же местах и того же размера, что в парном кадре; меняются только руки;
- `HANDS LOCK` — две кисти, две рукояти, по одной кисти на рукояти, нейтральный хват;
- `CAMERA` с привязкой стороны: «from BEHIND and slightly to her right, ~30° off straight back,
  camera above her head looking down ~20°» + «never mirror the scene».

## Что берём из референса (было до правки 13.10, оставлено как история ошибки)

Плоскость — горизонтальная: рукояти идут назад к корпусу по дуге вокруг нижнего шарнира.
Камера — **три-четверти со спины ~25°**, чуть выше головы: видны спина, широчайшие, средняя трапеция,
задняя дельта и то, как лопатки сводятся. Хват при этом не теряется, потому что гриф шире плеч и его
концы выступают из-за корпуса с обеих сторон — тот самый урок, что мы получили на разгибании.

Машина: вертикальная рама, перед атлетом наклонная грудная подушка, от неё к полу идёт поворотный рычаг,
на его внешнем конце — прямой широкий гриф с двумя короткими рукоятями под углом и по чёрному блину
на каждом торце; сзади — сиденье, на полу — две опорные площадки под стопы.

Фазы. 0 — руки выпрямлены, гриф впереди на уровне груди, лопатки растянуты, грудь прижата к подушке.
1 — локти согнуты и ушли назад вдоль рёбер, гриф у краёв подушки, лопатки сведены, грудь от подушки
не оторвалась, таз не отъехал от сиденья.

Локи, которые держим в обоих кадрах: `CHEST PAD LOCK`, `BAR WIDER THAN SHOULDERS` + `TWO FISTS AT THE
ENDS`, `ELBOWS BACK NOT OUT`, `NO TORSO ROCK-BACK`, `FEET ON PLATES`, `ONE PIVOT ARM ONLY` (никаких
двух расходящихся рычагов), `NO CABLE, NO PULLEY, NO STACK` (никакого троса и стека — иначе дубль
канатной тяги), `DEPTH ORDER`, `SINGLE FRAME`, `SCALE LOCK`, `ORIENTATION LOCK`.

Подсветка — `the latissimus dorsi on both sides of the back, from the armpit down along the ribcage
to the waist, plus the mid and lower trapezius between the shoulder blades`; тёмные: шея, задняя
поверхность руки ниже локтя, поясница, ягодицы, ноги.

## Кадр 1 — женщина, старт

```
STYLE - READ FIRST: a stylized CGI 3D render made for a fitness app, semi-realistic but unmistakably rendered, smooth matte shading, clean painted surfaces. NOT a photograph, not a cartoon, no camera grain. No text, no numbers, no logos, no watermark, no anatomy-chart artwork, no muscle diagram.

VIEWPOINT - READ SECOND, THIS IS THE MOST COMMON MISTAKE: we see the athlete from BEHIND and slightly to her right side, about 25 degrees off straight back, camera a little above her head height, 2.8 metres away. Her BACK fills the centre of the frame: shoulder blades, the ponytail on the back of her head, the back of both arms, her waist and the back of both thighs. Her face is NOT visible. She faces away from the camera, toward the machine.

MACHINE - READ THIRD, IT IS NOT A CABLE MACHINE: a plate-loaded chest-supported row. A vertical steel frame stands in front of her; a slanted black chest pad is pressed against her chest; from the front of the machine ONE rigid pivot arm reaches down toward the floor, and at its outer end there is ONE long straight bar lying across the frame, wider than her shoulders, with a short angled grip at each end and one black weight disc loaded on each tip of the bar. Behind her is a seat, and on the floor in front of the seat are two foot plates. There is NO cable, NO pulley, NO rope, NO weight stack, NO handle on a cord anywhere in the scene.

TWO FISTS LOCK: her two fists grip the two angled end grips of the bar, one hand at each end, the bar passing in front of her chest. The bar is wider than her shoulders and its ends with the weight discs stick out on BOTH sides of her body, clearly visible outside her silhouette.

POSE, START of the rep: her arms are EXTENDED FORWARD, elbows almost straight, the bar held out in front of her at the level of her chest, her shoulder blades stretched apart, her chest pressed into the pad, hips seated, knees bent, both feet flat on the foot plates. Her back is flat, her head is in the line of her spine, she looks down at the pad.

DEPTH ORDER: from the camera - her back and shoulders, then her arms going forward, then the bar with her fists on it, then the chest pad and the frame behind the bar, then the pivot arm and the weight discs at the sides.

SINGLE FRAME: one continuous scene filling the whole canvas - no collage, no split panels, no inset, no duplicated figure, no second view of the same exercise.

CHARACTER: one athletic woman in her late 20s, lean, NOT bulky, dark-blonde hair in a ponytail, black sports bra, black shorts, black sneakers with white soles, neutral focused expression. Slim athletic build, thin arms, flat trapezius, no bodybuilder mass. Exactly this one person, nobody else in the frame.

HIGHLIGHT: a soft, semi-transparent warm-red X-ray glow visible through her skin over the LATISSIMUS DORSI ON BOTH SIDES OF HER BACK - from the armpit down along the ribcage toward the waist - plus the mid and lower trapezius between the shoulder blades. The glow follows the real muscle shape and tapers at the edges; it is not a round blob. Her neck, the backs of her arms below the elbow, her lower back, glutes and legs stay completely dark, and the machine stays dark.

BACKGROUND: seamless desaturated cool blue-grey studio backdrop with soft gradient and gentle vignette, soft floor shadow under the machine feet and her shoes, matte dark-grey steel with black pads and black weight discs, generous air above her head and around the whole machine, nothing cropped.

FORBIDDEN: a front view or a side profile of the athlete; a cable, a pulley, a rope or a weight stack; two separate diverging lever arms with vertical handles (that is a different machine); a barbell or dumbbells; hands on the middle of the bar; only one fist visible; elbows flared wide to the sides; the chest off the pad; hips lifted off the seat; heels raised; a bent rounded lower back; a photograph; an anatomy chart with white muscles; a second person; text or watermark. 3:2 landscape composition, one single image.
```

## Кадр 2 — женщина, финиш

```
STYLE - READ FIRST: a stylized CGI 3D render made for a fitness app, semi-realistic but unmistakably rendered, smooth matte shading, clean painted surfaces. NOT a photograph, not a cartoon, no camera grain. No text, no numbers, no logos, no watermark, no anatomy-chart artwork, no muscle diagram.

VIEWPOINT - READ SECOND, THIS IS THE MOST COMMON MISTAKE: we see the athlete from BEHIND and slightly to her right side, about 25 degrees off straight back, camera a little above her head height, 2.8 metres away - the SAME camera as the companion frame. Her BACK fills the centre of the frame: shoulder blades, the ponytail on the back of her head, the back of both arms, her waist and the back of both thighs. Her face is NOT visible. She faces away from the camera, toward the machine.

MACHINE - READ THIRD, IT IS NOT A CABLE MACHINE: a plate-loaded chest-supported row. A vertical steel frame stands in front of her; a slanted black chest pad is pressed against her chest; from the front of the machine ONE rigid pivot arm reaches down toward the floor, and at its outer end there is ONE long straight bar lying across the frame, wider than her shoulders, with a short angled grip at each end and one black weight disc loaded on each tip of the bar. Behind her is a seat, and on the floor in front of the seat are two foot plates. There is NO cable, NO pulley, NO rope, NO weight stack, NO handle on a cord anywhere in the scene.

TWO FISTS LOCK: her two fists grip the two angled end grips of the bar, one hand at each end. The bar is wider than her shoulders and its ends with the weight discs stick out on BOTH sides of her body, clearly visible outside her silhouette.

POSE, FINISHED position - the TOP of the row: she has pulled the bar straight back toward herself, her elbows are bent and driven BACKWARD along her ribs, not flared out to the sides, and the bar sits close in front of her chest pad. Her shoulder blades are drawn together and down, her chest is still pressed into the pad, her hips are still seated, her feet are still flat on the plates. Her torso did NOT rock backward and her head did NOT jut forward.

DEPTH ORDER: from the camera - her back and shoulders, then her bent arms with the fists near her sides, then the bar across in front of her chest, then the chest pad and the frame, then the pivot arm raised toward the camera and the weight discs at the sides.

SINGLE FRAME: one continuous scene filling the whole canvas - no collage, no split panels, no inset, no duplicated figure, no second view of the same exercise.

CHARACTER: one athletic woman in her late 20s, lean, NOT bulky, dark-blonde hair in a ponytail, black sports bra, black shorts, black sneakers with white soles, neutral focused expression. Slim athletic build, thin arms, flat trapezius, no bodybuilder mass. Exactly this one person, nobody else in the frame.

HIGHLIGHT: a soft, semi-transparent warm-red X-ray glow visible through her skin over the LATISSIMUS DORSI ON BOTH SIDES OF HER BACK - from the armpit down along the ribcage toward the waist - plus the mid and lower trapezius between the shoulder blades, which is squeezed together in this frame, so the glow is at its brightest. The glow follows the real muscle shape and tapers at the edges; it is not a round blob. Her neck, the backs of her arms below the elbow, her lower back, glutes and legs stay completely dark, and the machine stays dark.

BACKGROUND: seamless desaturated cool blue-grey studio backdrop with soft gradient and gentle vignette, soft floor shadow under the machine feet and her shoes, matte dark-grey steel with black pads and black weight discs, generous air above her head and around the whole machine, nothing cropped.

FORBIDDEN: arms extended forward as in the companion frame; a front view or a side profile of the athlete; a cable, a pulley, a rope or a weight stack; two separate diverging lever arms with vertical handles; a barbell or dumbbells; hands on the middle of the bar; only one fist visible; elbows flared wide to the sides; the chest off the pad; hips lifted off the seat; heels raised; a rounded upper back; a photograph; an anatomy chart with white muscles; a second person; text or watermark. 3:2 landscape composition, one single image.
```

## Мужская пара

Отличается одним блоком `CHARACTER` и местоимениями; камера, машина, локи, фазы, подсветка и фон —
те же, иначе пара разъедется. Файлы: `Machine_Row_start_m.png`, `Machine_Row_finish_m.png`.

```
CHARACTER: one athletic man in his late 20s, lean, NOT bulky, short dark-brown hair cropped at the sides, clean-shaven, black sleeveless training top, black shorts, black sneakers with white soles, neutral focused expression. Slim athletic build, no bodybuilder mass. Exactly this one person, nobody else in the frame.
```

## Итог прогонов (13.10)

Фактическая пара: **старт v2 + финиш v5** (`Machine_Row_start_v2…`, `Machine_Row_finish_v5…`).
Листы: `qc/row-ref-zoom.jpg` (референс по узлам), `qc/machine-row-copy.jpg` (референс против нашего
старта и первого финиша), `qc/machine-row-v5.jpg` (пара старт v2 + финиш v5).

До этого: старт v1 + финиш v1 — гриф развалился на два огрызка; финиш v2 — камера перескочила на
левую сторону, пара зеркальная; финиш v3 — сторона вернулась, но рама перерисована; финиш v4 — рама
опять другая. Причина всех четырёх — формулировка «широкий гриф с блинами на концах», её нет на
референсе: там две короткие вертикальные рукояти на рычагах и один рог с одним блином слева.

Остаточный брак, принятый сознательно: в финише правая рукоять читается чуть оторванной от рычага,
и наклон камеры между кадрами различается на несколько градусов.

## Имя папки

`name_eng = Machine Row` → папка `Machine_Row`. Нынешний кадр принадлежит строке
«Жим в тренажере Shoulder Press» и остаётся у неё, мы ничего не отнимаем.
