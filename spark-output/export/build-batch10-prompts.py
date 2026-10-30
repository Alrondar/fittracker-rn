# -*- coding: utf-8 -*-
"""Prompts for the next queue position: Nordic Hamstring Curl (3f168d4a, папка Nordic_Hamstring_Curl).

Четыре файла по конвенции сборщика: <FolderId>_{start,finish}[_m].txt, женские — без суффикса.

Спека закрыта владельцем 29.10 по всем трём рекомендациям:
  1. голень прижимает низкая опора — две короткие стойки на полу и поперечная планка с мягкими
     валиками (НЕ партнёр: второй человек в кадре запрещён блоками CHARACTER LOCK и SINGLE FRAME);
  2. руки на старте скрещены на груди — это объясняет, почему внизу ловят руками;
  3. второй кадр опущен низко: между подбородком и полом 20–25 см (не «полунордическое»).

Внешняя техника (fit-pa, e3rehab, findyouredge, nordbelt, 29.10), она же лежит в строке:
встать на колени на мягкую опору, зафиксировать голеностоп, сохранить прямую линию от колен до
плеч без складывания в тазу, наклоняться вперёд ТОЛЬКО сгибанием коленей настолько медленно,
насколько позволяют бицепсы бедра, до потери контроля; внизу поймать себя руками и от них
вернуться. Первая ошибка по всем источникам — «ломается» таз, и задняя поверхность не нагружается.
Порядок фаз выведен из глаголов `technique` строки: «встань на колени → наклоняй вперёд →
опускайся до контроля» — значит кадр 1 вертикальный, кадр 2 наклонённый.

Что обязано отличаться между кадрами: ТОЛЬКО угол в колене и наклон одной прямой
«колено-таз-плечи-макушка». Колени не уходят с коврика, стопы не отрываются от пола, опора,
камера и масштаб не меняются.

Хост кадров — соседний репозиторий `fittracker-exercise-media`; адрес будущего кадра:
`https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Nordic_Hamstring_Curl/00f.jpg`.
"""
import importlib.util
import io
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "prompts")

_spec = importlib.util.spec_from_file_location("b4", os.path.join(HERE, "build-batch4-prompts.py"))
b4 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(b4)

FOLDER = "Nordic_Hamstring_Curl"

RULE = (
    "THE ONE RULE THAT DECIDES IF THIS IMAGE IS CORRECT: this is a NORDIC HAMSTRING CURL - a kneeling "
    "eccentric exercise in which the ONLY moving joint is the knee. The body from the knees through the "
    "hips, the trunk and the head is ONE RIGID STRAIGHT SEGMENT that tilts forward about the knee like "
    "a falling tower: the hips stay EXTENDED (glutes squeezed, ribs down, the front of the hip is a flat "
    "wall, not a crease), the spine stays straight, and the shins lie flat on the floor behind, held "
    "down at the ankles. If a visible angle opens at the hip - the trunk leaning forward while the "
    "torso stays upright, or the torso folding down onto the thighs - the image shows a different "
    "exercise and it is WRONG. If the knees come forward off the pad or the feet lift, it is also WRONG."
)

LIMBS = (
    "TWO LEGS, TWO ARMS, ONE BODY: exactly two thighs, two shins, two knees, two feet in two shoes and "
    "two arms - no third limb. The two legs belong to one body and move together. THE FEET: the shins "
    "lie horizontal on the floor behind her, the tops of both feet press the floor with the toes "
    "pointed backward and flat, the ankles are under the padded bar. THE ARMS in the start frame are "
    "CROSSED over the chest - hands on the opposite shoulders, elbows out to the sides - so they cannot "
    "help during the fall."
)

CAM = (
    "CAMERA: a DEAD SIDE view from the athlete's LEFT side, camera almost on the floor (15 cm height), "
    "3.0 m away, lens parallel to the floor, so the whole body is seen in profile and the tilt of the "
    "one straight segment is measurable against the floor line. ORIENTATION LOCK: her head and "
    "shoulders are on the LEFT of the frame, her knees in the middle, her feet and shoes on the RIGHT - "
    "she falls FORWARD, toward the left side of the frame, same as the companion frame of this pair. "
    "Never mirrored, never head to the right, never a three-quarter or front view, never from behind. "
    "SCALE LOCK: one metre of the body occupies exactly the same number of pixels as in the companion "
    "frame; the camera does not move, does not zoom, does not change height, and the floor line sits at "
    "the same pixel height in both frames. FRAMING LOCK - THE COORDINATE GRID BOTH FRAMES MUST SHARE "
    "(this is the defect of the previous draft: the knees slid about fifteen percent of the frame "
    "width to the right and the figure came out larger): the floor line runs across the frame at about "
    "80 percent of the frame height in BOTH frames; her knees press the mat at about 45 percent of the "
    "frame width in BOTH frames; her ankles at about 72 percent of the frame width; the anchor posts at "
    "about 84 percent. In the upright frame the crown of her head is at about 12 percent of the frame "
    "height; in the lowered frame the crown is at about 74 percent and her CHIN AT ABOUT 78 PERCENT of "
    "the frame height, just above the floor line. Her body measures the same number of pixels in both "
    "frames. Nothing is cropped: the head, the knees, both shoes and the anchor are all inside."
)

