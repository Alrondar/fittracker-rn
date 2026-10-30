# -*- coding: utf-8 -*-
"""Prompts for the two remaining wrong-frame rows (30.10): Underhand-Grip Dumbbell Bench Press
(668309c4, папка Underhand-Grip_Dumbbell_Bench_Press) и High Foot Position Leg Press
(b9c957fd, папка High_Foot_Position_Leg_Press).

Обе строки — класс C из разбора 53 расхождений: текущий кадр показывает другое движение.
Папки соседей (`Close-Grip_Dumbbell_Press`, `Leg_Press`) держат наши принятые пары и НЕ трогаются.

Вердикт владельца 30.10: «делай по очереди обе, потом пуш» — значит сначала жим гантелей,
потом жим ногами, затем пуш медиа-репозитория.

Внешняя сверка техники (muscleandstrength, steelsupplements, 30.10): обратный хват — ладони
повёрнуты к лицу, гантели не сводятся в верхней точке, локти ближе к корпусу, работа идёт по
верхней части груди. Жим ногами с высокой постановкой — стопы в верхней части платформы на
ширине плеч, носки чуть наружу, таз и поясница прижаты, колени не блокируются.
"""
import importlib.util
import io
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "prompts")

_spec = importlib.util.spec_from_file_location("b4", os.path.join(HERE, "build-batch4-prompts.py"))
b4 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(b4)

# ---------------------------------------------------------------- Underhand-Grip DB Bench Press
UP_FOLDER = "Underhand-Grip_Dumbbell_Bench_Press"

UP_RULE = (
    "THE ONE RULE THAT DECIDES IF THIS IMAGE IS CORRECT: this is an UNDERHAND-GRIP (supinated) "
    "DUMBBELL BENCH PRESS - the athlete lies on a flat bench, one dumbbell in each hand, and BOTH "
    "PALMS FACE HER OWN FACE: each handle lies in the cradle of an open upward-facing palm, the "
    "finger pads curl over the handle on the near side, and the backs of the hands with the knuckles "
    "are on the FAR side of the metal. THREE THINGS MUST BE TRUE AT ONCE: (1) the palm side of both "
    "hands is turned up toward her face and toward the camera; (2) the two dumbbells stay APART - a "
    "clear gap of about one dumbbell between them, they never touch and never share a handle; "
    "(3) the elbows are kept CLOSER to the torso than in a wide classic press - the upper arms at "
    "about 45 degrees from her torso, not flared out to 90 degrees to the bench. If the knuckles or "
    "the backs of the hands sit on top of the handles, if the two dumbbells are pressed together, or "
    "if the elbows are flared out wide, the image is WRONG."
)

UP_LIMBS = (
    "TWO ARMS, TWO LEGS, ONE BODY: exactly two arms and two legs, nothing extra. Both hands grip "
    "their own dumbbell in EXACTLY the same way, as mirror images of each other: palm up, the handle "
    "across the base of the fingers, the thumb wrapped on the outside. Both feet stay planted flat on "
    "the floor beside the bench for the whole movement, knees bent about 90 degrees, never lifted and "
    "never sliding along the floor between frames. The head rests on the bench pad in both frames."
)

UP_CAM = (
    "CAMERA: standing BEYOND THE TOP OF HER HEAD and 40 degrees around to her RIGHT side, 1.5 m above "
    "the floor, 2.7 m from her chest, looking down at her at about 20 degrees - the one angle at which "
    "an upward-facing palm is turned toward the lens and the grip can be read. Because the camera is "
    "beyond her head and toward her right: her head and shoulders are at the BOTTOM-LEFT of the frame, "
    "her shoes at the TOP-RIGHT, the bench runs diagonally from the bottom-left corner to the top-right "
    "corner, and her RIGHT arm and right hip are the NEAR ones - larger and closer than her left. "
    "ORIENTATION LOCK: the same diagonal in both frames of this pair; her head is never at the right, "
    "the bench never runs the other way, the camera is never at the feet end, never a flat view from "
    "directly above, never a side profile in which both palms are seen edge-on. SCALE LOCK: one metre "
    "of her body occupies exactly the same number of pixels in both frames; the camera does not move, "
    "does not zoom, does not change height, and the bench stays at exactly the same pixels. FRAMING "
    "LOCK - THE NUMBERS BOTH FRAMES SHARE: the top of her head at about 28 percent of the frame width "
    "and about 86 percent of the frame height; her shoes at about 90 percent of the frame width and "
    "about 14 percent of the frame height; the whole bench with both pairs of its legs is inside the "
    "frame, nothing cropped."
)

