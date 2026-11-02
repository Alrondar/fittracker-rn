# -*- coding: utf-8 -*-
"""Промпты перерисовки 01.11, позиция 4.

Строка `a4e1a02f` «Пуловер со штангой на спину» — класс C разбора
`frame-mismatch-triage.md`, строка, которую нашла механическая проверка общих папок:
своего кадра у неё нет вообще. Ссылка стоит на `Bent-Arm_Barbell_Pullover/0.jpg`, то есть
на папку соседней строки `0719d4a4` «Пуловер со штангой ЛЕЖА (СОГНУТЫЕ руки)». На тех
кадрах человек лежит на скамье вдоль, локти сложены примерно под прямым углом и гриф
уходит за голову вниз к полу — это согнутый вариант, кадр принадлежит соседу.

Вердикт владельца 31.10 по этой строке: рисовать два кадра — прямые руки, гриф за голову.

Проверено 01.11 по источникам (hermq, Gravitus, FitnessAI, разбор Golden Era): пуловер со
штангой делают лёжа на скамье вдоль, стопы на полу, хват шире плеч, «arms mostly straight
with a soft bend», гриф по дуге за голову до ощущения растяжения. Поперёк скамьи (upper
back на подушке, таз ниже уровня) — тоже существующая манера, но в описаниях её нет, и наш
`settings` говорит «скамья горизонтальная», поэтому рисуем вдоль.

Значит единственный честный отличительный признак от соседа — УГОЛ ЛОКТЯ, и к нему
добавлен второй: ШИРИНА ХВАТА (у пуловера на широчайшие хват намного шире плеч, у
согнутого варианта — около ширины плеч). Оба признака заданы числами и стоят в первом
блоке промпта.

`name_eng` строки сейчас «Barbell Pullover» — общее имя, которое по факту занято чужой
папкой. По паре имён в каталоге (`Straight-Arm_Dumbbell_Pullover` и её же
«Bent-Arm Dumbbell Pullover») правильное имя этой строки — «Straight-Arm Barbell
Pullover», папка `Straight-Arm_Barbell_Pullover`: такой папки в медиа-репозитории нет и
такого `name_eng` в каталоге нет (проверено по выборке `%pullover%` — там семь строк).

Текстовая правка, которую надо назвать вслух: в `technique` сейчас «прямыми ИЛИ слегка
согнутыми руками» — эта вилка и есть причина, по которой две строки неразличимы. Кадр
рисуется по вердикту владельца (прямые руки), значит вилку надо снять: «прямые руки с
мягким сгибом в локте, угол локтя не меняется». Правка идёт в ту же миграцию, решение о
выкладке — за владельцем.

ЧЕМ РЕАЛЬНО ДЕЛАЛИСЬ КАДРЫ (важно для воспроизведения). Текстовые промпты ниже —
фолбэк и носитель чисел; принятые кадры сделаны правкой по картинке:
  00f — `Straight-Arm_Barbell_Pullover_start_v7`: изображение-в-изображение с принятого
        финиша, менять только направление рук; ключевая формулировка, которая починила
        перпендикулярность: «обе руки — две ПАРАЛЛЕЛЬНЫЕ вертикальные линии одинаковой
        длины, как рельсы, не крыша, не сходящиеся и не расходящиеся; гриф пересекает
        каждую запястье под 90° именно на картинке». До этого гриф делался горизонтальным
        по кадру, линия плеч уходила в глубину, и руки сходились домиком.
  01f — `Straight-Arm_Barbell_Pullover_finish_v4`: текст-в-изображение с линзой на высоте
        грифа (см. `illustration-style-lock.md`, раздел про ракурс).
  00m, 01m — правка по соответствующим женским кадрам с заменой только человека:
        «заменить ТОЛЬКО человека на мужчину … всё остальное остаётся на месте», плюс
        явный запрет на хвост и на женское лицо. Пара сверена по опорам скамьи:
        головной конец 0.28-0.32, ножной 0.72-0.76 во всех четырёх кадрах.
"""
import importlib.util
import io
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "prompts")

_spec = importlib.util.spec_from_file_location("b4", os.path.join(HERE, "build-batch4-prompts.py"))
b4 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(b4)

FOLDER = "Straight-Arm_Barbell_Pullover"

