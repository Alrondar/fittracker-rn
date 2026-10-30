# -*- coding: utf-8 -*-
"""Промпты партии легаси-2 (14.10): пять позиций × женская пара = 10 кадров.

Общие блоки (STYLE, CHARACTER LOCK, SCALE, SINGLE FRAME, BACKGROUND) лежат в файле
ОДНИМИ строками и подставляются во все кадры — стилевой лок требует дословного
повтора, иначе модель между кадрами меняет и тело, и камеру.

Порядок блоков = приоритет прочтения (урок 12.10: Qwen слушает первые ~5 блоков):
STYLE → THE ONE RULE → CAMERA/ORIENTATION/SCALE/FRAMING/SINGLE → EXERCISE IDENTITY →
APPARATUS → PHASE → CHARACTER → HIGHLIGHT → BACKGROUND → FORBIDDEN.

Запуск из корня: python spark-output/export/build-batch2-prompts.py
"""
import os
import re

OUT = "spark-output/export/prompts"

STYLE = ("STYLE — READ FIRST AND OBEY: a stylized CGI 3D render in the visual language of a "
         "modern fitness app illustration, semi-realistic but unmistakably RENDERED: smooth matte "
         "shading over skin and muscle, slightly idealized anatomy, clean painted surfaces. THIS "
         "IS NOT A PHOTOGRAPH — no camera grain, no photographic skin pores, no real gym, no lens "
         "depth of field; not a cartoon, not a line icon.")

CHAR_F = ("CHARACTER LOCK: athletic woman in her late 20s, LEAN and athletic, NOT bulky, "
          "dark-blonde hair tied in a ponytail, black sports bra, black shorts, black sneakers "
          "with white soles, neutral focused expression. SLIM athletic build, thin biceps, flat "
          "trapezius, no bodybuilder mass. Exactly this one woman, no other person.")

CHAR_M = ("CHARACTER LOCK: athletic man in his late 20s, LEAN and athletic, NOT bulky, short "
          "dark-brown hair cropped at the sides, clean-shaven, black sleeveless training top, "
          "black shorts, black sneakers with white soles, neutral focused expression. Slim "
          "athletic build, no bodybuilder mass. Exactly this one man, no other person.")

SCALE = ("SCALE LOCK: one metre of the body occupies exactly the same number of pixels as in the "
         "companion frame of this pair; the camera does not move, does not zoom, does not change "
         "height, and the floor line and headroom stay identical.")

SINGLE = ("SINGLE FRAME: one continuous scene filling the whole canvas — no collage, no split "
          "panels, no inset, no duplicated figure, no second view of the same exercise.")

BACKGROUND = ("BACKGROUND: seamless desaturated cool blue-grey studio backdrop with a soft "
              "gradient and a gentle vignette, soft floor shadow under the athlete and under the "
              "equipment, matte dark-grey metal with black pads and black plates, no logos, no "
              "text, no numbers, no watermark, no mirrors.")

MACHINE_HACK = ("APPARATUS - MACHINE LOCK: the machine is ONE specific silhouette and it is "
  "drawn identically in both frames of this pair, same size, same place in the frame: (1) a "
  "dark grey steel A-frame that leans back toward the RIGHT, with a single straight top beam; "
  "(2) at its lower left, ONE rectangular inclined platform board at about 45 degrees, grooved "
  "black surface, its TOP EDGE at about 78 percent of the frame height, joined to the frame by "
  "one visible pivot bolt; (3) above her shoulders, a horizontal shoulder yoke - a straight dark "
  "bar with TWO rectangular black pads, one at each end, the pads flat and block-shaped, not "
  "round; (4) two polished chrome guide rods running from the top beam down to the base, side by "
  "side, with a black carriage block between them; (5) at the right of the frame, ONE round "
  "weight horn holding ONE black plate, its centre at about 45 percent of the frame height; "
  "(6) a small black stopper knob on the near guide rod. Nothing else in the room. FORBIDDEN "
  "machine changes: a second platform, a curved or round pad, a barbell, a leg press sled, a "
  "machine without the shoulder yoke, or plates that differ in number or position between the "
  "two frames.")

