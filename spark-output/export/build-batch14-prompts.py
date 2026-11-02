# -*- coding: utf-8 -*-
"""Промпты перерисовки 31.10, позиция 1 (из шести).

Строка `fd16fd41` «Жим в кроссовере с нижних блоков лёжа» — из корзины C разбора
`frame-mismatch-triage.md`. Её кадр до сих пор указывает на папку
`Low_Cable_Crossover`, которая принадлежит соседней строке `3e3c5ca0` «Сведение рук
в кроссовере снизу вверх» (на всём каталоге таких совпадений три). Вердикт
владельца 31.10: жим и сведение — разные движения, перерисовать жим.

Значит позиции нужен СВОЙ адрес: `name_eng` строки станет
`Lying Low Cable Chest Press`, папка — `Lying_Low_Cable_Chest_Press` (проверено:
такой папки в медиа-репозитории нет и строки с таким именем в каталоге нет), ссылка
`media_url` переедет на неё отдельной миграцией после приёмки.

Ракурс взят не с нуля, а с принятого кадра того же семейства —
`Dumbbell_Fly/00f.jpg`: голова слева, стопы справа, скамья поперёк кадра.

Два вердикта владельца по двум забракованным кругам (оба убраны в
`vibe_images/rejected-2026-10-31/`):
  1. «расположение кросовера на старте должно быть как на финише — сейчас они по
     диагонали, а должны находиться в районе плеч слева и справа»;
  2. «лавка на финише и на старте у тебя тоже вращается — так быть не должно».
Отсюда два новых блока, и оба — в той части промпта, которая читается первой:
`SHOULDER PLACEMENT LOCK` (обе стойки на линии плеч, по одной с каждой стороны
скамьи, зеркально, не по диагонали) и `BENCH GEOMETRY LOCK` (скамья задана
координатами её ближней кромки в процентах кадра, поэтому поворот лавки между
кадрами = уехавшая камера = брак).

Вердикт владельца по набору: один силуэт, две фазы — мужская пара этой волны не
рисуется.
"""
import importlib.util
import io
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "prompts")

_spec = importlib.util.spec_from_file_location("b4", os.path.join(HERE, "build-batch4-prompts.py"))
b4 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(b4)

FOLDER = "Lying_Low_Cable_Chest_Press"

RULE = (
    "THE ONE RULE THAT DECIDES IF THIS IMAGE IS CORRECT: this is a LYING CHEST PRESS from LOW cable "
    "pulleys - the athlete lies FLAT ON HER BACK on a LEVEL bench, one D-handle in each hand, and she "
    "presses both hands straight UP over her chest by bending and extending the ELBOWS. FOUR THINGS MUST "
    "BE TRUE AT ONCE: (1) her head, shoulders and hips all touch the same horizontal pad - she is not "
    "sitting, not leaning and not reclining against anything, because this bench has no backrest at all; "
    "(2) both hands sit directly above the middle of her chest, never opened wide to the sides, which "
    "would make it a fly; (3) exactly TWO cables run taut, one to each handle; (4) the TWO low pulley "
    "units stand on the floor at the TWO SIDES OF THE BENCH - one at the left edge of the picture and one "
    "at the right, both just behind her shoulder line and both equally far from the camera - with each "
    "pulley wheel about 30 cm off the floor, BELOW the level of the pad. If any vertical pad rises behind "
    "her back or her head, if she is seated, if the arms are abducted into a horizontal arc, if a cable "
    "comes from above, or if the two units stand at different distances from the camera, the image is "
    "WRONG. TWO ARMS, TWO LEGS, ONE BODY: exactly two arms and two legs, one handle in each hand. Both "
    "hands grip their own D-handle in EXACTLY the same way, as mirror images of each other. Both feet "
    "stand on the floor one on each side of the bench, knees bent about 90 degrees, and they do not move "
    "between the two frames."
)

