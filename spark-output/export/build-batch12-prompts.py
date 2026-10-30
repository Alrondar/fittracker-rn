# -*- coding: utf-8 -*-
"""Prompts for Copenhagen Adduction (b419d3b1, папка Copenhagen_Adduction). Длинный рычаг, v3.

Четыре файла по конвенции сборщика: <FolderId>_{start,finish}[_m].txt, женские — без суффикса.

Вердикт владельца 30.10 (вариант Б после двух неудач с коротким рычагом): ДЛИННЫЙ РЫЧАГ — голень
верхней ноги лежит вдоль сиденья, стопа у дальнего края. Текст строки править не надо: в `settings`
уже стоит «верхняя нога располагается на скамье примерно на уровне голени; корпус сохраняет прямую
линию» — это и есть описание длинного рычага.

Остальное — мои рекомендации: ракурс три четверти спереди, камера 0,9 м; подсветка на нижней
(рабочей) ноге; оба кадра — одна и та же планка, меняется только нижняя нога.

Внешняя техника (gravitus, tutorials, 30.10): лёжа на боку, нижнее предплечье на полу, локоть строго
под плечом; верхняя нога на скамье — внутренней стороной колена (короткий рычаг) или голеностопа
(длинный); таз поднят так, что голова, таз и стопы — одна прямая; нижняя нога поднимается к скамье.

ЗАМКИ v3 (после двух версий с коротким рычагом):
  - верхняя нога ПРЯМАЯ и лежит вдоль сиденья, контакт — голень и голеностоп, стопа у дальнего края;
  - линия контакта верхней ноги с сиденьем неподвижна: одни и те же пиксели в обоих кадрах;
  - финал привязан координатой: в верхнем кадре стопа нижней ноги на высоте сиденья (~42 % высоты
    кадра), бёдра соприкасаются — зазор закрывается, а не «поднимается на треть»;
  - кадрирование плотнее: передний край скамьи на ~70 % ширины, голова на ~16 %.

Ловушка с папкой: кадры идут в НОВУЮ папку `Copenhagen_Adduction`; папку `Plank` не трогаем —
там наша пара строки «Планка на локтях».
"""
import importlib.util
import io
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "prompts")

_spec = importlib.util.spec_from_file_location("b4", os.path.join(HERE, "build-batch4-prompts.py"))
b4 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(b4)

FOLDER = "Copenhagen_Adduction"

RULE = (
    "THE ONE RULE THAT DECIDES IF THIS IMAGE IS CORRECT: this is a COPENHAGEN ADDUCTION - a side "
    "plank held beside a bench, with the TOP leg straight along the bench and the BOTTOM leg doing "
    "the work: it hangs near the floor and then rises sideways until the two inner thighs meet. THREE "
    "THINGS MUST BE TRUE AT ONCE: (1) the body is one straight line from the head through the hips to "
    "the feet, with the hips LIFTED off the floor and stacked on top of each other, never sagging and "
    "never rolled forward or back; (2) the lower forearm is flat on the floor with the elbow EXACTLY "
    "under the shoulder; (3) only the bottom leg moves - the top leg lies still on the bench. If the "
    "hips sit on the floor, if the torso twists, if the bottom leg bends at the knee, or if the top leg "
    "leaves the bench, the image is WRONG."
)

LIMBS = (
    "TWO LEGS, TWO ARMS, ONE BODY: exactly two thighs, two shins, two knees, two feet and two arms. "
    "THE BOTTOM LEG is the working one: fully STRAIGHT at the knee, the whole leg in line with the "
    "torso, the foot pointed, and it travels sideways between the two frames. THE TOP LEG is STRAIGHT "
    "and lies ALONG the bench: the knee is almost locked, the shin rests on the seat with the ankle and "
    "the lower shin as the contact, the shoe points to the far end of the bench and sits above the "
    "seat. It does NOT move between the frames. THE ARMS: the bottom forearm lies flat on the floor, "
    "elbow under the shoulder, hand open toward the head; the top arm rests along her side with the "
    "hand on her hip, elbow bent."
)

