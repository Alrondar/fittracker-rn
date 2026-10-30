# -*- coding: utf-8 -*-
"""Prompts for the 23.10 batch: Plank (99e41686) and Wide-Grip Pull-Up (e4bcc6ac).

Four files per position, named <FolderId>_{start,finish}[_m].txt so build-illustrations.py
picks the pair up without a manual MAP. Female drafts carry NO suffix (the loader matches
"_start" / "_start_v2" only for the female gender).

Owner verdicts of 23.10 that shape these prompts:
  Plank        - static: both frames are the same hold, the second one is one breath later.
  Wide-Grip    - rear view, grip visibly 1.5x shoulder width (same camera family as our
                 "Pullups" pair; the grip width is the only readable discriminator).
"""
import io
import os
import re

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "prompts")

STYLE = (
    "STYLE - READ FIRST AND OBEY: a stylized CGI 3D render in the visual language of a modern "
    "fitness app illustration, semi-realistic but unmistakably RENDERED: smooth matte shading over "
    "skin and muscle, slightly idealized anatomy, clean painted surfaces. THIS IS NOT A PHOTOGRAPH "
    "- no camera grain, no photographic skin pores, no real gym, no lens depth of field; not a "
    "cartoon, not a line icon."
)

SINGLE = ("SINGLE FRAME: one continuous scene filling the whole canvas - no collage, no split "
          "panels, no inset, no duplicated figure, no second view of the same exercise.")

WOMAN = ("CHARACTER LOCK: athletic woman in her late 20s, LEAN and athletic, NOT bulky, dark-blonde "
         "hair tied in a ponytail, black sports bra, black shorts, black sneakers with white soles, "
         "neutral focused expression. SLIM athletic build, thin biceps, flat trapezius, no "
         "bodybuilder mass. Exactly this one woman, no other person.")

MAN = ("CHARACTER LOCK: athletic man in his late 20s, LEAN and athletic, NOT bulky, short dark-brown "
       "hair cropped at the sides, clean-shaven, black sleeveless training top, black shorts, black "
       "sneakers with white soles, neutral focused expression. Slim athletic build, no bodybuilder "
       "mass. Exactly this one man, no other person.")

BG = ("BACKGROUND: seamless desaturated cool blue-grey studio backdrop with a soft gradient and a "
      "gentle vignette, soft floor shadow under the athlete, matte dark-grey metal with black pads, "
      "no logos, no text, no numbers, no watermark, no mirrors.")

# ---------------------------------------------------------------- Plank (99e41686)
PLANK_RULE = (
    "THE ONE RULE THAT DECIDES IF THIS IMAGE IS CORRECT: this is a CLASSIC FOREARM PLANK facing the "
    "floor - weight on both FOREARMS and both TOES, elbows stacked directly under the shoulders, "
    "body one straight line from the top of the head to the heels, hips neither piked up nor sagging. "
    "If the figure crouches, kneels, sits back on the heels, stands, or rests on straight arms in a "
    "push-up, the image is wrong."
)
PLANK_CAM = (
    "CAMERA: true side view at hip height (0.55 m), 3.2 m away, lens parallel to the floor, so the "
    "head-to-heel line reads as one ruler-straight diagonal across the frame. ORIENTATION LOCK: her "
    "head and shoulders are on the LEFT of the frame, her feet and shoes on the RIGHT, same as the "
    "companion frame of this pair. Never mirrored, never three-quarter, never from behind, never "
    "head to the right. SCALE LOCK: one metre of the body occupies exactly the same number of pixels "
    "as in the companion frame; the camera does not move, does not zoom, does not change height, and "
    "the floor line and headroom stay identical. FRAMING LOCK: the whole body inside the frame with "
    "air; the crown of the head at about 22 percent of the frame width from the left edge, the heels "
    "at about 88 percent, both elbows and both shoes fully visible, nothing cropped."
)
PLANK_APP = (
    "APPARATUS: a bare studio floor with a thin flat training mat under the forearms and toes only. "
    "PROPS LOCK: exactly one low matte mat, no bench, no box, no ball, no barbell, no dumbbells, no "
    "bands, no wheel, no slider discs, no second person, no mirror."
)
PLANK_HL = (
    "HIGHLIGHT: a soft semi-transparent warm-red X-ray glow through the skin over the TRANSVERSUS "
    "ABDOMINIS - the deep corset of the front abdominal wall, drawn as a low, wide warm band running "
    "from under the ribcage to the hip crease and wrapping toward the flank, BELOW the six-pack "
    "muscle, not on it. The rectus abdominis surface, the chest, the shoulders, the quadriceps and "
    "the glutes stay completely unlit and dark."
)
PLANK_FORB = (
    "FORBIDDEN: the crouching or half-kneeling figure with folded hands that the current wrong frame "
    "shows; a push-up position on straight arms; knees resting on the mat; hips piked up into a "
    "tent; hips sagging toward the floor; the forearms forward of or behind the shoulders; hands "
    "clenched into fists on the floor; a side plank; a plank with feet up on a bench; a photograph; "
    "a different body type; any second figure."
)
PLANK_START_PHASE = (
    "PHASE - HOLD, first breath: she holds the forearm plank, forearms flat on the mat with the "
    "elbows exactly under the shoulders and the hands relaxed, fingers loosely touching the floor, "
    "toes tucked under the heels, knees straight, the pelvis slightly tucked so the lower back stays "
    "flat, the neck long with the gaze down at the floor between her hands. The abdominal wall is "
    "gently drawn IN toward the spine - this frame is the neutral, braced moment."
)
PLANK_FINISH_PHASE = (
    "PHASE - HOLD, one breath later: THE EXACT SAME forearm plank, same line, same height, same "
    "camera. The ONLY difference from the companion frame is the breath: the ribcage has expanded "
    "sideways a few millimetres and the belly is a shade fuller against the floor, while the spine, "
    "the pelvis, the elbows, the toes and the head stay where they were. If her hips, shoulders or "
    "head sit at a different height than in the companion frame, the image is WRONG."
)