RULE = (
    "THE ONE RULE THAT DECIDES IF THIS IMAGE IS CORRECT: this is a STRAIGHT-ARM BARBELL PULLOVER for the "
    "lats, and the barbell must READ as lying SQUARE ACROSS the bench, at ninety degrees to the length of "
    "the bench, not along it. HOW THE CAMERA MAKES THAT VISIBLE: the bench runs AWAY from the lens into "
    "the depth of the picture, so the bench is drawn as a band that narrows and rises toward the athlete's "
    "feet, while the barbell is drawn as a long horizontal line crossing that receding bench - the two "
    "directions must look perpendicular to the eye. If the bench and the bar are drawn as two parallel "
    "horizontal lines, the image is WRONG whatever the athlete's arms do. FOUR MORE THINGS MUST BE TRUE AT "
    "ONCE: (1) both arms are perfectly STRAIGHT - the elbow angle is about 170 degrees, one unbroken line "
    "from shoulder to wrist, the two arms parallel to each other like two rails of equal length, neither "
    "converging nor diverging; (2) the GRIP IS WIDE - her hands sit far outside shoulder width, about one "
    "and a half times it, so a long stretch of bare bar shows between each hand and each shoulder; (3) ONE "
    "barbell only, a dark bar with two large round black plates of the same diameter at the same height, "
    "both hands on the same bar, no dumbbells; (4) she lies on her back with her head, shoulder blades, "
    "upper back and hips on the pad and both feet flat on the floor. If the elbows fold to a right angle, "
    "if the hands come to shoulder width, if the bar stops above her forehead instead of going behind her, "
    "if she sits or stands, or if the bar is lowered to the chest like a press, the image is WRONG. TWO "
    "ARMS, TWO LEGS, ONE BODY: exactly two arms and two legs, one body, both hands gripping the bar the "
    "same way. Both feet stand flat on the floor on the two sides of the bench, knees bent about 90 "
    "degrees, and they do not move between the two frames."
)

CAM = (
    "CAMERA: the lens stands BEYOND THE HEAD END of the bench and about 35 degrees around to her RIGHT "
    "side, 1.3 m above the floor, 3.0 m from her chest, looking down the length of the bench toward her "
    "feet. Her head and shoulders are the NEAREST and LARGEST parts of her body and sit low in the "
    "picture; her hips, knees and shoes recede away from the lens and are drawn smaller and higher. "
    "ORIENTATION LOCK: her head low and near the centre-left, her feet higher and toward the right, and "
    "her RIGHT arm, right shoulder and right hip are the NEAR ones - the same in both frames of this "
    "pair, never mirrored, never a flat top-down view, never a dead side view. BENCH GEOMETRY: the flat "
    "black pad is a band that starts wide and low under her shoulders and narrows as it recedes to her "
    "feet, with its two dark leg-frames standing on the same floor line; no backrest, no uprights, "
    "nothing rising above the pad. FRAMING: the top of her head at about 55 percent of the frame height, "
    "the sole of her near shoe at about 80 percent, the barbell fully inside the picture with empty "
    "backdrop beyond each end of the bar."
)

IDENT = (
    "EXERCISE IDENTITY: STRAIGHT-ARM BARBELL PULLOVER - a lat exercise in which a barbell held at arm's "
    "length with locked-straight elbows arcs backward over and behind the head while the shoulder blades "
    "stay pinned to the bench. One flat bench and one barbell - no dumbbells, no cables, no rack, no "
    "machine, no EZ-curl bar."
)

