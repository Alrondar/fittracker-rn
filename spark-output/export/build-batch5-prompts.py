# -*- coding: utf-8 -*-
"""Prompts for the position after the 23.10 batch: Calf Press On The Leg Press Machine (19f4f807).

Four files, named <FolderId>_{start,finish}[_m].txt — the convention build-illustrations.py
reads without a manual MAP. Female drafts carry NO suffix.

Фиксация владельца от 24.10, она же порядок кадров (до неё фазы были перевёрнуты):
  Кадр 1 (start)  — стопа вытянута целиком, нога прямая до кончиков пальцев, платформа чуть ВЫШЕ.
  Кадр 2 (finish) — стопа под 90 градусов к голени, носок в ТОЙ ЖЕ точке платформы,
                    платформа на несколько сантиметров НИЖЕ (опустилась, когда пятка ушла назад).
  Общее           — носок прижат к кромке и не ходит по платформе; меняется только голеностоп.
  Камера          — мёртвый вид сбоку, выбран владельцем 24.10 после трёх прогонов с разворотом
                    на 20 градусов: платформа читается одной линией кромки, и «носок на линии»
                    становится рисунемым запретом, а не просьбой.
  Слияние         — «Жим носками в тренажёре» (5059defe) дубль этой строки, уходит merge-миграцией.
"""
import importlib.util
import io
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "prompts")

# Общие блоки и подмена пола живут в генераторе пачки 23.10 — переиспользуем их, а не копируем.
_spec = importlib.util.spec_from_file_location("b4", os.path.join(HERE, "build-batch4-prompts.py"))
b4 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(b4)

FOLDER = "Calf_Press_On_The_Leg_Press_Machine"

RULE = (
    "THE ONE RULE THAT DECIDES IF THIS IMAGE IS CORRECT: this is a CALF PRESS on a leg press "
    "machine. The legs are pushed OUT and held straight, each foot presses the LOWER EDGE of the foot "
    "plate with its TOE and with nothing else, and the whole repetition happens at the ANKLE. The toe "
    "is PINNED: in both frames it touches the very same point on the very same edge of the plate, it "
    "never slides up, down or along it. Only one number changes - the angle between the front of the "
    "shin and the sole of the shoe. In frame 1 the foot is fully pointed, that angle is about 150 "
    "degrees, the leg is one unbroken straight line from the hip to the toe tips, and the sled sits a "
    "little HIGHER on the rails. In frame 2 the foot is bent against the shin to a RIGHT ANGLE, that "
    "angle is 90 degrees, the heel has dropped back toward the seat, and because the ankle opened the "
    "sled has sunk a few centimetres DOWN the rails. The knees never bend and the hips never leave "
    "the seat; if the knees fold and the sled comes down toward the body, that is a LEG PRESS and the "
    "image is wrong. The shoe is RIGID in both frames - it swings about its own toe like the hand of "
    "a clock, it never creases, buckles or squashes."
)

# Лишняя нога рождалась из формулировки «дальняя нога видна от бедра и от колена»: модель рисовала
# колено и голень без продолжения. Теперь две полные цепи, и дальняя лежит прямо за ближней.
LEGS = (
    "TWO LEGS, TWO SHOES - NOTHING ELSE: the athlete has exactly two legs, and the frame contains "
    "exactly two thighs, two knees, two shins and two shoes. The NEAR leg is drawn in full detail as "
    "one closed chain: hip on the seat - thigh - knee - shin - ankle - one shoe. The FAR leg is the "
    "same chain, ending in its OWN single shoe. ONE LEG - ONE SHOE: never two shoes on the same leg, "
    "never a third shoe anywhere, never a shin that ends in nothing. Both legs are drawn from the hip "
    "on the seat to the shoe on the plate. From this dead-side angle the far leg lies directly behind "
    "the near one: draw it a shade darker, with its own shin peeking above the near shin and its own "
    "shoe peeking just above the near shoe, so they read as two separate limbs and never as one "
    "merged leg. COUNT BEFORE YOU DRAW: two shoes touching the plate edge, that is all. The machine "
    "is metal, not limbs: the rails are straight chrome tubes with bolt heads that pass BEHIND the "
    "legs and never fork, never bend like a knee and never end in a shoe."
)

