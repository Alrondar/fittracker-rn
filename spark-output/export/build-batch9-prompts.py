# -*- coding: utf-8 -*-
"""Prompts for the next queue position: Barbell Hold (f70c9ee3, папка Barbell_Hold).

Четыре файла по конвенции сборщика: <FolderId>_{start,finish}[_m].txt, женские — без суффикса.

Спека, закрытая владельцем 29.10 словом «делай» (все три варианта приняты как предложенные):
  ракурс — три четверти СПЕРЕДИ, потому что только спереди видно, что руки прямые и висят,
  а плечи опущены;
  оба кадра — ОДНА И ТА ЖЕ поза, второй кадр на выдохе позже (приём принятой планки), иначе
  пара начнёт изображать подъём;
  гриф нагружен — один диск с каждой стороны + замки.

Внешняя техника (STHENO, Bodybuilding-Wizard, Steel Supplements, 29.10): гриф берут из стоек
на высоте бёдер прямым хватом сверху на ширине плеч, снимают и держат на прямых опущенных
руках перед бёдрами; корпус вертикальный, плечи НЕ поднимаются, запястья нейтральные, гриф не
качается; держат 20–45 секунд, в конце ставят на стойки. Работают сгибатели предплечий,
вторично — бицепс и верх трапеции.

Главный риск позиции, он же главный признак: силуэт удержания = верхняя точка становой тяги,
а «Становая тяга» в каталоге уже есть и ведёт на свой кадр. Различить можно только по покою:
корпус строго вертикальный, таз под собой, колени мягкие но не согнуты для тяги, плечи опущены
и расслаблены, спина прямая без натяжения, взгляд вперёд. Второй обязательный признак — гриф
висит на кистях и НЕ лежит на бёдрах (тот же класс дефекта, что с грифом на коленях у
разгибания запястий 29.10).

Хост кадров — соседний репозиторий `fittracker-exercise-media`; адрес будущего кадра:
`https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Barbell_Hold/00f.jpg`.
"""
import importlib.util
import io
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "prompts")

_spec = importlib.util.spec_from_file_location("b4", os.path.join(HERE, "build-batch4-prompts.py"))
b4 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(b4)

FOLDER = "Barbell_Hold"

RULE = (
    "THE ONE RULE THAT DECIDES IF THIS IMAGE IS CORRECT: this is a STANDING BARBELL HOLD - a static "
    "grip exercise. The athlete stands perfectly UPRIGHT and AT REST under a loaded barbell that "
    "hangs from her two straight, down-hanging arms in front of her thighs, and she holds it. "
    "THE BODY IS AT REST, NOT UNDER A PULL: the hips are directly under the shoulders, the torso is "
    "vertical, the shoulder blades are DOWN and relaxed away from the ears, the neck is long and the "
    "gaze is straight ahead. If the hips are pushed back, the torso leans forward, the knees are bent "
    "for a pull or the shoulders are shrugged up to the ears, the image shows a deadlift or a shrug - "
    "different exercises that already exist in this catalog - and it is WRONG. Nothing moves in this "
    "exercise: no steps, no swing, no bend."
)

LIMBS = (
    "TWO ARMS, TWO HANDS, ONE BARBELL: exactly two straight arms hanging down from two shoulders, two "
    "hands gripping one bar, two legs and two feet. THE GRIP: a double overhand (pronated) grip - the "
    "palms face the front of her own thighs, the backs of the hands face the camera, the fingers wrap "
    "around the shaft from the far side and the thumbs clamp over the fingers from the near side. The "
    "two fists are about shoulder-width apart on the knurled part of the shaft. The elbows are "
    "straight but not locked backwards, the wrists stay neutral - not bent forward, not dropped."
)

CAM = (
    "CAMERA: three-quarter FRONT view, the camera stands in front of her and about 30 degrees to her "
    "right, at her chest height (1.4 m), 3.2 m away, lens level with the horizon. Because the camera "
    "is in front and to her RIGHT: her RIGHT arm and hand are the NEAR ones (drawn larger, slightly "
    "LOWER in the frame, on the LEFT side of the image), her LEFT arm and hand are the FAR ones "
    "(smaller, slightly HIGHER, on the RIGHT side of the image). ORIENTATION LOCK: we see her FACE and "
    "the FRONT of her body, her head is at the TOP of the frame and the soles of her shoes at the "
    "BOTTOM, the barbell runs across the frame in front of her thighs, same as the companion frame of "
    "this pair. Never mirrored, never a view from behind, never a flat dead-on symmetrical view, never "
    "a pure side profile. SCALE LOCK: one metre of the body occupies exactly the same number of pixels "
    "as in the companion frame; the camera does not move, does not zoom, does not change height. "
    "FRAMING LOCK: the whole athlete inside the frame with air; the crown of her head at about 12 "
    "percent of the frame height, the soles of her shoes at about 93 percent, both hands, the whole "
    "barbell with both plates and both rack uprights behind her fully visible, nothing cropped."
)

BAR_AXIS = (
    "BAR AXIS IN THIS CAMERA (a transverse bar seen under a 30-degree yaw must be described by the "
    "frame axes, never aimed into the lens): the shaft is a long near-horizontal tube crossing the "
    "frame slightly DOWNWARD to the LEFT - its LEFT end (her near, right hand) sits a few percent "
    "LOWER in the frame, is drawn THICKER and shows a WIDER elliptical plate face; its RIGHT end (her "
    "far, left hand) sits slightly HIGHER and is drawn THINNER with a NARROWER elliptical plate face. "
    "The shaft is NOT a flat line of even thickness, NOT a circle facing the camera and NOT pointing "
    "into the lens."
)