CAM = (
    "CAMERA: three-quarter FRONT view, the camera stands in front of her chest and about 30 degrees "
    "toward her HEAD end, 0.9 m above the floor, 3.0 m away, looking very slightly down - so the gap "
    "between the two legs and the closing of that gap lie IN THE PLANE OF THE IMAGE and can be read, "
    "not guessed. Because the camera is toward her head and her right: her RIGHT side is NEAR (the "
    "shoulder, arm and hip on the left of the image are larger), her LEFT side is FAR. ORIENTATION "
    "LOCK: her head is at the LEFT of the frame, her feet at the RIGHT, the floor line across the "
    "bottom, the bench on the RIGHT end, same as the companion frame of this pair. Never mirrored, "
    "never from behind, never a flat dead-on view from directly in front, never from the feet end, "
    "never looking down from above. SCALE LOCK: one metre of the body occupies exactly the same number "
    "of pixels as in the companion frame; the camera does not move, does not zoom, does not change "
    "height. FRAMING LOCK - THE NUMBERS BOTH FRAMES SHARE: the floor line at about 80 percent of the "
    "frame height; the hips at about 38 percent of the frame height in BOTH frames; the bench seat at "
    "about 42 percent; her head at about 16 percent of the frame width; the FRONT edge of the bench at "
    "about 70 percent of the frame width, so the bench fills the right third of the image and the "
    "contact of the top leg with the seat is large enough to read on a small card. Both legs, both "
    "feet, the bench and the whole arm are inside the frame, nothing cropped."
)

IDENT = (
    "EXERCISE IDENTITY: COPENHAGEN ADDUCTION (Copenhagen plank, long lever - the shin on the bench) "
    "- a side plank held next to a bench, the top leg lying along the seat, the bottom leg lifting "
    "toward it by adducting at the hip. Bodyweight only; the bench is support, not a load."
)

APP = (
    "APPARATUS: one flat bench standing lengthwise beside her, its seat at knee height of a kneeling "
    "person, matte black pad on a dark metal frame, the near leg of the bench clearly visible; plus a "
    "thin dark mat under her forearm only. BENCH LOCK: the bench does NOT move, resize or change shape "
    "between the two frames - its seat, legs and edge stay at exactly the same pixels, and the top leg "
    "rests on the same stretch of the seat in both frames. PROPS LOCK: no dumbbell, no kettlebell, no "
    "band, no cable, no partner, no second person, no spotter, no mirror, no logos."
)

CONTACT_LINE = (
    "CONTACT LINE (the size anchor of this pair): the line where the top leg meets the bench is "
    "FIXED - the lower shin and the ankle rest on the seat along the SAME pixels in both frames, and "
    "the shoe stays at the far end of the bench, above the seat, never hanging past it and never "
    "lifting off. The bench itself does not move, resize or change shape. Only the bottom leg travels."
)

DEPTH_ORDER = (
    "DEPTH ORDER (the defect of the previous draft: her bottom leg was drawn THROUGH the bench frame): "
    "the athlete lies in front of the bench, the bench stands BEHIND her. Wherever her legs and the "
    "bench overlap, HER LEG IS IN FRONT and the bench is BEHIND - no part of the bench (seat, near "
    "upright, crossbar, foot) may ever be drawn on top of her thigh, shin or shoe, and no part of her "
    "leg may pass through the bench frame. Between her bottom shoe and the bench's near upright there "
    "is always a sliver of background or floor, never an intersection."
)

HL = (
    "HIGHLIGHT: a soft semi-transparent warm-red X-ray glow through the skin along the INNER surface "
    "of the WORKING (bottom) thigh - the adductor mass running from the groin down to the inner side "
    "of the knee, drawn as one warm band that brightens as the leg rises. In the lowered frame it is "
    "a glow along a stretched inner thigh; in the raised frame the same band is bunched and brighter. "
    "The top leg, the quadriceps, the calves, the glutes, the abdomen, the obliques and the arms stay "
    "completely unlit and dark."
)