CAM = (
    "CAMERA: DEAD SIDE-ON view of the athlete's LEFT side - zero yaw toward the foot plate, optical "
    "axis exactly perpendicular to the plane of the rails, camera at seat height, 4.4 m away so the "
    "ENTIRE machine, its top edge and the athlete all sit inside the frame with air around them. This "
    "one choice decides the whole picture: seen from dead side-on the foot plate shows its EDGE, so "
    "it reads as a thick dark slab at the right of the frame and its lower edge is ONE straight line. "
    "There is no broad plate surface anywhere in the frame for a foot to stand on, and a shoe that "
    "appears to rest on a wide plate face means the camera has rotated and the image is wrong. The "
    "near leg is drawn in full; the far leg lies directly behind it and shows as a sliver of shin "
    "above the near shin plus its own shoe peeking a third of a shoe-height above the near shoe. "
    "BOTH SHOES STAY VISIBLE: the near shoe drawn in full and the far shoe showing its heel, its "
    "sole edge and its toe around the near one - a frame with only one shoe in it is a broken frame. "
    "MACHINE SCALE PARITY: the sled, the plate slab and the weight discs occupy exactly the same "
    "number of pixels in both frames; if the machine reads closer, larger or higher-detail in one "
    "frame, the camera has moved and the pair is broken. "
    "ORIENTATION LOCK: the reclined back pad and the seat are at the LEFT of the frame, the foot "
    "platform is at the RIGHT, so the legs run from left down to right up and the toes point up-right "
    "into the plate edge. Same orientation in both frames of this pair. Never mirrored, never head-on "
    "along the rails, never from above, never straight down the machine. SCALE LOCK, the strictest "
    "rule of the pair: one metre of the body occupies exactly the same number of pixels as in the "
    "companion frame, the distance from the top of the head to the seat is the same percentage of "
    "frame height in both frames, and the floor line, the headroom and the size of the plate slab are "
    "identical. The camera does not move, does not zoom, does not change height. A companion frame "
    "drawn closer in or larger is a failed pair. LEG LOCK ACROSS THE PAIR: the legs are pushed OUT "
    "and held straight - the angle between thigh and shin is about 165 degrees, a soft knee, in BOTH "
    "frames, and the hips stay glued to the seat. The sled sits at two thirds up the rails - a few "
    "centimetres higher in frame 1 than in frame 2 - and measured AGAINST THE PLATE the toes keep the "
    "same contact point in both frames: when the sled sinks the feet sink with it, but they never "
    "move along the plate. If the knees are bent to a right angle, or the sled sits low near the body "
    "in either frame, that frame shows a leg press and is wrong. FRAMING LOCK: nothing at all is "
    "cropped - the whole athlete, the whole sled, the whole foot plate and the weight discs sit "
    "inside the frame with a margin of empty backdrop on every side. The head sits at about 12 "
    "percent of the frame width from the left edge, the top edge of the foot plate at about 22 "
    "percent of the frame height from the top edge, both shoes at about 78 percent of the width and "
    "40 percent of the height, the near knee, ankle and heel fully visible and the far shoe peeking "
    "above it."
)

IDENT = (
    "EXERCISE IDENTITY: CALF PRESS ON THE LEG PRESS MACHINE - seated with the back and hips on the "
    "pad, legs pushed out and held straight while the sled rests on the rails at two thirds of their "
    "length, each foot pressing the LOWER EDGE of the foot plate with its TOE, and the repetition "
    "made entirely at the ankle: from the pointed foot she lets the heel drop back until the foot "
    "stands at a right angle to the shin - the sled sinks a few centimetres while she does that - "
    "then presses back up onto the toes. The knees never bend."
)

