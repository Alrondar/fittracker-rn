# Аудит качества кода FitTracker RN — 2026-10-06

Метод: `code-quality-analyzer` (read-only). Вне scope повторного репорта: ESLint-базлайн (LINT-1), закрытые ID FZ-1..11, BUG-1..12, CTR-1..7, PERF-8/9/10/11, SEC-11..19 (STATUS.md §13/§15). Все находки ниже — новые, с file:line.

## 1. Итоговый вердикт

Проект в хорошем системном состоянии: обязательные гейты проходят, архитектурные инварианты (сервисы только в `src/services`, чистый движок без I/O, feedback-канон, queryPolicy-тики) фактически держатся в коде. Главный residual-долг — не «места», а **невнедрённые собственные каноны**: сгенерированные Supabase-типы (1427 строк) не подключены к клиенту и весь слой сервисов живёт на рукописных `*Row` + `as unknown as`; `mapError` существует, но ~17 мест всё ещё показывают сырой `error.message`; константа `KG_TO_LB` объявлена и не используется нигде, пока литерал `2.20462` переписан в движке. Второй кластер — один monolithic-hook (946 строк) и два движковых функции-гиганта (328/375 строк, cc>50) как точки будущей регрессии. Третий — мёртвый код: 6 осиротевших файлов компонентов (включая файл, где «исправленный» BUG-11 до сих пор стоит в мёртвом коде) и ~40 неиспользуемых экспортов.

Гейты (фактический прогон 06.10.2026, не по документу):

| Гейт | Команда | Exit code |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | **0** |
| ESLint | `npx eslint . --max-warnings 0` | **0** |

Всего TS/TSX в src+app: ~59 740 строк (без node_modules; из них 3 777 — `database.types.ts` + `muscleSvgPaths.ts`, генерированные/данные).

## 2. Находки

Приоритет: 🔴高 / 🟠мед-выс / 🟡мед / 🟢низк. Стоимость S/M/L — оценка объёма исправления.

### QA-1 | 🔴 | src/lib/supabase.ts:10 · src/types/database.types.ts (весь файл) | Сгенерированные типы Supabase не подключены ни к чему

**Доказательство**: `createClient(supabaseUrl, supabaseAnonKey, {...})` — без дженерика `Database` (lib/supabase.ts:10). Гrep `database.types` по src+app: **ноль импортов** (единственное упоминание — комментарий внутри самого файла:11). Вместо типизации: **30+ рукописных `interface *Row`** в сервисах (programsService.ts:115-160 четыре ряда, historyService.ts:48-61,223-249, forecastService.ts:37-59, muscleStatsService.ts:35-53, exercisesServiceNormalized.ts:24,149-160, exerciseReferenceService.ts:9-21, warmupService.ts:436, weeklySummaryService.ts:56,95-100…) и **9+ `as unknown as`** кастов на границе данных (exerciseReferenceService.ts:70,77,86; exercisesServiceNormalized.ts:51,192,193; historyService.ts:329; programsService.ts:361,564; weeklySummaryService.ts:167).
**Почему риск**: ровно этот класс расхождения схемы и ожиданий уже давал прод-дефект PRG-400 (embed без FK → 400). `tsc` не поймает ни переименование колонки, ни смену nullability в БД — приватные Row-типы молча соврут; регенерация `database.types.ts` поддерживает только иллюзию контроля.
**Исправление**: `createClient<Database>(...)` в lib/supabase.ts; наTransition — заменять `*Row` на `Database['public']['Tables']['x']['Row']` по мере касания сервисов; включить генерацию в CI-чек.
**Стоимость**: M (подключение) + S на файл при касании.

### QA-2 | 🔴 | 17 мест (см. список) | Сырой `error.message` в UI пережил CTR-2

**Доказательство**: канон `mapError` (utils/errorMapper.ts:28) подключён в 22 местах, но остаются показать пользователю сырьё: NutritionAddModal.tsx:114, settings/ProfileSection.tsx:54,72, workout/PainSheet.tsx:196,227, hooks/useBodyMetrics.ts:60,71, hooks/useProfile.ts:101-102 (`catch (e: any)` + `e.message`), hooks/usePrograms.ts:153,170,310, app/(tabs)/programs.tsx:150,171, app/workout/create.tsx:64; плюс `throw new Error(error.message)` без маппинга в programSharingService.ts:16,35 и `error.message` в historyService.ts:322.
**Почему риск**: CTR-2 закрывал только 6 конкретных мест; паттерн порождает новые при каждой мутации. Postgres/RLS-текст в Toast — утечка внутренней схемы + нечитаемый UX; `e: any` обходит строгость.
**Исправление**: кодомод `feedback.alert('Ошибка', e.message ...)` → `mapError(e)`; в CLAUDE.md §2 добавить grep-чек `error.message` вне errorMapper в review-чеклист.
**Стоимость**: S.

