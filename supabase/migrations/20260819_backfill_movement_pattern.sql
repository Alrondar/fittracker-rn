-- ENG-5 preparation: backfill exercises.movement_pattern for strength + olympic_weightlifting
-- exercises, which currently have NULL values (149 total, ~143 will be filled).
--
-- Column type: plain TEXT (no CHECK, no ENUM) — no ALTER TYPE needed.
-- Idempotent: every UPDATE guarded by WHERE movement_pattern IS NULL.
-- Category guard: only fills strength + olympic weightlifting (stretching/cardio
-- legitimately lack a movement pattern — their NULLs remain honest).
--
-- Rule order matters only if a name matches multiple patterns (priority = first match
-- wins because subsequent rules also require movement_pattern IS NULL).
-- Rules placed most-specific first (wrist before anything else, calf before
-- leg rules that mention "сгибание/разгибание").
--
-- New values added (14 total, deterministic naming aligned with existing values):
--   elbow_flexion, elbow_extension, shoulder_raise, calf_raise, wrist_forearm,
--   knee_flexion, knee_extension, hip_abduction, hip_adduction, hip_extension,
--   shrug, lateral_flexion, isometric_hold, olympic_pull
--
-- Remaining NULLs after backfill: ~6 borderline cases
-- (balance, battle ropes, around-the-world, front press, etc.) — honest gaps.

-- 1. Wrists / forearms (сгибание/разгибание запястий, сгибатели/разгибатели предплечья)
UPDATE exercises SET movement_pattern = 'wrist_forearm'
WHERE movement_pattern IS NULL
  AND category IN ('strength', 'olympic weightlifting')
  AND (name ILIKE '%запяст%' OR name ILIKE '%предплечья%');

-- 2. Calves (подъёмы на носки, жимы носками)
UPDATE exercises SET movement_pattern = 'calf_raise'
WHERE movement_pattern IS NULL
  AND category IN ('strength', 'olympic weightlifting')
  AND (name ILIKE '%на носки%' OR name ILIKE 'жим носками%');

-- 3. Biceps curls (elbow flexion) — excluding hamstring ("бицепс бедра")
UPDATE exercises SET movement_pattern = 'elbow_flexion'
WHERE movement_pattern IS NULL
  AND category IN ('strength', 'olympic weightlifting')
  AND (
    (name ILIKE '%бицепс%' AND name NOT ILIKE '%бицепс бедра%')
    OR name ILIKE 'сгибание рук%'
    OR name ILIKE '%молот%'
    OR name ILIKE 'сгибания зоттмана%'
    OR name ILIKE 'паучьи сгибания%'
    OR name ILIKE '%скотта%'
  );

-- 4. Triceps extensions (elbow extension) — wrist rule 1 already excluded "разгибание запястий"
UPDATE exercises SET movement_pattern = 'elbow_extension'
WHERE movement_pattern IS NULL
  AND category IN ('strength', 'olympic weightlifting')
  AND (
    name ILIKE '%трицепс%'
    OR name ILIKE 'разгибание рук%'
    OR name ILIKE 'разгибание обеих рук%'
    OR name ILIKE '%body-up%'
  );

-- 5. Leg curls (knee flexion)
UPDATE exercises SET movement_pattern = 'knee_flexion'
WHERE movement_pattern IS NULL
  AND category IN ('strength', 'olympic weightlifting')
  AND (
    name ILIKE 'сгибание ног%'
    OR name ILIKE 'сгибания ног%'
    OR name ILIKE 'скандинавские сгибания%'
    OR name ILIKE 'скольжение пятками%'
  );

-- 6. Leg extensions (knee extension)
UPDATE exercises SET movement_pattern = 'knee_extension'
WHERE movement_pattern IS NULL
  AND category IN ('strength', 'olympic weightlifting')
  AND name ILIKE 'разгибание ноги в тренажере%';

-- 7. Leg abduction (hip_abduction)
UPDATE exercises SET movement_pattern = 'hip_abduction'
WHERE movement_pattern IS NULL
  AND category IN ('strength', 'olympic weightlifting')
  AND name ILIKE 'отведение ноги в сторону%';