APP = (
    "APPARATUS, one rigid machine: a plate-loaded 45-degree leg press - a reclined back pad with a "
    "flat seat at its lower end, TWO straight parallel rails rising from the frame to the upper "
    "right, a sled riding on those rails with a large foot plate whose face is PERPENDICULAR to the "
    "rails and therefore seen EDGE-ON by this camera - a thick dark slab whose lower edge is a single "
    "straight line, with no visible surface to stand on, round handlebars beside the seat, and black "
    "weight plates loaded on the sled. SLED LOCK: the sled is held on the rails at about two thirds "
    "of their length by her feet on straight legs - a long stretch of EMPTY rail stays visible above "
    "the sled, the plate never touches the top of the picture, and the knees never bend to move it. "
    "SLED TRAVEL is only a few centimetres: the sled sits slightly higher in frame 1 and has sunk "
    "slightly lower in frame 2. FOOT POSITION LOCK, read it as occlusion: the lower edge of the foot "
    "plate is ONE straight line, and the toe tip is the only part of either shoe that touches it. The "
    "whole body of each shoe hangs BELOW that line, in open air, with the machine frame and the "
    "backdrop visible behind it. That contact point is identical in the two frames - the foot is "
    "pinned to it like a hinge pin and never walks along the plate. The toes point up-right into the "
    "edge. TWO SHOES, ONE SILHOUETTE: the feet are strictly parallel and hip-width apart, so from "
    "dead side-on the two shoes are the SAME side view of the same shoe - laces toward the camera, "
    "sole toward the plate line, toe up - drawn twice, one partly hidden behind the other and offset "
    "up by about a third of a shoe height, the far one a shade darker. Never mirror one of them, "
    "never turn the far shoe so its sole or inner arch faces the camera, never aim either toe left, "
    "straight up, or toward the other shin. The toes do NOT splay outward and the heels do not flare "
    "apart. Above the toe line the plate stays bare. If the sole or the ball of a shoe lies against "
    "the plate, the foot is in the wrong place and the image shows a leg press. DEPTH ORDER from the "
    "camera back: her near arm, her near leg, her far leg directly behind it, the edge-on sled and "
    "its foot plate, the far rail, the frame. PROPS LOCK: no barbell across the hips, no shoulder "
    "pads, no calf-raise block, no knee-padded seated machine, no dumbbells, no resistance bands, no "
    "second person, no mirror."
)

HIGHLIGHT = (
    "HIGHLIGHT: a soft semi-transparent warm-red X-ray glow through the skin over the GASTROCNEMIUS "
    "of BOTH lower legs - the two-headed calf muscle on the BACK of the shin, the side that faces the "
    "seat and the floor, NOT the side that faces the plate. Draw it as the diamond bulge behind the "
    "shin, below the knee, narrowing into the Achilles tendon at the heel. Light BOTH legs - the near "
    "calf in full and the far calf on the strip of it that peeks above the near shin, so there are "
    "exactly two glowing calves, one per leg, and the glow belongs to the body, never floating on its "
    "own. The front ridge of the shin (the tibialis, the side facing the plate) stays dark, and so do "
    "the quadriceps, the hamstrings, the glutes, the abdominals and the feet."
)

START_PHASE = (
    "PHASE - FRAME 1, THE POINTED FOOT: she sits with the back and hips flat on the pad, both hands "
    "on the handlebars, legs pushed OUT and straight. The feet are fully extended - the leg is ONE "
    "unbroken line from the hip through the knee and the shin all the way to the toe tips, the ankles "
    "are plantarflexed and the angle between the front of the shin and the sole of the shoe is about "
    "150 degrees. The toes press the lower edge line of the plate and the whole rest of each shoe "
    "hangs below that line in open air. The calves are short, round and bunched, and the sled sits at "
    "the higher end of its few centimetres of travel, empty rail above it. Each shoe is a RIGID "
    "object turning on its own toe like a key on a hook - no crease, no buckle, no squash anywhere "
    "along its length."
)