START_PHASE = (
    "PHASE - FRAME 1, LEG DOWN: she holds the side plank beside the bench with her hips LIFTED - head, "
    "hips and feet on one straight line, the pelvis stacked (no rotation toward the floor or the "
    "ceiling), the bottom shoulder directly above the elbow, the head in line with the spine and the "
    "gaze forward. The top leg lies straight along the seat, the shin resting on it. The BOTTOM leg is "
    "straight and hangs just above the floor - a hand's width of air between the shoe and the floor - "
    "the inner thigh stretched long. Nothing else is tense or moving."
)

FINISH_PHASE = chr(10).join([
    "PHASE - FRAME 2, LEG UP: the SAME plank, the same hips height, the same elbow, the same top leg lying along the same seat, the same camera - and the BOTTOM leg has risen sideways until the two inner thighs are TOUCHING, so the legs form one closed wedge with NO gap between them. Read the signs that must all be true:",
    "(1) THE BOTTOM FOOT IS NOW AT THE HEIGHT OF THE BENCH SEAT - about 42 percent of the frame height, level with the seat, and it STOPS SHORT of the bench's near upright: the shoe ends before the post, with air between them. A leg that stops a third of the way up, or one that ends inside the bench frame, is the defect of the previous drafts and the image is WRONG.",
    "(2) THE BOTTOM LEG IS STILL STRAIGHT at the knee - a bent knee makes this a different exercise.",
    "(3) THE HIPS HAVE NOT SAGGED OR RISEN: same height as in the companion frame, still stacked, the body line from head to feet unchanged.",
    "(4) THE TOP LEG HAS NOT MOVED: the same shin on the same seat, the same shoe at the far end, the same angle.",
    "(5) THE HEAD, THE SHOULDERS and the supporting elbow are where they were; only the bottom leg travelled."
])

FORB = (
    "FORBIDDEN: her leg passing THROUGH the bench frame or the bench drawn on top of her leg; the bottom "
    "shoe overlapping the bench's near upright; "
    "the top leg leaving the bench so the seat stands EMPTY in one frame; the top shoe "
    "hanging past the far end of the bench or lifted off the seat; a bent top knee hooked over the "
    "seat; the bottom leg stopping halfway so a gap stays between the thighs; hips down on the floor "
    "or sagging toward it; hips rolled forward or back so the body twists; an elbow ahead of or behind "
    "the shoulder; a bent bottom knee; both legs moving; the bottom leg crossing past the top leg; a "
    "partner holding the legs; a dumbbell or a band; a lying knee-to-knee squeeze on the floor; a "
    "standing adduction machine; a photograph; a view from above or from the feet; a mirrored "
    "orientation; a different body type; any second figure."
)

WARDROBE = (
    "MATCHES THE COMPANION FRAME (read this before posing): the SAME woman, the SAME outfit and the "
    "SAME build as the other frame of this pair - a black sports bra with a wide under-band, black "
    "shorts that run to mid-thigh, black sneakers with white soles, dark-blonde hair in a ponytail. "
    "BUILD LOCK: LEAN, not bulky - smooth muscle, NO visible fibre striations, flat stomach. If her "
    "outfit or her build differs from the companion frame, the image is WRONG."
)


def masculine(text):
    """Тот же текст, только местоимения по слову (b4.male чинит и падежи)."""
    return b4.male(text)


EXTRA = chr(10).join([CONTACT_LINE, chr(10), DEPTH_ORDER, chr(10), WARDROBE])

written = []
for suffix, phase, is_male in (("_start", START_PHASE, False), ("_finish", FINISH_PHASE, False),
                               ("_start_m", START_PHASE, True), ("_finish_m", FINISH_PHASE, True)):
    text = b4.render(RULE + " " + LIMBS, CAM, IDENT, APP, phase, b4.MAN if is_male else b4.WOMAN,
                     HL, FORB, EXTRA)
    if is_male:
        text = masculine(text)
    p = os.path.join(OUT, FOLDER + suffix + ".txt")
    io.open(p, "w", encoding="utf-8", newline="\n").write(text)
    written.append((os.path.basename(p), len(text)))

for name, n in written:
    print(name, n)