IDENT = (
    "EXERCISE IDENTITY: BARBELL HOLD (static barbell hold for grip and forearms) - the barbell has "
    "already been taken out of the rack and is being held at arm's length in front of the thighs while "
    "the athlete stands still. Body position identical in both frames; the only thing happening is "
    "time passing under tension."
)

APP = (
    "APPARATUS: one loaded Olympic barbell in her hands - a 2.2 m chrome shaft with knurled grip "
    "sections, ONE large black bumper-style plate on each end outboard of the fists, and a collar "
    "clamped beside each plate. Behind her stands an EMPTY squat rack: two matte dark-grey vertical "
    "uprights with the J-cups set at hip height and nothing resting in them. RACK LOCK: the rack is "
    "furniture, not part of the movement - it stands behind her at the same distance, the same size "
    "and the same height in both frames, and the barbell is NOT in it. TOUCH LOCK: the barbell hangs "
    "from the two hands and TOUCHES NOTHING - not the thighs, not the hips, not the rack, not the "
    "floor - a clear gap of air is visible along the whole length of the shaft between the bar and her "
    "legs. PROPS LOCK: no lifting belt, no straps, no hooks, no chalk on the hands, no dumbbells, no "
    "kettlebells, no weight plate carried in one hand, no platform, no bench, no mirror, no second "
    "person, no spotter."
)

HL = (
    "HIGHLIGHT: a soft semi-transparent warm-red X-ray glow through the skin along the INNER front of "
    "both FOREARMS - the flexor mass between the elbow and the wrist on the thumb side, drawn as two "
    "warm bands that end at the wrist and stop where the hand grips the bar. The glow is on both arms "
    "equally. The biceps, the shoulders, the trapezius, the chest, the quadriceps and the calves stay "
    "completely unlit and dark."
)

START_PHASE = (
    "PHASE - FRAME 1, THE HOLD, FIRST BREATH: she stands tall and still holding the loaded barbell at "
    "arm's length in front of her mid-thighs. Feet hip-width apart, flat on the floor, toes pointing "
    "forward; knees soft, not bent; hips stacked under the shoulders; ribcage over the pelvis; the "
    "lower back flat and neutral; shoulder blades down and back in a relaxed position, NOT shrugged; "
    "arms straight down at her sides with the fists resting on the shaft; neck long, gaze straight "
    "ahead at the camera height; jaw relaxed. This is a calm, braced, stationary moment - the pose of "
    "someone who is going to stand here for thirty seconds."
)

FINISH_PHASE = (
    "PHASE - FRAME 2, THE SAME HOLD A FEW BREATHS LATER: THE EXACT SAME pose, same camera, same bar "
    "height, same foot placement, same arm angle. The ONLY differences from the companion frame are "
    "signs of time under the hold: the ribcage has risen one breath, the fists have tightened a shade "
    "harder around the shaft, and the shoulders are still down - if her hips, knees, elbows, the bar "
    "or her head sit at a different height than in the companion frame, the image is WRONG. She has "
    "not stepped, not swung the bar, not shrugged, not put the bar back on the rack."
)

FORB = (
    "FORBIDDEN: a deadlift - hips hinged back, torso tilted forward, bar dragged up the legs or "
    "resting at the knees (this catalog already has that row and this is not it); a shrug - shoulders "
    "eared up toward the ears; a barbell row or curl - elbows bent, bar pulled toward the chest or the "
    "waist; the bar resting ON the thighs or hanging in the rack's J-cups; a farmer's walk - dumbbells "
    "or kettlebells in each hand, or a mid-stride step; a plate pinch - a loose plate held between "
    "fingers with the thumb on one face; a barbell good-morning with the bar on the back; a lifting "
    "belt, straps or hooks; a bent or twisted wrist; a swinging bar; a lunge or a wide sumo stance; a "
    "side plank; a photograph; a view from behind; a different body type; any second figure."
)

WARDROBE = (
    "MATCHES THE COMPANION FRAME (read this before posing): the SAME woman, the SAME outfit and the "
    "SAME build as the other frame of this pair - a black sports bra with a wide under-band, black "
    "shorts that run to mid-thigh, black sneakers with white soles, flat and closed, no barefoot, dark-"
    "blonde hair in a ponytail. BUILD LOCK: LEAN, not bulky - smooth muscle, NO visible fibre "
    "striations, NO veins on the forearms, flat stomach. If her forearms look like a bodybuilder's or "
    "her outfit differs from the companion frame, the image is WRONG."
)


def masculine(text):
    """Тот же текст, только местоимения по слову (b4.male чинит и падежи)."""
    return b4.male(text)


written = []
for suffix, phase, is_male in (("_start", START_PHASE, False), ("_finish", FINISH_PHASE, False),
                               ("_start_m", START_PHASE, True), ("_finish_m", FINISH_PHASE, True)):
    text = b4.render(RULE + " " + LIMBS, CAM, IDENT, APP, phase, b4.MAN if is_male else b4.WOMAN,
                     HL, FORB, "\n\n".join([BAR_AXIS, WARDROBE]))
    if is_male:
        text = masculine(text)
    p = os.path.join(OUT, FOLDER + suffix + ".txt")
    io.open(p, "w", encoding="utf-8", newline="\n").write(text)
    written.append((os.path.basename(p), len(text)))

for name, n in written:
    print(name, n)