### QA-3 | 🟠 | src/hooks/useWorkoutSession.ts:32-977 | Один hook = 946 строк, cc≈150, вложенность 10, внутреннее дублирование

**Доказательство** (метрики, скрипт по брас-подсчёту): тело `useWorkoutSession` — одна функция 32→977, ~35 `useCallback` внутри; **14 копий** блока `setExercises((prev)=>{const updated=[...prev]; updated[i]={...}; return updated;})` (:246,364,381,414,444,483,528,567,695,791,815,835,853,864); список из ~12 полей карточки (id, name, primary_muscles, …, media_url, personalBest) переписан дважды почти идентично — `swapCardFields` :533-545 и `resetToOriginal` :700-714; оптимистичный паттерн «snapshot → splice → await → rollback-splice → mapError» скопирован в `savePainState`/`clearPainState` :808-873; контекст-объект `loadAlternatives(exercise.id, {primaryMuscles…hasPain})` продублирован :602-607 и :755-760.
**Почему риск**: любой баг-фикс сессии (уже 7 из 12 BUG-ID живут здесь) правит один из N拷贝; deps-массивы и ref-зеркала (`exercisesRef`) — первый кандидат на race.
**Исправление**: helper `patchExercise(index, patch)`; единый `cardFieldSwap(from, to)`; вынести sub-хуки useReplacements / usePainState / useSessionFinish (это же закроет отложенный CTR-3 для файла).
**Стоимость**: M-L.

### QA-4 | 🟠 | src/engine/progression.ts:360-687, 721-1095 | Две суперфункции + knowledge-дублирование decide↔explain

**Доказательство**: `decideProgression` (старт :360, ~328 строк, оценка cc≈80, вложенность до 5) и `explainProgression` (старт :721, ~375 строк, внутри `switch` из 30 `case` по `reason.code`, строки ~750-990). Каждый reason-code существует **в двух несвязанных местах**: текст строится инлайн в decide (`'Высокий RPE — закрепляем вес'` :636, `'Не в диапазоне — снижаем вес'` :671) и заново разворачивается в explain-свитче (`AUTO_DELOAD_SUGGESTION`-текст «6+ недель…» есть и в :340ish decide-ветках, и в switch :885-890). Switch **без exhaustiveness-check** — новый code молча получит пустое объяснение; TS не предупредит.
**Почему риск**: движок рекомендаций — продуктовое ядро (§5 STATUS); рассинхрон code↔объяснение = «почему рекомендуй» врёт пользователю.
**Исправление**: единый реестр `REASON_REGISTRY: Record<ReasonCode, {ruText, signal(label,value,emphasis)}>` — decide ссылается на текст, explain на сигнал; `ReasonCode` union вместо `string` (`reason: { code: string …}` сейчас — progression.ts:336 окр.).
**Стоимость**: M.

### QA-5 | 🟠 | services/programsService.ts:753-864, engine/weeklySummary.ts:516-628 | Функции-рекордсмены вне двух главных файлов

**Доказательство**: `replaceExerciseInProgram` — 112 строк, cc≈33, вложенность 4 (программная замена + sync будущих тренировок + несколько error-веток в одном теле); `calculateDeloadContext` — 113 строк, cc≈34; `activateProgram` :604-650 (47 строк, cc≈11). Для сравнения: `mapExercise/mapPhase/mapDay` в том же файле по 11-20 строк — дисциплина есть, но три функции-выброса ломают её.
**Почему риск**: activate/replace — сценарии с транзакционным semantics (несколько await-шагов); ветвление >30 в одном теле = непроверяемые комбинаций откатов.
**Исправление**: декомпозиция replaceExerciseInProgram на resolve-context / mutate-program / sync-future с явными error-границами; calculateDeloadContext — таблица правил.
**Стоимость**: M.