FINISH_PHASE = (
    "PHASE - FRAME 2, THE FOOT AT A RIGHT ANGLE TO THE SHIN: the toes still press the SAME point on "
    "the SAME edge line of the plate, nothing has slid along it. What changed is the ankle: each foot "
    "has rotated about its own toe until the angle between the front of the shin and the sole is "
    "exactly 90 degrees, the way a bare foot stands flat on the floor. The heel has dropped back and "
    "down toward the seat, the sole now faces down-left toward the body instead of up-right toward "
    "the plate, the arch points at the plate, and the calves are long and stretched. Because the "
    "ankle opened, the sled has sunk a few centimetres DOWN the rails. Each shoe stays RIGID - the "
    "same outline, the same length, the same unbroken sole curve as in the companion frame; the whole "
    "shoe has simply turned about its toe like the hand of a clock, by about 60 degrees. A creased, "
    "buckled or squashed shoe is a fatal error. NOTHING ELSE HAS MOVED: the knees keep the same soft "
    "165 degrees, the hips stay on the seat, the hands stay on the handlebars, and the camera and the "
    "body scale are identical to the companion frame. PAIR TEST: in the companion frame the leg is "
    "straight through to the toe tips, the sole faces the plate and the sled sits a little higher; in "
    "this frame the foot is at a right angle to the shin, the sole faces the body and the sled is a "
    "few centimetres lower. Same toe contact point in both. If the shoes look alike, or the toe has "
    "moved along the plate, or the knees have bent, the image is wrong."
)

FORB = (
    "FORBIDDEN: any third leg part of any kind - an extra thigh, knee, shin, ankle or shoe; a limb "
    "that starts or ends in mid-air; a knee without a thigh above it; a shin that runs into the "
    "machine instead of into a shoe; two legs merged into one; only one shoe in the frame; a machine "
    "drawn larger or closer than in the companion frame; a foot resting on the floor - the "
    "athlete has two legs and no more; a toe that has moved along the plate between the two frames; a "
    "shoe standing on the plate face instead of hanging below its edge; the far foot rotated so its "
    "sole or inner arch faces the camera; knees that fold and a sled that travels far down the rails "
    "toward the body (a leg press); feet planted in the middle or at the top of the plate; a hack "
    "squat machine with shoulder pads; a standing calf-raise block with a shoulder pad; a seated "
    "calf machine with pads over the knees; a barbell, dumbbell or band anywhere; the same ankle "
    "angle in both frames; the muscle glow on the front of the shin or on one leg only; a bent or "
    "arched back off the pad; a wide plate face visible under or behind the feet, which means the "
    "camera has swung off side-on; anything cropped by the edge of the frame; a photograph; a "
    "different body type; any second figure."
)


def masculine(text):
    """Только местоимения: блок CHARACTER LOCK подставляется уже мужской (b4.MAN), поэтому
    гардероб и причёску здесь менять не нужно. Подмена по границе слова — наивный replace 'her '
    ломает 'where ' и 'other '. Тот же приём, что в генераторах пачек 23.10."""
    for pat, sub in ((r"\bshe\b", "he"), (r"\bShe\b", "He"),
                     (r"\bher\b", "his"), (r"\bHer\b", "His"),
                     (r"\bherself\b", "himself")):
        text = re.sub(pat, sub, text)
    return text


written = []
for suffix, phase, is_male in (("_start", START_PHASE, False), ("_finish", FINISH_PHASE, False),
                               ("_start_m", START_PHASE, True), ("_finish_m", FINISH_PHASE, True)):
    text = b4.render(RULE + " " + LEGS, CAM, IDENT, APP, phase, b4.MAN if is_male else b4.WOMAN,
                     HIGHLIGHT, FORB)
    if is_male:
        text = masculine(text)
    p = os.path.join(OUT, FOLDER + suffix + ".txt")
    io.open(p, "w", encoding="utf-8", newline="\n").write(text)
    written.append((os.path.basename(p), len(text.split())))

for name, words in written:
    print("%-52s %4d words" % (name, words))
