# -*- coding: utf-8 -*-
"""Промпты перерисовки 01.11, позиция 2 (из оставшихся пяти).

Строка `813c576c` «Подъём гантелей перед собой лёжа на наклонной скамье» — класс C
разбора `frame-mismatch-triage.md`. Её кадр — фото из апстрима: спиной к подушке,
ЛОКТИ СОГНУТЫ, гантели уходят над головой. Читается как жим гантелей на наклонной
(`a4b05d2e`), чьи кадры почти совпадают. При этом наш текст обещал «лягте ГРУДЬЮ».

Вердикт владельца 01.11 после веб-проверки по четырём источникам (g1v.me, ElevareFit,
MasterClass, GMLYFT): рисовать КАНОН — СИДЯ на наклонной 30-60°, спиной к подушке,
руки ПРЯМЫЕ, подъём перед собой до уровня плеч. Опора корпуса и есть смысл варианта:
она снимает читинг, которым стоит мах. Значит вместе с кадрами правятся `technique`,
`settings` и русское имя («лёжа» -> «сидя»), а `name_eng` остаётся прежним —
«Front Incline Dumbbell Raise» источники называют ровно так же.

Папка та же, `Front_Incline_Dumbbell_Raise` (на неё смотрит одна строка в каталоге):
кладем 00f/01f/00m/01m рядом, два прежних фото-кадра удаляем тем же коммитом.

Главный признак, по которому кадр сдаётся или бракуется: локоть НЕ сгибается ни в
одной фазе. Как только угол в локте меньше 160 градусов — это уже жим, и кадр не
отличается от соседней строки.

Женская пара принята владельцем 01.11 со второго прогона (первый финиш — в
`vibe_images/rejected-2026-11-01/`), там же сделан и замер скамьи, который теперь
стоит в FINISH_PARITY. Вердикт по мужской паре: «делай мужскую версию».
"""
import importlib.util
import io
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "prompts")

_spec = importlib.util.spec_from_file_location("b4", os.path.join(HERE, "build-batch4-prompts.py"))
b4 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(b4)

FOLDER = "Front_Incline_Dumbbell_Raise"

RULE = (
    "THE ONE RULE THAT DECIDES IF THIS IMAGE IS CORRECT: this is a SEATED INCLINE FRONT RAISE with "
    "DUMBBELLS - the athlete sits back against an inclined bench pad and lifts both weights straight "
    "FORWARD by turning at the shoulder joints with the arms kept STRAIGHT. It is a raise, not a press "
    "and not a curl. FOUR THINGS MUST BE TRUE AT ONCE: (1) she is SEATED - her buttocks rest on the "
    "seat of the bench, her whole back from hips to head lies flat against the inclined pad, which is "
    "set at about 45 degrees, and both feet stand on the floor; (2) BOTH ELBOWS ARE STRAIGHT IN BOTH "
    "FRAMES - the elbow angle never drops below about 165 degrees, there is a hair of softness in the "
    "joint and nothing more, the arms do not fold at any point of the movement; (3) exactly TWO "
    "dumbbells, one gripped in each hand, and the two hands move together, not one after the other; "
    "(4) both arms swing in the plane directly IN FRONT OF HER SHOULDERS, never opened out to the "
    "sides, which would make it a lateral raise. If the dumbbells are ever in front of her chest with "
    "folded elbows, if the hands end up over her sternum or in line with the pad behind her head, if she "
    "lies chest-down on the pad, if she stands, or if only one arm moves, the image is WRONG. TWO ARMS, "
    "TWO LEGS, ONE BODY: exactly two arms and two legs, one dumbbell in each hand, both hands gripping "
    "their own dumbbell the same way as mirror images of each other."
)

CAM = (
    "CAMERA: her RIGHT side, three-quarter rather than dead-on - turned about 25 degrees from a true "
    "profile toward the lens so that BOTH arms and BOTH dumbbells read separately and the near arm does "
    "not hide the far one. The lens stands at the height of her shoulder joint when she is seated, about "
    "2.8 m from her, level with the floor. ORIENTATION LOCK: her head and the top of the inclined pad "
    "are at the LEFT of the frame, her knees, shins and shoes at the RIGHT, and her RIGHT arm, right "
    "shoulder and right hip are the NEAR ones - the same in both frames, never mirrored. BENCH GEOMETRY "
    "LOCK: the inclined pad is one straight dark band rising from about 62 percent of the frame width "
    "and 74 percent of the frame height at its lower end to about 27 percent of the frame width and 24 "
    "percent of the frame height at its top, tilted about 45 degrees back to the LEFT, and the seat pad "
    "continues from its foot down and to the RIGHT at a much shallower angle. The bench is drawn at the "
    "SAME place, the SAME angle and the SAME size in both frames - only her arms change. ABSOLUTE "
    "FRAMING NUMBERS BOTH FRAMES SHARE: the top of her head sits at about 20 percent of the frame "
    "height, the sole of her near shoe at about 88 percent, the front edge of the seat at about 70 "
    "percent of the frame height, and she occupies the same share of the frame in both pictures. If the "
    "pad is steeper, flatter, longer or shorter than in the companion frame, or her body is larger or "
    "smaller, the camera moved and the image is WRONG."
)