# Вердикт владельца 01.11: штанга перпендикулярна телу и одновременно параллельна
# полу, а на кадрах один конец выглядел ниже. Причина геометрическая — линза стоит
# ниже грифа, и при повороте на 25° от профиля дальний конец горизонтальной штанги
# проецируется выше ближнего. Лечим явно: гриф задан горизонтальной линией картинки.
APP = (
    "APPARATUS, unit by unit: (1) one FLAT bench - a single horizontal black padded slab on two dark metal "
    "leg-frames, NO backrest, NO uprights, NO rack arms, NO J-cups, NO hooks and NO vertical part of any "
    "kind: nothing stands behind her head and nothing rises above the pad anywhere. (2) ONE barbell - a "
    "straight dark-grey Olympic bar with two identical round black plates on each end; the bar is straight, "
    "NOT an EZ-curl bar with a zig-zag. (3) no second bench, no weight rack, no mirror, no mat, no bands, "
    "no chalk, no second person. BAR LEVEL LOCK: The barbell is drawn as a "
    "PERFECTLY HORIZONTAL line in the picture - both ends at exactly the same height, both plate stacks "
    "the same size and the same distance from the top edge of the frame. The bar lies across her body at "
    "right angles to the length of her torso and parallel to the floor, so it never tilts, never has one "
    "end lower than the other and never shows one plate larger than the other. GRIP LOCK: an overhand "
    "grip with the thumbs around the bar, the hands placed far outside "
    "shoulder width - about one and a half times it - so that the stretch of bare bar between each hand "
    "and the shoulder on that side is about as long as her own head, in BOTH frames, and the hand position "
    "does not change between the frames. A shoulder-width grip is WRONG - it belongs to the neighbouring "
    "bent-arm row. BODY CONTACT LOCK: her head, shoulder blades, upper back and hips stay on the pad in "
    "both frames; her lower back may arch a little as the bar goes behind her, but her hips never leave "
    "the pad and her bottom never slides off it. FOOT LOCK: both feet flat on the floor, one on each side "
    "of the bench, knees bent about 90 degrees, shins vertical."
)

HL = (
    "HIGHLIGHT - THE TARGET IS THE BACK, NOT THE CHEST: a soft semi-transparent warm-red tint under intact "
    "skin over each LATISSIMUS DORSI - the broad sheet that begins at the outer edge of the armpit and "
    "sweeps down the SIDE of the ribcage toward the waist - plus a smaller strip of the same tint over the "
    "SERRATUS ANTERIOR, the finger-edged muscle on the ribs just below the armpit. Draw the tint as a "
    "band along the SIDE and the REAR of the ribcage, behind the arm. NO peeled-back skin, no exposed "
    "striated muscle, no diagram lines - the skin stays smooth and the red shows through it. The chest, "
    "the abdomen, the shoulders, the biceps, the triceps, the hips and the legs keep their plain skin "
    "colour with no red tint at all."
)

START = (
    "PHASE - FRAME 1, BAR STRAIGHT UP OVER THE CHEST: she holds the barbell at full arm's length DIRECTLY "
    "ABOVE the middle of her chest, over the nipple line - the arms point straight UP at about 90 degrees "
    "to the floor, vertical, NOT tilted back toward her head and NOT above her face. The elbow angle is "
    "about 175 degrees, the upper arms sit beside the line of her ears, the wrists are stacked over the "
    "elbows and the bar is horizontal. Her head, shoulder blades and hips rest on the pad, her gaze "
    "straight up along her arms, her chest is lifted. This is the FRONT limit of the range: in this frame "
    "the bar is over her chest, and only in the companion frame does it travel back behind her head."
)

FINISH = (
    "PHASE - FRAME 2, BAR BEHIND THE HEAD: the barbell has swung back in one long arc over her forehead "
    "and now hangs BEHIND her head, the arms still perfectly STRAIGHT at the same about 175 degrees - the "
    "elbow angle has not changed at all between the two frames. Measured against her body the two arms "
    "form one straight line continuing from the shoulders past the top of her head, angled down toward the "
    "floor behind her by about 35 degrees, so the bar sits above and behind her head at about the height "
    "of the bench pad and does NOT touch the floor. The grip is still the same wide grip, the bar still "
    "horizontal, the plates still clear of the pad. Her shoulder blades and hips stay pinned to the bench, "
    "her lower back arches slightly, her head stays on the pad, her feet have not moved. The bar is NOT "
    "lowered toward her chest and her elbows are NOT dropped or folded."
)

# Якорь снят с принятых кадров 01.11 (головный конец камеры): опоры скамьи на старте
# 0.28-0.57 и 0.61-0.67 ширины кадра, на финише 0.28-0.84; мужская пара легла на те же
# числа с точностью до сотых, поэтому замок общий на все четыре кадра позиции.
PAIR_LOCK = (
    "BENCH-TO-BODY LOCK - THE ANCHOR ALL FOUR FRAMES SHARE: the bench is drawn at the same place and the "
    "same size in every frame of this position. Its near leg-frame stands at about 28 to 57 percent of "
    "the frame width, its far leg-frame at about 61 to 67 percent of the width, and the pad narrows as it "
    "recedes from under her shoulders to her feet. Her head sits low and near the centre of the picture, "
    "the sole of her near shoe at about 80 percent of the frame height, and her body is drawn exactly the "
    "same size in every frame - the camera does not slide, does not pull back and does not rotate; only "
    "her arms and the bar change. WIDE ENOUGH TO FIT THE BAR: the barbell and both plate stacks must be "
    "FULLY inside the picture with a clear strip of empty backdrop beyond each end of the bar; if a "
    "plate, a hand or an elbow is cut by any edge of the frame, the image is WRONG."
)

