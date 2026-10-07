# Анализ зависимостей и blast-radius носителей >500 строк (CTR-3)

Дата: 06.10.2026. Режим: только чтение (grep/wc/sed), без сборки и правок кода.
Зерно анализа: файл. Границы: реальные `import`-строки (упоминания в комментариях не считались потребителями).
Артефакт-граф: `spark-output/arch/dependency-map-2026-10-06.dot` (узлы = носители, цвет ≈ риск; пунктир = скрытые связи).

## 1. Реальные размеры vs STATUS.md §15 (дрейф)

`wc -l` по `app/` + `src/`, срез 06.10.2026. Числа CTR-3 (аудит 28.09) устарели:

| Файл | Факт | STATUS §15 | Дрейф |
|---|---:|---:|---|
| src/components/workout/SetsGrid.tsx | **1548** | 1483 | +65, largest |
| src/hooks/useWorkoutSession.ts | **1061** | 963 | +98 |
| src/services/programsService.ts | **1000** | 925 | +75 |
| src/engine/progression.ts | 1226 | 1224 | ±0 |
| src/components/progress/WeeklyReviewSection.tsx | 1052 | 1052 | ±0 |
| src/components/progress/MuscleStatsSection.tsx | 791 | 789 | ±0 |
| src/components/program/sheets/ExercisePickerSheet.tsx | 667 | 660 | ±7 |
| app/(tabs)/progress.tsx | 659 | 649 | +10 |
| app/(tabs)/profile.tsx | 653 | 643 | +10 |
| src/components/dashboard/StatusCard.tsx | 611 | 602 | +9 |
| app/workout/[id].tsx | 603 | 609 | −6 |
| src/components/workout/WorkoutTimer.tsx | 545 | 536 | +9 |

**Носители >500, отсутствовавшие в списке CTR-3** (добавлены в анализ):
`src/types/database.types.ts` 1427 (generated — исключение), `src/constants/muscleSvgPaths.ts` 1080 (данные), `src/engine/weeklySummary.ts` 743, `src/services/workoutService.ts` 616, `src/constants/theme.ts` 613 (конфиг-токены), `src/services/warmupService.ts` 587, `app/(tabs)/programs.tsx` 572, `src/services/weeklySummaryService.ts` 567, `app/exercise/[id].tsx` 561, `src/services/profileService.ts` 537, `src/services/dashboardService.ts` 514.
Ниже порога, но рядом: `app/program/[id]/edit.tsx` 380 (носитель FZ-5 — сам не пилится, см. §5), `useProgramEditor.ts` 418.

## 2. Сводная таблица: файл → потребителей → связи → seams → риск → вердикт

Риск: 🔴 высокий (regression на core flow / был прецедент), 🟠 средний, 🟡 низкий.

