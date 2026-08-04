Master Refactoring Guide — FitTracker RN

ОБНОВЛЕНО 04.08.2026. Исходный аудит — 29.07.2026.
Статусы задач → TASKS_STATUS.md. Инвентарь файлов → FILE_INVENTORY.md.
Этот guide сохраняет детальный разбор проблем с примерами кода.

## Обновление 31.07.2026 (дельта сверх аудита 29.07.2026)

Закрыто / реализовано в этой итерации:

| Пункт | Что сделано | Где подтверждено |
|---|---|---|
| SEC-7 | catch advanceProgramProgress больше не врёт «Успех»: Haptics.Warning + честный Alert «Тренировка сохранена» с кнопками «Повторить» (retryAdvance) / «Позже». Данные тренировки сохранены до вызова прогрессии. | useWorkoutSession.ts saveWorkout |
| FIT-1 | Активация программ: одна активная, бейдж «Текущая», кнопка «Активировать», диалог «начать заново» для завершённых (reset). | programsService.activateProgram/getUserProgramsStatus/deactivateAllPrograms, ProgramCard, programs.tsx |
| FIT-2 | Синхронизация правок программы → будущие тренировки через RPC sync_program_changes_to_workouts (атомарно; завершённые/в процессе не трогаются). | programsService.syncProgramChanges, вызов в useProgramEditor.saveProgram |
| FIT-3 | Робастное удаление программы: отвязка workouts.program_id=null, удаление user_programs (→ 0 активных), каскад, защита от FK-падения. | programsService.deleteProgram(id, userId), usePrograms.deleteMutation |
| FIT-4 | Плейсхолдер «Нет активной программы» на Dashboard + кнопка «Выбрать программу». | (tabs)/index.tsx |
| FIT-5 | Строка «Следующая: Фаза N, Неделя X» в шапке списка тренировок. | (tabs)/workouts.tsx renderHeader |
| FIT-6 | Название программы + фаза в шапке тренировки. | (tabs)/workout/[id].tsx (getWorkoutProgramInfo) |
| ARCH-3 | ProgramCard переведён на единый LEVEL_COLORS (хардкод уровней убран). ProgramFormSheet — НЕ подтверждено. | ProgramCard.tsx |
| SCALE-5|useProgramEditor разбит (+useProgramPhases); program/[id].tsx разбит (ProgramHero/Fabs/DetailModals); goals.tsx разбит (constants/goals.ts + utils/macroCalculator.ts + components/goals/GoalsComponents/GoalsStep1/GoalsStep2/GoalsStep3).|useProgramEditor.ts + useProgramPhases.ts + program/ProgramHero.tsx + program/ProgramFabs.tsx + program/ProgramDetailModals.tsx + constants/goals.ts + utils/macroCalculator.ts + components/goals/*|
| SCALE-7 | Документация актуализирована; команда регенерации типов переведена на --db-url (legacy-ключи отключены). | CLAUDE.md, этот файл |
| SEC-2|updateSet() не персистит до saveWorkout (краш = потеря тренировки)|debounce 500мс + RPC upsert_workout_logs + flush при размонтировании|useWorkoutSession.ts|
| SEC-6|неатомарный DELETE+INSERT workout_logs в saveWorkout|RPC upsert_workout_logs: INSERT ON CONFLICT + удаление отсутствующих в одной транзакции|useWorkoutSession.ts|
| PERF-1|N+1 в легаси createWorkoutsFromProgram|функция удалена (нигде не использовалась)|programsService.ts|
| ARCH-1|централизация Bottom Sheet на SheetShell|DaySettingsSheet, ExerciseSettingsSheet, ScheduleEditorSheet переведены на SheetShell|sheets/|
| ARCH-5|хардкод цветов в UI-компонентах|ExercisePickerSheet, ExerciseSettingsSheet, ShareProgramSheet, ImportProgramSheet — заменено на токены|sheets/|
| PERF-4|двойные запросы на упражнение в saveProgram|RPC save_program_snapshot — 1 запрос вместо N×2|useProgramEditor.ts|
| PERF-6|нет транзакции в saveProgram|RPC save_program_snapshot — атомарная транзакция|useProgramEditor.ts|
| SEC-10|прямые supabase.* в UI|history/[id].tsx → historyService.getWorkoutDetail; injuries.tsx уже чистый|historyService.ts, [id].tsx|
| ARCH-3|дубли маппинга уровень→цвет|ProgramFormSheet переведён на LEVEL_COLORS из semanticColors.ts|ProgramFormSheet.tsx|
| PERF-2|клиентский пересчёт getFilterOptions|RPC get_exercise_filter_counts — агрегация на сервере вместо выборки 870+ строк|exercisesService.ts|
| PERF-3|тяжёлые поля в warmupService.generateWarmup|двухфазный запрос: лёгкий select (80 кандидатов) + тяжёлые тексты только для финальных 7|warmupService.ts|
| PERF-5|SCREEN_WIDTH не реагирует на Split View|ExerciseSlider/WarmupBlock → useWindowDimensions; ширина карточки вынесена из фабрики в реактивный контейнер; мёртвые SwipeableCard/BottomSheet удалены|ExerciseSlider.tsx, WarmupBlock.tsx, card/workout.ts|
| ARCH-4|Reanimated v3 vs легаси Animated|FadeIn/Skeleton/Toast переведены на Reanimated v3 (useSharedValue/withTiming/withRepeat/withSequence); SwipeableCard/BottomSheet/ToastProvider/AnimatedButton удалены как мёртвые — легаси Animated/PanResponder/useNativeDriver в живом коде не осталось (grep чист)|FadeIn.tsx, Skeleton.tsx, Toast.tsx|
| ARCH-2|две системы Toast|мёртвый ToastProvider удалён из _layout; осталась одна рабочая система (hooks/useToast + компонент Toast на экране)|_layout.tsx, ToastProvider.tsx 🗑|
| ARCH-4|Reanimated v3 vs легаси Animated|FadeIn/Toast/Skeleton переведены на Reanimated v3 (useSharedValue/withTiming/withSpring/withRepeat); ToastProvider/SwipeableCard/BottomSheet удалены как мёртвые — легаси Animated/PanResponder/useNativeDriver в живом коде не осталось (grep чист)|FadeIn.tsx, Toast.tsx, Skeleton.tsx, ToastProvider.tsx 🗑, SwipeableCard.tsx 🗑, BottomSheet.tsx 🗑|
| ARCH-6|систематический any в мапперах сервисов|programsService/exercisesService/warmupService/useWorkoutSession/useProgramEditor/historyService — мапперы типизированы локальными row-интерфейсами / выводом supabase; catch:any оставлены под SEC-9|programsService.ts, exercisesService.ts, warmupService.ts, useWorkoutSession.ts, useProgramEditor.ts, historyService.ts|
| ARCH-7|types/index.ts vs types/workout.ts дублирование|types/index.ts удалён как мёртвый (0 импортов по grep); types/workout.ts — единственный источник ExerciseData/AlternativeExercise/SetData|types/index.ts 🗑, types/workout.ts|
| ARCH-8|противопоказания через keyword-эвристики|уровень 1 → lookup по injury_exercise_warnings; computeExerciseWarnings/warmupService/useInjuryWarnings переключены; matchesContraindication @deprecated|injuries.ts, warmupService.ts, useInjuryWarnings.ts, injuriesService.ts|

Новые зафиксированные факты долга:

- database.types.ts на диске в UTF-16 (артефакт PowerShell >); в Functions нет sync_program_changes_to_workouts → рассинхрон с БД (рантайм не ломается). Регенерировать через Out-File -Encoding utf8 + --db-url.
- useActiveProgram.ts — мёртвый (не импортируется; programs.tsx использует getUserProgramsStatus напрямую) → кандидат на удаление (SCALE-3).
- usePrograms.handleProgramPress — бессмысленная проверка !program.id.startsWith('user_') (безвредно).

Оговорка по верификации: сводка выше — целевое состояние. Разнобой версий в присланных файлах (programs.tsx, useWorkoutSession.ts приходят в двух вариантах) означает, что на диске может лежать старая версия. Прежде чем считать пункт закрытым, проверь grep-ом. Если grep пуст — пункт на диске открыт.

## Часть 2. Детальная инструкция по переработке

### A. Безопасность и контроль доступа ✅ ЗАКРЫТО (04.08.2026)

RLS для user_injuries (SELECT/INSERT/UPDATE/DELETE по auth.uid() = user_id) и nutrition_logs (ALL по auth.uid() = user_id) подтверждены запросом к pg_policies. Задокументированы в CLAUDE.md.

### B. Целостность данных при записи (атомарность) ✅ ЗАКРЫТО (04.08.2026)

useWorkoutSession: SEC-2/SEC-6 закрыты (debounce + RPC upsert_workout_logs); SEC-7 закрыт 31.07; cleanup-эффект вынесен на пустые deps + ref-зеркала isWorkoutActiveRef/isFinishingRef — лишний UPDATE при смене isFinishing устранён.
useProgramEditor: PERF-4/PERF-6 закрыты 01.08.2026 (RPC save_program_snapshot).

### C. Корректность бизнес-логики ✅ ЗАКРЫТО (04.08.2026)

PR-bias устранён: dashboardService переиспользует profileService.getPersonalRecords (корректная группировка по exercise_id). Формула калорий унифицирована: getBurnedCalories(days=7) вместо workoutsCount*300.

### D. Дизайн-система: несогласованность оверлеев шторок (ARCH-1) ✅ ЗАКРЫТО (04.08.2026)
- EquipmentSheet → colors.overlay; ExercisePickerSheet и ProgramFormSheet уже на colors.overlay; DaySettingsSheet/ExerciseSettingsSheet — без затемнения (осознанное исключение); SheetShell-based и модалки profile.tsx/metrics.tsx — colors.overlay. Централизация на SheetShell не требуется.

### E. Дизайн-система: хардкод цветов (ARCH-5) ✅ ЗАКРЫТО (04.08.2026)
- ProgramCard уровни закрыто (31.07). ProgramProgressCard color="white" → colors.textInverse; ExerciseSettingsSheet hex → colors.success/w

### F. Мёртвый код и рассинхрон карт иконок ✅ ЗАКРЫТО (03.08.2026)

- EQUIPMENT_SVG_MAP ↔ ICON_MAP синхронизированы: 73 SVG-файла замаплены в EquipmentIcon.tsx
- partner.svg и support.svg доступны через ICON_MAP
- Dev-time assert (`__DEV__`) в EquipmentIcon.tsx проверяет рассинхрон при загрузке модуля
- useActiveProgram.ts удалён (SCALE-3 ✅)
- Дубли по регистру в EQUIPMENT_SVG_MAP убраны; нормализация через EQUIPMENT_SVG_MAP_LOWER (toLowerCase + trim)
- 9 ранее неиспользуемых SVG-ассетов замаплены: ab-bench, battle-ropes, decline-bench, power-rack, push-up-bar, stepper, triceps-curl, trx-trainer, weightlifting-belt
- Файл push-up bar.svg переименован в push-up-bar.svg (пробел в имени — риск для сборщика)

### G. Производительность рендера списков (частично 31.07)

workouts.tsx render* обёрнуты в useCallback (закрыто). history.tsx — проверить.

### H. Нарушение слоя данных в UI ✅ ЗАКРЫТО (04.08.2026)

history/[id].tsx → historyService.getWorkoutDetail; history.tsx → useHistory + historyService; injuries.tsx → useInjuries. Прямых supabase.* в UI не осталось.

### I. Излишние разрешения ✅ ЗАКРЫТО (04.08.2026)

RECORD_AUDIO/MODIFY_AUDIO_SETTINGS убраны из app.json.