### QA-6 | 🟠 | src/hooks/useProfile.ts:18-39 + useDailyNutrition.ts:14 | Двойной источник состояния профиля/питания (useState-зеркало против React Query)

**Доказательство**: `useProfile` вручную держит 6 useState-срезов (userData/stats/targets/todayNutrition/personalRecords/loading, :18-39), грузит их `Promise.all` по 5 сервисам (:51-57); **те же серверные факты** уже живут в RQ-кэшах: `useDailyNutrition.ts:14` (`dailyNutrition`/targets), и сам useProfile при записи вынужден вручную синхронизировать два мира — refetch + `setTodayNutrition` (:96-97) **плюс** `invalidateNutritionCaches` (:100, баг-фикс BUG-10). Инвалидация `['profile', userId]` встречается 10 раз разными литералами.
**Почему риск**: класс-первоисточник BUG-9/10: stale copy между useState и RQ; каждая новая мутация должна помнить обновить оба.
**Исправление**: перевести профиль-домен на `useQuery` (queryKey-фабрика, см. QA-9), useState оставить только для UI.
**Стоимость**: M.

### QA-7 | 🟠 | 8+ мест unit-магистраль vs канон KG_TO_LB | Форматирование единиц: константа есть — потребителя нет

**Доказательство**: канон `KG_TO_LB = 2.20462` (useUnitPreferences.ts:8) — **ноль импортов** вне файла; литерал переписан в движке: progression.ts:731, weeklySummary.ts:173. `unitLabel`-тернар `unit === 'kg' ? 'кг' : 'lb'` (и инвертированный `'lb' ? 'lb' : 'кг'`) — ExerciseProgressCard.tsx:74, WeightTrendChart.tsx:30, WeightTrendRow.tsx:22, RpeEditor.tsx:83, SetsGrid.tsx:1257, muscleLoad.ts:153, progression.ts:732, weeklySummary.ts:171, хотя хук `useWeightDisplay().unitLabel` (:86) уже канон. **5 копий `formatVolume`** с расходящейся логикой (порог «тонн» есть в RecordsCard.tsx:39-41, нет в WorkoutForecastSheet.tsx:65, ProgressStats.tsx:18, RecentWorkouts.tsx:39, VolumeTrendChart.tsx:27).
**Почему риск**: расхождение округления кг↔lb между движком и UI (движок округляет сам, минуя канон); «объём» в одном экране показывает `12.4 т`, в другом `12400 кг`.
**Исправление**: вынести KG_TO_LB/formatWeight/formatVolume в `src/utils/units.ts` (чистый, доступен движку без хука); кодомод тернаров → хук/утилиту.
**Стоимость**: S-M.

### QA-8 | 🟡 | 5 файлов, даты | Дублирование календарной логики вокруг dateKey-канона

**Доказательство**: канон ключей дат `utils/dateKey.ts` есть (CYC-3), но: **5 независимых массивов дней недели** — CycleCalendar.tsx:121 (инлайн `['Пн'…'Вс']`), TrainingCalendarCard.tsx:14 (Пн-первый), WeeklyBalanceChip.tsx:24, NutritionWeekTable.tsx:12, NutritionWeekCard.tsx:15 (Вс-первый) — плюс ActivityCalendar.tsx:36 выводит названия через `toLocaleDateString`. **3 идентичных локальных formatDate** (`day:'numeric', month:'short'`) — RecordsCard.tsx:36, RecentWorkouts.tsx:27, VolumeTrendChart.tsx:23 (+4-й вариант painTrend.ts:64), + 15 инлайн-литералов локали `'ru-RU'`. Один `toISOString().split('T')[0]` вне канона остался в usePainTrend.ts:21-22 (как queryKey from/to — UTC-границы диапазона; если пользователь UTC+, ключ расходится с локальными key дня).
**Почему риск**: смена начала недели/локали = 5+ правок; usePainTrend-ключ может разминуться с `todayKey()`-потребителями.
**Исправление**: `src/utils/dateFormat.ts` — WEEKDAYS_MON/SUN, formatDateShort; usePainTrend перевести на `toDateKeyFromIso`.
**Стоимость**: S.

### QA-9 | 🟡 | 7 файлов + ~40 экспортов | Осиротевшие компоненты и неиспользуемые экспорты