IDENT = (
    "EXERCISE IDENTITY: SEATED INCLINE DUMBBELL FRONT RAISE - a front-deltoid raise done seated on an "
    "incline bench so the pad supports the torso and the body cannot swing the weight. Two dumbbells and "
    "one incline bench - no barbell, no cables, no machine, no rack, no plates on the floor."
)

APP = (
    "APPARATUS, unit by unit: (1) ONE adjustable INCLINE BENCH - a long dark padded backrest tilted back "
    "about 45 degrees, meeting a shorter near-horizontal seat pad at its lower end, on a dark metal "
    "frame with feet flat on the floor. The backrest is present and she sits INTO it: her shoulder "
    "blades, the back of her head and her triceps all touch the pad. No uprights, no rack arms, no "
    "barbell hooks, no lat pulldown lever, no logos or letters on the upholstery. (2) TWO identical "
    "black hex-head dumbbells of medium size, one in each hand, handles gripped across the palm. (3) "
    "nothing else in the room: no second bench, no dumbbell rack, no mirror, no mat, no band, no bench "
    "under the feet. BODY CONTACT LOCK: her head, upper back and hips stay against the pad in both "
    "frames; only the arms move. FOOT LOCK: both feet flat on the floor, one on each side of the seat, "
    "knees bent about 90 degrees, shins vertical, and they do not move between the two frames. If her "
    "head or her lower back lifts off the pad, or her bottom slides forward off the seat, the image is "
    "WRONG."
)

HL = (
    "HIGHLIGHT: a soft semi-transparent warm-red X-ray glow through the skin over each FRONT DELTOID - "
    "the cap of muscle at the FRONT of the shoulder joint, between the collarbone line and the point "
    "where the arm begins. Two small caps and nothing else: the chest, the biceps, the triceps, the "
    "abdomen, the neck, the forearms, the hips and the legs keep their plain skin colour with no red "
    "tint at all, and the side and rear of the shoulder stay dark."
)

START = (
    "PHASE - FRAME 1, WEIGHTS AT THE THIGHS: both arms are completely STRAIGHT, the elbow angle about "
    "175 degrees, and they extend down and forward so that each dumbbell hangs just above its own "
    "quadriceps, an inch clear of the thigh, in front of her knees. The palms face DOWNWARD toward the "
    "floor, the wrists are straight, the two dumbbells are parallel to each other and about shoulder-"
    "width apart. Her shoulder blades and the back of her head rest against the inclined pad, her hips "
    "are at the join between the backrest and the seat, both feet stand flat on the floor. This is the "
    "lowest point of the range - the weights have not started to rise yet and the arms are ALREADY "
    "straight, because in this exercise the arms never bend."
)

FINISH = (
    "PHASE - FRAME 2, WEIGHTS RAISED IN FRONT: the arms are still perfectly STRAIGHT - the elbow angle "
    "is unchanged, only the shoulder joints have turned - and each weight has travelled straight "
    "FORWARD and UP from its own thigh to a point clearly above her own shoulder joint. Measured against "
    "her body, each arm is turned about 95 degrees away from her torso, roughly perpendicular to the "
    "inclined pad; on screen that means both arms point up and to the RIGHT at about 50 degrees above "
    "horizontal, out over the space in front of her knees. The two hands stay APART by about the width "
    "of her own head, one dumbbell above the outside of each thigh - they never converge, never line up "
    "behind one another and never touch, because two separate arms hold them apart. The palms still face "
    "the floor, the wrists stay straight. Her head, shoulder blades, hips and both feet have not moved "
    "and are exactly where the start frame puts them; the weights are NOT over her chest, NOT in line "
    "with the pad behind her head and NOT folded toward her face."
)

# Замер принятого стартового кадра 01.11: задняя кромка подушки пересекает кадр в
# точках (0.21;0.20) (0.24;0.30) (0.27;0.40) (0.30;0.50), макушка на 4 % высоты.
# Без этих чисел модель на финише сдвинула скамью влево на 4 % ширины, подняла
# корпус вертикальнее и оторвала затылок от подушки.
FINISH_PARITY = (
    "MEASURED PARITY AGAINST THE START FRAME OF THIS PAIR - THE DEFECT OF THE FIRST DRAFT: the back "
    "edge of the inclined pad crosses the frame at 21 percent of the frame WIDTH when it is at 20 "
    "percent of the frame HEIGHT, at 24 percent of the width at 30 percent of the height, at 27 percent "
    "of the width at 40 percent of the height and at 30 percent of the width at 50 percent of the "
    "height, and the top corner of that pad sits at about 20 percent width and 17 percent height. Draw "
    "the bench on exactly those coordinates, at the same angle and the same size as in the start frame; "
    "the crown of her head stays at about 4 percent of the frame height. HEAD-ON-PAD LOCK: the back of "
    "her skull remains pressed into the upholstery exactly where the start frame puts it - her neck does "
    "NOT crane forward to watch the weights, her torso does NOT sit more upright, and if a gap opens "
    "between the back of her head and the pad, or the pad stands left of those numbers, the image is "
    "WRONG. Only her arms are different in this frame."
)

