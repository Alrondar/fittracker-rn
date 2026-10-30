# -*- coding: utf-8 -*-
"""Prompts for Smith Machine Leg Extension (9a77e5f5) — СТРОКА УДАЛЕНА ИЗ КАТАЛОГА 29.10.

Владелец снял позицию формулировкой «нам не нужны какие-то придуманные упражнения»: конфигурация
«скамья в Смите + адаптер + гриф у голеней» не подтверждена ни одним внешним описанием, а
существующий в продаже адаптер — рычаг, который bolt-ится к стойкам рамы, то есть по сути уже
покрытая строка «Разгибание ног в тренажере» (2b2f46fb). Файлы оставлены как запись попытки:
прогоны отвергнуты в vibe_images/rejected-2026-10-29/, раскладки не было, миграция удаления —
20261029073000_delete_smith_machine_leg_extension_invented_row.sql.

История вопроса ниже — она и есть урок.

Four files, named <FolderId>_{start,finish}[_m].txt — the convention build-illustrations.py
reads without a manual MAP. Female drafts carry NO suffix.

Спека согласована с владельцем 29.10:
  Вариант А  — скамья между стойками, на грифе толстая подушка, на голенях манжеты; разгибание
               колена толкает гриф ВВЕРХ по рельсам. Рычажный адаптер с осью у колена (вариант Б)
               отвергнут: реже встречается и хуже рисуется.
  Строка     — остаётся (needs_review, 0 / 0); формулировка «ось совпадает с коленным суставом»
               в этой конфигурации держится манжетами, а не осью — это честно, не выдумка.
  Стопы      — плоско на полу, пятки не отрываются (иначе кадр пойдёт в жим ногами).
  Гриф       — по одному диску с каждой стороны.
  Референса нет: `Smith_Machine_Leg_Extension/0.jpg` и `Leg_Extension/0.jpg` на апстриме — 404.

Дискриминаторы против соседей, оба обязательны в кадре:
  «Разгибание ног в тренажёре» (`Leg_Extensions`) — блочный тренажёр: стек грузов, сиденье со
   спинкой, рычаг с валиком. У нас их быть не должно.
  «Жим ногами» той же машины — откидная спинка, сани с платформой, ноги вверх. У нас человек
   сидит ВЕРТИКАЛЬНО на плоской скамье, стопы на ПОЛУ, работает только колено.
"""
import importlib.util
import io
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "prompts")

_spec = importlib.util.spec_from_file_location("b4", os.path.join(HERE, "build-batch4-prompts.py"))
b4 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(b4)

FOLDER = "Smith_Machine_Leg_Extension"

RULE = (
    "THE ONE RULE THAT DECIDES IF THIS IMAGE IS CORRECT: this is a SEATED KNEE EXTENSION done on a "
    "SMITH MACHINE with an adapter - not a leg press and not a squat. The athlete sits upright on a "
    "flat backless bench placed between the two posts of the Smith machine, facing the barbell; both "
    "THIGHS lie horizontal on the bench, both SHINS stand vertical, both FEET are FLAT on the floor "
    "with the heels down, and the loaded barbell sits in front of the lower legs on a thick pad with "
    "a cuff strapped around each ankle, so straightening the knees pushes the barbell UP along its "
    "rails. Between the two frames ONLY the knees move: the thigh stays on the bench, the hip angle "
    "stays about 90 degrees, the buttocks stay on the seat, the back keeps its angle, the hands keep "
    "their grip on the bench, and the heels are FLAT on the floor in the start frame. The knee is the "
    "only hinge: as the leg straightens the shin swings forward and the foot lifts off the floor with "
    "its cuff - that is correct and unavoidable, because the thigh never leaves the bench. What is NOT "
    "allowed is the foot pressing something: if the feet stay planted and push, if the torso reclines "
    "against a back pad, or if the body drives a foot platform, that is a LEG PRESS "
    "or a SQUAT and the image is wrong. If the bar rests on the hips, the thighs or behind the knees, "
    "the image is wrong - the bar works on the front of the ankles only."
)

LIMBS = (
    "TWO LEGS, TWO ARMS, ONE BARBELL: the frame contains exactly two thighs, two knees, two shins, "
    "two feet, two upper arms, two forearms and two hands, plus one barbell. Each leg is one closed "
    "chain: hip on the bench - thigh resting on the bench - knee - shin - ankle in its cuff - one foot "
    "flat on the floor. Each arm is one closed chain: shoulder - upper arm - forearm - one hand "
    "gripping the edge of the bench. NEVER a third leg or a third arm, never a shin that ends in "
    "nothing, never a foot floating in the air. The machine is metal, not limbs: the two guide rails "
    "are straight vertical tubes with carriage bearings that pass BEHIND the body and never fork, "
    "never bend like a knee and never end in a foot."
)