**Доказательство** (grep по всему дереву main, перепроверено в web-port — тоже ноль ссылок): **6 полностью мёртвых файлов компонентов**: `src/components/ActivityCalendar.tsx`, `ExerciseProgressCard.tsx`, `LastWorkoutCard.tsx`, `PersonalRecordsCard.tsx`, `profile/MacroPieChart.tsx`, `WeeklyStatsCard.tsx` (заменены `exercises/RecordsCard.tsx` и секциями progress). **Неиспользуемые экспорты** (0 ссылок вне определяющего файла): services — `getProgramWithPhases`, `updateProgramProgress`, `completeProgram`, `deactivateAllPrograms`, `getActiveProgramId`, `getActiveUserProgram` (programsService.ts:334,451?,395…), `createPhase`/`deletePhase`/`reorderPhases` (programPhasesService.ts), `normalizeShareCode`, `parseWarmupDuration`; components — `MiniRing` (RestTimerContext.tsx:222), `ExerciseCardKnowledge`, `ProgramCardSkeleton` (ui/skeletons.tsx), `CheckMark`; lib/utils — `getList` (supabase.ts:20, к тому же `data: any`), `lightTheme`/`darkTheme` (theme.ts:504-505, алиасы «для обратной совместимости» без потребителей), `mixHex`/`buildIntensityScale` (colorScale.ts), `weightForTarget1RM` (e1rm.ts), `sortPoints`/`movingAverage`/`linearSlopePerWeek` (trend.ts), `deviationLabel`, `calculateAge`, `extractMessage` (экспортирован, но за пределами файла не вызывается — только mapError внутри), `getCategoryLabel`, `getPhaseLabel`/`getPhaseIcon`, `ALL_MUSCLES`, `SLUG_TO_MUSCLE_NAMES`/`collectAllSlugs`, `BODY_PART_RU`/`INJURY_TYPE_RU` (частично — используются в самом injuries.ts), `EXERCISE_NAME_TO_STANDARD_KEY`, `RPE_PROMPT_LABELS`, `createWorkoutStyles`/`createEquipmentBadgeStyles`/`createMuscleBadgeStyles`.
**Почему риск**: мёртвый код врёт аудиторам — BUG-11 «починил» key={index} в PersonalRecordsCard/ExerciseProgressCard, которые после рефакторинга никто не рендерит (QA-12); двойная поддержка неживых стили-фабрик и сервисных API раздувает blast-radius при рефакторинге.
**Исправление**: удалить 6 файлов + мёртвые экспорты (оставив внутри-файловые); при сомнениях — `git rm` после grep-раунда на обеих ветках. `generateWarmupSets` проверена: 0 упоминаний — уже чисто.
**Стоимость**: S (решимая), M если чистить index-реэкспорты.

### QA-10 | 🟡 | 79 мест + WeeklyReviewSection | `colors: any` — ThemeColors канон обходится проп-дрелингом

**Доказательство**: канон `interface ThemeColors` (theme.ts:13) + `useTheme()` реально используется в **91** файле компонентов; но **79 props объявлены `colors: any`** (47 файлов, в т.ч. ui-обвязка PhaseCard.tsx:30-32 `colors/cardStyles/badgeStyles: any`, ExercisePickerSheet.tsx:33,37,44, DayCard.tsx:26,91…). Худший случай — WeeklyReviewSection.tsx:165,285,288,630: `(colors as any).warningLight / [colorMap.bg]` — ключи вне ThemeColors достаются через any, переименование токена не увидит ни tsc, ни eslint. Цепочка дрелинга: app/program/[id]/index.tsx → `<PhaseCard colors>` (:104) → `DayCard colors` (:165) → `ExerciseMuscles colors` — 4 уровня, всё `any`.
**Почему риск**: 191 `any`-место всего (с `as any`, `<any>`) — главный объём «тихо гниющего» кода; rename токена темы или props = runtime-краш класса CRASH 28.09 (`rgba(NaN)` fatal).
**Исправление**: типизировать props `colors: ThemeColors`; недостающие семантик-ключи — в ThemeColors/semanticColors; новые компоненты — только `useTheme()`, props-`colors` вымаривать по касанию.
**Стоимость**: M (кодомод + доопределение типа).

### QA-11 | 🟡 | STATUS §15 BUG-11 vs код | Закрытый ID не соответствует коду (drift «документ vs код»)