# ------------------------------------------------------ Wide-Grip Pull-Up (e4bcc6ac)
PULL_RULE = (
    "THE ONE RULE THAT DECIDES IF THIS IMAGE IS CORRECT: the two hands grip the pull-up bar WIDE - "
    "each hand about three quarters of a head-width outside its own shoulder, so the distance between "
    "the hands is roughly 1.5 times her shoulder width and the forearms and upper arms form two clear "
    "V shapes with the horizontal bar. If the hands come down to shoulder width, or if one hand is "
    "near the middle of the bar, the image shows a different exercise and it is WRONG."
)
PULL_CAM = (
    "CAMERA: rear view, three-quarters of the way around her back, about 35 degrees to her right, "
    "at just above bar height (2.3 m), 3.4 m away, looking slightly down at her back so the lat "
    "spread and the width of the grip are both readable. ORIENTATION LOCK: we see her BACK, her head "
    "is at the TOP of the frame, her feet at the BOTTOM, the bar runs horizontally across the upper "
    "part of the frame, same as the companion frame of this pair. Never mirrored, never a front view, "
    "never a pure side profile. SCALE LOCK: one metre of the body occupies exactly the same number of "
    "pixels as in the companion frame; the camera does not move, does not zoom, does not change "
    "height, and the bar stays at the same pixel height in both frames. FRAMING LOCK: the whole "
    "athlete inside the frame with air; both outer ends of the bar with their rack uprights visible, "
    "the crown of her head at about 20 percent of the frame height, the soles of her shoes at about "
    "92 percent, both hands and both elbows fully visible, nothing cropped."
)
PULL_APP = (
    "APPARATUS: a wall-mounted pull-up rig - one horizontal matte dark-grey metal bar between two "
    "vertical uprights bolted to the wall, the bar a straight round tube with knurled grips near each "
    "end. PROPS LOCK: no cable, no pulley, no pulldown bar, no weight stack, no seat, no thigh pad, "
    "no bench, no resistance band on the bar or around the body, no dip belt, no dumbbell between the "
    "feet, no chalk bag, no second person, no mirror."
)
PULL_HL = (
    "HIGHLIGHT: a soft semi-transparent warm-red X-ray glow through the skin over both LATISSIMUS "
    "DORSI - the wide fan of muscle running from the lower ribs and spine out to the armpit on each "
    "side of the back, drawn as two symmetric warm wings under the armpits that narrow toward the "
    "waist. The trapezius, the rear deltoids, the biceps, the forearms and the erectors below the "
    "ribcage stay completely unlit and dark. Both lats glow equally; never one side only."
)
PULL_BAR_PERSPECTIVE = (
    "BAR PERSPECTIVE LOCK (this is the failure of every previous attempt): the camera stands BEHIND "
    "HER AND TO HER RIGHT, so the rig must be seen from the same three-quarter angle as her body - "
    "NOT straight into the lens.\n"
    "Three signs that must all be true:\n"
    "(1) The bar is NOT a flat horizontal line of even thickness. It recedes in depth: her RIGHT hand "
    "is the NEAR hand, so the right end of the bar is nearer the lens - drawn THICKER, LOWER in the "
    "frame and LONGER visible; her left hand is the FAR hand, so the left end is THINNER, slightly "
    "HIGHER in the frame and shorter.\n"
    "(2) The two wall uprights are at different depths: the RIGHT upright (near) is wider, its bolts "
    "and its bracket bigger and sharper; the LEFT upright (far) is narrower, smaller and slightly "
    "softer. They are NOT mirror images of each other.\n"
    "(3) Where the bar enters each bracket, the round end cap is drawn as an ELLIPSE tilted by the "
    "same three-quarter angle, not as a circle facing the camera, and not as a flat rectangle.\n"
    "WRONG RESULT: a bar that runs perfectly parallel to the top edge of the frame with both ends at "
    "the same height and the same thickness, and two identical mirrored uprights - that is a rig "
    "drawn in profile under a three-quarter body, and the image is WRONG."
)
PULL_WARDROBE = (
    "MATCHES THE COMPANION FRAME (read this before posing): the SAME woman, the SAME outfit and the "
    "SAME build as the other frame of this pair - a black sports bra with a wide under-band, "
    "HIGH-WAIST black shorts that run to mid-thigh (waistband at the navel, hem covering the top of "
    "the thigh, NOT short running shorts), black sneakers with white soles, dark-blonde hair in a "
    "ponytail. BUILD LOCK: LEAN, not bulky - smooth muscle, NO visible fibre striations in the "
    "deltoids or trapezius, NO veins on the arms or forearms, flat stomach. If her shoulders look "
    "like a bodybuilder's or her shorts are shorter than in the companion frame, the image is WRONG."
)
PULL_HEADSCALE = (
    "RIG SCALE LOCK (the only reliable size anchor): the wall rig does NOT move or resize between the "
    "two frames of this pair - the two uprights and the horizontal bar occupy exactly the same pixels "
    "as in the companion frame, the bar stays at the same height in the frame, and the athlete is the "
    "only thing that moves. Her head is the same pixel size as in the companion frame. If the rig "
    "looks bigger, closer or cropped differently than in the companion frame, the camera moved and "
    "the image is WRONG."
)
PULL_START_PHASE = (
    "PHASE - START, the dead hang: she hangs from the wide grip with both arms fully extended, "
    "shoulders packed down away from the ears, shoulder blades set, the body long and still, legs "
    "bent behind her with the knees about 90 degrees and the ankles crossed, the chin far BELOW the "
    "bar. The bar is straight overhead, her back faces the camera. The crown of her head sits at "
    "about 13 percent of the frame height and the soles of her shoes at about 93 percent."
)
PULL_FINISH_PHASE = (
    "PHASE - FINISH, one rep up: the top of the same strict pull-up. Arms bent, elbows driven DOWN "
    "and OUT to the sides keeping the same wide V as in the companion frame, the lats flared wide, "
    "the body pulled straight up with no swing, no kip, no arch and no legs kicked forward. The head "
    "stays upright above the bar, the neck in line with the spine. Legs unchanged from the companion "
    "frame - knees about 90 degrees behind her, ankles crossed, soles at about 93 percent of the "
    "frame height."
)
PULL_FORB = (
    "FORBIDDEN: a cable lat-pulldown machine, a weight stack, a seat or a thigh pad - the current "
    "wrong frame shows exactly that and it must not reappear; the bar pulled BEHIND the head (that "
    "is a different row); a shoulder-width or close grip; a supinated underhand grip (chin-up); a "
    "neutral hammer grip; hands in the middle of the bar; a resistance band; added weight; straight "
    "legs dangling or piked forward; a kipping arch; a photograph; a front view; a different body type."
)


