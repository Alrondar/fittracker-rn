# -*- coding: utf-8 -*-
"""Промпты перерисовки 01.11, позиция 3 (из оставшихся четырёх).

Строка `726e06e3` «Разводка гантелей лёжа на полу» — класс C разбора
`frame-mismatch-triage.md`: кадр нарисован не под своё имя при уникальном движении.
Ссылается на `exercises/Dumbbell_Flyes/0.jpg`, где человек разводит руки над ГОРИЗОНТАЛЬНОЙ
СКАМЬЕЙ с полной дугой ниже уровня подушки — это движение соседней строки `9564b145`
«Разводка гантелей лежа» (её принятая пара — `Dumbbell_Fly/00f.jpg`, `01f.jpg`).

Текст строки править НЕ нужно, он верный: «лягте на пол… разведите руки в стороны до
момента, когда плечи мягко коснутся пола». Снаряд тоже верный — только «Гантели», скамья
не заявлена. Неверны кадр и английское имя: `name_eng` = «Dumbbell Flyes», то есть
обычная разводка; по источникам вариант называется «Dumbbell Floor Fly» (Motra, PureGym).

Отсюда: новая папка `Dumbbell_Floor_Fly` (в медиа-репозитории такой нет, имени с таким
`name_eng` в каталоге нет), ссылка переезжает на неё, `name_eng` меняется — а вместе с
ним пересобирается `search_text`, потому что `name_eng` кормит `trg_fill_search_text`
укороченной формулой. Русское имя остаётся как есть.

Ключевой признак приёмки: в нижней точке дуги ПЛЕЧО (отрезок от плечевого сустава до
локтя) лежит на полу — пол и останавливает амплитуду, в этом весь смысл варианта без
скамьи. Второй признак: скамьи в кадре нет вообще. Третий: руки расходятся в стороны,
а не уходят за голову — за головой это пуловер, он тоже в очереди (`a4e1a02f`).

Камера взята из семьи принятой пары `Dumbbell_Fly`: голова слева, стопы справа, вид
из-за головного конца с поворотом на ~30° к её правой стороне — но ниже (0.4 м), иначе
касание плечом пола не читается.

Порядок фаз по `technique`: старт — гантели над грудью, финиш — руки разведены.
"""
import importlib.util
import io
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "prompts")

_spec = importlib.util.spec_from_file_location("b4", os.path.join(HERE, "build-batch4-prompts.py"))
b4 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(b4)

FOLDER = "Dumbbell_Floor_Fly"

RULE = (
    "THE ONE RULE THAT DECIDES IF THIS IMAGE IS CORRECT: this is a DUMBBELL FLOOR FLY - the athlete lies "
    "flat on her back ON THE BARE FLOOR and opens both arms wide in an arc to the two sides, then closes "
    "them back over her chest. FOUR THINGS MUST BE TRUE AT ONCE: (1) her head, shoulders, upper back and "
    "hips lie DIRECTLY on the studio floor - there is NO bench, NO pad, NO mat, NO platform and NO raised "
    "support of any kind anywhere under her body or beside it; (2) exactly TWO dumbbells, one gripped in "
    "each hand, and the two hands do the same thing as mirror images of each other; (3) the arms travel in "
    "a WIDE ARC out to the SIDES, roughly in line with her shoulders - the elbow keeps one soft fixed "
    "bend all the way, so this is a fly and not a press, and the hands never fold down toward her chest; "
    "(4) at the bottom of the arc the UPPER ARM - the segment between her shoulder and her elbow - rests "
    "FLAT ON THE FLOOR, because the floor is what stops the range; nothing sinks below the floor line. If "
    "a bench appears under her, if her arms travel back behind her head instead of out to the sides, if "
    "the elbows fold like a press, if she lies on her side, sits or kneels, or if only one arm moves, the "
    "image is WRONG. TWO ARMS, TWO LEGS, ONE BODY: exactly two arms and two legs, one dumbbell in each "
    "hand. Both knees are bent about 90 degrees and both feet stand flat on the floor, one on each side "
    "of her hips, and they do not move between the two frames."
)