CAM = (
    "CAMERA: head-on from beyond the HEAD end of the bench, about 1.4 m above the floor, 2.6 m from her, "
    "looking down the length of the bench toward her feet. She is centred in the frame, her head and "
    "shoulders are the NEAREST and LARGEST parts and sit low in the picture, her hips and shoes recede "
    "upward and become slightly smaller. ORIENTATION LOCK: the same head-on camera, the same height and "
    "the same distance in both frames of this pair - never a side view, never from the feet end, never a "
    "flat top-down view, never mirrored, never zoomed. ABSOLUTE FRAMING NUMBERS BOTH FRAMES SHARE: the "
    "near short edge of the black pad crosses the centre of the frame at about 88 percent of the frame "
    "height, the top of her head is at about 62 percent of the frame height, her hips at about 22 "
    "percent, and the two pulley units stand at about 12 percent and 88 percent of the frame WIDTH - "
    "fully inside the picture, each with a clear strip of empty floor between it and the side edge, "
    "nothing cropped by the left or the right edge. BENCH GEOMETRY LOCK: the bench is one horizontal "
    "black pad seen end-on with two dark leg-frames standing on the same floor line; it keeps the same "
    "width, length and position in both frames. If the bench, the units or her body are drawn larger, "
    "smaller, higher or at another angle than those numbers, the camera has moved and the image is WRONG."
)

IDENT = (
    "EXERCISE IDENTITY: LYING LOW CABLE CHEST PRESS - a chest press done lying flat on a bench whose "
    "shoulder line stands between two low floor pulleys, one on each side, so the resistance pulls both "
    "hands DOWN and OUT to the two sides and the athlete presses the handles straight up over the "
    "sternum. Cables and handles only - no barbell, no dumbbells, no machine seat, no rack."
)

APP = (
    "APPARATUS, unit by unit: (1) one FLAT bench - a single horizontal black padded slab on two dark "
    "metal leg-frames with four feet on the floor. NO BACKREST LOCK: the bench has NO backrest, NO seat, "
    "NO uprights, NO head rest, NO adjustable angle and NO vertical part of any kind - nothing rises "
    "above the pad anywhere behind her body; if a pad or a frame stands behind her back, her shoulders or "
    "her head, the image is WRONG. (2) TWO identical LOW FLOOR PULLEY UNITS, one at the left edge of the "
    "picture and one at the right, both just behind her shoulder line, both equally far from the camera "
    "and mirror images of each other. Each unit is a short dark-grey weight base no taller than 40 cm "
    "carrying ONE black weight stack and a small pulley wheel about 30 cm above the floor, clearly BELOW "
    "the level of the bench pad. Neither unit is behind her head, neither is a tall tower, neither stands "
    "at the foot end. (3) exactly TWO cables, one per unit, each a PERFECTLY STRAIGHT taut segment that "
    "leaves its wheel and runs diagonally up to the handle in the hand on that same side, so the two "
    "cables form a wide symmetric V opening to the left and to the right. They never cross over her body, "
    "never come from above, never sag, never double, and there is no third cable and no spare handle. (4) "
    "two black D-shaped handles in total, one in each hand. CABLE TENSION LOCK: both cables are UNDER LOAD "
    "and therefore ruler-straight from wheel to handle. MACHINE PARITY LOCK: the bench, both units, both "
    "weight stacks and the floor keep exactly the same place and size in BOTH frames of this pair - only "
    "her arms and the handles change. PROPS LOCK: no barbell, no dumbbell, no rack, no cable tower, no "
    "uprights, no spotter, no second person, no mirror, no logos, no letters on clothing. HEAD LOCK: the "
    "back of her head rests on the pad in both frames, chin level, gaze straight up at her hands."
)


HL = (
    "HIGHLIGHT - THE DEFECT OF THE PREVIOUS DRAFT WAS RED TINT RUNNING DOWN THE THIGHS: the glow is a "
    "narrow band on EACH PECTORAL only, the strip of chest between the shoulder joint and the nipple "
    "line, plus a small cap on each FRONT DELTOID in front of the shoulder joint. It is semi-transparent "
    "warm red and it stops at the lower edge of the sports bra. NOTHING BELOW THE BRA LINE GLOWS - the "
    "abdomen, the hips, the thighs, the knees and the shins keep their plain skin colour with no red "
    "tint at all, and the triceps, the biceps, the neck and the back stay dark as well."
)

START = (
    "PHASE - FRAME 1, HANDS AT THE CHEST: the elbow angle is about 90 degrees in both arms. Each hand "
    "sits DIRECTLY ABOVE the lower half of its own pectoral, the forearm vertical, the upper arm lying "
    "out from the torso by only about 30 degrees - a narrow elbow tuck, not a wide open arc. The two "
    "hands are at the SAME HEIGHT ON HER BODY with a clear gap of about one head between them, the "
    "wrists straight over the elbows, the shoulder blades drawn down and back into the pad, the chest "
    "lifted and stretched. Both cables run taut from the two side units up to the handles. This is the "
    "lowest point of the range - nothing has been pressed up yet."
)