def render(one_rule, cam, ident, app, phase, character, hl, forb, extra=None):
    parts = [STYLE, one_rule, cam, ident, app, phase, character, hl, BG, forb, SINGLE]
    if extra:
        parts.insert(6, extra)
    return "\n\n".join(parts) + "\n"


def male(text):
    """Мужской вариант = тот же текст, но местоимения по слову, а не по подстроке:
    наивный replace 'her ' ломает 'other ' и 'where '. Верх — по принятой в пачке
    формулировке мужского CHARACTER LOCK ('black sleeveless training top')."""
    for pat, sub in ((r"\bshe\b", "he"), (r"\bShe\b", "He"),
                     (r"\bher\b", "his"), (r"\bHer\b", "His"),
                     (r"\bherself\b", "himself")):
        text = re.sub(pat, sub, text)
    text = text.replace("a black sports bra with a wide under-band",
                        "a black sleeveless training top")
    text = text.replace("black sports bra with a wide under-band",
                        "black sleeveless training top")
    text = text.replace("black sports bra, black shorts", "black sleeveless training top, black shorts")
    text = text.replace("the SAME woman", "the SAME man")
    text = text.replace("dark-blonde hair in a ponytail",
                        "short dark-brown hair cropped at the sides")
    # Падежи: дословная замена her->his ломает объектные позиции («behind his»,
    # «away from his») и не трогает верхний регистр в блоках-замках.
    for bad, good in (("BEHIND HER AND TO HER", "BEHIND HIM AND TO HIS"),
                      ("HER OWN FACE", "HIS OWN FACE"),
                      ("TOP OF HER HEAD", "TOP OF HIS HEAD"),
                      ("behind his and to his", "behind him and to his"),
                      ("bent behind his with", "bent behind him with"),
                      ("degrees behind his", "degrees behind him"),
                      ("AWAY from his", "AWAY from him"),
                      ("Behind his stands", "Behind him stands"),
                      ("behind his stands", "behind him stands"),
                      ("at his at", "at him at")):
        text = text.replace(bad, good)
    # Объектная позиция после предлога: «his» на месте «her» допустимо, только если
    # дальше существительное («to his right», «from his two arms»). Если дальше
    # служебное слово — это местоимение, а не притяжательное («in front of his and …»).
    text = re.sub(r"\b(behind|from|to|with|under|above|against|beside|before|after|around|through"
                  r"|in front of) his\b(?=\s+(?:and|at|fully|is|was|not|no|in|on|of|the|a|an|while)"
                  r"|\s*[,.;:])", r"\1 him", text)
    return text