# id, folder, phase, one_rule, camera, orientation, framing, identity, apparatus, phase_text, highlight, forbidden
FRAMES = [
 # ── 1. Тяга Рынделя ─────────────────────────────────────────────────────────
 dict(folder="Rendl_Barbell_Row", phase="start",
   one=("THE ONE RULE THAT DECIDES IF THIS IMAGE IS CORRECT: her chest, stomach and forehead stay "
        "pressed DOWN on the bench pad in both frames of this pair. This is a CHEST-SUPPORTED row "
        "lying face down — NOT a standing bent-over row, NOT a bench press, NOT a push-up. If her "
        "torso is free in the air or her face points at the ceiling, the image is wrong."),
   camera=("CAMERA: three-quarter view from BEHIND her and well toward her right side, about 50° "
           "off straight back, camera at 1.3 m height looking gently down along her body, 3.2 m "
           "away. We see her back at an angle, both shoulder blades, BOTH arms and the bench pad "
           "under her chest; the bar and both of its plate stacks fall clear of her silhouette."),
   orient=("ORIENTATION LOCK: her head is at the FAR-TOP of the frame resting on the head pad, "
           "her shoes are at the NEAR-BOTTOM, her back faces the camera. Never mirrored, never "
           "head toward the camera."),
   framing=("FRAMING LOCK: the whole bench and the whole body inside the frame with generous air; "
            "the top of the head pad at about 8 percent of the frame height, the soles of her "
            "shoes at about 92 percent, both bench legs fully visible, nothing cropped."),
   ident=("EXERCISE IDENTITY: RENDEL ROW — a barbell row performed lying prone (face down) on an "
          "inclined bench, the bar pulled from below the bench edge to the waist."),
   appr=("APPARATUS, node by node from the near end to the far end: (1) a long inclined weight "
         "bench, pad tilted about 20° up toward the far end, matte dark-grey upholstery, two "
         "square steel legs with flat feet on the floor; (2) at the far top edge a small "
         "rectangular forehead rest pad on a short post; (3) an EZ-curl barbell — a short rigid "
         "steel bar with two angled grip sections — held in both hands, hanging BELOW the front "
         "edge of the pad, its plates just above the floor; (4) two black weight plates on each "
         "end of the bar. The bar is a separate object from the bench, it touches nothing but her "
         "hands. Nothing about the bench moves during the set. BAR UNDER PAD LOCK: the shaft stays "
         "BELOW the bench pad in every frame of this pair — it hangs and travels under the front "
         "edge of the pad, the pad is always ABOVE the bar; the bar never crosses the face of the "
         "pad, never rests on the upholstery, never passes through it and never appears in front "
         "of it. BAR CONTINUITY LOCK: the EZ-bar is "
         "ONE rigid uninterrupted shaft — never two stubs, never a bar cut in half, never a bar "
         "that disappears behind the pad and reappears on the other side; the middle of the shaft "
         "is visible between her two hands. TWO-HAND LOCK: BOTH hands grip the shaft, one on each "
         "angled grip section, and BOTH forearms hang down fully visible — the far left arm is "
         "seen beside the far side of the bench, it is not missing and not hidden behind her "
         "body. If only one hand holds the bar, the image is wrong."),
   phase_text=("PHASE — START of the rep: both arms hang STRAIGHT down from the shoulders, elbows "
          "locked out, the EZ-bar hangs below the front edge of the pad at arm's length, the "
          "shoulder blades are spread apart, the chest and forehead rest calmly on the pad, legs "
          "relaxed and straight, toes on the floor."),
   high=("HIGHLIGHT: a soft semi-transparent warm-red X-ray glow through the skin over the "
         "LATISSIMUS DORSI on BOTH sides of the mid-back — from the lower ribs up to the "
         "armpits — following the real muscle contour and tapering at both ends. The trapezius, "
         "the rear shoulders, the arms and the legs stay completely unlit and dark."),
   forb=("FORBIDDEN: a standing bent-over row; the torso lifted off the pad; a barbell above the "
         "chest as in a bench press; a lat pulldown cable machine; dumbbells; a barbell resting "
         "on the shoulders or behind the neck; a head suspended in the air with no head rest; "
         "an empty bar without plates; a bar split into two disconnected pieces; a missing far "
         "arm or only one hand on the bar; a barbell crossing in front of the pad or lying on the upholstery; a second spotter or coach; a photograph; a different "
         "body type. 3:2 landscape composition."),
 ),
 dict(folder="Rendl_Barbell_Row", phase="finish",
   one=("THE ONE RULE THAT DECIDES IF THIS IMAGE IS CORRECT: her chest, stomach and forehead stay "
        "pressed DOWN on the bench pad in both frames of this pair. This is a CHEST-SUPPORTED row "
        "lying face down — NOT a standing bent-over row, NOT a bench press, NOT a push-up. If her "
        "torso is free in the air or her face points at the ceiling, the image is wrong."),
   camera=("CAMERA: three-quarter view from BEHIND her and well toward her right side, about 50° "
           "off straight back, camera at 1.3 m height looking gently down along her body, 3.2 m "
           "away. We see her back at an angle, both shoulder blades, BOTH arms and the bench pad "
           "under her chest; the bar and both of its plate stacks fall clear of her silhouette."),
   orient=("ORIENTATION LOCK: her head is at the FAR-TOP of the frame resting on the head pad, "
           "her shoes are at the NEAR-BOTTOM, her back faces the camera. Never mirrored, never "
           "head toward the camera."),
   framing=("FRAMING LOCK: the whole bench and the whole body inside the frame with generous air; "
            "the top of the head pad at about 8 percent of the frame height, the soles of her "
            "shoes at about 92 percent, both bench legs fully visible, nothing cropped."),
   ident=("EXERCISE IDENTITY: RENDEL ROW — a barbell row performed lying prone (face down) on an "
          "inclined bench, the bar pulled from below the bench edge to the waist."),
   appr=("APPARATUS, node by node from the near end to the far end: (1) a long inclined weight "
         "bench, pad tilted about 20° up toward the far end, matte dark-grey upholstery, two "
         "square steel legs with flat feet on the floor; (2) at the far top edge a small "
         "rectangular forehead rest pad on a short post; (3) an EZ-curl barbell — a short rigid "
         "steel bar with two angled grip sections — pulled BACK and only UP as far as a point BELOW "
         "the lower edge of the pad, where it hangs in open air about 30 cm below her hips and "
         "NEVER touches her body; the entire shaft, both angled grips and both plate stacks are "
         "visible against the background, nothing of the bar is behind her body or behind the "
         "upholstery; "
         "(4) two black weight plates on each end of the bar, both ends clear of the bench and "
         "fully visible. The bar is a separate "
         "object from the bench, it touches nothing but her hands. ELBOW SYMMETRY LOCK: both "
         "elbows are bent to the SAME angle and drawn back to the same height, both upper arms "
         "lie along the ribs — if one arm is straight while the other is bent, the image is "
         "wrong. "
         "Nothing about the bench moves during the set. BAR UNDER PAD LOCK: the pad is ABOVE the "
         "bar in this frame too — the shaft is under the pad edge, it never crosses the face of "
         "the pad, never rests on the upholstery and never appears in front of it. "
         "BAR CONTINUITY LOCK: the EZ-bar is ONE rigid "
         "uninterrupted shaft — never two stubs, never a bar cut in half, never a bar that "
         "disappears behind the pad and reappears on the other side; the middle of the shaft is "
         "visible between her two hands. TWO-HAND LOCK: BOTH hands grip the shaft, one on each "
         "angled grip section, and BOTH upper arms are drawn back with the elbows visible on "
         "either side of her ribs — the far left arm is seen beside the far side of the bench, it "
         "is not missing and not hidden behind her body. If only one hand holds the bar, or the "
         "bar reads as two separate pieces, the image is wrong."),
   phase_text=("PHASE — FINISH of the rep: the bar has travelled BACK along the same line it started "
          "on and is held SHORT — it stops below the lower edge of the pad and hangs in open air, "
          "a clear gap between the bar and her body, not touching her hips, the pad or the floor; "
          "the whole shaft is one continuous piece of metal with both plate stacks fully visible. "
          "Her elbows are bent to about 90° and driven BACK, the forearms hang straight down onto "
          "the angled grips. The chest and forehead have NOT moved off the pad, the arms and the "
          "bar are the only things that changed position since the start."),
   high=("HIGHLIGHT: a soft semi-transparent warm-red X-ray glow through the skin over the "
         "LATISSIMUS DORSI on BOTH sides of the mid-back — from the lower ribs up to the "
         "armpits — following the real muscle contour and tapering at both ends. The trapezius, "
         "the rear shoulders, the arms and the legs stay completely unlit and dark."),
   forb=("FORBIDDEN: a standing bent-over row; the torso lifted off the pad; the bar resting on "
         "the pad; elbows pointing forward with arms straight; a barbell above the chest as in a "
         "bench press; a lat pulldown cable machine; dumbbells; a barbell on the shoulders or "
         "behind the neck; a head suspended in the air with no head rest; a bar split into two "
         "disconnected pieces; a missing far arm or only one hand on the bar; a barbell crossing in "
         "front of the pad or lying on the upholstery; the bar touching her body, resting on her "
         "hips or lying across her thighs; one arm straight while the other is bent; "
         "a shaft hidden inside her body; a second spotter or "
         "coach; a photograph; a different body type. 3:2 landscape composition."),
 ),
 # ── 2. Махи одной рукой с наклоном (задняя дельта) ─────────────────────────
 dict(folder="Bent-Over_One-Arm_Cable_Rear_Delt_Raise", phase="start",
   one=("THE ONE RULE THAT DECIDES IF THIS IMAGE IS CORRECT: the handle is in HER RIGHT hand — "
        "the arm FARTHEST from the cable column, which stands at the left of the frame — and she "
        "is hinged forward with her chest close to parallel with the floor. Two things must match "
        "the companion frame: the same hinged torso, and the same right arm on the handle. If she "
        "stands upright, or the handle is in the hand nearer the column, the image is wrong."),
   camera=("CAMERA: view from BEHIND her and slightly toward her right side, about 25° off "
           "straight back, camera at shoulder height 1.3 m, 3.0 m away. We see her back, both "
           "shoulder blades, both buttocks and the back of her right shoulder; the cable column "
           "stands at the LEFT edge of the frame."),
   orient=("ORIENTATION LOCK: the cable column at the LEFT edge of the frame, her head toward the "
           "upper middle, her shoes at the bottom, her back to the camera. HIPS SQUARE LOCK: her "
           "hips face the camera square, both buttocks the same size, her back flat and parallel "
           "to the floor — she is NOT turned sideways and her chest does not face the side of the "
           "frame. Never mirrored."),
   framing=("FRAMING LOCK: full body with generous air; the top of her head at about 10 percent of "
            "the frame height, the soles of her shoes at about 93 percent, the whole column and "
            "its low pulley inside the frame, nothing cropped."),
   ident=("EXERCISE IDENTITY: BENT-OVER ONE-ARM CABLE REAR DELT RAISE — torso hinged forward, one "
          "arm sweeping a cable handle OUT to the side and up, the rear shoulder doing the work. "
          "It is not a row to the chest and not a standing shrug."),
   appr=("APPARATUS, node by node: (1) a single cable column at the LEFT edge of the frame — a "
         "slim dark grey upright with a round base plate, a closed weight stack inside it and a "
         "LOW pulley at floor level, the carriage at the BOTTOM of the stack so the cable exits "
         "near the floor; (2) exactly ONE cable — one long straight taut DIAGONAL running from "
         "that low pulley at the bottom-left of the frame up to a single D-shaped handle at her "
         "right hand; (3) the handle is a black triangular D-grip with one strap, held in her "
         "RIGHT hand only, the hand on the far side of her body from the column. CABLE TENSION "
         "LOCK: the cable is UNDER LOAD, therefore a PERFECTLY STRAIGHT taut segment — no sag, no "
         "curve, no slack loop. CABLE ROUTE LOCK: exactly one cable in the frame; no second "
         "cable, no extra handle, no high pulley. FREE ARM LOCK: her left arm is free — the left "
         "elbow points out to the LEFT side of the frame and the left hand rests on her left hip; "
         "the left hand is never behind her back, never on her thigh and never holds anything."),
   phase_text=("PHASE — START of the rep: she is hinged forward at the hips, chest close to "
          "parallel with the floor, back flat, head in line with the spine looking down at the "
          "floor. Her RIGHT arm hangs straight DOWN from the shoulder, elbow soft and barely "
          "bent, the handle near the floor under her shoulder, the cable running taut back to the "
          "low pulley at the left. The left hand already rests on the left hip."),
   high=("HIGHLIGHT: a soft semi-transparent warm-red X-ray glow through the skin over the "
         "POSTERIOR DELTOID of her RIGHT shoulder — the back cap of the shoulder, the rounded "
         "strip behind the shoulder joint, exactly where the arm joins the shoulder blade from "
         "this view. The upper back, the rhomboids, the traps, the left shoulder and both arms "
         "stay completely unlit and dark."),
   forb=("FORBIDDEN: standing upright or only slightly tilted; the body turned sideways so that "
         "her side faces the camera; a hand behind the back; the handle in the left hand or in "
         "the hand nearest the column; a bent-over ROW with the handle pulled to the ribs; a face "
         "pull to the forehead; two handles or two cables; a barbell or dumbbell instead of the "
         "handle; a cable from a HIGH pulley; a short cable stub that does not reach the machine; "
         "a sagging cable; a photograph; a different body type. 3:2 landscape composition."),
 ),
 dict(folder="Bent-Over_One-Arm_Cable_Rear_Delt_Raise", phase="finish",
   one=("THE ONE RULE THAT DECIDES IF THIS IMAGE IS CORRECT: the handle is in HER RIGHT arm — the "
        "arm FARTHEST from the cable column at the left of the frame, which from this camera is "
        "also the arm nearest the lens — and it is raised OUT to her side at shoulder height while "
        "her chest stays hinged close to parallel with the floor. If she stands up, or the arm "
        "nearer the column holds the handle, the image is wrong."),
   camera=("CAMERA: view from BEHIND her and slightly toward her right side, about 25° off "
           "straight back, camera at shoulder height 1.3 m, 3.0 m away. We see her back, both "
           "shoulder blades, both buttocks and the back of her right shoulder; the cable column "
           "stands at the LEFT edge of the frame."),
   orient=("ORIENTATION LOCK: the cable column at the LEFT edge of the frame, her head toward the "
           "upper middle, her shoes at the bottom, her back to the camera. HIPS SQUARE LOCK: her "
           "hips face the camera square, both buttocks the same size, her back flat and parallel "
           "to the floor — she is NOT turned sideways and her chest does not face the side of the "
           "frame. Never mirrored."),
   framing=("FRAMING LOCK: full body with generous air; the top of her head at about 10 percent of "
            "the frame height, the soles of her shoes at about 93 percent, the whole column and "
            "its low pulley inside the frame, nothing cropped."),
   ident=("EXERCISE IDENTITY: BENT-OVER ONE-ARM CABLE REAR DELT RAISE — torso hinged forward, one "
          "arm sweeping a cable handle OUT to the side and up, the rear shoulder doing the work. "
          "It is not a row to the chest and not a standing shrug."),
   appr=("APPARATUS, node by node: (1) a single cable column at the LEFT edge of the frame — a "
         "slim dark grey upright with a round base plate, a closed weight stack inside it and a "
         "LOW pulley at floor level, the carriage at the BOTTOM of the stack so the cable exits "
         "near the floor; (2) exactly ONE cable — one long straight taut DIAGONAL running from "
         "that low pulley at the bottom-left of the frame up to a single D-shaped handle at her "
         "raised right hand; (3) the handle is a black triangular D-grip with one strap, held in "
         "her RIGHT hand only, the hand on the far side of her body from the column. CABLE "
         "TENSION LOCK: the cable is UNDER LOAD, therefore a PERFECTLY STRAIGHT taut segment — no "
         "sag, no curve, no slack loop. CABLE ROUTE LOCK: exactly one cable in the frame; no "
         "second cable, no extra handle, no high pulley. FREE ARM LOCK: her left arm is free — "
         "the left elbow points out to the LEFT side of the frame and the left hand rests on her "
         "left hip; the left hand is never behind her back, never on her thigh and never holds "
         "anything."),
   phase_text=("PHASE — FINISH of the rep: the RIGHT arm is swept OUT to the side and up to about "
          "shoulder height, nearly straight with the elbow soft, the hand at the same height as "
          "the shoulder and the thumb side of the hand turned down toward the floor; the cable "
          "stays one taut diagonal back to the low pulley at the left. The torso has NOT risen, "
          "the spine is still parallel to the floor, the hips are still square to the camera and "
          "the left hand is still on the left hip. Only the right arm changed position."),
   high=("HIGHLIGHT: a soft semi-transparent warm-red X-ray glow through the skin over the "
         "POSTERIOR DELTOID of her RIGHT shoulder — the back cap of the shoulder, the rounded "
         "strip behind the shoulder joint at the top of the raised arm. The upper back, the "
         "rhomboids, the traps, the left shoulder and both arms stay completely unlit and dark."),
   forb=("FORBIDDEN: standing upright or only slightly tilted; the body turned sideways so that "
         "her side faces the camera; a hand behind the back; the arm raised in FRONT of the body "
         "or overhead; a bent-over ROW with the handle at the ribs; the handle in the left hand or "
         "in the arm nearest the column; two handles or two cables; a barbell or dumbbell instead "
         "of the handle; a cable from a HIGH pulley; a short cable stub that does not reach the "
         "machine; a fully locked straight arm; a sagging cable; a photograph; a different body "
         "type. 3:2 landscape composition."),
 ),
 dict(folder="Hack_Squat_Machine_Calf_Raise", phase="start",
   one=("THE ONE RULE THAT DECIDES IF THIS IMAGE IS CORRECT: only the ANKLES move in this "
        "exercise. The knee angle, the hip angle and the shoulders under the pads are IDENTICAL "
        "in both frames of this pair — the only difference is how high the heels sit. If her "
        "knees bend deeper in one frame than in the other, this is a squat and the image is "
        "wrong."),
   camera=("CAMERA: SIDE view, true profile about 85° off straight-on, camera low at calf height "
           "0.6 m, 3.4 m away. We see the full side line: platform edge, foot, calf, thigh, "
           "torso and the shoulder pads."),
   orient=("ORIENTATION LOCK: she faces the LEFT edge of the frame — head and shoulders at the "
           "left, platform and feet at the right, back of the calves toward the right. Never "
           "mirrored, never front-on."),
   framing=("FRAMING LOCK: the whole athlete and the whole machine inside the frame with air on "
            "both ends; her head at about 10 percent of the frame height from the top, the base "
            "of the machine at about 94 percent, both the shoulder pads and the platform fully "
            "visible, nothing cropped."),
   ident=("EXERCISE IDENTITY: CALF RAISE ON A HACK SQUAT MACHINE — shoulders under the pads, the "
          "balls of the feet on the edge of the inclined platform, the heels travelling far below "
          "the platform edge and then far above it. The knees barely bend."),
   appr=(MACHINE_HACK + " The platform is FIXED and does not move in this exercise; only her "
         "feet travel."),
   phase_text=("PHASE — START, the stretched position — this is the BOTTOM of the movement, the "
          "opposite of a raised-toe stance: only the toes and the balls of both feet touch the top "
          "edge of the platform board, and BOTH heels hang DOWN in open air about 15 cm BELOW that "
          "edge, with a visible gap of background between the heels and the board; the ankle is "
          "bent upward, the Achilles tendons are long and stretched, the calf muscle is "
          "elongated. Knees soft and nearly straight, hips under the pads, torso upright against "
          "the pads, arms relaxed with hands resting on the shoulder bar. HEEL DROP LOCK: the heels "
          "are the lowest part of her legs in this frame. HEEL ANGLE CUE: the ankle is "
          "dorsiflexed, so both HEELS sit LOWER than her toes and lower than the top edge of the "
          "board, the sole of each shoe faces down and back toward the camera, and the board edge "
          "is at the level of her ankles, not under her whole foot. If the soles lie flat along "
          "the board or the toes point down the board, the image is wrong. SHOE OVERHANG: only the "
          "front half of each shoe stands on the board — the heel half of both shoes hangs over "
          "the edge with empty background visible UNDERNEATH the heels, and the sole of each shoe "
          "is turned toward the camera."),
   high=("HIGHLIGHT: a soft semi-transparent warm-red X-ray glow through the skin over the "
         "GASTROCNEMIUS of BOTH calves — the diamond-shaped muscle of the back of the lower leg, "
         "from below the knee down to the Achilles tendon, widest at the top and tapering toward "
         "the heel. The nearer calf reads clearly; the thigh muscles, the glutes and the "
         "abdominals stay completely unlit and dark."),
   forb=("FORBIDDEN: a squat with deep knee bend; a leg press with feet flat on a large plate; a "
         "standing calf raise on a flat floor or on a small block; heels resting flat ON the "
         "platform; the whole foot flat on the platform; toes hanging off the edge; heels pushed UP "
         "onto the toes in this frame; a barbell on the back instead of shoulder pads; a machine "
         "with no pads; seated calf raise; a photograph; a different body type. 3:2 landscape "
         "composition."),
 ),
 dict(folder="Hack_Squat_Machine_Calf_Raise", phase="finish",
   one=("THE ONE RULE THAT DECIDES IF THIS IMAGE IS CORRECT: only the ANKLES move in this "
        "exercise. The knee angle, the hip angle and the shoulders under the pads are IDENTICAL "
        "in both frames of this pair — the only difference is how high the heels sit. If her "
        "knees bend deeper in one frame than in the other, this is a squat and the image is "
        "wrong."),
   camera=("CAMERA: SIDE view, true profile about 85° off straight-on, camera low at calf height "
           "0.6 m, 3.4 m away. We see the full side line: platform edge, foot, calf, thigh, "
           "torso and the shoulder pads."),
   orient=("ORIENTATION LOCK: she faces the LEFT edge of the frame — head and shoulders at the "
           "left, platform and feet at the right, back of the calves toward the right. Never "
           "mirrored, never front-on."),
   framing=("FRAMING LOCK: the whole athlete and the whole machine inside the frame with air on "
            "both ends; her head at about 10 percent of the frame height from the top, the base "
            "of the machine at about 94 percent, both the shoulder pads and the platform fully "
            "visible, nothing cropped."),
   ident=("EXERCISE IDENTITY: CALF RAISE ON A HACK SQUAT MACHINE — shoulders under the pads, the "
          "balls of the feet on the edge of the inclined platform, the heels travelling far below "
          "the platform edge and then far above it. The knees barely bend."),
   appr=(MACHINE_HACK + " The platform is FIXED and does not move in this exercise; only her "
         "feet travel."),
   phase_text=("PHASE — FINISH, the contracted position: she is pushed UP on her toes as high as it "
          "goes, both heels lifted far ABOVE the platform edge — higher than the board line, the "
          "calves bunched and short, the balls of both feet still planted on the same edge of the "
          "same board. The knees are unchanged and soft, the hips are still under the pads, the "
          "torso has not risen or leaned — only the ankles extended."),
   high=("HIGHLIGHT: a soft semi-transparent warm-red X-ray glow through the skin over the "
         "GASTROCNEMIUS of BOTH calves — the diamond-shaped muscle of the back of the lower leg, "
         "from below the knee down to the Achilles tendon, widest at the top and tapering toward "
         "the heel. The nearer calf reads clearly; the thigh muscles, the glutes and the "
         "abdominals stay completely unlit and dark."),
   forb=("FORBIDDEN: a squat with deep knee bend; heels still below the platform edge; feet flat "
         "on the platform; a leg press; a standing calf raise on a flat floor or a small block; "
         "toes hanging off the edge; a barbell on the back instead of shoulder pads; a machine "
         "with no pads; seated calf raise; rising onto one foot; a photograph; a different body "
         "type. 3:2 landscape composition."),
 ),
 # ── 4. Выпады в Смите ───────────────────────────────────────────────────────
 dict(folder="Smith_Machine_Lunge", phase="start",
   one=("THE ONE RULE THAT DECIDES IF THIS IMAGE IS CORRECT: this is a LUNGE, not a squat — the "
        "two feet stand in a STAGGERED line, one full step apart along the direction she faces, "
        "and they stay that way in both frames of this pair. If both feet sit side by side under "
        "her hips, the image shows a squat and it is wrong."),
   camera=("CAMERA: three-quarter view from in front of her and toward her RIGHT side, about 35° "
           "off the line of the barbell, camera at 1.3 m height, 3.4 m away. We see the staggered "
           "line of both legs, the front of her torso, the bar across her upper back running away "
           "from the camera toward the far guide column, and BOTH guide columns fully in frame: "
           "the near one at the RIGHT edge, the far one at the upper LEFT."),
   orient=("ORIENTATION LOCK: she faces the LEFT edge of the frame — the FRONT leg and foot point "
           "left, the back leg and raised-or-planted back heel sit to the right. Never mirrored, "
           "never front-on."),
   framing=("FRAMING LOCK: the whole athlete and both guide columns inside the frame with air; "
            "the top of her head at about 6 percent of the frame height, the soles of her shoes "
            "at about 93 percent, the plates and both her hands visible, nothing cropped."),
   ident=("EXERCISE IDENTITY: SMITH MACHINE LUNGE — a barbell fixed in two vertical guide rails, "
          "one foot stepped forward, the body lowered straight down between the two staggered "
          "feet and pushed back up."),
   appr=("APPARATUS, node by node (drawn from a real Smith-machine photo): (1) a Smith machine — a "
         "tall dark-grey steel PORTAL: TWO vertical guide columns, one at each end of the "
         "bar, joined overhead by a top crossbeam, with a row of hook-cam notches cut along the "
         "inside of each column and flat base feet on the floor; (2) a loaded barbell whose ENDS "
         "ARE CLAMPED INTO the carriages of both columns, so the bar can only travel straight up "
         "and down the rails — it cannot swing free and its ends never leave the columns; (3) TWO "
         "large round black weight plates on each end of the bar, mounted OUTSIDE her hands close "
         "to the columns, the same number of plates on both ends and in both frames; (4) a flat "
         "lifted platform floor under her feet. APPARATUS-MACHINE LOCK (both frames of this pair "
         "show the SAME machine): each guide column is a SLIM rectangular dark-grey steel post "
         "about 12 cm wide, with a polished vertical guide rod on its inner face and ONE vertical "
         "row of SMALL tooth-shaped hook notches about 4 cm tall, spaced 15 cm apart, cut into the "
         "outer face; the two posts are joined overhead by ONE slim horizontal crossbeam. "
         "FORBIDDEN column looks: a power-rack post with large round or oval holes, a square tube "
         "with a pegboard grid of big square holes, a curved arch, a padded column, or columns "
         "that differ in thickness, height or notch pattern between the "
         "two frames. DEPTH ORDER from "
         "the camera back: the near guide "
         "column, then her near arm and shoulder, then the bar across her upper back, then her "
         "body, then the far column, then the wall."),
   phase_text=("PHASE — START, the top position: she stands TALL with the bar resting across her "
          "upper back, hands gripping it wider than the shoulders, chest up, torso vertical. The "
          "front foot is planted a full step ahead, the back leg is straight behind her and the "
          "BACK FOOT RESTS FLAT ON THE FLOOR with its heel down. KNEES STRAIGHT LOCK: in this frame "
          "BOTH legs are extended — the front knee and the back knee are straight, the hips are at "
          "their HIGHEST point of the whole set and sit directly under the bar, and the body reads "
          "as one vertical column from the bar down through the heels. If either knee is bent or "
          "the hips have sunk even a little, this frame shows the bottom position and it is wrong."),
   high=("HIGHLIGHT: a soft semi-transparent warm-red X-ray glow through the skin over TWO "
         "muscles, both of them on the FRONT leg only — the QUADRICEPS along the front of the "
         "thigh, from the hip down to the knee, and the GLUTEUS MAXIMUS of the same hip, the "
         "rounded muscle at the top of the back of the pelvis, visible on the rear contour from "
         "this side view. Both patches follow the real muscle contours and taper at their ends. "
         "The back leg, the hamstrings and the calves stay completely unlit and dark."),
   forb=("FORBIDDEN: both feet side by side under the hips (that is a squat); a split squat with "
         "the rear foot raised on a bench; a step-up on a box; a forward lean of the torso; a "
         "free barbell held over the head or a barbell with no guide columns; the bar swinging "
         "off the rails; a front-rack hold with the hands at the shoulders; knees collapsing "
         "inward; a photograph; a different body type. 3:2 landscape composition."),
 ),
 dict(folder="Smith_Machine_Lunge", phase="finish",
   one=("THE ONE RULE THAT DECIDES IF THIS IMAGE IS CORRECT: this is a LUNGE, not a squat — the "
        "two feet stand in a STAGGERED line, one full step apart along the direction she faces, "
        "and they stay that way in both frames of this pair. If both feet sit side by side under "
        "her hips, the image shows a squat and it is wrong."),
   camera=("CAMERA: three-quarter view from in front of her and toward her RIGHT side, about 35° "
           "off the line of the barbell, camera at 1.3 m height, 3.4 m away. We see the staggered "
           "line of both legs, the front of her torso, the bar across her upper back running away "
           "from the camera toward the far guide column, and BOTH guide columns fully in frame: "
           "the near one at the RIGHT edge, the far one at the upper LEFT."),
   orient=("ORIENTATION LOCK: she faces the LEFT edge of the frame — the FRONT leg and foot point "
           "left, the back leg and raised back heel sit to the right. Never mirrored, never "
           "front-on."),
   framing=("FRAMING LOCK: the whole athlete and both guide columns inside the frame with air; "
            "the top of her head at about 6 percent of the frame height, the soles of her shoes "
            "at about 93 percent, the plates and both her hands visible, nothing cropped."),
   ident=("EXERCISE IDENTITY: SMITH MACHINE LUNGE — a barbell fixed in two vertical guide rails, "
          "one foot stepped forward, the body lowered straight down between the two staggered "
          "feet and pushed back up."),
   appr=("APPARATUS, node by node (drawn from a real Smith-machine photo): (1) a Smith machine — a "
         "tall dark-grey steel PORTAL: TWO vertical guide columns, one at each end of the "
         "bar, joined overhead by a top crossbeam, with a row of hook-cam notches cut along the "
         "inside of each column and flat base feet on the floor; (2) a loaded barbell whose ENDS "
         "ARE CLAMPED INTO the carriages of both columns, so the bar can only travel straight up "
         "and down the rails — it cannot swing free and its ends never leave the columns; (3) TWO "
         "large round black weight plates on each end of the bar, mounted OUTSIDE her hands close "
         "to the columns, the same number of plates on both ends and in both frames; (4) a flat "
         "lifted platform floor under her feet. APPARATUS-MACHINE LOCK (both frames of this pair "
         "show the SAME machine): each guide column is a SLIM rectangular dark-grey steel post "
         "about 12 cm wide, with a polished vertical guide rod on its inner face and ONE vertical "
         "row of SMALL tooth-shaped hook notches about 4 cm tall, spaced 15 cm apart, cut into the "
         "outer face; the two posts are joined overhead by ONE slim horizontal crossbeam. "
         "FORBIDDEN column looks: a power-rack post with large round or oval holes, a square tube "
         "with a pegboard grid of big square holes, a curved arch, a padded column, or columns "
         "that differ in thickness, height or notch pattern between the "
         "two frames. DEPTH ORDER from "
         "the camera back: the near guide "
         "column, then her near arm and shoulder, then the bar across her upper back, then her "
         "body, then the far column, then the wall."),
   phase_text=("PHASE — FINISH, the bottom position: the hips have travelled STRAIGHT DOWN, the FRONT "
          "knee is bent to about 90° and sits directly above the front foot, pointing the same "
          "way as the toes, the BACK knee is bent and lowered to a fist's height above the "
          "floor, and the BACK HEEL IS LIFTED so the foot rests on its toes. The torso is still "
          "vertical, the chest up, the bar still across the upper back between both columns — "
          "her head is only a little lower than in the start frame, not pitched forward."),
   high=("HIGHLIGHT: a soft semi-transparent warm-red X-ray glow through the skin over TWO "
         "muscles, both of them on the FRONT leg only — the QUADRICEPS along the front of the "
         "thigh, from the hip down to the knee, and the GLUTEUS MAXIMUS of the same hip, the "
         "rounded muscle at the top of the back of the pelvis, visible on the rear contour from "
         "this side view. Both patches follow the real muscle contours and taper at their ends. "
         "The back leg, the hamstrings and the calves stay completely unlit and dark."),
   forb=("FORBIDDEN: both feet side by side under the hips (that is a squat); the front knee "
         "straight; a torso hinged forward over the front thigh; the back knee touching the "
         "floor; a split squat with the rear foot on a bench; a step-up on a box; a free barbell "
         "with no guide columns; the bar off the rails or overhead; a front-rack hold; knees "
         "collapsing inward; a photograph; a different body type. 3:2 landscape composition."),
 ),
 # ── 5. Ягодичный мостик на полу ─────────────────────────────────────────────
 dict(folder="Butt_Lift_(Bridge)", phase="start",
   one=("THE ONE RULE THAT DECIDES IF THIS IMAGE IS CORRECT: this is a BODYWEIGHT GLUTE BRIDGE on "
        "the FLOOR — there is NO barbell, NO plate, NO band and NO machine anywhere near her "
        "hips, and her upper back and head rest directly on the FLOOR, not on a bench. If a "
        "loaded bar sits across her pelvis, or her shoulders are up on a bench, the image shows "
        "a hip thrust and it is wrong."),
   camera=("CAMERA: three-quarter side view of the body lying on the floor, about 30° rotated from "
           "the side toward the foot end, camera low but not on the floor (0.7 m height), 3.4 m "
           "away. The body reads ACROSS the frame: head and shoulders at the LEFT, hips in the "
           "middle, knees and feet at the RIGHT; we see her right side and the outer upper edge of "
           "her right buttock."),
   orient=("ORIENTATION LOCK: her head is on the LEFT of the frame and her feet on the RIGHT, her "
           "back faces the camera — exactly the same in both frames of this pair. Never mirrored, "
           "never looked down the length of the body from the foot end, never head toward the "
           "camera."),
   framing=("FRAMING LOCK: the whole body inside the frame with air; her head at about 15 percent of "
            "the frame width from the left edge, the soles of her shoes at about 85 percent, both "
            "elbows, both knees and both feet fully visible, nothing cropped; the body occupies the "
            "same pixel length in both frames of the pair."),
   ident=("EXERCISE IDENTITY: BUTT LIFT / GLUTE BRIDGE — lying on the back on an open floor, "
          "knees bent, feet flat, the hips lifted and lowered with bodyweight only."),
   appr=("APPARATUS: NONE. An empty studio floor only — no bench, no box, no pillow, no mat edge, "
         "no barbell, no bands, no machine. PROPS LOCK: exactly zero pieces of equipment in the "
         "scene; the floor is a single seamless surface."),
   bg=("BACKGROUND: seamless desaturated cool blue-grey studio backdrop with a soft gradient and a "
       "gentle vignette, soft floor shadow under the athlete, no equipment anywhere, no logos, no "
       "text, no numbers, no watermark, no mirrors."),
   phase_text=("PHASE — START, the resting position: she lies on her back, knees bent, both feet flat "
          "on the floor about hip-width apart with the heels just behind the knees, arms straight "
          "along the body with the palms pressed down on the floor, head and shoulder blades on "
          "the floor. The hips rest LOW, the buttocks on the ground, the thighs pointing up "
          "toward the ceiling."),
   high=("HIGHLIGHT: a soft semi-transparent warm-red X-ray glow through the skin over the "
         "GLUTEUS MAXIMUS — the outer upper edge of her buttock at the hip crease, the part that "
         "faces the camera from this low angle, reading as a rounded warm patch on the hip. The "
         "hamstrings, the quadriceps, the abdominals and the calves stay completely unlit and "
         "dark."),
   forb=("FORBIDDEN: a barbell or a plate across the hips; a band above the knees; a bench or "
         "box under the shoulders; feet up on a bench or on a stability ball; a single-leg "
         "bridge; a plank on the forearms; a back extension on a Roman chair; hips already "
         "lifted in this frame; a photograph; a different body type. 3:2 landscape composition."),
 ),
 dict(folder="Butt_Lift_(Bridge)", phase="finish",
   one=("THE ONE RULE THAT DECIDES IF THIS IMAGE IS CORRECT: this is a BODYWEIGHT GLUTE BRIDGE on "
        "the FLOOR — there is NO barbell, NO plate, NO band and NO machine anywhere near her "
        "hips, and her upper back and head rest directly on the FLOOR, not on a bench. If a "
        "loaded bar sits across her pelvis, or her shoulders are up on a bench, the image shows "
        "a hip thrust and it is wrong."),
   camera=("CAMERA: three-quarter side view of the body lying on the floor, about 30° rotated from "
           "the side toward the foot end, camera low but not on the floor (0.7 m height), 3.4 m "
           "away. The body reads ACROSS the frame: head and shoulders at the LEFT, hips in the "
           "middle, knees and feet at the RIGHT; we see her right side and the outer upper edge of "
           "her right buttock."),
   orient=("ORIENTATION LOCK: her head is on the LEFT of the frame and her feet on the RIGHT, her "
           "back faces the camera — exactly the same in both frames of this pair. Never mirrored, "
           "never looked down the length of the body from the foot end, never head toward the "
           "camera."),
   framing=("FRAMING LOCK: the whole body inside the frame with air; her head at about 15 percent of "
            "the frame width from the left edge, the soles of her shoes at about 85 percent, both "
            "elbows, both knees and both feet fully visible, nothing cropped; the body occupies the "
            "same pixel length in both frames of the pair."),
   ident=("EXERCISE IDENTITY: BUTT LIFT / GLUTE BRIDGE — lying on the back on an open floor, "
          "knees bent, feet flat, the hips lifted and lowered with bodyweight only."),
   appr=("APPARATUS: NONE. An empty studio floor only — no bench, no box, no pillow, no mat edge, "
         "no barbell, no bands, no machine. PROPS LOCK: exactly zero pieces of equipment in the "
         "scene; the floor is a single seamless surface."),
   bg=("BACKGROUND: seamless desaturated cool blue-grey studio backdrop with a soft gradient and a "
       "gentle vignette, soft floor shadow under the athlete, no equipment anywhere, no logos, no "
       "text, no numbers, no watermark, no mirrors."),
   phase_text=("PHASE — FINISH, the top position: the hips are lifted so that the knees, the hips and "
          "the shoulders form ONE STRAIGHT LINE, the buttocks squeezed, the feet still flat on "
          "the floor in the same place, the heels behind the knees, the arms still straight with "
          "palms down, the head and shoulder blades still resting on the floor. The ribs stay "
          "down — the back does not arch beyond the straight line."),
   high=("HIGHLIGHT: a soft semi-transparent warm-red X-ray glow through the skin over the "
         "GLUTEUS MAXIMUS — the outer upper edge of her buttock at the hip crease, the part that "
         "faces the camera from this low angle, reading as a rounded warm patch on the hip. The "
         "hamstrings, the quadriceps, the abdominals and the calves stay completely unlit and "
         "dark."),
   forb=("FORBIDDEN: a barbell or a plate across the hips; a band above the knees; a bench or box "
         "under the shoulders; feet up on a bench or on a stability ball; a single-leg bridge; a "
         "plank on the forearms; a back extension on a Roman chair; hips still on the floor in "
         "this frame; an over-arched back with the ribs flared up; a photograph; a different body "
         "type. 3:2 landscape composition."),
 ),
]

