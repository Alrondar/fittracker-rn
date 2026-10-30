# -*- coding: utf-8 -*-
"""Prompts for the last queue position: Smith Machine Shrug (62adbf83, папка Smith_Machine_Shrug).

Четыре файла по конвенции сборщика: <FolderId>_{start,finish}[_m].txt, женские — без суффикса.

Спека (владелец сказал «делай», взяты мои рекомендации):
  1. ракурс — три четверти спереди, как у пары «Удержание штанги»: подъём плеч читается только
     спереди, а ракурс сохраняет единство серии;
  2. два кадра — опущенные плечи и поднятые; между кадрами меняется ТОЛЬКО высота плеч, а гриф
     поднимается вместе с ними на те же 6–8 см, потому что руки жёсткие и гриф на направляющих;
  3. гриф спереди на середине бедра, снят с крюков, с блинами по диску с каждой стороны.

Внешняя техника (pocket-fit, ritfitsports, атлетические гиды, 29.10), она же в строке: гриф в
тренажёре Смита ставят на высоту середины бедра, стопы на ширине плеч, хват чуть шире плеч, руки
прямые, плечи поднимают строго ВВЕРХ к ушам, пауза секунда, опускают под контролем; шея
нейтральна, плечи не вращают. Порядок фаз выведен из глаголов `technique` строки: «возьмись →
подними плечи вверх → пауза → медленно опусти» — значит кадр 1 опущенные плечи, кадр 2 поднятые.

Главные риски и запреты: согнутые локти превращают движение в тягу; отрыв пяток — в подъём на
носки; гриф за спиной — это строка «Шраги Ли Хейни» (Smith Machine Behind the Back Shrug); гриф не
на направляющих — это «Шраги со штангой перед собой». Гриф в Смите ходит ТОЛЬКО вертикально,
поэтому его подъём обязан быть ровно таким же, как подъём плеч, без ухода вперёд.

Хост кадров — соседний репозиторий `fittracker-exercise-media`; адрес будущего кадра:
`https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Smith_Machine_Shrug/00f.jpg`.
"""
import importlib.util
import io
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "prompts")

_spec = importlib.util.spec_from_file_location("b4", os.path.join(HERE, "build-batch4-prompts.py"))
b4 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(b4)

FOLDER = "Smith_Machine_Shrug"

RULE = (
    "THE ONE RULE THAT DECIDES IF THIS IMAGE IS CORRECT: this is a SMITH MACHINE SHRUG - the athlete "
    "stands upright with a loaded bar hanging from two STRAIGHT arms and raises her SHOULDERS straight "
    "up toward her ears, then lowers them. THE ONLY THING THAT MOVES IS THE SHOULDER GIRDLE: the "
    "shoulders climb 6 to 8 centimetres up toward the ears, the neck stays where it is, and because "
    "the arms are rigid and the bar is locked on vertical rails, the bar rises by exactly the same 6 "
    "to 8 centimetres. The elbows stay straight - a bent elbow turns this into a row or a curl. The "
    "heels stay on the floor - a lifted heel turns this into a calf raise. If the bar is behind her "
    "back, it is a different exercise that already exists in this catalog."
)

LIMBS = (
    "TWO ARMS, TWO HANDS, ONE BAR, TWO LEGS: exactly two straight arms hanging down from the "
    "shoulders, two hands gripping one bar with a double overhand grip slightly wider than shoulder "
    "width, two legs and two feet flat on the floor. THE ARMS DO NOT BEND in either frame: the angle "
    "at each elbow stays 180 degrees - only the shoulders lift."
)

CAM = (
    "CAMERA: three-quarter FRONT view, the camera stands in front of her and about 30 degrees to her "
    "right, at chest height (1.4 m), 3.2 m away, lens level with the horizon - the same camera family "
    "as the accepted BARBELL HOLD pair, so the two shrug variations and the hold read alike. Because "
    "the camera is in front and to her RIGHT: her RIGHT arm and shoulder are the NEAR ones (larger, "
    "slightly LOWER in the frame, on the LEFT side of the image), her LEFT arm and shoulder are the "
    "FAR ones (smaller, slightly HIGHER, on the RIGHT). ORIENTATION LOCK: we see her FACE and the "
    "FRONT of her body, head at the TOP of the frame, shoes at the BOTTOM, the bar across the frame in "
    "front of her thighs, same as the companion frame of this pair. Never mirrored, never from behind, "
    "never a flat dead-on symmetrical view, never a side profile. SCALE LOCK: one metre of the body "
    "occupies exactly the same number of pixels as in the companion frame; the camera does not move, "
    "does not zoom, does not change height. FRAMING LOCK - THE NUMBERS BOTH FRAMES SHARE: the floor "
    "line runs across the frame at about 82 percent of the frame height in BOTH frames; the crown of "
    "her head at about 12 percent in BOTH; her feet at about 32 and 44 percent of the frame width; the "
    "bar at about 55 percent of the frame height when the shoulders are DOWN and at about 52 percent "
    "when they are UP - a rise of only 6 to 8 centimetres, never a jump. Both rails, both hands and "
    "both shoes fully inside the frame, nothing cropped."
)

RAILS = (
    "SMITH RAILS LOCK (this is the apparatus that makes the position unique): the bar runs on TWO "
    "VERTICAL STEEL RAILS that stand in front of her, one at each side, mounted on tall frames; the "
    "rails are perfectly vertical and parallel, they do NOT bend and they do NOT tilt. The bar's ends "
    "are captured by the rail sleeves, so the bar can only travel UP and DOWN - never forward, never "
    "sideways. The bar has just been unhooked: it hangs FREE of the J-hooks by a clear gap, and the "
    "hooks stay visible above it on the same rails. RACK LOCK: the rails, the hooks and the frames do "
    "NOT move, resize or change shape between the two frames - only the bar slides up along them."
)