UP_IDENT = (
    "EXERCISE IDENTITY: UNDERHAND-GRIP DUMBBELL BENCH PRESS - a flat-bench press with free dumbbells "
    "held in a supinated grip, the palms turned toward the face, pressing up over the UPPER chest with "
    "the elbows kept closer to the torso than in a wide classic press. Free weights only."
)

UP_APP = (
    "APPARATUS: one FLAT bench - a level black padded bench, dark metal frame, TWO pairs of legs with "
    "four feet on the floor, no incline, no decline, no uprights, no rack, no barbell; plus TWO "
    "dumbbells only - matte dark-grey metal handles with black hexagonal heads at each end, no plates, "
    "no collars. DUMBBELL COUNT LOCK: exactly two dumbbells in the whole scene, one in each hand, and "
    "the floor is otherwise empty. PROPS LOCK: no barbell, no rack, no spotter, no second person, no "
    "band, no cable, no mirror, no logos. HEAD LOCK: the back of her head stays on the bench pad in "
    "both frames, the chin level, the gaze straight up; the head is never lifted off the pad."
)

UP_GRIP = (
    "GRIP LOCK (the defect that decides this row): the palm side of both hands faces UP toward her "
    "face and toward the camera, and the fingers curl OVER the handles so that the finger pads are "
    "visible IN FRONT of the metal from the camera's side; the knuckles and the backs of the hands "
    "are hidden on the FAR side of the handles and must never be drawn on top of them. An open palm "
    "with the handle lying across it, thumb on the outside, is the correct picture. IF YOU SEE THE "
    "BACKS OF THE HANDS OR THE KNUCKLES ON TOP OF THE HANDLES, IT IS AN OVERHAND PRESS AND THE IMAGE "
    "IS WRONG."
)

UP_DEPTH = (
    "DEPTH ORDER (from the camera toward the background): (1) the dumbbells and her hands, (2) her "
    "chest and arms, (3) the bench pad, (4) the floor. Both dumbbells are in front of and above the "
    "chest, never sunken into it: between each dumbbell head and the chest there is visible air or "
    "clearly drawn metal, never a handle that disappears into the body."
)

UP_HL = (
    "HIGHLIGHT: a soft semi-transparent warm-red X-ray glow through the skin over the UPPER PART OF "
    "BOTH PECTORALS - the clavicular band of the chest, running from the top of the sternum out to the "
    "front of each shoulder, just under the collarbones, drawn as one warm band across the top of the "
    "chest above the main belly of the muscle. Both sides glow equally. The lower and middle chest, "
    "the front deltoids, the triceps, the biceps, the abdomen and the legs stay completely unlit and "
    "dark."
)

UP_START = (
    "PHASE - FRAME 1, DUMBBELLS LOWERED: she lies flat on the bench with her head on the pad, both "
    "feet planted on the floor. Both dumbbells are lowered to the SIDES OF THE UPPER CHEST - each "
    "dumbbell at the level of the chest, a hand's width outside her ribs, the forearms close to "
    "vertical, the palms up toward her face. The elbows are TUCKED: the upper arms at about 45 "
    "degrees from her torso, the elbows below the hands and slightly out from the ribs, never flared "
    "out to the level of the bench. The two dumbbells are apart with a clear gap between them, both "
    "handles splayed outward in the shallow V of the MIRROR HANDS LOCK. The upper chest is "
    "stretched; nothing is pressed up yet.\n"
    "LEVEL LOCK - THE DEFECT OF THE PREVIOUS DRAFT: the two hands are at the SAME HEIGHT IN THE "
    "BODY'S OWN FRAME - both at the level of the chest, each dumbbell at the side of a pectoral, "
    "neither one raised to the face and neither one dropped to the ribs. The far hand sits higher "
    "in the picture only because it is farther from the lens, never because it is higher on the "
    "body. THE TOP OF EACH DUMBBELL DOES NOT RISE ABOVE THE COLLARBONE IN THIS FRAME. If one "
    "dumbbell is up at the chin while the other hangs at the waist, the image is WRONG."
)