CAM = (
    "CAMERA: view from the athlete's LEFT side, turned about 25 degrees toward the front of her thighs "
    "and the bar, camera at 1.0 m height, 3.0 m away. ORIENTATION LOCK: the bench, the hips and the "
    "head are at the LEFT of the frame, the knees, the shins, the cuffs and the barbell are at the "
    "RIGHT, so she faces the right edge and the thighs run horizontally to the left-to-right knee. Same "
    "orientation in both frames of this pair. Never mirrored, never straight head-on, never from "
    "behind, never from above. BAR AXIS IN THIS CAMERA: the shaft is transverse across her body, so it "
    "reads as a diagonal - the end nearest the camera is LOWER in the frame, thicker and larger, its "
    "plate a wide open ellipse with the sleeve tip visible; the far end is HIGHER, thinner and smaller, "
    "its plate a narrow ellipse. The shaft is NEVER aimed straight into the lens (that collapses the "
    "bar into one big sleeve pointing at the viewer) and never a flat line with two identical ends; "
    "the two ends never change places between the frames. SCALE LOCK: one metre of the body occupies "
    "exactly the same number of pixels as in the companion frame, the bench, the machine height, the "
    "bar length and the plate diameters are identical in both frames; the camera does not move, does "
    "not zoom and does not change height. FRAMING LOCK: nothing is cropped - the whole athlete, the "
    "whole bench and the whole Smith machine frame with its top crossbeam and both rails sit inside "
    "the frame with a margin of backdrop on every side; the head at about 20 percent of the frame "
    "width from the left edge, the bar and both feet at about 70 percent of the width, both knees, "
    "both ankles and both feet fully visible."
)

IDENT = (
    "EXERCISE IDENTITY: SMITH MACHINE LEG EXTENSION WITH AN ADAPTER - sitting upright on a flat bench "
    "inside the Smith machine with the thighs resting on it and the feet flat on the floor, an adapter "
    "pad on the barbell and a cuff on each ankle, and the repetition made only by straightening the "
    "knees to lift the barbell up the rails and lowering it back under control. It isolates the "
    "quadriceps on the front of the thigh."
)

APP = (
    "APPARATUS, three rigid objects. SMITH MACHINE: a steel power rack with TWO perfectly vertical "
    "chrome guide rails, an upper crossbeam, hook points and safety catches along the posts, and a "
    "barbell whose ends ride in bearings ON those two rails - the bar can only travel straight up and "
    "down, it never tilts, one end is never higher than the other, and it never leaves the rails. "
    "BARBELL: one straight Olympic-style bar, loaded with ONE black round plate on each end plus a "
    "collar, and a THICK CYLINDRICAL FOAM PAD wrapped around the middle of the shaft between the two "
    "plates. ADAPTER: two ankle cuffs - a padded strap buckled around the FRONT of each lower shin and "
    "ankle, joined to that bar pad, so the bar hangs from the cuffs and stays in front of the shins "
    "with a hand's width of air between the bar and the kneecaps. BENCH: a flat, backless lift bench "
    "standing between the two posts, seat height about 45 centimetres, NO backrest, NO incline, NO "
    "seat pad under the thighs other than the bench itself. BODY: both thighs lie flat and horizontal "
    "on the bench, both shins drop vertically, both feet are FLAT on the floor under the bar with the "
    "heels down and the toes pointing forward, hip angle about 90 degrees, back tall with only a "
    "slight lean, both hands gripping the edges of the bench beside the hips. DEPTH ORDER from the "
    "camera back: her near arm, her near thigh and shin, the near cuff, the bar pad and the near end "
    "of the bar, the shaft, the far cuff and far end, her far leg, the near guide rail, the bench "
    "frame, the far guide rail, the backdrop. FORBIDDEN APPARATUS - this is NOT a leg press machine "
    "and NOT a selectorized extension machine, so the frame must contain NO angled sled, NO foot "
    "platform to push, NO weight stack with a pin, NO cable, NO reclined back pad, NO lever arm with "
    "a roller pad over the shins, NO shoulder pads, NO dumbbells, NO bands, NO second rack, NO mirror, "
    "NO second person."
)