IDENT = (
    "EXERCISE IDENTITY: SMITH MACHINE SHRUG (Smith machine barbell shrug) - standing upright inside a "
    "Smith machine with a loaded bar hanging at mid-thigh from straight arms, raising the shoulders "
    "straight up toward the ears, pausing, lowering under control. Upper trapezius work; no rowing, no "
    "curl, no calf action."
)

APP = (
    "APPARATUS: a Smith machine - two tall matte dark-grey vertical rails on solid frames, a straight "
    "chrome bar captured between them at mid-thigh height, with ONE black plate on each end and a "
    "collar beside each plate; the J-hooks are visible on the rails a little above the bar and are "
    "EMPTY. PROPS LOCK: no free barbell off the rails, no dumbbells, no kettlebells, no cable, no "
    "pulley, no bench, no box, no platform, no lifting belt, no straps, no chalk, no partner, no "
    "second person, no mirror, no logos."
)

HL = (
    "HIGHLIGHT: a soft semi-transparent warm-red X-ray glow through the skin over BOTH UPPER "
    "TRAPEZIUS muscles - the two thick bands running from the base of the neck out and down to each "
    "shoulder point, drawn as a warm V-shaped yoke across the top of the shoulders that rises with "
    "them. Both sides glow equally. The neck itself, the deltoids, the chest, the arms, the forearms, "
    "the lats and the lower back stay completely unlit and dark."
)

START_PHASE = (
    "PHASE - FRAME 1, SHOULDERS DOWN: she stands tall inside the Smith machine with the bar at "
    "mid-thigh. Feet shoulder-width apart, flat on the floor, toes forward; knees soft; hips under the "
    "shoulders; the torso vertical and calm. Her SHOULDERS ARE LOW AND RELAXED - the distance from the "
    "earlobe to the top of the shoulder is long, the neck looks long, the trapezius bands are flat "
    "under the skin. Both arms hang STRAIGHT, elbows at 180 degrees, wrists neutral, hands gripping "
    "the shaft slightly wider than her shoulders. The bar hangs on the two vertical rails, off the "
    "hooks by a visible gap. Gaze straight ahead."
)

FINISH_PHASE = (
    "PHASE - FRAME 2, SHOULDERS UP: the same stance, the same camera, the same rails, the same grip - "
    "and the SHOULDERS HAVE RISEN STRAIGHT UP toward the ears, so the distance from the earlobe to the "
    "top of the shoulder is now short, the trapezius bands are bunched and high, and the neck looks "
    "shorter. Because the arms are still perfectly straight, the bar has risen with the shoulders by "
    "the same 6 to 8 centimetres and now slides FURTHER UP the same rails - it has not moved forward, "
    "backward or sideways. Read the signs that must all be true:\n"
    "(1) THE ELBOWS ARE STILL STRAIGHT: 180 degrees, no bend, the forearms in line with the upper "
    "arms - a bent elbow makes this a row and the image WRONG.\n"
    "(2) THE HEELS ARE STILL DOWN: both soles flat on the floor, the ankles at the same angle as in "
    "the companion frame - a raised heel makes this a calf raise and the image WRONG.\n"
    "(3) THE HEAD HAS NOT MOVED: the neck stays vertical and the chin level, the head is NOT pushed "
    "forward and the shoulders do NOT roll - they go straight up.\n"
    "(4) THE KNEES, THE HIPS AND THE TORSO have not changed at all: only the shoulders and, with "
    "them, the bar, moved."
)

FORB = (
    "FORBIDDEN: bent elbows or a bar pulled toward the chest or the waist (that is a row or a curl); "
    "raised heels or a calf raise; a bar BEHIND the back (that is the Lee Haney shrug, a different row "
    "in this catalog); a free barbell with no rails; the bar travelling forward or sideways instead of "
    "straight up; a bar that stays put while the shoulders rise; shoulders rolling or circling; the "
    "head pushed forward or the chin tucked; a spine bent sideways; a jerk or a bounce in the bar "
    "path; a wide sumo stance; a lunge; a bench, a box or a platform; a lifting belt, straps or hooks; "
    "a partner or a second person; a photograph; a view from behind; a different body type."
)

WARDROBE = (
    "MATCHES THE COMPANION FRAME (read this before posing): the SAME woman, the SAME outfit and the "
    "SAME build as the other frame of this pair - a black sports bra with a wide under-band, black "
    "shorts that run to mid-thigh, black sneakers with white soles, dark-blonde hair in a ponytail. "
    "BUILD LOCK: LEAN, not bulky - smooth muscle, NO visible fibre striations, NO thick bladed "
    "traps - the trapezius reads as a smooth slope, not as armour. If her traps look like a "
    "bodybuilder's or her outfit differs from the companion frame, the image is WRONG."
)


def masculine(text):
    """Тот же текст, только местоимения по слову (b4.male чинит и падежи)."""
    return b4.male(text)


written = []
for suffix, phase, is_male in (("_start", START_PHASE, False), ("_finish", FINISH_PHASE, False),
                               ("_start_m", START_PHASE, True), ("_finish_m", FINISH_PHASE, True)):
    text = b4.render(RULE + " " + LIMBS, CAM, IDENT, APP, phase, b4.MAN if is_male else b4.WOMAN,
                     HL, FORB, "\n\n".join([RAILS, WARDROBE]))
    if is_male:
        text = masculine(text)
    p = os.path.join(OUT, FOLDER + suffix + ".txt")
    io.open(p, "w", encoding="utf-8", newline="\n").write(text)
    written.append((os.path.basename(p), len(text)))

for name, n in written:
    print(name, n)
