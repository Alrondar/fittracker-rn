# Skill: Engine Pure Functions

**Когда использовать:** При работе с `src/engine/` (`progression.ts`, `alternatives.ts`, `weeklySummary.ts`), создании чистой бизнес-логики без React/Supabase зависимостей.

## Контекст
Директория `src/engine/` содержит чистые функции для детерминированных тренировочных решений. Это фундамент Training Engine, работающий без AI.

## Ключевые правила
1. **Чистота**:
   - Никаких импортов React, React Query, Zustand или Supabase.
   - Функции принимают данные как аргументы и возвращают результат.
   - Легко покрываются unit-тестами (SCALE-1).
2. **Progression (`progression.ts`)**:
   - 8 правил в порядке приоритета: MAX_EFFORT, READY_TO_PROGRESS, ALL_MAX_REPS, HIGH_RPE_HOLD, CONSOLIDATE, OVERREACHED, MISSED_REPS, INCONCLUSIVE.
   - `targetSetIndex`: рекомендация для сета N строится от его собственного `previousWeight` (работает для пирамид).
   - `is_warmup` сеты исключены из оценки.
   - Усталость оценивается по завершённым рабочим сетам текущей сессии (SESSION_FATIGUE, SESSION_LIGHT_DAY).
3. **Safety Precedence (`progression.ts`)**:
   - Порядок: `injury/pain constraints` > `training constraints` > `recommendation` > `AI`.
   - `applySafetyPrecedence`: stopExercise → PAIN_STOPPED; warning.level=avoid → INJURY_AVOID; hasPain + base.increase → PAIN_RECORDED (downgrade to hold).
   - Engine **никогда** не обходит `injury_exercise_warnings` (hard constraint).
4. **Alternatives Ranking (`alternatives.ts`)**:
   - Hard exclusion: `injury_exercise_warnings` level=avoid при совпадении с активной травмой.
   - Scoring: мышцы (+2/+1), pattern (+3), оборудование (+2/−1), уровень (−3/−2), боль в группе (−3), injury medium/low (−5/−2).
   - Relation-type bonuses: regression +5 при боли/травме, progression −3 при боли.
5. **Explainability**:
   - Функции возвращают structured reason codes (machine-readable).
   - UI форматирует эти коды в human-readable «Почему?» (ENG-2).

## Source of truth
- `ROADMAP.md` §3 (Training Engine)
- `CLAUDE.md` §5 (Training model)
- `INVENTORY.md` §9 (Core types / constants / utilities), §12 (Progression rules, Safety precedence, Alternatives ranking)