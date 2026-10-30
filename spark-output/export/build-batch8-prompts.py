# -*- coding: utf-8 -*-
"""Prompts for the next queue position: Side To Side Chins (1208d0bd).

Four files, named <FolderId>_{start,finish}[_m].txt — конвенция, которую сборщик
build-illustrations.py читает без ручной MAP. Женские черновики — без суффикса.

Спека, согласованная с владельцем 29.10 (последний ответ — «Смещение к дальней руке,
ноги скрещены»):
  камера — та же семья, что у принятой пары «Подтягивания широким хватом» (e4bcc6ac):
  вид со спины, чуть справа-сверху, поэтому её ПРАВАЯ кисть — ближняя к объективу,
  ЛЕВАЯ — дальняя;
  кадр 1 — вис на прямых руках, хват сверху примерно в 1,5 раза шире плеч;
  кадр 2 — верх, на котором корпус смещён к ДАЛЬНЕЙ (левой) руке: та рука согнута и
  держит нагрузку, ближняя (правая) остаётся почти прямой;
  ноги скрещены в лодыжках — как у принятой пары.

Внешняя техника (upstream-инструкция Side To Side Chins, прочитана 29.10 в зеркале
`../fittracker-exercise-media/exercises/Side_To_Side_Chins.json`): хват широкий, ладони
обращены от себя; корпус отклонён назад около 30° с прогибом в пояснице и грудью вперёд;
подъём — «pull your torso up while leaning to the left hand side until the bar almost
touches your upper chest»; «upper torso should remain stationary, no swinging, only the
arms should move». То есть смещение — боковой перенос тела к рабочей руке, а не наклон
через талию и не раскачивание.

Единственный читаемый признак, который отличает строку от соседней «Подтягивания
широким хватом»: асимметрия рук и голова у одной кисти. Если на верхнем кадре оба локтя
согнуты одинаково и голова под серединой перекладины — это соседняя строка, кадр неверный.

Хост кадров — соседний репозиторий `fittracker-exercise-media`, адрес будущего кадра:
`https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Side_To_Side_Chins/00f.jpg`.
"""
import importlib.util
import io
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "prompts")

_spec = importlib.util.spec_from_file_location("b4", os.path.join(HERE, "build-batch4-prompts.py"))
b4 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(b4)

FOLDER = "Side_To_Side_Chins"

RULE = (
    "THE ONE RULE THAT DECIDES IF THIS IMAGE IS CORRECT: this is a SIDE-TO-SIDE WIDE-GRIP PULL-UP - "
    "one arm does the work and the other is left almost straight. At the top of the repetition the "
    "body is carried SIDEWAYS toward one hand, so that her head finishes beside that hand and the "
    "arm on that side is fully bent, while the opposite arm stays extended with only a small bend at "
    "the elbow. THE SHIFT IS A LATERAL TRANSLATION of the whole body toward the loaded hand: the "
    "shoulders, the sternum, the pelvis and the crossed feet all move the same distance to the same "
    "side, so the body stays plumb and long. It is NOT a side bend through the waist, NOT a lean, NOT "
    "a swing, and NOT a twist of the torso. If both arms bend the same amount and the head hangs under "
    "the middle of the bar, the image shows a plain wide-grip pull-up, which is a different exercise, "
    "and it is WRONG."
)

LIMBS = (
    "TWO ARMS, TWO HANDS, TWO LEGS: the frame contains exactly two upper arms, two forearms, two "
    "hands gripping the bar, two thighs, two shins and two feet - one body, no third arm, no missing "
    "hand. The FAR arm (her left) is the working arm: bent, elbow drawn down and tucked toward the "
    "ribs. The NEAR arm (her right) stays long, straight or nearly straight, still gripping the bar "
    "with the full hand, wrist visible, fingers wrapped over the top of the tube. Both arms stay "
    "attached to her shoulders; neither hand let go."
)

CAM = (
    "CAMERA: rear view, three-quarters of the way around her back, about 35 degrees to her right, at "
    "just above bar height (2.3 m), 3.4 m away, looking slightly down at her back so the lat spread, "
    "the width of the grip and the sideways offset of the body are all readable. ORIENTATION LOCK: we "
    "see her BACK, her head is at the TOP of the frame, her feet at the BOTTOM, the bar runs across "
    "the upper part of the frame, same as the companion frame of this pair. Because the camera stands "
    "behind her and to her RIGHT: her RIGHT hand is the NEAR hand (drawn larger, lower in the frame, "
    "on the RIGHT side) and her LEFT hand is the FAR hand (drawn smaller, slightly higher, on the "
    "LEFT side). Never mirrored, never a front view, never a pure side profile. SCALE LOCK: one metre "
    "of the body occupies exactly the same number of pixels as in the companion frame; the camera does "
    "not move, does not zoom, does not change height, and the bar stays at the same pixel height in "
    "both frames. FRAMING LOCK: the whole athlete inside the frame with air; both outer ends of the "
    "bar with their rack uprights visible, the crown of her head at about 20 percent of the frame "
    "height, the soles of her shoes at about 92 percent, both hands and both elbows fully visible, "
    "nothing cropped."
)