-- 8. Leg adduction (hip_adduction)
UPDATE exercises SET movement_pattern = 'hip_adduction'
WHERE movement_pattern IS NULL
  AND category IN ('strength', 'olympic weightlifting')
  AND (name ILIKE 'приведение ноги%' OR name ILIKE 'сведение ног%');

-- 9. Leg kickbacks (hip_extension)
UPDATE exercises SET movement_pattern = 'hip_extension'
WHERE movement_pattern IS NULL
  AND category IN ('strength', 'olympic weightlifting')
  AND name ILIKE 'отведение ноги назад%';

-- 10. Deltoid raises — lateral / front / rear (all "махи" + front raise + YTWL)
--     Excludes compound pullover ("подъём ... пуловер"), which is a hybrid chest/back movement.
UPDATE exercises SET movement_pattern = 'shoulder_raise'
WHERE movement_pattern IS NULL
  AND category IN ('strength', 'olympic weightlifting')
  AND (
    name ILIKE 'махи%'
    OR (name ILIKE '%подъем%перед собой%' AND name NOT ILIKE '%пуловер%')
    OR name ILIKE 'подъёмы y-t-w-l%'
    OR name ILIKE 'подъемы y-t-w-l%'
  );

-- 11. Shrugs
UPDATE exercises SET movement_pattern = 'shrug'
WHERE movement_pattern IS NULL
  AND category IN ('strength', 'olympic weightlifting')
  AND name ILIKE 'шраги%';

-- 12. Olympic pulls — snatch + clean-pull family (kettlebell included)
UPDATE exercises SET movement_pattern = 'olympic_pull'
WHERE movement_pattern IS NULL
  AND category IN ('strength', 'olympic weightlifting')
  AND (name ILIKE 'рывок%' OR name ILIKE '%прием штанги%' OR name ILIKE '%приём штанги%');

-- 13. Lateral trunk flexion / oblique crunches (side bends, side crunches, windmill)
UPDATE exercises SET movement_pattern = 'lateral_flexion'
WHERE movement_pattern IS NULL
  AND category IN ('strength', 'olympic weightlifting')
  AND (
    name ILIKE 'боковые наклоны%'
    OR name ILIKE 'наклоны в сторону%'
    OR name ILIKE 'боковые складки%'
    OR name ILIKE 'боковые скручивания%'
    OR name ILIKE '%мельница%'
  );

-- 14. Isometric holds — pinches, neck resistance, iron cross, chest squeeze
UPDATE exercises SET movement_pattern = 'isometric_hold'
WHERE movement_pattern IS NULL
  AND category IN ('strength', 'olympic weightlifting')
  AND (
    name ILIKE 'удержание%'
    OR name ILIKE 'сопротивление шеи%'
    OR name ILIKE 'изометрическое%'
    OR name ILIKE 'железный крест%'
  );

-- 15. Upright row → reuses existing 'pull_vertical' value (not a new value)
UPDATE exercises SET movement_pattern = 'pull_vertical'
WHERE movement_pattern IS NULL
  AND category IN ('strength', 'olympic weightlifting')
  AND name ILIKE '%к подбородку%';

-- Document the expanded value set
COMMENT ON COLUMN exercises.movement_pattern IS
  'Movement pattern for exercise ranking (ENG-5). Existing: '
  'push_horizontal, push_vertical, hinge, squat, rotation, pull_horizontal, '
  'core_flexion, pull_vertical, jump, lunge, gait, throw, anti_extension, '
  'step_up, anti_rotation, carry, isometric. '
  'Added 2026-08-19: elbow_flexion, elbow_extension, shoulder_raise, calf_raise, '
  'wrist_forearm, knee_flexion, knee_extension, hip_abduction, hip_adduction, '
  'hip_extension, shrug, lateral_flexion, isometric_hold, olympic_pull. '
  'NULL is valid for stretching/cardio/balance/conditioning where pattern does not apply.';