**Доказательство**: BUG-11 (✅) перечисляет 4 места `key={index}`; в коде остались **WorkoutInjuryBanner.tsx:134** (живой компонент, список травм) и ExerciseProgressCard.tsx:126 (мёртвый файл — см. QA-9); PersonalRecordsCard.tsx:54 и profile.tsx:318 действительно переведены на составные ключи. По AGENTS.md «побеждает код» — документ врёт о полноте починки.
**Почему риск**: доверие к §15 как к канону закрытых находок; живой кейс: добавление/удаление травмы из middle списка → remount соседних Text со стилями.
**Исправление**: key по `injury.id ?? text`; в §15 пометить BUG-11 как «частично».
**Стоимость**: S.

### QA-12 | 🟡 | 3 места | `.then().finally()` без `.catch` — разбросанная политика необработанных rejection

**Доказательство**: MetricChartsSection.tsx:32-44 (`AsyncStorage.getItem… .finally(setChartsReady)`), ExerciseSlider.tsx:152-162 и WarmupExerciseSheet.tsx:194-199 (`loadAlternatives(...).then(...).finally(...)`). Последние две сейчас safety только потому, что hook-обёртка `loadAlternatives` глотает ошибки внутри (useWorkoutSession.ts:337-339) — **неявный контракт**: прямой вызов сервисного `fetchAlternatives` дал бы unhandled rejection. Остальные settings-хуки (useTimerSettings/useRpeSettings/useUnitPreferences/useWorkoutDisplayMode) аналогичные цепочки закрывают `.catch` — паттерн непоследователен.
**Почему риск**: «Possible Unhandled Promise Rejection» + тихая потеря ошибок; при рефакторинге loadAlternatives контракт порвётся незаметно.
**Исправление**: `.catch` с `console.warn` во всех трёх; либо единый helper `fireAndForget(promise, label)`.
**Стоимость**: S.

### QA-13 | 🟢 | src/engine + workout timers | Пороги и тайминги без имённых констант (частично)

**Доказательство**: `DEFAULT_STEP_KG = 2.5` именована (progression.ts:312) — но: deload-коэффициент `* 0.9` инлайн дважды (:526, :646), RPE-пороги `>= 9` (:635) и `<= 8` (:662), `consecutiveHolds >= 3` (:645), `sleepHours < 6` (:343). В таймерах: тик 250 мс (RestTimerContext.tsx:128), debounce логов 500 мс (useWorkoutSession.ts:352-354), интервал 1000 мс (WorkoutTimer.tsx:143). Тики React Query при этом чисто сконсолидированы в `Q`-тиры (проверено: литералов staleTime вне queryPolicy.ts не осталось, единственный явный gcTime — forecast 30 мин, задокументирован в PERF-10) — то есть **шаблон канона в проекте уже есть и применим сюда**.
**Почему риск**: tuning-правка (например «deload −12%») требует поиска по файлам; «один факт — один владелец» нарушено в домене движка.
**Исправление**: блок `const RULES = { DELOAD_FACTOR: 0.9, RPE_HARD_HOLD: 9, … }` в progression.ts; `REST_TICK_MS`/`LOG_DEBOUNCE_MS` туда же, где живут таймеры.
**Стоимость**: S.

### QA-14 | 🟢 | структура | Двойняшки `workoutService`/`workoutsService` и shim `exercisesService`

**Доказательство**: `src/services/workoutService.ts` (616 строк, сессия/лог/замена) и `src/services/workoutsService.ts` (372 строки, данные таба «Тренировки») — разные экспорты, но имена различаются одной буквой `s`; `exercisesService.ts` — чистый ре-экспорт `exercisesServiceNormalized.ts`. Правила «сервисы только в src/services» и «движок без I/O» соблюдены (engine импортирует только `../types/workout` и `../constants/injuries`; grep `.from(`/`.rpc(` вне services — ноль). `src/lib/supabase.ts:20-28,59-62` — приютил generic-хелперы `getList/getString` с `data: any` (getList мёртв).
**Почему риск**: навигационная ловушка (легко править не тот файл — уже было: PERF-10 проверял «N+1» именно из-за путаницы имён).
**Исправление**: переименовать workoutsService→workoutsTabService (или слить с prefix-соглашением), удалить shim; getList/getString вычистить.
**Стоимость**: S.

## 3. Метрики рекордсменов (скрипт: strip-strings + brace-count; cc — оценка по числу ветвлений)