CAM = (
    "CAMERA: low, from beyond the HEAD end of her body and turned about 30 degrees around to her RIGHT "
    "side, only 0.4 m above the floor, 3.1 m from her chest, looking along her body toward her feet. Her "
    "head and shoulders are the NEAREST and LARGEST parts and sit low in the LEFT of the picture, her "
    "hips and shoes recede up and to the RIGHT and become slightly smaller. ORIENTATION LOCK: head at the "
    "LEFT, shoes at the RIGHT, and her RIGHT arm, right shoulder and right hip are the NEAR ones - the "
    "same in both frames, never mirrored, never a flat top-down view, never a side profile, never from "
    "the feet end. FRAME WIDE - THE DEFECT OF THE FIRST DRAFT, WHICH FILLED THE CANVAS WITH HER BODY: she "
    "occupies about 60 percent of the frame WIDTH, not 90, and there is a clear band of empty floor on "
    "both sides of her, because in the companion frame her arms lie opened flat to the two sides and must "
    "fit there without being cropped. ABSOLUTE FRAMING NUMBERS BOTH FRAMES SHARE: the crown of her head "
    "sits at about 52 percent of the frame height, the sole of her near shoe at about 76 percent, her "
    "hips at about 62 percent, the top of her raised dumbbells at about 22 percent, and she occupies the "
    "same share of the frame in both pictures - do not zoom in, do not step closer, keep the same "
    "headroom. SCALE LOCK: one metre of her body is the same number of pixels in both frames. If her body "
    "is drawn larger, smaller, higher or at another angle than those numbers, the camera moved and the "
    "image is WRONG."
)

IDENT = (
    "EXERCISE IDENTITY: DUMBBELL FLOOR FLY - the chest fly performed on the floor instead of on a bench, "
    "where the ground catches the upper arms and shortens the range. Two dumbbells and an empty studio "
    "floor - no bench, no rack, no cables, no barbell, no bands, no machine."
)

APP = (
    "APPARATUS, unit by unit: (1) the BARE FLOOR - one continuous seamless desaturated cool blue-grey "
    "studio floor with a soft gradient, a gentle shadow directly under her body that proves she is lying "
    "ON it, and NOTHING else on it. NO BENCH LOCK: no bench, no pad, no step, no mat, no towel, no "
    "platform, no raised support of any kind, no bench legs, no frame, no upholstery anywhere in the "
    "picture - if any horizontal padded surface appears under her back, her arms or beside her body, the "
    "image shows the neighbouring bench exercise and is WRONG. (2) TWO identical black hex-head dumbbells "
    "of medium size, one gripped in each hand, handles across the palm, the two dumbbells the same size "
    "and the same shape in both frames. (3) no second person, no spotter, no mirror, no dumbbell rack, no "
    "plates on the floor, no logos or letters on clothing. BODY CONTACT LOCK: in both frames the back of "
    "her head, her shoulder blades, her upper back and her hips all press the floor - she is not bridged "
    "up, her lower back keeps only a natural small gap, and nothing lifts her torso off the ground. FOOT "
    "LOCK: both feet flat on the floor, knees bent about 90 degrees, shins vertical, one foot on each "
    "side of her hips, unchanged between the two frames."
)

HL = (
    "HIGHLIGHT: a soft semi-transparent warm-red X-ray glow through the skin over BOTH PECTORAL muscles - "
    "the fan of chest muscle between the collarbone line, the sternum in the middle and the outer edge of "
    "the armpit, stretched across the front of her ribcage. DRAW IT AS A TINT UNDER INTACT SKIN - THE "
    "DEFECT OF THE FIRST DRAFT, WHICH PAINTED AN ANATOMY CUTAWAY: her skin surface stays smooth, "
    "continuous "
    "and unbroken exactly like the rest of her body, and the red simply shows through it. NO peeled-back "
    "flap of skin, NO exposed muscle belly, NO fibre striations, NO visible muscle bundles, NO tendon or "
    "rib detail, NO diagram lines, NO second body layer. Chest only: the front of the shoulder, the "
    "biceps, the triceps, the abdomen, the hips, the thighs, the knees and the shins keep their plain "
    "skin colour with no red tint at all."
)

START = (
    "PHASE - FRAME 1, ARMS UP OVER THE CHEST: both arms reach straight up over the middle of her chest, "
    "the elbow angle about 160 degrees - a small fixed soft bend, not a locked joint and not a folded "
    "arm. The two dumbbells sit side by side above her sternum at about one head-width apart, palms turned "
    "toward each other. Her shoulder blades are drawn down and back into the floor, her chest is lifted "
    "and open, the back of her head rests on the floor, her gaze is straight up at her hands. This is the "
    "top of the movement, the arms are already up and nothing is stretched yet."
)

FINISH = (
    "PHASE - FRAME 2, ARMS OPEN ON THE FLOOR: both arms have swung OUT WIDE to the two sides in one open "
    "arc and now lie along the floor, the elbow angle still about 160 degrees - the SAME soft bend as in "
    "the first frame, unchanged. The back of each UPPER ARM and each triceps rests flat on the floor, the "
    "elbows and the dumbbells sit at floor level, nothing presses below the floor line. The two hands are "
    "out roughly in line with her shoulders, a little toward her head, the palms still turned toward each "
    "other, the two dumbbells parallel to each other. Her arms form one wide horizontal line across the "
    "picture, her chest is stretched open, her head, hips and both feet have not moved. The arms are NOT "
    "reached back behind her head - that would be a pullover, a different exercise."
)