FILES = {
    "Plank": dict(
        one_rule=PLANK_RULE, cam=PLANK_CAM,
        ident="EXERCISE IDENTITY: PLANK (forearm plank) - an isometric hold on the forearms and toes "
              "on the floor, elbows under the shoulders, body in one straight line, hips slightly "
              "tucked. Static hold: nothing travels, the only motion is breathing.",
        app=PLANK_APP, hl=PLANK_HL, forb=PLANK_FORB),
    "Wide-Grip_Pull-Up": dict(
        one_rule=PULL_RULE, cam=PULL_CAM,
        ident="EXERCISE IDENTITY: WIDE-GRIP PULL-UP - hanging from an empty pull-up bar with a "
              "pronated grip about 1.5 times shoulder width, pulling the upper chest to the bar and "
              "lowering under control. Bodyweight only, no cable anywhere.",
        app=PULL_APP, hl=PULL_HL, forb=PULL_FORB,
        extra="\n\n".join([PULL_BAR_PERSPECTIVE, PULL_WARDROBE, PULL_HEADSCALE])),
}

PHASES = {"Plank": (PLANK_START_PHASE, PLANK_FINISH_PHASE),
          "Wide-Grip_Pull-Up": (PULL_START_PHASE, PULL_FINISH_PHASE)}

written = []
for folder, d in FILES.items():
    start, finish = PHASES[folder]
    for suffix, character, phase in (("_start", WOMAN, start), ("_finish", WOMAN, finish),
                                     ("_start_m", MAN, start), ("_finish_m", MAN, finish)):
        text = render(d["one_rule"], d["cam"], d["ident"], d["app"], phase, character, d["hl"],
                      d["forb"], d.get("extra"))
        if suffix.endswith("_m"):
            text = male(text)
        p = os.path.join(OUT, folder + suffix + ".txt")
        io.open(p, "w", encoding="utf-8", newline="\n").write(text)
        written.append((p, len(text)))

for p, n in written:
    print(os.path.basename(p), n)