UP_FINISH = (
    "PHASE - FRAME 2, DUMBBELLS PRESSED UP: the SAME bench, the same camera, the same head on the pad, "
    "the same feet - and both arms are now extended UP over the UPPER CHEST, the hands above the "
    "collarbones rather than above the nipples. The elbows are almost straight but NOT locked - about "
    "165 degrees - and they still sit closer to the torso than a wide press, not thrown out to the "
    "sides. The two dumbbells stay APART at about shoulder width with a clear gap between them, both "
    "handles still splayed outward in the shallow V of the MIRROR HANDS LOCK; they never touch or "
    "clink together. The palms still face her face, the finger pads still visible in "
    "front of the handles. If the knuckles come on top, if the dumbbells meet in the middle, or if the "
    "elbows flare out to 90 degrees, the image is WRONG."
)

UP_FORB = (
    "FORBIDDEN: two right hands or two left hands - the two hands drawn as copies of each other, both thumbs at the same end of the two handles; a pronated overhand grip with the knuckles on top of the handles; the two dumbbells "
    "touching or pressed together into one line; elbows flared out to the level of the bench; a "
    "barbell, a rack or uprights; an incline or decline bench; a seated press; a dumbbell fly with "
    "wide arms and bent elbows; a single arm press; a spotter or any second person; plates, collars "
    "or a cable; the head lifted off the pad; the feet lifted off the floor; a photograph; a view "
    "from the feet end; a flat top-down view; a mirrored orientation; a different body type."
)

UP_WARDROBE = (
    "MATCHES THE COMPANION FRAME (read this before posing): the SAME woman, the SAME outfit and the "
    "SAME build as the other frame of this pair - a black sports bra with a wide under-band, black "
    "shorts that run to mid-thigh, black sneakers with white soles, dark-blonde hair in a ponytail. "
    "BUILD LOCK: LEAN, not bulky - smooth muscle, NO visible fibre striations, flat stomach. If her "
    "outfit or her build differs from the companion frame, the image is WRONG."
)

UP_MIRROR = (
    "MIRROR HANDS LOCK - THE DEFECT OF THE PREVIOUS DRAFTS: both hands were drawn as copies of ONE "
    "hand. This draft fixes it with the geometry of the dumbbells themselves. BOTH WRISTS TURN "
    "OUTWARD, so the two handles are NOT parallel: they form a shallow V that opens toward her head, "
    "about 30 degrees between them, and the two thumb-ends are the far apart, open ends of that V "
    "while the two little-finger ends are the close-together ends at the base of the V. "
    "THE TWO THUMBS ARE THE TWO POINTS OF THE V FARTHEST APART: the thumb of the near hand at the "
    "outer end of the near handle, the thumb of the far hand at the outer end of the far handle - "
    "each thumb on the side of its own handle that points AWAY from her body's midline. "
    "CHECK THE PICTURE: the two thumbs must be the two ends of the V that are farthest from each "
    "other, and the two handles must visibly converge toward her feet. If the two handles are "
    "parallel while both palms are up, or if both thumbs sit at the same side of the handles, the "
    "two hands are copies of each other and the image is WRONG."
)

UP_EXTRA = chr(10).join([UP_GRIP, chr(10), UP_MIRROR, chr(10), UP_DEPTH, chr(10), UP_WARDROBE])

# ---------------------------------------------------------------- High Foot Position Leg Press
LP_FOLDER = "High_Foot_Position_Leg_Press"

LP_RULE = (
    "THE ONE RULE THAT DECIDES IF THIS IMAGE IS CORRECT: this is a 45-DEGREE LEG PRESS with the feet "
    "placed HIGH ON THE PLATFORM - both soles flat in the UPPER THIRD of the foot platform, with the "
    "toes a hand's width short of the TOP EDGE, about shoulder width apart and turned slightly OUT. "
    "That high placement is the whole exercise, and the frame must make it obvious. THREE THINGS MUST "
    "BE TRUE AT ONCE: (1) the feet are high, near the top edge of the platform, never in its middle "
    "and never at its lower end; (2) her lower back and pelvis stay pressed to the angled backrest - "
    "no gap, no rolling of the hips off the pad; (3) the platform is pushed away by both legs evenly, "
    "the knees never locked straight. If the feet sit in the middle of the platform, the image shows "
    "an ordinary leg press and is WRONG."
)