FINISH = (
    "PHASE - FRAME 2, HANDS PRESSED UP: the elbow angle is about 165 degrees in both arms - the arms are "
    "extended STRAIGHT UP over the middle of her chest, nearly but not fully locked, and the elbows still "
    "sit under the hands rather than out to the sides. The two handles stay APART at about shoulder width "
    "above the sternum, one over each inner edge of the chest; they never touch and never meet in the "
    "middle, because two separate cables hold them apart. Both cables remain taut, each running from its "
    "own low side unit to its own handle. Her head, shoulders, hips and feet have not moved, the shoulder "
    "blades stay pressed into the pad, the lower back keeps its natural flat contact."
)

FORB = (
    "FORBIDDEN: any backrest, seat, head rest, upright or vertical pad behind her - she lies on a flat "
    "slab; sitting up, leaning back or reclining against anything; the bench or the two pulley units "
    "moved, resized or repositioned between the two frames; the camera closer, farther or higher in one "
    "frame than in the other; red tint anywhere below the sports bra, on the abdomen, hips, thighs or "
    "shins; a pulley wheel above the pad line, a tall cable tower, a unit behind her head or at the foot "
    "end; the two units at unequal distances from the lens; a standing or seated cable crossover; a chest "
    "fly with the arms straight and opened wide to the sides; the two handles meeting above the chest; one "
    "hand higher on the body than the other; bent arms in the pressed-up frame or straight arms in the "
    "lowered frame; a barbell or dumbbells anywhere; an incline or decline bench; a bench press rack; a "
    "cable coming from above, sagging, doubled or crossing her body; a mixed grip or one hand empty; the "
    "head lifted off the pad; the feet lifted or resting on the bench; the hips arching off the pad; a "
    "spotter or any second person; a photograph; a man's body or a man's face; letters or a logo on "
    "clothing; a view from the feet end; a flat top-down view; a mirrored orientation."
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


MALE_FIXES = (
    ("FLAT ON HER BACK", "FLAT ON HIS BACK"),
    ("SAME HEIGHT ON HER BODY", "SAME HEIGHT ON HIS BODY"),
    ("athletic woman", "athletic man"),
    ("this one woman", "this one man"),
    ("dark-blonde hair tied in a ponytail", "short dark hair"),
    ("dark-blonde hair in a ponytail", "short dark hair"),
    ("lower edge of the sports bra", "lower edge of the chest"),
    ("BELOW THE BRA LINE", "BELOW THE NIPPLE LINE"),
    ("below the sports bra", "below the chest"),
)


def masculine(text):
    """Тот же текст, только местоимения, гардероб и причёска по мужскому.

    b4.male не трогает строки в ВЕРХНЕМ регистре внутри блоков-замков и блок
    персонажа, поэтому поверх него идёт явная таблица: иначе в мужском промпте
    оставались «ON HER BACK», «athletic woman … ponytail» и «sports bra».
    """
    text = b4.male(text)
    for a, b in MALE_FIXES:
        text = text.replace(a, b)
    return text


MALE_FINISH_PARITY = (
    "MEASURED PARITY AGAINST THE ACCEPTED MALE START FRAME: the near short edge of the black pad "
    "crosses the centre of the frame at about 85 percent of the frame height (not lower), the two "
    "pulley units stand at about 1.5 percent and 98 percent of the frame width, and the bench is drawn "
    "the SAME size as in that start frame. If the bench and his body are larger or lower in this frame "
    "than in the start frame, the camera stepped closer and the image is WRONG."
)

written = []
for suffix, phase, is_male in (("_start", START, False), ("_finish", FINISH, False),
                               ("_start_m", START, True), ("_finish_m", FINISH, True)):
    extra = WARDROBE_M if is_male else EXTRA
    if suffix == "_finish_m":
        extra = extra + chr(10) + MALE_FINISH_PARITY
    text = b4.render(RULE, CAM, IDENT, APP, phase, b4.MAN if is_male else b4.WOMAN, HL, FORB, extra)
    if is_male:
        text = masculine(text)
    path = os.path.join(OUT, FOLDER + suffix + ".txt")
    io.open(path, "w", encoding="utf-8", newline="\n").write(text)
    written.append((os.path.basename(path), len(text)))

for name, size in written:
    print(name, size)