os.makedirs(OUT, exist_ok=True)


def to_male(text):
    """Мужской вариант кадра: та же камера, те же локи, другой CHARACTER LOCK и местоимения.

    Правил по тексту меньше, чем кажется опасным: меняются только отдельные слова,
    «there / where / other» не задеваются из-за границ слова.
    """
    t = text.replace(CHAR_F, CHAR_M)
    # «her» в объектной позиции («straight behind her and…», «above her.») swapping даёт «his»
    # с обрывом фразы. Признак объектной позиции — следующее слово из закрытого класса или знак.
    t = re.sub(r"\bher\b(?=\s+(?:and|but|or|the|a|an|from|as|by|with)\b|[.,;:])", "him", t)
    for a, b in ((r"\bher\b", "his"), (r"\bshe\b", "he"), (r"\bShe\b", "He"),
                 (r"\bHer\b", "His"), (r"\bHER\b", "HIS"), (r"\bSHE\b", "HE"),
                 (r"\bshe's\b", "he's")):
        t = re.sub(a, b, t)
    return t


written = []
for f in FRAMES:
    body = "\n\n".join([
        STYLE,
        f["one"],
        " ".join([f["camera"], f["orient"], SCALE, f["framing"], SINGLE]),
        f["ident"],
        f["appr"],
        f["phase_text"],
        CHAR_F,
        f["high"],
        f.get("bg", BACKGROUND),
        f["forb"],
    ])
    for suffix, text in (("", body), ("_m", to_male(body))):
        name = "%s_%s%s.txt" % (f["folder"], f["phase"], suffix)
        open(os.path.join(OUT, name), "w", encoding="utf-8").write(text + "\n")
        written.append((name, len(text.split())))

for name, words in written:
    print("%-58s %4d words" % (name, words))
print("frames:", len(written))