LP_LIMBS = (
    "TWO LEGS, TWO ARMS, ONE BODY: exactly two thighs, two shins, two feet and two arms. Both feet "
    "stand flat on the platform with the same contact: the whole sole on the rubber surface, the toes "
    "turned out by about 12 degrees on each side, mirror images of each other. Both knees travel in "
    "line with their feet. Her arms lie along her sides with the hands resting on the two side "
    "handles of the seat, elbows slightly bent, and they do not push the machine."
)

LP_CAM = (
    "CAMERA: three-quarter view from the PLATFORM END of the machine, standing to the near side at "
    "about 35 degrees off the machine's long axis, 1.15 m above the floor, 3.2 m away, looking "
    "slightly down at the sled - the same camera family as our accepted leg-press frame. ORIENTATION "
    "LOCK: her head is at the RIGHT of the frame, the foot platform and the loaded upper end of the "
    "sled at the LEFT, the machine's frame running diagonally across the picture; the athlete's near "
    "arm, near thigh and near hip are drawn larger and closer. The same orientation in both frames of "
    "this pair - never mirrored, never from the head end, never from the far side of the machine, "
    "never a flat side-on profile. SCALE LOCK: one metre of her body occupies exactly the same number "
    "of pixels in both frames; the camera does not move, does not zoom, does not change height, and "
    "the base frame of the machine stays at exactly the same pixels. FRAMING LOCK - THE NUMBERS BOTH "
    "FRAMES SHARE: the crown of her head at about 86 percent of the frame width and about 28 percent "
    "of the frame height; the front foot of the base frame at about 4 percent of the frame width and "
    "about 78 percent of the frame height; the outer edge of the foot platform at about 12 percent of "
    "the frame width; the "
    "whole machine - rails, backrest, platform, both weight horns and the base frame - is inside the "
    "frame, nothing cropped; both feet and the full platform are clearly visible."
)

LP_IDENT = (
    "EXERCISE IDENTITY: HIGH FOOT POSITION LEG PRESS - a 45-degree sled leg press with both feet "
    "placed high on the platform, near the top edge, which shifts the work toward the glutes and the "
    "hamstrings; the platform travels away from her as the knees extend."
)

LP_APP = (
    "APPARATUS: a 45-degree leg press built from units, from the platform end to the head end: (1) a "
    "straight slanting sled riding on TWO parallel polished chrome rails; (2) at its lower end a WIDE "
    "BLACK FOOT PLATFORM, rectangular, with a fine anti-slip grid and a raised rim along all four "
    "edges; (3) at the upper end of the sled TWO round weight horns, each carrying a stack of large "
    "black plates; (4) behind the athlete a long BLACK PADDED BACKREST tilted at 45 degrees, and a "
    "black padded seat under her hips; (5) TWO short side handles beside her hips; (6) a heavy "
    "dark-grey steel base frame standing on the floor. MACHINE LOCK: the rails, the backrest, the "
    "seat, the handles, the weight horns and the base frame NEVER move, resize or change shape - only "
    "the sled with its platform travels along the rails, and every fixed part stays at the same pixels "
    "in both frames. PROPS LOCK: exactly this one machine, no dumbbell, no barbell, no band, no "
    "second person, no spotter, no mirror, no logos."
)

LP_FOOT = (
    "FOOT LOCK (the size anchor of this pair): both soles stand FLAT on the platform at the SAME "
    "height, about shoulder width apart - the inner edges of the two shoes are a full shoe width "
    "apart - the toes turned slightly OUT; the TOP EDGE of the platform runs just above the toes, "
    "with about a hand's width of empty platform between the toes and the rim, and the heels sit in "
    "the upper third of the platform. In both frames the feet keep exactly this placement on the "
    "platform - they never slide down toward the middle, never hang over the top edge, never leave "
    "the platform."
)

LP_HL = (
    "HIGHLIGHT - THE DEFECT OF THE PREVIOUS DRAFT WAS A GLOW ON THE FRONT OF THE THIGH, WHICH IS "
    "THE WRONG MUSCLE FOR THIS ROW. Two muscles of the BACK of the body glow, and only they: "
    "(1) THE GLUTEUS MAXIMUS - a broad soft warm-red glow through both buttocks where they press "
    "into the seat, brightest on the near hip, spreading from the top of the buttock down to the "
    "crease behind the thigh; (2) THE HAMSTRINGS - a NARROW warm strip that hugs the LOWER (BACK) "
    "CONTOUR of each thigh, from under the buttock to the back of the knee, drawn as a thin band "
    "along the silhouette edge of the underside of the thigh, never across its face. "
    "THE SURFACE OF EACH THIGH THAT FACES THE CAMERA IS THE QUADRICEPS AND IT MUST STAY COMPLETELY "
    "UNLIT AND DARK: no glow on the top, the front or the outer face of either thigh; the warm "
    "colour appears only at the buttock and at the thin edge along the back of the thigh. The "
    "calves, the abdomen, the chest and the arms also stay dark."
)