FORB = (
    "FORBIDDEN: bent elbows in either frame - a folded elbow turns this into an incline press, which is "
    "a different row and the exact defect of the current frame; dumbbells stopped in front of her chest "
    "with folded arms; the hands pushed up over her face in line with the pad behind her head; one arm "
    "raised and one down; lying chest-down on the pad; standing, kneeling or perching on the edge of the "
    "seat with the back off the pad; the head or lower back lifted away from the pad; the torso upright "
    "on a flat or vertical pad rather than reclined at about 45 degrees; a flat bench, a decline bench or "
    "a bench with no backrest; a barbell, a plate, a cable, a band or a machine; a dumbbell rack, mirror "
    "or second person in the room; arms swung out to the sides into a lateral raise; a swinging or "
    "arching body; feet up on the bench or tucked under it; red glow anywhere but the front of the "
    "shoulder joint; the bench, its angle or the camera size changed between the two frames; a "
    "photograph; a man's body or a man's face; letters or a logo on clothing; a mirrored orientation."
)

WARDROBE = (
    "MATCHES THE COMPANION FRAME (read this before posing): the SAME woman, the SAME outfit and the "
    "SAME build as the other frame of this pair - a black sports bra with a wide under-band, black "
    "shorts that run to mid-thigh, black sneakers with white soles, dark-blonde hair in a ponytail. "
    "BUILD LOCK: LEAN, not bulky - smooth muscle, NO visible fibre striations, flat stomach. If her "
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

# b4.male не трогает ВЕРХНИЙ регистр внутри блоков-замков, блок персонажа и фразу
# про «man's body» в FORB (там как раз она и должна перевернуться).
MALE_FIXES = (
    ("IN FRONT OF HER SHOULDERS", "IN FRONT OF HIS SHOULDERS"),
    ("athletic woman", "athletic man"),
    ("this one woman", "this one man"),
    ("a man's body or a man's face", "a woman's body or a woman's face"),
)


def masculine(text):
    text = b4.male(text)
    for a, b in MALE_FIXES:
        text = text.replace(a, b)
    return text


# Замер принятого мужского стартового кадра 01.11: задняя кромка подушки
# (0.22;0.20) (0.26;0.30) (0.28;0.40) (0.31;0.50), верхний угол около (0.21;0.12),
# макушка на 6 % высоты. Мужская скамья стоит на ~1 % правее женской — поэтому
# числа сверки для мужского финиша свои, а не общие на пару.
MALE_FINISH_PARITY = (
    "MEASURED PARITY AGAINST THE START FRAME OF THIS MALE PAIR: the back edge of the inclined pad "
    "crosses the frame at 22 percent of the frame WIDTH when it is at 20 percent of the frame HEIGHT, "
    "at 26 percent of the width at 30 percent of the height, at 28 percent of the width at 40 percent "
    "of the height and at 31 percent of the width at 50 percent of the height, the top corner of that "
    "pad sits at about 21 percent width and 12 percent height, and the crown of his head stays at about "
    "6 percent of the frame height. Draw the bench on exactly those coordinates, at the same angle and "
    "the same size as in his start frame. HEAD-ON-PAD LOCK: the back of his skull remains pressed into "
    "the upholstery exactly where his start frame puts it - his neck does NOT crane forward to watch the "
    "weights, his torso does NOT sit more upright, and if a gap opens between the back of his head and "
    "the pad, or the pad stands left of those numbers, the image is WRONG. Only his arms are different "
    "in this frame."
)

written = []
for suffix, phase, is_male in (("_start", START, False),
                               ("_finish", FINISH + chr(10) + chr(10) + FINISH_PARITY, False),
                               ("_start_m", START, True),
                               ("_finish_m", FINISH + chr(10) + chr(10) + MALE_FINISH_PARITY, True)):
    extra = WARDROBE_M if is_male else EXTRA
    text = b4.render(RULE, CAM, IDENT, APP, phase, b4.MAN if is_male else b4.WOMAN, HL, FORB, extra)
    if is_male:
        text = masculine(text)
    path = os.path.join(OUT, FOLDER + suffix + ".txt")
    io.open(path, "w", encoding="utf-8", newline="\n").write(text)
    written.append((os.path.basename(path), len(text)))

for name, size in written:
    print(name, size)