# Замер принятого стартового кадра 01.11: центр головы (0.29;0.65), белая подошва
# ближней обуви (0.77;0.62), кисти поднятых рук верхняя точка кожи 0.19.
FINISH_PARITY = (
    "MEASURED PARITY AGAINST THE START FRAME OF THIS PAIR: the centre of her head on the floor sits at "
    "about 29 percent of the frame WIDTH and 65 percent of the frame HEIGHT, the white sole of her near "
    "shoe at about 77 percent of the width and 62 percent of the height, her near shoulder at about 36 "
    "percent of the width, and her hips at about 57 percent of the width. Keep her body on exactly those "
    "coordinates - same camera, same height, same distance, same size. WIDE ENOUGH TO FIT THE ARMS: the "
    "two dumbbells resting on the floor at her sides sit at about 8 percent and 88 percent of the frame "
    "width, both FULLY inside the picture with a clear strip of empty floor beyond each of them; if a "
    "dumbbell, a hand or an elbow is cut by the left or the right edge, the image is WRONG."
)

FORB = (
    "FORBIDDEN: a bench, pad, mat, step or any raised support under her or beside her - the current wrong "
    "frame shows exactly that, a bench, and this row is the floor version; a full range that drops the "
    "arms below the floor; arms folded down to the chest like a press; arms reached straight back behind "
    "her head like a pullover; arms bent into a push-up position; elbows flared forward of the shoulders "
    "with the hands at the chest; one arm open and one arm up; a barbell, cable, band, machine or a third "
    "dumbbell; a dumbbell rack, mirror, spotter or second person; her head, hips or shoulders lifted off "
    "the floor; a bridged torso; legs stretched flat, feet up, knees tucked to the chest or one leg "
    "crossed; red glow anywhere but the chest; an anatomy cutaway - peeled-back skin, exposed striated "
    "muscle, visible muscle bundles or diagram lines instead of a plain tint under intact skin; the "
    "camera closer, farther, higher or at another angle in one frame than in the other; a sitting, "
    "kneeling or standing figure; a side view or a flat top-down "
    "view; a mirrored orientation; a photograph; a man's body or a man's face; letters or a logo on "
    "clothing."
)

WARDROBE = (
    "MATCHES THE COMPANION FRAME (read this before posing): the SAME woman, the SAME outfit and the SAME "
    "build as the other frame of this pair - a black sports bra with a wide under-band, black shorts that "
    "run to mid-thigh, black sneakers with white soles, dark-blonde hair in a ponytail lying out to the "
    "side on the floor. BUILD LOCK: LEAN, not bulky - smooth muscle, NO visible fibre striations, flat "
    "stomach. If her outfit or her build differs from the companion frame, the image is WRONG."
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
# про «man's body» в FORB (там она как раз должна перевернуться).
MALE_FIXES = (
    ("athletic woman", "athletic man"),
    ("this one woman", "this one man"),
    ("a man's body or a man's face", "a woman's body or a woman's face"),
    # b4.male меняет «her» по границе слова и не смотрит, есть ли после него
    # существительное: в запрете остаётся «under his or beside his» без предмета,
    # а в ВЕРХНЕМ регистре он не меняет ничего («WITH HER BODY» в замке кадра).
    ("support under his or beside his", "support under him or beside him"),
    ("on both sides of his, because", "on both sides of him, because"),
    ("WHICH FILLED THE CANVAS WITH HER BODY", "WHICH FILLED THE CANVAS WITH HIS BODY"),
)


def masculine(text):
    text = b4.male(text)
    for a, b in MALE_FIXES:
        text = text.replace(a, b)
    return text


# Замер принятого мужского стартового кадра 01.11: центр головы (0.31;0.61),
# белая подошва ближней обуви (0.73;0.65), кожа силуэта по ширине 0.22-0.79.
# Мужская голова стоит на ~2 % правее и на ~4 % выше женской, поэтому числа свои.
MALE_FINISH_PARITY = (
    "MEASURED PARITY AGAINST THE MALE START FRAME OF THIS PAIR: the centre of his head on the floor sits "
    "at about 31 percent of the frame WIDTH and 61 percent of the frame HEIGHT, the white sole of his "
    "near shoe at about 73 percent of the width and 65 percent of the height, his near shoulder at about "
    "38 percent of the width, and his hips at about 58 percent of the width. Keep his body on exactly "
    "those coordinates - same camera, same height, same distance, same size. WIDE ENOUGH TO FIT THE ARMS: "
    "the two dumbbells resting on the floor at his sides sit at about 8 percent and 88 percent of the "
    "frame width, both FULLY inside the picture with a clear strip of empty floor beyond each of them; if "
    "a dumbbell, a hand or an elbow is cut by the left or the right edge, the image is WRONG."
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