LP_START = (
    "PHASE - FRAME 1, PLATFORM DRAWN IN: she sits in the angled seat with her hips and lower back "
    "pressed flat against the backrest, her head and neck in line with the backrest and her gaze "
    "forward, and both knees bent to about 90 degrees so the platform is drawn close to her body. "
    "Both feet stand high on the platform in the FOOT LOCK position, the top edge just above the "
    "toes. The knees travel in line with the feet, the hips stay down on the seat, the abdomen is "
    "braced, the hands rest on the side handles. The sled is at its deepest point of the range."
)

LP_FINISH = (
    "PHASE - FRAME 2, PLATFORM PUSHED AWAY: the SAME seat, the same backrest, the same hands, the same "
    "camera - and both legs have extended so that the sled has travelled away up the rails. The knees "
    "are now nearly straight, about 160 degrees, NEVER locked or snapped back, and the legs are still "
    "in line with the feet. Both feet stay exactly in the same FOOT LOCK placement on the platform, "
    "high near its top edge, with the same toe-out, and the whole sole still touches it. The hips and "
    "lower back remain pressed to the backrest - no lifting of the pelvis, no rolling onto the "
    "shoulders. Only the sled moved, and it moved straight along its two rails."
)

LP_FORB = (
    "FORBIDDEN: the feet in the middle or at the lower end of the platform; the heels hanging over the "
    "top edge; the toes lifted off the platform; the feet slipping down between frames; one foot "
    "lower than the other; the pelvis rolling off the seat or the lower back arching away from the "
    "backrest; the knees locked and snapped straight; the knees collapsing inward; a horizontal leg "
    "press; a seated machine with a pad on the thighs; a hack squat; a barbell or a dumbbell anywhere "
    "in the scene; a spotter or any second person; a photograph; a view from the head end; a mirrored "
    "orientation; a different body type."
)

LP_WARDROBE = (
    "MATCHES THE COMPANION FRAME (read this before posing): the SAME woman, the SAME outfit and the "
    "SAME build as the other frame of this pair - a black sports bra with a wide under-band, black "
    "shorts that run to mid-thigh, black sneakers with white soles, dark-blonde hair in a ponytail. "
    "BUILD LOCK: LEAN, not bulky - smooth muscle, NO visible fibre striations, flat stomach. If her "
    "outfit or her build differs from the companion frame, the image is WRONG."
)

LP_EXTRA = chr(10).join([LP_FOOT, chr(10), LP_WARDROBE])


def masculine(text):
    """Тот же текст, только местоимения по слову (b4.male чинит и падежи)."""
    return b4.male(text)


POSITIONS = {
    UP_FOLDER: dict(rule=UP_RULE + " " + UP_LIMBS, cam=UP_CAM, ident=UP_IDENT, app=UP_APP,
                    hl=UP_HL, start=UP_START, finish=UP_FINISH, forb=UP_FORB, extra=UP_EXTRA),
    LP_FOLDER: dict(rule=LP_RULE + " " + LP_LIMBS, cam=LP_CAM, ident=LP_IDENT, app=LP_APP,
                    hl=LP_HL, start=LP_START, finish=LP_FINISH, forb=LP_FORB, extra=LP_EXTRA),
}

written = []
for folder, d in POSITIONS.items():
    for suffix, phase, is_male in (("_start", d["start"], False), ("_finish", d["finish"], False),
                                   ("_start_m", d["start"], True), ("_finish_m", d["finish"], True)):
        text = b4.render(d["rule"], d["cam"], d["ident"], d["app"], phase,
                         b4.MAN if is_male else b4.WOMAN, d["hl"], d["forb"], d["extra"])
        if is_male:
            text = masculine(text)
        p = os.path.join(OUT, folder + suffix + ".txt")
        io.open(p, "w", encoding="utf-8", newline="\n").write(text)
        written.append((os.path.basename(p), len(text)))

for name, n in written:
    print(name, n)