HIGHLIGHT = (
    "HIGHLIGHT: a soft semi-transparent warm-red X-ray glow through the skin over the QUADRICEPS of "
    "BOTH thighs - the large muscle mass on the FRONT of the thigh, from the hip down to just above "
    "the kneecap, including the strap-like rectus femoris running down the middle of the front. Draw "
    "it on the side of the thigh that faces UP and forward (the bench side), on BOTH legs equally: "
    "exactly two glowing thighs, one per leg, and the glow belongs to the body, never floating on its "
    "own. The back of the thigh (hamstrings), the glutes, the calves, the shins, the abdomen and the "
    "arms stay dark."
)

START_PHASE = (
    "PHASE - FRAME 1, THE START, KNEES BENT: she sits tall on the bench with both thighs horizontal "
    "and both shins vertical, knees bent to about 90 degrees, both feet FLAT on the floor with the "
    "heels down. The barbell with its pad and the two ankle cuffs sits at the LOW end of its travel, "
    "resting just above the safety catches, in front of the shins and a hand's width clear of the "
    "kneecaps. The quadriceps are stretched and relaxed, the hands grip the bench, the back holds its "
    "slight lean, the hips stay pressed into the seat."
)

FINISH_PHASE = (
    "PHASE - FRAME 2, THE TOP, KNEES STRAIGHT: measured against the companion frame the ONLY thing "
    "that moved is the two knees. Both shins have swung forward until the legs are nearly straight - "
    "the angle between thigh and shin is about 175 degrees, a soft end of range, not a locked snap - "
    "and the barbell has travelled 30 to 40 centimetres UP the two vertical rails, its ends still in "
    "the same bearings, still level, still held by the ankle cuffs in front of the feet. Because the "
    "thighs never leave the bench, the feet have risen off the floor with their cuffs - the legs are "
    "extended in front of the body, the shoes clear of the ground, nothing is being pressed and "
    "nothing is planted. THROUGHOUT: both thighs stay lying horizontal on the bench, the buttocks and "
    "hips never lift off the seat, the back keeps the same angle, the hands keep the same grip, and the "
    "bar never touches the knees or the thighs. The quadriceps are short, thick and squeezed. PAIR "
    "TEST: companion frame - shins vertical, knees 90 degrees, heels flat on the floor, bar low; this "
    "frame - legs nearly straight, shins swung forward, feet lifted with the cuffs, bar high on the "
    "rails. Same body, same camera, same bench, different knees. If the torso has reclined, if a foot "
    "has found a platform to push, or if the bar has tilted or left the rails, the image is wrong."
)

FORB = (
    "FORBIDDEN: any third leg, arm or foot; a limb that starts or ends in mid-air; a shin that ends in "
    "nothing; feet planted on a platform and pressing it; heels already off the floor in the start "
    "frame; toes pointed down like a ballet point; a leg press machine with an angled sled, a foot "
    "plate or a reclined back pad; a "
    "selectorized extension machine with a weight stack, a cable or a lever arm with a roller pad; a "
    "squat - no bar on the back, no bar on the shoulders, no standing position; a barbell resting on "
    "or behind the knees, on the thighs or on the hips; a bar that has left the guide rails, a bar "
    "tilted with one end higher, a bar end pointing straight into the lens; a bench with a backrest or "
    "an incline; hips or buttocks lifted off the seat; a torso reclined against anything; dumbbells, "
    "bands, kettlebells, a second rack or a mirror; the muscle glow on the back of the thigh or on one "
    "leg only; a rounded or arched back; a photograph; a different body type; any second figure."
)


def masculine(text):
    """Только местоимения: CHARACTER LOCK подставляется уже мужской (b4.MAN), гардероб и причёску
    менять не нужно. Подмена по границе слова — наивный replace 'her ' ломает 'where ' и 'other '."""
    for pat, sub in ((r"\bshe\b", "he"), (r"\bShe\b", "He"),
                     (r"\bher\b", "his"), (r"\bHer\b", "His"),
                     (r"\bherself\b", "himself")):
        text = re.sub(pat, sub, text)
    return text


written = []
for suffix, phase, is_male in (("_start", START_PHASE, False), ("_finish", FINISH_PHASE, False),
                               ("_start_m", START_PHASE, True), ("_finish_m", FINISH_PHASE, True)):
    text = b4.render(RULE + " " + LIMBS, CAM, IDENT, APP, phase, b4.MAN if is_male else b4.WOMAN,
                     HIGHLIGHT, FORB)
    if is_male:
        text = masculine(text)
    p = os.path.join(OUT, FOLDER + suffix + ".txt")
    io.open(p, "w", encoding="utf-8", newline="\n").write(text)
    written.append((os.path.basename(p), len(text.split())))

for name, words in written:
    print("%-46s %4d words" % (name, words))