IDENT = (
    "EXERCISE IDENTITY: SIDE-TO-SIDE CHINS / side-to-side wide-grip pull-up - hanging from an empty "
    "wall-mounted pull-up bar with a pronated grip about 1.5 times shoulder width, then pulling up so "
    "the bar comes close to the upper chest while the body travels sideways toward one hand, lowering "
    "under control and repeating to the other hand. Bodyweight only, no cable anywhere."
)

APP = (
    "APPARATUS: a wall-mounted pull-up rig - one horizontal matte dark-grey metal bar between two "
    "vertical uprights bolted to the wall, the bar a straight round tube with knurled grips near each "
    "end. PROPS LOCK: no cable, no pulley, no pulldown bar, no weight stack, no seat, no thigh pad, no "
    "bench, no resistance band on the bar or around the body, no dip belt, no dumbbell between the "
    "feet, no chalk bag, no second person, no mirror."
)

BAR_PERSPECTIVE = (
    "BAR PERSPECTIVE LOCK: the camera stands BEHIND HER AND TO HER RIGHT, so the rig is seen from the "
    "same three-quarter angle as her body - NOT straight into the lens.\n"
    "Three signs that must all be true:\n"
    "(1) The bar is NOT a flat horizontal line of even thickness. It recedes in depth: her RIGHT hand "
    "is the NEAR hand, so the right end of the bar is nearer the lens - drawn THICKER, LOWER in the "
    "frame and LONGER visible; her LEFT hand is the FAR hand, so the left end is THINNER, slightly "
    "HIGHER in the frame and shorter.\n"
    "(2) The two wall uprights are at different depths: the RIGHT upright (near) is wider, its bolts "
    "and its bracket bigger and sharper; the LEFT upright (far) is narrower, smaller and slightly "
    "softer. They are NOT mirror images of each other.\n"
    "(3) Where the bar enters each bracket, the round end cap is drawn as an ELLIPSE tilted by the "
    "same three-quarter angle, not as a circle facing the camera, and not as a flat rectangle."
)

WARDROBE = (
    "MATCHES THE COMPANION FRAME (read this before posing): the SAME woman, the SAME outfit and the "
    "SAME build as the other frame of this pair - a black sports bra with a wide under-band, "
    "HIGH-WAIST black shorts that run to mid-thigh (waistband at the navel, hem covering the top of "
    "the thigh, NOT short running shorts), black sneakers with white soles, dark-blonde hair in a "
    "ponytail. BUILD LOCK: LEAN, not bulky - smooth muscle, NO visible fibre striations in the "
    "deltoids or trapezius, NO veins on the arms or forearms, flat stomach. If her shoulders look like "
    "a bodybuilder's or her shorts are shorter than in the companion frame, the image is WRONG."
)

RIG_SCALE = (
    "RIG SCALE LOCK (the only reliable size anchor): the wall rig does NOT move or resize between the "
    "two frames of this pair - the two uprights and the horizontal bar occupy exactly the same pixels "
    "as in the companion frame, the bar stays at the same height in the frame, and the athlete is the "
    "only thing that moves. Her head is the same pixel size as in the companion frame. Her two hands "
    "grip the SAME two points of the bar in both frames - the hands do not slide along the bar; only "
    "her body moves. If the rig looks bigger, closer or cropped differently than in the companion "
    "frame, the camera moved and the image is WRONG."
)

GRIP_ANCHOR = (
    "GRIP POINT ANCHOR (this is the defect of the previous draft): in BOTH frames each hand grips the "
    "bar about one quarter of the way in from its own end, so a clear length of EMPTY bar is visible "
    "outside her right hand and the same length of empty bar outside her left hand - identical in both "
    "frames. The distance between her two fists is the same in both frames, about 1.5 times her "
    "shoulder width, and it never widens. Her hands are NOT at the ends of the bar and NOT at the "
    "brackets. Her arms keep their real anatomical length in both frames: the shoulder, elbow and "
    "wrist of the straight arm measure the same pixels as in the companion frame - the arm is straight, "
    "never stretched longer to reach. The body travels toward the far hand by about ONE HEAD-WIDTH, "
    "not by half the bar: at the top her head is just to the RIGHT of and just below her left fist, "
    "still clearly inside the two hands."
)