OCCLUSION = (
    "DEPTH ORDER IN A DEAD SIDE VIEW: she is seen from her LEFT side, so her LEFT arm, LEFT thigh and "
    "LEFT shin are the NEAR ones, drawn crisp, fully lit and complete; her RIGHT arm, thigh and shin "
    "are FAR, drawn slightly darker, softer and offset by a few centimetres so the viewer can tell "
    "there are two of each. The near shoulder covers the far shoulder; the near hand covers the far "
    "hand. TWO KNEES, TWO SHOES MUST READ: both knees press the pad and both shoes stay visible on the "
    "right - the silhouette of the legs must not collapse into one limb."
)

IDENT = (
    "EXERCISE IDENTITY: NORDIC HAMSTRING CURL (Nordic hamstring exercise) - kneeling with the ankles "
    "anchored, lowering the rigid torso forward by bending only the knees, resisting the fall with the "
    "hamstrings, catching with the hands at the bottom and pushing back up. Bodyweight only; no "
    "dumbbell, no barbell, no band, no machine load anywhere."
)

APP = (
    "APPARATUS: a low floor anchor - two short matte dark-grey posts bolted to a base plate on the "
    "floor, joined by one horizontal bar padded with two black foam rollers that press the top of her "
    "calves just above the ankles; plus one folded dark training mat under her knees only. The anchor "
    "is LOW: its bar sits about 20 cm off the floor, nothing rises above knee height. PROPS LOCK: no "
    "bench, no box, no GHD machine, no barbell, no plates, no dumbbells, no kettlebells, no resistance "
    "band, no cable, no partner, no second person, no spotter, no mirror, no logos."
)

HL = (
    "HIGHLIGHT: a soft semi-transparent warm-red X-ray glow through the skin along the BACK of both "
    "THIGHS - the hamstrings, the muscle band running from the gluteal crease down to the back of the "
    "knee on the rear side of each thigh, drawn on the near leg fully and on the far leg as a darker "
    "twin. The glow follows the thigh as it tilts. The quadriceps (front of the thigh), the calves, the "
    "shins, the glutes, the lower back, the shoulders and the arms stay completely unlit and dark."
)

START_PHASE = (
    "PHASE - FRAME 1, THE UPRIGHT START: she kneels on the mat in a TALL, perfectly vertical position. "
    "Her knees are under her hips on the pad, shins and feet lying flat on the floor behind her, ankles "
    "locked under the padded bar. From the knees up through the hips, the trunk, the shoulders and the "
    "head the body is one vertical plumb line - the hip crease is FLAT and open, the pelvis is neutral, "
    "the chest is tall, the ribs are down, the glutes are squeezed. Her arms are crossed on her chest, "
    "hands resting on the opposite shoulders. Her neck is long and her gaze is straight ahead at the "
    "floor line, chin level. Nothing is leaning: this frame is the ninety-degree starting position."
)