| Файл (строк) | Реальные import'ёры | Внешние связи (RPC/контекст/QueryKey) | Seam-кандидаты | Риск | Вердикт |
|---|---|---|---|---|---|
| **progression.ts** (1226) | 6: SetsGrid:67, ExerciseCard:30, ExerciseSlider:21, RecommendationCard:24, workout/[id]:50, utils/reps | Чистый движок: 0 supabase, 0 контекст, 0 QueryKey. Экспорты группами: parseRepsRange+calculateProgression (114–702), explainProgression (721–1069), applySafetyPrecedence/applyReadinessContext (1097–1226) | 3 файла по экспорт-группам + barrel `engine/progression/index.ts` (пути импорта не меняются) | 🟡 | **Пилить, волна 1** |
| **weeklySummary.ts** (743, новый) | WeeklyReviewSection:27 (типы), weeklySummaryService:16, useWeeklySummary:7, WeeklyInsightsSection:11, ContextInsightCard:13 | Чистый движок, supabase только в weeklySummaryService. Экспорты: buildWeeklyInsights(164), calculateTrainingLoadContext(520), calculateDeloadContext(628) + типы (10–163) | insights / trainingLoad / deload + types, barrel | 🟡 | **Пилить, волна 1** |
| **MuscleStatsSection.tsx** (791) | 1: app/(tabs)/progress.tsx:42 | Данные через useMuscleStats → QueryKey `['muscleStats', userId]`; сам — 0 RPC. Компонент с 299; чистые функции 89–293 (filterRowsByPeriod, rowsToMuscleLoad, computeFatigue, computeStrength, topExercisesInPeriod) | Вынести чистые compute-функции в `utils/muscleStatsCompute.ts` (или `engine/`); компонент 299–791 оставить/разбить по таб-блокам | 🟡 | **Пилить, волна 1** |
| **WorkoutTimer.tsx** (545) | 2: workout/[id]:27, WorkoutScreenHeader:19 | Провайдер+Pill+Panel+PulseDot уже разделены export'ами (76/284/399/227); timer-колбэки в useWorkoutSession:290–314 | Разложить 1-в-4 по существующим экспортам; контекст-тип утекает в hook-файл | 🟡 | **Пилить, волна 1 (косметика)** |
| **WeeklyReviewSection.tsx** (1052) | 1: progress.tsx:32 | useWeeklySummary (`['weeklySummary', userId, weekOffset, unit]`), типы движка; 0 прямых RPC. Внутри — одна функция 47–1015 + DetailBlock:1016; JSX-блоки L2: Consistency(398), Performance(414), TrainingLoad(441/549/642), MuscleMap(723), Plateau(908), Recovery(949) | Поблоковый вынос L2-аккордеона + DetailBlock → `progress/weekly/`; граница = `{data, colors}` пропсы | 🟡→🟠 (объём JSX, но 1 потребитель) | **Пилить, волна 2** |
| **programsService.ts** (1000) | ~12 файлов: usePrograms, useProgramEditor, useProgramPhases, programPhasesService, PhaseCard:18, DayCard:14, ProgramCard, ProgramFormSheet, 3 editor-sheet'а, ProgramEditorModals:12, workout/[id]:22, useTabPrefetch:17 | **4 RPC**: copy_program_for_user(:546), save_program_snapshot(:605), create_workouts_for_program (:618, :682, :694 — 3 точки вызова!), sync_program_changes_to_workouts(:756). Секции размечены: типы(5), мапперы(169), CRUD(236), загрузка(343), старт/прогресс(375), копия(538), граница редактора CTR-1(568), активация(626), синк(748), замена упражнения(767) | Barrel-сплит по секциям **без изменения логики**: types+mappers / crud / lifecycle / editorBoundary / sync. Пути `services/programsService` сохранить через index | 🟠 (blast-radius: program-sync semantics, §2 «не ломать persistence/sync»; но diff механический) | **Пилить, волна 2, только как pure-move + гейты tsc/eslint** |
| **profile.tsx** (653) | экран (роут) | useProfile, useCycle, cycleService, authService.signOut, saveNutrition (мутация профиля, без RPC); предпосылка BUG-5 — guard двойного тапа (:120–123) | Секции: NutritionQuickAdd, CycleCalendar-блок (уже компонент), PR-строка (RecordsCard — уже вынесен) → мелкие components/profile/* | 🟡 | **Пилить, волна 2 (низкая价值, но дёшево)** |
| **progress.tsx** (659) | экран | useHistory (`['history']`), useProgress (`['progress', userId]`), usePainTrend, profileService:43, defer-гейт PERF-11 (:168) | derived-data блок 85–160 → хук `useProgressDerived`; SectionTitle:622 → shared. **Не трогать defer-mount гейт** | 🟡→🟠 (грабли UX-2 anti-flash) | **Пилить аккуратно, волна 2** |
| **ExercisePickerSheet.tsx** (667) | 1: ProgramEditorModals:6 | useExercises → exercisesServiceNormalized → **RPC search_exercises(:40), get_exercise_filter_counts(:70)**; useWebKeyboardInset:20 (веб-специфика) | Фильтр-панель/search-бар → подкомпонент; ядро списка оставить | 🟠 (сидит в редакторе программы рядом с FZ-5-зоной; веб-ветка) | **Отложить до волны 3; split только UI-обвязки** |
| **useWorkoutSession.ts** (1061) | 1 реальный: workout/[id]:18 (остальные упоминания — комментарии; workoutService импортирует только типы `hooks/workout/useWorkoutSession.types`) | Импортирует RestTimerContext(:29) и **модульный синглтон bindRestActions/getRestActions** (RestTimerContext.tsx:67–77); workoutService (единственная supabase-граница сессии, **RPC upsert_workout_logs** в workoutService:576), programsService:22, profileService:23; useQueryClient(:10,:49) — invalidate не найден (не проверено: возможно мёртвый импорт). Секции: flush(115), load(185), timer(288), alternatives(317), **set-mutations(346–517)**, replace/reset(518–741), program-replacement(742–805), pain(806–875), save(876–1028); return 30+ ключей (1029) | Продолжить начатый паттерн loader/mapper: `useWorkoutSession.mutate.ts` (346–517), `.replace.ts` (518–805), `.pain.ts` (806–875), `.save.ts` (876–1028); хук остаётся оркестратором | 🔴 (core flow, persistence-атомарность flush P0-B; §8 gate: «явно оценить mount/render impact»; device-прогон обязателен) | **Не пилить до separately-запланированного device-прогона; волна 3** |
| **SetsGrid.tsx** (1548) | **1 реальный: ExerciseCard.tsx:12** (остальные 7 файлов — только комментарии!) | 5 скрытых хуков напрямую: useTimerSettings, useRpeSettings, useRecommendationFeedback (→fire-and-forget запись), useBarbellSettings, useUnitPreferences; дети RpeEditor/PainMorphEditor/PlateMathRow/SetFeedbackChip/RecommendationCard; engine/progression; автоотдых через `startRestTimer` prop → прокси синглтона. Грабли: responder/blur ячеек (workout/[id]:531, ExerciseSlider:268 — «не возвращать» dettach), FZ-2 компаратор SetRow(:395), ref-зеркало sets(:516) | SetInput(144–241), SetRow(267–426), PrPop(104–131) → отдельные файлы; морф-слот (554–692) и PR-момент (693–740) — позже | 🔴 (таблица сетов = самая горячая интерактивная зона; любой перенос TextInput рискует граблями responder; memo-компараторы ломких мест) | **Не трогать без device-прогона; волна 3 (только механический вынос SetRow/SetInput/PrPop с сохранением компараторов)** |
| **workout/[id].tsx** (603) | экран | useWorkoutSession, useWarmup, useInjuryWarnings, RestTimerProvider/RestChip(:26), profileService, programsService(getWorkoutProgramInfo), ProgressionContext | Переборка inline-колбэков в `sections/` компоненты; объём в основном JSX+handler-обвязка | 🔴 (приоритетная performance-зона §8; FZ-1/FZ-2 только что стабилизированы) | **Не трогать в текущей волне; 603 близко к порогу — приоритет низкий** |
| **StatusCard.tsx** (611) | 1: (tabs)/index.tsx:25 (ReadinessSheet/PainTrendSheet/WorkoutForecastSheet — дети) | 9 хуков (useTodayReadiness/Recovery/Pain/PainTrend/WorkoutForecast/Injuries/Profile/Cycle) + прямые readinessService/cycleService (quick-set pips, check-in); QueryKeys todayReadiness/todayPain/workoutForecast/cycleEvents. **Прецедент CRASH 28.09: rgba(NaN) в cycle-чипе → fatal release-APK** | Чипы (цикл/боль/готовность) → `dashboard/statusChips/`; sheet-роутинг оставить | 🔴→🟠 (был вылет на female-аккаунте; device-прогон female-path обязателен) | **Не трогать без запланированного device-прогона; волна 3** |
| workoutService.ts (616, новый) | 1: useWorkoutSession:39 + loader | **RPC upsert_workout_logs**(:576); session-load(312)/alternatives(428)/writers(542+) | Разделить loaders (278–535) и writers (536–616) | 🟠 (атомарность записи сессии) | **Отложить (волна 3)** |
| warmupService.ts (587, новый) | useWarmup, WarmupBlock/Card/Sheet | supabase.from (0 RPC), warmup_preferences | types+prefs vs генерация | 🟡 | Волна 2, опционально |
| programs.tsx (572, новый) | экран | usePrograms, programSharingService(importProgramByCode → **RPC generate_share_code**), FZ-3 уже исправлен | renderHeader (уже мемо-компонент после FZ-3) + filter-bar | 🟡 | Волна 2, опционально |
| weeklySummaryService.ts (567, новый) | useWeeklySummary | 8 supabase.from-блоков (0 RPC); агрегаты недели | Разбить по источникам данных (workouts/logs/body_metrics/...) | 🟠 (форма embed-запросов = грабли PRG-400) | Волна 3 |
| exercise/[id].tsx (561, новый) | экран | useExerciseDetail (`['exercise', id]`) | дети уже вынесены; остаток — стили/секции | 🟡 | Волна 3, косметика |
| profileService.ts (537, новый) | **12+ import'ёров** (самый высокий fan-in среди сервисов: 8+ хуков, утилиты, экраны) | 20 supabase-вызовов, 0 RPC; QueryKey `['profile', userId]` ×7 (после CTR-7) | Только barrel-сплит с сохранением путей; трогатьquery-формы нельзя | 🟠 (максимальный blast-radius по потребителям) | **Не пилировать первой; при сплите — строго barrel** |
| dashboardService.ts (514, новый) | useDashboard | 9 supabase.from, 0 RPC | по секциям dashboard-запросов | 🟡 | Волна 3, на грани порога |
| database.types.ts / muscleSvgPaths.ts / theme.ts | все | generated / данные SVG / токены | — | — | **Исключить из CTR-3 (предложение §6)** |

## 3. Скрытые связи, циклы, layering

- **Циклов import'ов не найдено** (проверено: `src/engine|services|store` не импортируют `components/` — grep пуст). Обратный слой-запах: `src/hooks/useWorkoutSession.ts:29` импортирует **компонент-файл** `components/workout/RestTimerContext` (нужен лишь `getRestActions`). DEP-7.
- **Модульный синглтон как event-механизм**: `RestTimerContext.tsx:67–77` `bindRestActions/getRestActions` — глобальная рукопожатная связь без пропсов: SetsGrid (через `startRestTimer`-прокси useWorkoutSession) и workout/[id]:454 дергают движок таймера вне React-дерева. Любой split RestTimer/useWorkoutSession обязан сохранить момент bind/unbind относительно монтирования RestTimerProvider, иначе `getRestActions()` вернёт null (деградация «чип таймера молчит»).
- FZ-1 **уже закрыт кодом**: тик вынесен в `createTickStore` (`src/lib/tickStore.ts`, подписка `useRestTick`), `value` мемоизирован (RestTimerContext:203), actions мемоизированы (:173). Разделять «статика/тик» further не нужно — remount-риск при split ниже, чем в описании CTR-3/FZ-1.
- Zustand (`src/store/useStore.ts`, 33 строки): только `isAuthenticated/userId/justRegistered` — server data там нет (§9 соблюдён); носителей >500 от store не зависит критично.
- Пути данных без пропсов: React Query ключи (см. §2) — split компонентов безопасен по ключам, split **хуков/сервисов** обязан сохранить точные строки ключей (инвалидации завязаны на них, e.g. `['profile', userId]` ×7 после CTR-7, `['weeklySummary', userId, weekOffset, unit]`).
- `useWorkoutSession.ts` импортирует `useQueryClient` (:10,:49), но `invalidateQueries/setQueryData` в файле не найдены — **не проверено** (нужен grep по `queryClient.` в теле), кандидат на удаление при split'е.

## 4. Blast-radius прод-RPC (сплит этих файлов опаснее)

| RPC | Где вызывается | Зонаregression |
|---|---|---|
| `copy_program_for_user` | programsService:546 | копирование готовой программы (PROG-1) |
| `save_program_snapshot` | programsService:605 | сохранение из редактора (после CTR-1 — единственная точка) |
| `create_workouts_for_program` | programsService:618, :682, :694 | активация + copy-путь; **3 точки вызова** — при split'е не разнести по разным «половинам» файла |
| `sync_program_changes_to_workouts` | programsService:756 | sync-семантика правок (прямой запрет §2 «не ломать program-sync semantics») |
| `upsert_workout_logs` | workoutService:576 | запись подходов; атомарный flush P0-B внутри useWorkoutSession |
| `search_exercises`, `get_exercise_filter_counts` | exercisesServiceNormalized:40,:70 |ExercisePickerSheet через useExercises |
| `generate_share_code` | programSharingService:13 | programs.tsx (шеринг) |

Сервисные файлы (`*Service.ts`) — единственная supabase-граница (§2); их split = чистое перемещение кода, **пока не меняется форма select/embed** (урок PRG-400: embed без FK уже давал прод-баг).

## 5. FZ-5 (отложенная) — почему не смешивать с CTR-3

`app/program/[id]/edit.tsx` — 380 строк, **не носитель CTR-3**; находка FZ-5 (:238–286) — inline `renderItem`-фабрика с ~12 arrow-props на PhaseCard над NestableDraggableFlatList (drag&drop RNGH). Это перф-fix, а не split: требует device-прогона редактора (дроп/ребалланс) и не порождает новых файлов >500. Держать отдельной задачей; не включать в механические barrel-сплиты.

## 6. Порядок работ (рекомендация)

**Волна 1 — «чистые движки и осиротевшие функции», 🟡, гейты tsc+eslint достаточны, device не нужен:**
1. `engine/progression.ts` → 3 модуля + barrel (пути импорта 6 потребителей не меняются).
2. `engine/weeklySummary.ts` → insights/trainingLoad/deload + типы + barrel.
3. `MuscleStatsSection.tsx` → чистые compute-функции (89–293) в `utils/`; компонент падает до ~500.
4. `WorkoutTimer.tsx` → разложить по уже существующим экспортам (Provider/Pill/Panel).
Итог: −4 носителя из списка, ~0 риска, обновление STATUS §15/INVENTORY в том же коммите.

**Волна 2 — UI с одним потребителем и сервисы-rpc «только перемещение», 🟡–🟠:**
5. `WeeklyReviewSection.tsx` → поблочный вынос L2-аккордеона (1 import'ёр, данные через уже готовый `useWeeklySummary`).
6. `programsService.ts` → barrel-сплит по готовым секционным заголовкам (5–767), сигнатуры и RPC-строки не трогаются; проверить, что все 3 точки `create_workouts_for_program` остались в одном модуле-обёртке активации.
7. `profile.tsx`/`progress.tsx`/`programs.tsx`/`warmupService.ts` — секционные выносы, не задевая defer-mount гейты PERF-11 и guard'ы BUG-5.
Плюс документ-фикс: исключить `database.types.ts` (generated), `muscleSvgPaths.ts` (pure data), `theme.ts` (токены) из зачёта CTR-3 явным правилом-исключением в CLAUDE.md §2 (иначе backlog никогда не закроется).

**Волна 3 — core flow, только вместе с назначенным device-прогоном владельца:**
8. `useWorkoutSession.ts` (секции mutate/replace/pain/save в `hooks/workout/*`, паттерн уже заложен loader/mapper) + `workoutService.ts` loaders/writers — **одним пакетом**, т.к. связь через flush/upsert семантику.
9. `SetsGrid.tsx` — только механический вынос SetRow/SetInput/PrPop с переносом компаратора FZ-2; TextInput-границу не переставлять (грабли responder).
10. `StatusCard.tsx` (чипы) и `workout/[id].tsx` — после 8–9; StatusCard — обязательно с прогоном female-аккаунта (прецедент CRASH 28.09).
**Не трогать без отдельного решения:** ExercisePickerSheet (зона редактора+FZ-5 соседство, веб-inset), weeklySummaryService/profileService (высокий fan-in, форма запросов).

Зеркалирование: все пакет — в `main`, затем `git merge main` в `web-port` (web-специфика только в RestTimerContext/useWebKeyboardInset — при split'е не разрывать Platform-ветки).

## 7. Находки

| ID | Приоритет | file:line | Доказательство | Impact | Предложение | Стоимость |
|---|---|---|---|---|---|---|
| DEP-1 | 🟠 | STATUS.md §15 (CTR-3) | wc: SetsGrid 1548 vs 1483, useWorkoutSession 1061 vs 963, programsService 1000 vs 925 | Документ врёт о размерах; порядок сплитов может быть ошибочным | Обновить §15 вместе с первой волной (drift-fix по AGENTS.md) | мин |
| DEP-2 | 🟠 | src/components/workout/RestTimerContext.tsx:67–77 | `bindRestActions` — модульная глобальная регистрация RestActions; consumers: useWorkoutSession.ts:29, workout/[id] (через прокси :454), SetsGrid `startRestTimer` | Split RestTimer/useWorkoutSession, нарушающий порядок bind/unbind относительно RestTimerProvider → `getRestActions()===null`, автоотдых и чип таймера молчат | Сохранить прокси-слой (getRestActions наружу, не в пропсы) + ручной прогон: старт отдыха из ячейки | мед |
| DEP-3 | 🟡 | src/hooks/useWorkoutSession.ts:10,49 | useQueryClient импортирован, invalidateQueries/setQueryData в файле не найдены (grep пуст; **не проверено** глубже) | Мёртвая зависимость или скрытое использование | При split'е проверить и удалить | мин |
| DEP-4 | 🟡 | grep SetsGrid | Реальный import'ёр — 1 (ExerciseCard.tsx:12); 7 файлов упоминают SetsGrid только в комментариях | Blast-radius SetsGrid уже, чем кажется из INVENTORY/STATUS | Отразить в INVENTORY §7/§12; это понижает риск wave-3 сплита | мин |
| DEP-5 | 🔴 | src/services/programsService.ts:618,682,694,756 | `create_workouts_for_program` вызывается из 3 внутренних точек, `sync_program_changes_to_workouts` — sync-граница | Неосторожный split разнесёт точки вызова по модулям → риск рассинхрона активации/копии/синка | Сплит «только перемещение»: все 3 точки остаются в activation-модуле; tsc/eslint + ревью порядка вызовов | мед |
| DEP-6 | 🟠 | src/services/workoutService.ts:576 | `upsert_workout_logs` — единственная запись подходов; атомарный flush P0-B в useWorkoutSession.ts:115 | Split session-слоя без device-прогона может задеть persistence (потеря/дубль логов) | Волна 3, пакетом с useWorkoutSession, device-прогон с записью сетов | высокая |
| DEP-7 | 🟡 | src/hooks/useWorkoutSession.ts:29 | hook импортирует компонент-файл RestTimerContext | Layering-запах; при split'е RestTimerContext импорт потянется за собой MiniRing/RestChip (UI) | Вынести `getRestActions/bindRestActions` в `lib/restActions.ts`, Re-экспорт из контекста | мал |
| DEP-8 | 🟡 | src/components/workout/RestTimerContext.tsx:49,203 + lib/tickStore.ts | FZ-1 уже закрыт в коде: tick-store + useMemo value | Оценки «splitRestTimerContext для перфа» из старых документов больше не нужны — не перепиливать | Отметить в STATUS §15 при обновлении | мин |
| DEP-9 | 🟡 | src/components/program/sheets/ExercisePickerSheet.tsx:20 | useWebKeyboardInset — веб-специфичный хук внутри носителя | Split обязан сохранить Platform-ветки в неизменном компоненте; иначе web-port merge конфликтует | Выносить только filter-UI; зеркала через merge main | мал |
| DEP-10 | 🟡 | CLAUDE.md §2 («файл не >500») vs src/types/database.types.ts:1 (generated), constants/muscleSvgPaths.ts, constants/theme.ts | wc 1427/1080/613; database.types сгенерирован (§11 «не редактируется вручную») | CTR-3 неисполним без исключений — сгенерированные/данные файлы нельзя «пилить» | В §2 добавить исключение: generated, pure-data константы, токены темы | мин |
| DEP-11 | 🟡 | app/(tabs)/profile.tsx:118–123 | guard `nutritionSaving` (BUG-5) живёт внутри тела экрана | При выносе NutritionQuickAdd guard должен переехать целиком — иначе двойной тап удваивает калории (уже чинили) | Переносить секцию куском вместе с state-guard | мал |

## 8. Ограничения и неподтверждённое

- Runtime-поведение (frequent re-render, responder-грабли) не проверялось — только статические связи; device-прогон остаётся за владельцем (§12 baseline сравнивать dev↔dev).
- «Не проверено»: возможное использование `queryClient` в useWorkoutSession (DEP-3); точный список invalidate-ключей в мутациях profile/nutrition не исчерпан grep'ом по одному файлу.
- Веб-порт не инспектировался (`../fittracker-rn-web` вне границ задачи); Platform-чувствительные seam'ы помечены (DEP-9, RestTimerContext:24 Platform).