| Файл | LOC | Функция | Строка | Длина | cc≈ | Вложенность |
|---|---|---|---|---|---|---|
| useWorkoutSession.ts | 1061 | useWorkoutSession (одна!) | 32-977 | 946 | ~152 | 10 |
| progression.ts | 1226 | decideProgression | 360-687 | ~328 | 80+ | 5 |
| progression.ts | | explainProgression | 721-1095 | ~375 | ~57 (+switch 30 case) | 4 |
| programsService.ts | 1000 | replaceExerciseInProgram | 753-864 | 112 | 33 | 4 |
| weeklySummary.ts | 743 | calculateDeloadContext | 516-628 | 113 | 34 | 4 |
| weeklySummary.ts | | adaptInsightText / applyGoalContext | 389-419 / 330-383 | 31/54 | 32/32 | 2/4 |
| SetsGrid.tsx | 1548 | max fn: setRowPropsEqual | 374-398 | 25 | 16 | 3 |
| MuscleStatsSection.tsx | 791 | (локальные ≤~60) | — | — | — | — |

Копипаст-конвейер: `setExercises`-сплайс ×14 (useWorkoutSession), field-list карточки ×2, optimistic+rollback ×2, loadAlternatives-context ×2, weekday-массивы ×5, formatVolume ×5, unitLabel-тернар ×8, локальный short-date-format ×4, `as unknown as` ×9+, `colors: any` ×79, `queryKey`-литералы ×41 (без фабрики ключей; ['profile', userId] ×10).
Мелкие functions-метрики SetsGrid/MuscleStatsSection показывают: проблема >500-строчников — **размер файлов, а не сложность функций** (это уже учтено отложенным CTR-3, не дублирую).

## 4. Чисто / не трогать (специально проверено)

- **Гейты**: tsc=0, eslint=0 — подтверждено прогоном.
- **Архитектурные инварианты**: supabase-вызовы только в services (grep `.from(` в hooks/components/app — 0, CTR-1 держится); engine без I/O (импорты — только типы/константы); `Alert.alert` только через feedback.ts; `LayoutAnimation` нет; `Math.random` в keyExtractor нет; SheetShell/feedback-каноны живы.
- **queryPolicy (PERF-10)**: ни одного stray-литерала staleTime вне `Q`-тиров; gcTime forecast — осознанный исключение с комментарием. Хороший образец для QA-13.
- **queryInvalidation.ts**: списки кэшей финиша/питания действительно в одном владельце; инлайн-инвалидации вне него — только по ключам своих доменов (useBodyMetrics, useInjuries, cycle) — приемлемо.
- **FZ-1-рефакторинг RestTimerContext**: tick через `createTickStore` + `useSyncExternalStore`, статика через мемоизированный контекст — реализовано по документу (кроме мёртвого `MiniRing`-экспорта, QA-9).
- **errorMapper.mapError** как паттерн — корректен, покрыт сетью/RLS/PGRST-кодами; не хватает не логики, а внедрения (QA-2).
- **effective-date, UTC-ключи дат**: `toISOString()` в 44 местах — почти все timestamp-в-БД (легитимно); единственная оставшаяся date-key-ветка — usePainTrend.ts:21-22 (QA-8).
- **useProgramEditor, saveWorkout**: прямых `.rpc` нет, re-entry guard и flush-join на месте (проверено бегло — закрытые CTR-1/BUG-6 не регрессировали).

## 5. Что осталось непроверенным

- **app/ экраны на cc-метриках** — скрипт запускался для 5 файлов-хотспотов; `app/(tabs)/progress.tsx` (659), `profile.tsx` (653), `ExercisePickerSheet` (667) не измерялись функциально.
- **Runtime-поведение**: ничего не исполнялось (expo/тесты не запускались по условию задачи); найденные «unhandled rejection» — статические.
- **Соответствие RPC-сигнатур и `supabase/migrations/`** — не сверялось (кроме факта неиспользования database.types); тест на актуальность сгенерированных типов относительно прод-схемы — отдельно.
- **Web-port worktree**: проверка осиротевших компонентов grep'ом сделана, полный аудит порта — нет.
- **Глубина memo-эффективности** (кроме закрытых FZ-конкретик) и перерендер-профилирование — не делалось (нужен device/profiler).
- **`patches/`, `data/`, `design/`, `web-deploy/`** вне audit-scope.
- **Реальные прод-данные** на предмет date-ключей (как в 28.09 UTC-диагностике) — не перепроверялось.