FINISH_PHASE = (
    "PHASE - FRAME 2, THE LOW END OF THE CONTROLLED FALL: she has lowered forward by bending ONLY her "
    "knees, and the same single rigid segment now leans forward about the knee at about 80 degrees from "
    "vertical - the TRUNK IS ALMOST PARALLEL TO THE FLOOR, her face is about 5 centimetres above the "
    "floor line, at about 78 percent of the frame height. This is the very bottom of a deep eccentric "
    "lowering, not a halfway one, and her head is far to the LEFT of where it was in the companion "
    "frame. Read the signs that must all be true:\n"
    "(1) NO ANGLE AT THE HIP: the line from the knee to the hip to the shoulder to the crown of the "
    "head stays perfectly straight - a bent waist, a broken hip or a torso folding toward the thighs "
    "makes the image WRONG.\n"
    "(2) THE KNEES HAVE NOT MOVED: they still press the mat at the SAME horizontal position as in the "
    "companion frame (about 45 percent of the frame width), directly under the ankles' contact point, "
    "and the shins and the tops of the feet still lie flat on the floor behind her, held under the "
    "padded bar.\n"
    "(3) THE SPINE IS STRAIGHT, not rounded: the back is one long flat line, the chest still faces "
    "down-forward, the head is in line with the spine and looks at the floor just ahead of her.\n"
    "(4) THE ARMS have just uncrossed: the elbows bend forward and both hands reach DOWN toward the "
    "floor to catch herself, but in this frame NEITHER HAND TOUCHES THE FLOOR - a clear gap of air is "
    "visible under both palms.\n"
    "(5) The camera, the floor line, the anchor and the scale of her body are identical to the "
    "companion frame; only the tilt changed."
)

FORB = (
    "FORBIDDEN: a shallow tilt with the chin high in the frame - a half-nordic is NOT the bottom of "
    "this movement, the face must come within 20 to 25 centimetres of the floor; knees sitting at a "
    "different horizontal position than in the companion frame; the figure drawn larger, smaller or "
    "closer to the camera than in the companion frame; an arm drawn longer than the same arm in the "
    "companion frame, reaching the floor while the face stays high; a hip hinge - torso tilting forward while the "
    "hips stay stacked and a visible angle opens at the waist; a rounded or sagging back; knees "
    "sliding forward off the pad or lifting up; "
    "feet or toes lifting off the floor; heels raised; hands already resting on the floor; a partner "
    "holding the legs; a GHD, a bench, a box, a barbell, a plate, a dumbbell or a band anywhere in the "
    "frame; a standing or lunge position; a reverse nordic (leaning BACKWARD); a leg curl lying on a "
    "machine; a photograph; a three-quarter or front view; a mirrored orientation; a different body "
    "type; any second figure."
)

WARDROBE = (
    "MATCHES THE COMPANION FRAME (read this before posing): the SAME woman, the SAME outfit and the "
    "SAME build as the other frame of this pair - a black sports bra with a wide under-band, black "
    "shorts that run to mid-thigh, black sneakers with white soles, dark-blonde hair in a ponytail "
    "that hangs toward the floor as she tilts. BUILD LOCK: LEAN, not bulky - smooth muscle, NO visible "
    "fibre striations, flat stomach. If her outfit or her build differs from the companion frame, the "
    "image is WRONG."
)

ANCHOR_LOCK = (
    "ANCHOR LOCK (the size anchor of this pair): the low floor anchor does NOT move, resize or change "
    "shape between the two frames - the two posts, the padded bar and its foam rollers occupy exactly "
    "the same pixels on the RIGHT side of the frame in both, the bar stays at the same height above the "
    "floor, and the mat under her knees stays the same size and in the same place. She is the only "
    "thing that moves. If the anchor looks bigger, closer, higher or missing in one frame, the image is "
    "WRONG."
)

ARM_LOCK = (
    "ARM LENGTH LOCK (the defect of the previous draft): the shoulder, the elbow and the wrist of each "
    "arm measure EXACTLY the same number of pixels as the same arm in the companion frame - an adult "
    "arm is about three tenths of her standing height, and it does not grow to reach the floor. The "
    "hands only get near the floor because the TRUNK came down, not because the arm got long. Test to "
    "apply: if in the lowered frame the palms are close to the floor while the face is still high above "
    "it, the arm has been drawn too long and the image is WRONG - lower the whole trunk until the head "
    "is just above the floor line and keep the arms short."
)


def masculine(text):
    """Тот же текст, только местоимения по слову (b4.male чинит и падежи)."""
    return b4.male(text)


written = []
for suffix, phase, is_male in (("_start", START_PHASE, False), ("_finish", FINISH_PHASE, False),
                               ("_start_m", START_PHASE, True), ("_finish_m", FINISH_PHASE, True)):
    text = b4.render(RULE + " " + LIMBS, CAM, IDENT, APP, phase, b4.MAN if is_male else b4.WOMAN,
                     HL, FORB, "\n\n".join([OCCLUSION, ANCHOR_LOCK, ARM_LOCK, WARDROBE]))
    if is_male:
        text = masculine(text)
    p = os.path.join(OUT, FOLDER + suffix + ".txt")
    io.open(p, "w", encoding="utf-8", newline="\n").write(text)
    written.append((os.path.basename(p), len(text)))

for name, n in written:
    print(name, n)