FORB = (
    "FORBIDDEN: folded elbows in either frame - a right-angle elbow is the neighbouring bent-arm row and "
    "the exact defect of the current frame; a TILTED barbell - one end of the bar lower than the other, or "
    "one plate drawn larger or nearer the top edge than the other; a shoulder-width or only slightly wider "
    "grip, with no clear "
    "head-length of bare bar between each hand and each shoulder; the bar resting on her chest or lowered "
    "to it like a press; the bar touching the floor behind her; the bar stopped above her forehead instead "
    "of travelling behind her head; one arm bent and one straight; dumbbells, a cable, a band, an EZ-curl "
    "bar, a machine or a second bar; a backrest, uprights, rack arms or hooks behind her "
    "head; a bench with a vertical part of any kind; her hips or shoulders lifting off the pad; her bottom "
    "sliding off the bench; legs stretched flat, feet up on the bench, feet tucked under it or one knee "
    "collapsed inward; a sit-up, a standing pull-over or a decline bench; red tint on the chest, the "
    "shoulders or the abdomen instead of the side and rear of the ribcage; an anatomy cutaway - peeled-back "
    "skin, exposed striated muscle or diagram lines instead of a plain tint under intact skin; the bench, "
    "the camera or her body size changed between the two frames; a plate, hand or elbow cropped by the "
    "edge of the frame; a photograph; a man's body or a man's face; letters or a logo on clothing; a "
    "mirrored orientation."
)

WARDROBE = (
    "MATCHES THE COMPANION FRAME (read this before posing): the SAME woman, the SAME outfit and the SAME "
    "build as the other frame of this pair - a black sports bra with a wide under-band, black shorts that "
    "run to mid-thigh, black sneakers with white soles, dark-blonde hair in a ponytail lying out on the "
    "pad. BUILD LOCK: LEAN, not bulky - smooth muscle, NO visible fibre striations, flat stomach. If her "
    "outfit or her build differs from the companion frame, the image is WRONG."
)

EXTRA = chr(10).join([WARDROBE])

WARDROBE_M = (
    "MATCHES THE COMPANION FRAME (read this before posing): the SAME man, the SAME outfit and the SAME "
    "build as the other frame of this pair - a black sleeveless training top, black shorts that run to "
    "mid-thigh, black sneakers with white soles, short dark hair. BUILD LOCK: LEAN and athletic, not "
    "bulky - smooth muscle, flat stomach. If his outfit or his build differs from the companion frame, "
    "the image is WRONG."
)

# b4.male меняет «her» по границе слова, не глядя на падеж, и не трогает ВЕРХНИЙ
# регистр внутри блоков-замков - эти три случая починены явно.
MALE_FIXES = (
    ("athletic woman", "athletic man"),
    ("this one woman", "this one man"),
    ("a man's body or a man's face", "a woman's body or a woman's face"),
    ("her head, shoulder blades", "his head, shoulder blades"),
    ("WITH HER BODY", "WITH HIS BODY"),
    ("both sides of her, knees", "both sides of him, knees"),
)


def masculine(text):
    text = b4.male(text)
    for a, b in MALE_FIXES:
        text = text.replace(a, b)
    return text


written = []
for suffix, phase, is_male in (("_start", START + chr(10) + chr(10) + PAIR_LOCK, False),
                               ("_finish", FINISH + chr(10) + chr(10) + PAIR_LOCK, False),
                               ("_start_m", START + chr(10) + chr(10) + PAIR_LOCK, True),
                               ("_finish_m", FINISH + chr(10) + chr(10) + PAIR_LOCK, True)):
    extra = WARDROBE_M if is_male else EXTRA
    text = b4.render(RULE, CAM, IDENT, APP, phase, b4.MAN if is_male else b4.WOMAN, HL, FORB, extra)
    if is_male:
        text = masculine(text)
    path = os.path.join(OUT, FOLDER + suffix + ".txt")
    io.open(path, "w", encoding="utf-8", newline="\n").write(text)
    written.append((os.path.basename(path), len(text)))

for name, size in written:
    print(name, size)
