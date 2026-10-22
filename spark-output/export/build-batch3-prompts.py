# -*- coding: utf-8 -*-
"""Промпты партии легаси-3 (21.10): пять позиций × женская пара = 10 кадров.

Позиции: махи на среднюю дельту, сисси-приседания, пуловер в Смите, французский жим обратным
хватом и «Мёртвый жук» — последний добавлен 21.10 по слову владельца и идёт раньше остальных,
потому что это самый занятый пункт очереди (37 слотов и 51 строка истории). Пятая позиция
прежней партии («Выпады в Смите») описана в build-batch2-prompts.py — её файлы лежат в
prompts/ и здесь не дублируются.

Порядок владельца: махи на среднюю дельту → выпады в Смите → мёртвый жук → сисси-приседания →
пуловер в Смите → французский жим обратным хватом. По одной позиции за раз: женская пара,
одобрение, мужская пара.

Общие блоки (STYLE, CHARACTER LOCK, SCALE, SINGLE FRAME, BACKGROUND) — дословные копии
блоков из build-batch2-prompts.py: стилевой лок требует точного повтора строк между кадрами
и партиями, иначе модель меняет и тело, и камеру. Владелец формулировок —
illustration-style-lock.md.

Порядок блоков = приоритет прочтения: STYLE → THE ONE RULE → CAMERA/ORIENTATION/SCALE/FRAMING/
SINGLE → EXERCISE IDENTITY → APPARATUS → PHASE → CHARACTER → HIGHLIGHT → BACKGROUND → FORBIDDEN.

Запуск из корня: python spark-output/export/build-batch3-prompts.py
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

# урок 21.10: голый SCALE LOCK модель игнорирует — финишный кадр вышел крупнее стартового.
# Помогает числовой якорь: доля высоты кадра, которую занимает тело, плюс ориентир по снаряду.
SCALE_PAIR = ("PAIR SCALE ANCHOR: the athlete is drawn at EXACTLY the size stated in the FRAMING "
              "LOCK below — the same percentages of the frame height for the head, the limbs and "
              "the floor line — in the start frame AND in the finish frame alike. If a piece of "
              "equipment is in the scene (a column, a support, a bench, a machine), it is the same "
              "size in pixels in both frames. If the athlete or the equipment looks bigger or "
              "smaller than in the companion frame, that is a zoom error and the frame is wrong.")

SINGLE = ("SINGLE FRAME: one continuous scene filling the whole canvas — no collage, no split "
          "panels, no inset, no duplicated figure, no second view of the same exercise.")

BACKGROUND = ("BACKGROUND: seamless desaturated cool blue-grey studio backdrop with a soft "
              "gradient and a gentle vignette, soft floor shadow under the athlete and under the "
              "equipment, matte dark-grey metal with black pads and black plates, no logos, no "
              "text, no numbers, no watermark, no mirrors.")

# ── 1. Махи в кроссовере на среднюю дельту (Cable Lateral Raise) ─────────────
CABLE_ONE = ("THE ONE RULE THAT DECIDES IF THIS IMAGE IS CORRECT: she stands FULLY UPRIGHT — torso "
             "vertical, chest facing the camera — and exactly ONE arm is lifted OUT TO THE SIDE, in "
             "the frontal plane, to shoulder height. The working arm is the arm FARTHEST from the "
             "cable column. If the torso is hinged forward, if the arm swings in FRONT of the chest "
             "(a front raise), or if the arm nearer the column is the one holding the handle, the "
             "image is wrong.")

CABLE_CAM = ("CAMERA: front view, about 20 degrees off straight-on and slightly toward her LEFT "
             "side, camera at 1.5 m height, 3.2 m away. We see her face and chest toward the "
             "camera, both shoulders, the raised left arm going out toward the RIGHT edge of the "
             "frame, and the cable column standing at the LEFT edge.")

CABLE_ORIENT = ("ORIENTATION LOCK: she faces the camera. The cable column is at the LEFT edge of "
                "the frame, her head is in the upper middle, both shoes are at the bottom. Her "
                "working arm is her LEFT arm, which from this camera is the arm on the RIGHT side "
                "of the frame. Never mirrored, never a back view.")

CABLE_FRAMING = ("FRAMING LOCK: the athlete drawn LARGE in the frame — the top of her head at "
                 "about 4 percent of the frame height, the soles of her shoes at about 93 percent, "
                 "the whole column with its low pulley inside the frame, and the raised hand and "
                 "its handle fully inside the frame with a small gap to the right edge, never "
                 "cropped. Both frames of this pair are drawn at this same size.")

# подсказки по живому фото-референсу Side_Lateral_Raise (апстрим free-exercise-db, кадр 1):
# камера строго спереди, корпус вертикально, плечи опущены, рука выведена в сторону чуть
# впереди фронтальной плоскости; стойка — стопы на ширине плеч, колени мягкие.

CABLE_ID = ("EXERCISE IDENTITY: CABLE LATERAL RAISE — standing side-on to a LOW pulley, one arm "
            "abducted through the side plane up to shoulder height, the middle of the shoulder "
            "doing the work. It is not a front raise, not an upright row and not an overhead press.")

CABLE_APPR = ("APPARATUS, node by node: (1) ONE cable column at the LEFT edge of the frame — a slim "
              "dark-grey upright with a round base plate, a closed weight stack inside it and a LOW "
              "pulley at floor level, the carriage sitting at the BOTTOM of the stack so the cable "
              "exits near the floor; (2) exactly ONE cable — a single straight taut line running "
              "from that low pulley up and across to a single black triangular D-handle; the cable "
              "passes IN FRONT of her body, over the background and over the front of her "
              "near-side thigh, never behind her; (3) the handle is in her LEFT hand only, the hand "
              "farthest from the column. CABLE TENSION LOCK: the cable is UNDER LOAD, therefore a "
              "PERFECTLY STRAIGHT taut segment — no sag, no curve, no slack loop. CABLE ROUTE LOCK: "
              "exactly one cable and one handle in the frame; no second cable, no extra handle, no "
              "high pulley, no crossover beam above her. FREE ARM LOCK: her RIGHT arm is free — the "
              "right hand rests on her right hip, it never holds the handle and never hangs in "
              "front of her body. PROPS LOCK: no dumbbell, no kettlebell, no bench, no second "
              "column.")

CABLE_HIGH = ("HIGHLIGHT: a soft semi-transparent warm-red X-ray glow through the skin over the "
              "MIDDLE (LATERAL) DELTOID of her LEFT shoulder only — the rounded cap that sits on "
              "the OUTER edge of the shoulder where the arm leaves the joint, running from the "
              "top of the shoulder down toward where the deltoid tapers into the upper arm. The "
              "patch stays on the OUTER side contour of the shoulder: not on the front of the "
              "chest, not on the upper trapezius, not on the biceps. The trapezius, the chest, the "
              "right shoulder, the arms and the legs stay completely unlit and dark.")

CABLE_FORB = ("FORBIDDEN: a hinged or bent-over torso; the arm raised in front of the chest (front "
              "raise) or overhead; the arm swept behind the torso; a shrug with the working "
              "shoulder hiked toward the ear; an elbow bent to 90 degrees; the body leaning away "
              "from the cable to hoist the arm; the handle in the hand nearest the column or in "
              "both hands; two cables or two handles; a cable from a high pulley; a dumbbell "
              "instead of the handle; a short cable stub that does not reach the machine; a "
              "sagging cable; a photograph; a different body type. 3:2 landscape composition.")

# ── 2. Сисси-приседания (Bodyweight Sissy Squat) ─────────────────────────────
SISSY_ONE = ("THE ONE RULE THAT DECIDES IF THIS IMAGE IS CORRECT: this is a BODYWEIGHT knee-focused "
             "squat on the toes — there is NO plate, NO dumbbell and NO barbell anywhere on or in "
             "her body, and her only contact with anything is her LEFT hand on the rack post. Both "
             "heels are LIFTED off the floor in both frames of this pair, the knees travel FORWARD "
             "past the toes and the "
             "torso leans BACK while the hips stay extended. If a weight sits on her chest, or the "
             "soles rest flat on the floor, or she sits back between her feet with a hinged torso "
             "like an ordinary squat, the image is wrong.")

SISSY_CAM = ("CAMERA: SIDE view, near profile about 85 degrees off straight-on, camera at 1.1 m "
             "height, 3.4 m away. We see the whole side line of her body: the upright post and her "
             "gripping hand in front, the knee, the thigh, the torso leaning back, and both feet on "
             "the toes at the bottom.")

SISSY_ORIENT = ("ORIENTATION LOCK: she faces the LEFT edge of the frame — the upright post and her "
                "gripping hand are at the LEFT, her knees point LEFT and travel leftward past her "
                "toes, her hips and buttocks sit to the RIGHT. Never mirrored, never front-on.")

SISSY_FRAMING = ("FRAMING LOCK: the whole athlete and the whole upright post inside the frame with "
                 "air; the top of her head at about 10 percent of the frame height, the balls of "
                 "her shoes at about 92 percent, her gripping hand and the base foot of the post "
                 "fully visible, the top of the post running out of the frame is allowed, nothing "
                 "of her body cropped.")

SISSY_ID = ("EXERCISE IDENTITY: BODYWEIGHT SISSY SQUAT — holding a stable upright post with ONE "
            "hand, rising onto the toes, driving the knees far forward over the toes and leaning "
            "the torso back with the hips kept straight, then pushing back up. Bodyweight only, "
            "nothing in the hands.")

SISSY_APPR = ("APPARATUS, node by node (the support is ONE rack upright, chosen by the owner on "
              "21.10 — not a crossbar, not a machine): (1) a SINGLE vertical steel upright of a "
              "squat rack standing at the LEFT edge of the frame — a rectangular dark-grey post "
              "about 8 cm wide with a row of small rectangular hook notches down its front face and "
              "a flat base foot bolted to the floor; it is ONE post, there is no second post and no "
              "horizontal crossbar anywhere in the scene; (2) her LEFT hand grips that post at chest "
              "height (about 1.25 m) with the arm fully straight, the fingers wrapped around the "
              "front of the post, the knuckles toward the camera; (3) her RIGHT arm is free and "
              "unloaded — it hangs down along the far side of her body, mostly hidden behind her "
              "torso, with the back of the hand visible at her hip line; (4) NOTHING else in the "
              "room: no barbell, no weight plate, no dumbbell, no kettlebell, no band, no bench, no "
              "box, no padded sissy-squat machine, no wall behind her, no second piece of rack. "
              "LOAD LOCK: she carries zero external load — both hands are empty, nothing rests on "
              "her chest or shoulders; this is what separates her from the weighted version of the "
              "same movement. POST LOCK (draw the SAME post in both frames of this pair): the post "
              "is a BROAD rectangular column, and its width on the canvas equals about HALF the "
              "width of her own torso measured across the ribcage — a thick rack upright, never a "
              "slim pole and never a thin tube. The post has the same thickness, the same place at "
              "the left edge and the same top height in the start frame and in the finish frame; "
              "only her body moves along it. If the post is thinner, thicker or closer than in the "
              "companion frame, the frame is wrong. DEPTH ORDER from "
              "the camera back: her near arm and hand on the post, the post, her torso and near "
              "thigh, her far leg partly hidden behind the near leg.")

# урок 21.10: на референсе Weighted_Sissy_Squat стопа лежит плашмя, из-за чего движение выглядит
# обычным приседом; по вердикту владельца 21.10 подъём поднят в ОБОИХ кадрах
SISSY_FEET = ("HEELS-UP LOCK (both frames): the heels are lifted off the floor the whole time and "
              "she stands on the balls of both feet, the toes pressed down and pointing forward, "
              "the ankles strongly dorsiflexed so the front of the shin and the top of the foot "
              "form one long line into the knee. If either sole lies flat on the floor in either "
              "frame, the image is wrong.")

SISSY_HIGH = ("HIGHLIGHT: a soft semi-transparent warm-red X-ray glow through the skin over the "
              "RECTUS FEMORIS of her NEAR thigh — the straight central strap on the FRONT of the "
              "thigh, from the hip crease down to the knee, tapering into the patellar tendon "
              "below the kneecap. The patch stays on the front centre line of the thigh; the side "
              "sweep of the quadriceps, the hamstrings, the glutes and the calves stay completely "
              "unlit and dark, and the far thigh stays dark.")

SISSY_FORB = ("FORBIDDEN: a plate or dumbbell held against the chest; a barbell on the shoulders or "
              "in the hands; heels resting on the floor; feet flat with the knees behind the toes; "
              "an ordinary squat with the hips sitting back between the feet; a forward hinged "
              "torso; a lunge or a step-up; a wall sit; a seated leg-extension machine; a padded "
              "sissy bench; the knees caving inward or touching the floor; hands on the hips; BOTH "
              "hands gripping a horizontal crossbar; a second upright post or any crossbeam in the "
              "scene; the free hand holding the post as well; a photograph; a different body type. "
              "3:2 landscape composition.")

# ── 3. Пуловер в Смите (Smith Machine Pullover) ──────────────────────────────
PULL_ONE = ("THE ONE RULE THAT DECIDES IF THIS IMAGE IS CORRECT: she lies on her back on a FLAT "
            "bench with BOTH arms extended straight up, and the ONLY thing that changes between "
            "the two frames is the bar sliding along the rails toward and past her HEAD on straight "
            "arms. This is a PULLOVER — an arc overhead with the elbows nearly locked. If the "
            "elbows bend to bring the bar down onto her chest (a bench press), if the bench is "
            "inclined, or if the bar sits behind her neck with bent elbows (a skullcrusher), the "
            "image is wrong.")

PULL_CAM = ("CAMERA: three-quarter view from the SIDE of the bench and slightly toward her head "
            "end, about 55 degrees off the line of her body, camera at 1.4 m height, 3.2 m away. "
            "We see her face turned up to the ceiling, both arms stretched toward the bar, the "
            "side contour of her torso from armpit to waist, the flat bench under her and both "
            "vertical guide columns of the machine.")

PULL_ORIENT = ("ORIENTATION LOCK: her head is at the FAR-TOP-LEFT of the frame, her shoes are at "
               "the NEAR-BOTTOM-RIGHT, her body lies along the axis of the bar, the bar hangs "
               "above her chest between the two columns. Never mirrored, never a head-on view down "
               "the bench.")

PULL_FRAMING = ("FRAMING LOCK: the whole bench, the whole body, the bar and both guide columns "
                "inside the frame with air; her head at about 14 percent of the frame height, the "
                "soles of her shoes at about 90 percent, both hands and both ends of the bar fully "
                "visible, nothing cropped.")

PULL_ID = ("EXERCISE IDENTITY: SMITH MACHINE PULLOVER — lying on a flat bench under a guided "
           "barbell, arms extended, the bar lowered on an arc behind the head and drawn back over "
           "the chest, the lats doing the work. Not a press and not a skullcrusher.")

PULL_APPR = ("APPARATUS, node by node from the near end to the far end: (1) a FLAT weight bench, "
             "pad perfectly horizontal (no incline, no decline, no adjustable backrest), matte "
             "dark-grey upholstery, square steel legs with flat feet; (2) a Smith machine — TWO "
             "vertical dark-grey guide columns, one at the head end and one at the foot end of the "
             "bench, with a row of hook cams on each column; (3) a loaded barbell whose ends are "
             "clamped INTO both carriages, so it can only travel along the rails and slide along "
             "its own axis — it never leaves the columns and never swings free; (4) TWO black "
             "weight plates on each end of the bar, both ends visible OUTSIDE her hands, the same "
             "number of plates in both frames. BAR AXIS LOCK (settled from a real pullover photo): "
             "the long axis of the bar is PARALLEL to the long axis of her body and of the bench — "
             "her head sits BETWEEN her two hands, one plate stack is beyond her hands toward her "
             "feet and the other beyond her hands toward her head. If the bar lies sideways across "
             "her chest the way a bench-press bar does, the image is wrong. HER GRIP LOCK: both "
             "hands grip the shaft about shoulder-width apart with an overhand grip, arms extended "
             "toward the bar, elbows SOFT and only slightly bent in both frames. BAR CONTINUITY "
             "LOCK: one rigid uninterrupted shaft, never two stubs, never hidden inside her body. "
             "DEPTH ORDER from the camera back: the near guide column, her near arm, the bar, her "
             "torso, the bench pad, the far guide column, the wall. Nothing else in the room: no "
             "spotter, no rack, no dumbbells.")

PULL_HIGH = ("HIGHLIGHT: a soft semi-transparent warm-red X-ray glow through the skin over the "
             "LATISSIMUS DORSI on BOTH flanks of her torso — the muscle that runs from the armpit "
             "down and back toward the waist, which from this three-quarter view reads as two "
             "long tapering patches along the SIDE contour of the ribcage, one on each side of the "
             "chest. The chest muscles, the abdominals, the biceps, the arms and the legs stay "
             "completely unlit and dark.")

PULL_FORB = ("FORBIDDEN: an inclined or decline bench; a bench press with the bar descending to "
             "the chest and the elbows bent; a skullcrusher with the bar behind the head and the "
             "elbows bent; a narrow grip or a wide grip with the hands out over the shoulders; the "
             "bar off the rails or swinging free; a free barbell in a rack instead of a Smith "
             "machine; a dumbbell pullover; her hips twisted off the pad; a head arched back off "
             "the bench; a spotter; a photograph; a different body type. 3:2 landscape composition.")

# ── 4. Французский жим обратным хватом ───────────────────────────────────────
FRENCH_ONE = ("THE ONE RULE THAT DECIDES IF THIS IMAGE IS CORRECT: she lies on her back on a FLAT "
              "bench and the ONLY joint that moves is the ELBOWS. The upper arms stay vertical, "
              "pointing at the ceiling, fixed above her chest in both frames; the forearms lower "
              "the bar toward her forehead and press it back up. This is a LYING TRICEPS EXTENSION "
              "— not a bench press (the bar never descends to her chest), not a cable pushdown (no "
              "cable, no column). If the upper arms tilt toward her head or the elbows flare wide, "
              "the image is wrong.")

FRENCH_CAM = ("CAMERA: three-quarter view from the SIDE of the bench and slightly toward her head "
              "end, about 45 degrees off the line of her body, camera at 1.3 m height, 3.0 m away. "
              "We see her face turned up, both arms working above her chest, the angled grips of "
              "the EZ-bar, the side of the flat bench and both ends of the bar.")

FRENCH_ORIENT = ("ORIENTATION LOCK: her head is at the FAR-TOP-LEFT of the frame, her shoes are at "
                 "the NEAR-BOTTOM-RIGHT, the bench runs along that diagonal, her arms point up "
                 "toward the ceiling above her chest. Never mirrored, never a view straight down "
                 "the bench.")

FRENCH_FRAMING = ("FRAMING LOCK: the whole bench, the whole body and the whole bar inside the frame "
                  "with air; her head at about 14 percent of the frame height, the soles of her "
                  "shoes at about 90 percent, both elbows, both hands and both plate stacks fully "
                  "visible, nothing cropped.")

FRENCH_ID = ("EXERCISE IDENTITY: LYING REVERSE-GRIP TRICEPS EXTENSION WITH AN EZ-CURL BAR — supine "
             "on a flat bench, supinated (reverse) grip on the angled sections, elbows fixed at "
             "90 degrees, the bar lowered to the forehead and pressed back up.")

FRENCH_APPR = ("APPARATUS, node by node: (1) a FLAT weight bench, pad perfectly horizontal, matte "
               "dark-grey upholstery, square steel legs with flat feet on the floor; (2) an EZ-curl "
               "barbell — ONE rigid chrome shaft with TWO angled grip sections between the outer "
               "straight ends; (3) her hands grip the ANGLED sections, shoulder-width apart, in a "
               "SUPINATED (reverse) grip: the palms face UP toward her face and the thumbs are on "
               "the far side of the bar from her, so from this camera the undersides of both hands "
               "read toward the lens; (4) TWO black weight plates on each end of the bar, both ends "
               "clear and fully visible, the same number in both frames. TWO-HAND LOCK: BOTH hands "
               "are on the bar and both forearms are fully visible, one on each side of her head. "
               "BAR CONTINUITY LOCK: one uninterrupted shaft, never two stubs, never a bar that "
               "disappears behind her arms. PROPS LOCK: NO cable, NO pulley column, NO rack, NO "
               "dumbbells, NO bench with uprights. Nothing else in the room and no spotter.")

FRENCH_HIGH = ("HIGHLIGHT: a soft semi-transparent warm-red X-ray glow through the skin over the "
               "TRICEPS BRACHII of BOTH upper arms — the muscle on the BACK of the upper arm "
               "between the shoulder and the elbow, which from this three-quarter view reads along "
               "the rear contour of each upper arm, from the back of the shoulder down to the "
               "olecranon at the elbow tip. Two patches, both arms, following the muscle contour "
               "and tapering at both ends. The chest, the shoulders, the forearms, the abdominals "
               "and the legs stay completely unlit and dark.")

FRENCH_FORB = ("FORBIDDEN: a cable pushdown at a station or any cable in the frame; a bench press "
               "with the bar descending between her armpits or onto her chest; a decline or "
               "inclined bench; dumbbells instead of the bar; an overhand (pronated) grip — the "
               "palms must face up; a close-grip press; the upper arms angled toward her head or "
               "the elbows flared wide; the bar resting on her chest or behind her neck; one hand "
               "off the bar; a bar split into two disconnected pieces; a spotter; a photograph; a "
               "different body type. 3:2 landscape composition.")

# ── 5. Мёртвый жук (Dead Bug) ────────────────────────────────────────────────
BUG_ONE = ("THE ONE RULE THAT DECIDES IF THIS IMAGE IS CORRECT: she lies flat on her back on an open "
           "studio floor and the ONLY things that move are one arm and the OPPOSITE leg. In the "
           "start frame both arms point at the ceiling and both knees are bent to 90 degrees with "
           "the feet in the air; in the finish frame one arm has reached back OVERHEAD toward the "
           "floor while the leg on the other side has extended down toward the floor. Two things "
           "never change in either frame: the lower back stays pressed into the floor, and the "
           "head and shoulder blades stay on the floor. If both arms and both legs stay where they "
           "were, if the arm and the leg on the SAME side reach out, or if the back arches off the "
           "floor, the image is wrong.")

BUG_CAM = ("CAMERA: SIDE view, true profile about 85 degrees off straight-on, camera low at 0.9 m "
           "height, 2.8 m away, looking along the floor so the whole line of her body, the reaching "
           "arm and the extending leg read clearly against the background.")

BUG_ORIENT = ("ORIENTATION LOCK: she lies on her back with her LEFT side toward the camera, her head "
              "at the LEFT edge of the frame and her feet toward the RIGHT. The arm that works is "
              "her LEFT arm — the one nearest the camera — and the leg that works is her RIGHT leg, "
              "the far one, extending below and behind the held knee. Never mirrored, never a view "
              "from above, never a three-quarter angle that hides the floor line.")

BUG_FRAMING = ("FRAMING LOCK: the floor line sits at about 86 percent of the frame height and her "
               "back rests on it; the crown of her head at about 62 percent, the top of her raised "
               "knee at about 34 percent; the reaching hand and the extending heel stay fully inside "
               "the frame with air beyond them, nothing cropped.")

BUG_ID = ("EXERCISE IDENTITY: DEAD BUG — supine anti-extension core exercise: arms up, knees in "
          "tabletop, then the opposite arm and leg reach toward the floor while the spine stays "
          "glued down. It is not a sit-up, not a crunch, not a straight-leg raise and not a "
          "hollow-body hold.")

BUG_APPR = ("APPARATUS: NONE. An empty studio floor only — no mat edge, no bench, no box, no pillow "
            "under the head, no stability ball, no band, no weight, no foam roller. PROPS LOCK: "
            "exactly zero pieces of equipment in the scene; the floor is one seamless surface with a "
            "soft shadow under her body. BODY CONTACT LOCK: in both frames the back of her head, "
            "both shoulder blades, her lower back and her buttocks touch the floor — there is NO "
            "gap under the lumbar spine and her ribcage is not flared open toward the ceiling.")

# урок 21.10: в профиле модель тянет за голову ДАЛЬНЮЮ руку, а ближнюю оставляет в потолке —
# получается одноимённая пара (дальняя рука + дальняя нога) и «проблема с руками». Лечится
# отдельным блоком про назначение конечностей, а не перефразированием фазы.
BUG_ARMS = ("ARM ASSIGNMENT LOCK (this is what was wrong in the previous attempt): the arm that "
            "reaches back overhead is HER LEFT arm — the arm on the side facing the camera. Its "
            "shoulder is the NEAR shoulder, the one closest to the lens, and the arm runs from that "
            "shoulder past her LEFT ear down toward the floor beyond her head. Her RIGHT arm — the "
            "far one, drawn slightly behind her torso and partly hidden by it — stays VERTICAL, "
            "pointing straight at the ceiling, exactly where it was in the start frame; it does NOT "
            "reach back. Two arms, two hands, no third limb: each arm is one continuous limb with "
            "one clean elbow joint, a normal wrist and four fingers plus a thumb — no bulge, knot "
            "or swelling on the forearm, no extra finger, no melted hand. Keep a visible gap of "
            "background between the reaching arm and the vertical arm so they never fuse into one "
            "shape.")

# урок 21.10: общий «lower back stays pressed» не сработал — на финише под поясницей виден
# светлый зазор. Нужен блок про видимый контакт с полом и про наклон таза, который его держит.
BUG_SPINE = ("LUMBAR CONTACT LOCK (this is the second thing that was wrong in the previous attempt): "
             "seen from this side camera, the WHOLE underside of her trunk lies on the floor — "
             "shoulder blades, ribcage, the small of the back and the sacrum all press down, and "
             "there is NO daylight gap, no bright sliver of floor and no shadow cavity between her "
             "lower back and the ground anywhere along the spine. The pelvis is posteriorly tilted: "
             "the pubic bone points up toward the ceiling and the front of the hips stays flat on "
             "the floor. The lower ribs stay knit down — the torso does not dome open toward the "
             "ceiling. If you can draw a straight line under her back and see space between that "
             "line and her spine, the image is wrong.")

BUG_HIGH = ("HIGHLIGHT: a soft semi-transparent warm-red X-ray glow through the skin over the "
            "RECTUS ABDOMINIS — the flat panel on the FRONT of the trunk running from the "
            "sternum down to the pubis, which from this side view reads along the front contour of "
            "her waist and belly, with the midline seam faintly visible. The patch stays on the "
            "front abdominal wall between the ribs and the pelvis. The obliques on the side of the "
            "trunk, the hip flexors, the thighs, the arms and the shoulders stay completely unlit "
            "and dark.")

BUG_FORB = ("FORBIDDEN: a sit-up or crunch with the head or shoulder blades lifted off the floor; a "
            "hollow-body position with both arms overhead and both legs off the floor at the same "
            "time; a straight leg raise with both legs; a bicycle crunch with the elbows touching "
            "the knees; the same-side arm and leg extended together; a visible gap between the "
            "lower back and the floor; the hips rolled to one side; the held knee straightening or "
            "dropping to the floor; a daylight gap, a bright sliver of floor or a shadow cavity "
            "between her lower back and the ground; an anteriorly tilted pelvis with the front of "
            "the hips lifting off the floor; the lower ribs domed open toward the ceiling; the FAR "
            "(right) arm reaching back overhead while the near arm "
            "stays pointing at the ceiling; a third arm, a fused pair of arms, or a forearm with a "
            "bulge, knot or swelling; a hand with the wrong number of fingers; a mat, bench, ball, "
            "band or weight in the scene; clothing other "
            "than the black sports bra and shorts; a photograph; a different body type. 3:2 "
            "landscape composition.")

# id, folder, phase, one_rule, camera, orientation, framing, identity, apparatus, phase_text,
# highlight, forbidden
FRAMES = [
 dict(folder="Cable_Lateral_Raise", phase="start",
   one=CABLE_ONE, camera=CABLE_CAM, orient=CABLE_ORIENT, framing=CABLE_FRAMING, ident=CABLE_ID,
   appr=CABLE_APPR, high=CABLE_HIGH, forb=CABLE_FORB,
   phase_text=("PHASE — START of the rep: her LEFT arm hangs STRAIGHT DOWN at her side, elbow soft "
          "and barely bent, the D-handle beside her left hip, the cable running taut diagonally "
          "down-left to the low pulley at the left edge of the frame. Her RIGHT hand already rests "
          "on her right hip. Torso vertical, chest facing the camera, both feet flat on the floor "
          "shoulder-width apart and pointing at the camera, knees soft, shoulders level and "
          "relaxed DOWN away from the ears, head neutral looking straight at the camera.")),
 dict(folder="Cable_Lateral_Raise", phase="finish",
   one=CABLE_ONE, camera=CABLE_CAM, orient=CABLE_ORIENT, framing=CABLE_FRAMING, ident=CABLE_ID,
   appr=CABLE_APPR, high=CABLE_HIGH, forb=CABLE_FORB,
   phase_text=("PHASE — FINISH of the rep: her LEFT arm is swept OUT to the side and up to exactly "
          "SHOULDER HEIGHT — the arm straight out to the side of the body, tilted only about "
          "15 degrees in front of the shoulder line, neither squared in front of the chest nor "
          "swept behind the torso — the arm nearly straight with the elbow soft, the hand level "
          "with the shoulder and the palm turned down toward the floor. The cable is still one taut "
          "straight diagonal from that hand down to the low pulley at the left. The torso has NOT "
          "moved, the working shoulder is still DOWN away from the ear, the right hand is still on "
          "the right hip, both feet are still flat. Only the left arm changed position.")),
 dict(folder="Bodyweight_Sissy_Squat", phase="start",
   one=SISSY_ONE, camera=SISSY_CAM, orient=SISSY_ORIENT, framing=SISSY_FRAMING, ident=SISSY_ID,
   appr=SISSY_APPR + " " + SISSY_FEET, high=SISSY_HIGH, forb=SISSY_FORB,
   phase_text=("PHASE — START, the top position: she stands TALL, torso vertical, hips pushed "
          "slightly forward so the body is one straight column from head to foot, knees only "
          "softly bent. BOTH heels are lifted off the floor and she rests on the balls of her "
          "feet, the knees just in front of the toes. Her LEFT hand grips the rack post at chest "
          "height with a straight arm, the RIGHT arm hangs free and unloaded at her far side. The "
          "head is neutral, eyes forward, the abdominal wall braced.")),
 dict(folder="Bodyweight_Sissy_Squat", phase="finish",
   one=SISSY_ONE, camera=SISSY_CAM, orient=SISSY_ORIENT, framing=SISSY_FRAMING, ident=SISSY_ID,
   appr=SISSY_APPR + " " + SISSY_FEET, high=SISSY_HIGH, forb=SISSY_FORB,
   phase_text=("PHASE — FINISH, the bottom position: she has lowered herself by driving the KNEES "
          "FAR FORWARD past the toes — the knees are now clearly ahead of the toes, the shins "
          "strongly angled forward, and the TORSO IS LEANED BACK about 30 degrees from vertical "
          "while the HIPS STAY EXTENDED, so the thigh and the torso form ONE straight inclined "
          "line from the knee up to the shoulder. Both heels are still lifted, she is still on the "
          "balls of both feet, her LEFT hand still grips the same rack post at the same height with "
          "a straight arm, the RIGHT arm still hangs free at her far side, the knees do not touch "
          "the floor and the back is not arched separately from the thigh.")),
 dict(folder="Smith_Machine_Pullover", phase="start",
   one=PULL_ONE, camera=PULL_CAM, orient=PULL_ORIENT, framing=PULL_FRAMING, ident=PULL_ID,
   appr=PULL_APPR, high=PULL_HIGH, forb=PULL_FORB,
   phase_text=("PHASE — START of the rep: her arms are extended STRAIGHT UP over the middle of her "
          "chest, both hands gripping the shaft shoulder-width apart with an overhand grip, the "
          "bar directly above her sternum between the two columns. Her shoulder blades rest on the "
          "pad, the head lies on the bench, the lower back stays on the pad, knees bent and both "
          "feet flat on the floor at the foot end of the bench. The bar is high, the elbows are "
          "locked out, the arms and the torso make a narrow V.")),
 dict(folder="Smith_Machine_Pullover", phase="finish",
   one=PULL_ONE, camera=PULL_CAM, orient=PULL_ORIENT, framing=PULL_FRAMING, ident=PULL_ID,
   appr=PULL_APPR, high=PULL_HIGH, forb=PULL_FORB,
   phase_text=("PHASE — FINISH of the rep: the bar has travelled along the SAME straight line of "
          "the rails and along its own axis down BEHIND HER HEAD, low over the floor beyond the "
          "head end of the bench, and her arms are still EXTENDED AND STRAIGHT — the angle between "
          "her upper arm and her torso has opened, the bar is now behind the head rather than "
          "above the chest, and the elbows are only slightly bent, never folded. Shoulder blades, "
          "head, hips and both feet have NOT moved, the bench and the plates are unchanged. The "
          "ribcage stays down on the pad; only the arms and the bar moved along the arc.")),
 dict(folder="Reverse-Grip_Barbell_Lying_Triceps_Extension", phase="start",
   one=FRENCH_ONE, camera=FRENCH_CAM, orient=FRENCH_ORIENT, framing=FRENCH_FRAMING,
   ident=FRENCH_ID, appr=FRENCH_APPR, high=FRENCH_HIGH, forb=FRENCH_FORB,
   phase_text=("PHASE — START of the rep: the EZ-bar is held at full arm's length ABOVE her chest, "
          "the arms nearly straight, the UPPER ARMS VERTICAL and pointing at the ceiling, elbows "
          "tucked at shoulder width and fixed, the palms turned UP toward her face in the reverse "
          "grip. Shoulder blades and head rest on the pad, knees bent, both feet flat on the floor "
          "at the foot end of the bench.")),
 dict(folder="Reverse-Grip_Barbell_Lying_Triceps_Extension", phase="finish",
   one=FRENCH_ONE, camera=FRENCH_CAM, orient=FRENCH_ORIENT, framing=FRENCH_FRAMING,
   ident=FRENCH_ID, appr=FRENCH_APPR, high=FRENCH_HIGH, forb=FRENCH_FORB,
   phase_text=("PHASE — FINISH of the rep: the forearms have folded the bar DOWN AND BACK to just "
          "above her FOREHEAD, a hand's width clear of her face, the elbows bent to about 90 "
          "degrees. The UPPER ARMS HAVE NOT MOVED — still vertical, still pointing at the ceiling, "
          "the same distance apart as in the start frame; only the forearms and the bar changed "
          "position. Both elbows are bent to the SAME angle and sit at the same height (ELBOW "
          "SYMMETRY LOCK), the palms are still turned up toward her face. The head stays on the "
          "pad, the shoulders and hips do not rise, the feet stay flat.")),
 dict(folder="Dead_Bug", phase="start",
   one=BUG_ONE, camera=BUG_CAM, orient=BUG_ORIENT, framing=BUG_FRAMING, ident=BUG_ID,
   appr=BUG_APPR + " " + BUG_ARMS + " " + BUG_SPINE, high=BUG_HIGH, forb=BUG_FORB,
   phase_text=("PHASE — START, the set position: BOTH arms are extended straight UP at 90 degrees to "
          "the floor, palms facing each other, the biceps beside the ears, the hands at the highest "
          "point of the frame. BOTH hips and BOTH knees are bent to 90 degrees so the thighs stand "
          "vertical above the hips and the shins are parallel to the floor — the tabletop position — "
          "with the feet relaxed and the toes pointed toward the right edge of the frame. The back "
          "of her head, both shoulder blades and her whole spine, including the lower back, rest on "
          "the floor; the ribs are down and the abdominal wall is gently braced. Her expression is "
          "calm, eyes on the ceiling.")),
 dict(folder="Dead_Bug", phase="finish",
   one=BUG_ONE, camera=BUG_CAM, orient=BUG_ORIENT, framing=BUG_FRAMING, ident=BUG_ID,
   appr=BUG_APPR + " " + BUG_ARMS + " " + BUG_SPINE, high=BUG_HIGH, forb=BUG_FORB,
   phase_text=("PHASE — FINISH, the extended position: her LEFT arm (the near one, nearest the "
          "camera) has reached BACK overhead toward the floor — the arm straight, past the ear, the "
          "back of the hand within a fist's distance of the floor beyond her head, the thumb side "
          "turned up. At the same time her RIGHT leg (the far one) has extended DOWN and back "
          "toward the floor — the knee straight, the heel sliding along the floor, the foot within "
          "a fist's distance of the floor and the thigh about 20 degrees off the pad, visible below "
          "and behind the held knee. Her LEFT leg has NOT moved: the hip and knee are still bent to "
          "90 degrees in the same tabletop as in the start frame. The head, both shoulder blades "
          "and the lower back are still pressed to the floor, the hips are square and have not "
          "rolled, the ribcage is still down. Only the left arm and the right leg changed position.")),
]

os.makedirs(OUT, exist_ok=True)


def to_male(text):
    """Мужской вариант кадра: та же камера, те же локи, другой CHARACTER LOCK и местоимения.

    Правил по тексту меньше, чем кажется опасным: меняются только отдельные слова,
    «there / where / other» не задеваются из-за границ слова.
    """
    t = text.replace(CHAR_F, CHAR_M)
    # «her» в объектной позиции («never behind her», «above her.») swapping даёт «his» с обрывом
    # фразы. Признак объектной позиции — конец строки, знак препинания или следующее слово из
    # закрытого класса.
    t = re.sub(r"\bher\b(?=\s+(?:and|but|or|the|a|an|from|as|by|with)\b|[.,;:]|\Z)", "him", t)
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
        " ".join([f["camera"], f["orient"], SCALE, SCALE_PAIR, f["framing"], SINGLE]),
        f["ident"],
        f["appr"],
        f["phase_text"],
        CHAR_F,
        f["high"],
        BACKGROUND,
        f["forb"],
    ])
    for suffix, text in (("", body), ("_m", to_male(body))):
        name = "%s_%s%s.txt" % (f["folder"], f["phase"], suffix)
        open(os.path.join(OUT, name), "w", encoding="utf-8").write(text + "\n")
        written.append((name, len(text.split())))

for name, words in written:
    print("%-70s %4d words" % (name, words))
print("frames:", len(written))