HL = (
    "HIGHLIGHT: a soft semi-transparent warm-red X-ray glow through the skin over both LATISSIMUS "
    "DORSI - the wide fan of muscle running from the lower ribs and spine out to the armpit on each "
    "side of the back, drawn as two symmetric warm wings under the armpits that narrow toward the "
    "waist. The trapezius, the rear deltoids, the biceps, the forearms and the erectors below the "
    "ribcage stay completely unlit and dark. Both lats glow equally; never one side only."
)

START_PHASE = (
    "PHASE - FRAME 1, THE HANG: she hangs from the wide overhand grip with BOTH arms fully extended "
    "and straight, shoulders packed down away from the ears, shoulder blades set, the chest lifted "
    "forward and the upper back rounded slightly so her sternum faces up toward the bar, the body "
    "long, centred under the middle of the bar and perfectly still. Her head is directly under the "
    "midpoint of the bar, the chin far BELOW the bar. Legs bent behind her with the knees about 90 "
    "degrees and the ANKLES CROSSED, one foot resting over the other, the soles at about 93 percent of "
    "the frame height. In this frame the two arms are mirror images of each other - same bend, same "
    "length, same distance from the head. THIS IS THE BOTTOM OF THE MOVEMENT: the sideways shift "
    "described above belongs to the companion frame only, so in this frame no arm is bent, the body is "
    "not leaning to either hand, and her head stays on the centre line of the bar."
)

FINISH_PHASE = (
    "PHASE - FRAME 2, THE TOP WITH THE BODY SHIFTED TO THE FAR HAND: she has pulled up and carried the "
    "body SIDEWAYS toward her LEFT hand - the FAR hand, the smaller one on the LEFT side of the frame. "
    "Read the five signs that must all be true:\n"
    "(1) Her head and sternum are now LEFT of the bar midpoint: the crown of her head finishes level "
    "with and just to the right of her left fist, about one head-width away from the centre line she "
    "hung on in the companion frame.\n"
    "(2) Her LEFT (far) arm is the loaded one: upper arm down along the side, elbow bent hard and "
    "tucked close to the ribs, forearm angled up to the bar.\n"
    "(3) Her RIGHT (near) arm is nearly STRAIGHT - the elbow barely bent, the arm still long and reaching "
    "up to its same grip point, visibly straighter than the left arm. This contrast between one bent arm "
    "and one straight arm is the whole point of the image.\n"
    "(4) Her pelvis and her crossed feet have travelled the SAME distance to the left as her head, so "
    "the body is one straight long column, not a banana: no side bend at the waist, no twist, no arch, "
    "no legs kicked forward or swinging. Knees still about 90 degrees behind her, ANKLES STILL CROSSED, "
    "soles at about 93 percent of the frame height.\n"
    "(5) The bar almost touches her upper chest at the point where the far arm meets it. Both hands hold "
    "the SAME two marks on the bar as in the companion frame - the bar and the hands do not move "
    "sideways, only she does."
)

FORB = (
    "FORBIDDEN: a cable lat-pulldown machine, a weight stack, a seat or a thigh pad; a shoulder-width or "
    "close grip; a supinated underhand chin-up grip with the palms facing her face - the palms face AWAY "
    "from her; a neutral hammer grip; hands sliding to the middle of the bar; one hand letting go or a "
    "one-arm pull-up; both arms bent equally with the head under the middle of the bar (that is the "
    "plain wide-grip pull-up, a different row); a kipping swing, a leg kick, a twist of the torso, a "
    "side bend through the waist like a windmill; a resistance band; added weight; straight legs "
    "dangling; hands at the very ends of the bar or on the brackets; the gap between the two fists "
    "wider in one frame than in the other; an arm drawn longer than the same arm in the companion "
    "frame; a photograph; a front view; a different body type; any second figure."
)


def masculine(text):
    """Тот же текст, только местоимения по слову, а не по подстроке (naive replace 'her '
    ломает 'other ' и 'where ')."""
    return b4.male(text)


written = []
for suffix, phase, is_male in (("_start", START_PHASE, False), ("_finish", FINISH_PHASE, False),
                               ("_start_m", START_PHASE, True), ("_finish_m", FINISH_PHASE, True)):
    text = b4.render(RULE + " " + LIMBS, CAM, IDENT, APP, phase, b4.MAN if is_male else b4.WOMAN,
                     HL, FORB, "\n\n".join([BAR_PERSPECTIVE, WARDROBE, RIG_SCALE, GRIP_ANCHOR]))
    if is_male:
        text = masculine(text)
    p = os.path.join(OUT, FOLDER + suffix + ".txt")
    io.open(p, "w", encoding="utf-8", newline="\n").write(text)
    written.append((os.path.basename(p), len(text)))

for name, n in written:
    print(name, n)
