TASKS_STATUS.md — Сводная таблица задач FitTracker RN

Срез: 04.08.2026. Статусы = по факту кода на диске, не по намерениям.
Легенда: ✅ закрыто | 🟡 частично | 🔲 открыто

## 🔴 Безопасность (SEC)

| ID | Приоритет | Описание | Статус | Дата / Комментарий |
|---|---|---|---|---|
| SEC-1 | 🔴 | service_role в .env → publishable keys + disable legacy JWT | ✅ | 29.07.2026 |
| SEC-2||updateSet() не персистит до saveWorkout (краш = потеря тренировки)|✅|01.08.2026 (debounce 500мс + RPC upsert_workout_logs + flush при размонтировании)|| SEC-3 | 🟠 | nested VirtualizedList без scrollEnabled={false} (DayCard) | ✅ | 29.07.2026 |
| SEC-4 | 🟠 | .single() на пустой выборке (createWorkoutsFromProgram) | ✅ | 29.07.2026 (.maybeSingle + guard) |
| SEC-5 | 🟠 | сброс пароля без redirectTo | ✅ | 29.07.2026 (sendPasswordReset + deep link) |
| SEC-6|🟡|неатомарный DELETE+INSERT workout_logs в saveWorkout|✅|01.08.2026 (RPC upsert_workout_logs: INSERT ON CONFLICT + удаление отсутствующих в одной транзакции)|| SEC-7 | 🟡 | ошибка advanceProgramProgress маскировалась под «Успех» | ✅ | 31.07.2026 (честный Alert + «Повторить/Позже», Haptics.Warning) |
| SEC-8 | 🟡 | кастомная схема fittracker:// вместо Universal/App Links|✅|04.08.2026 (схема в app.json; sendPasswordReset + redirectTo fittracker://reset-password; PASSWORD_RECOVERY в _layout.tsx; Universal/App Links не используются; Redirect URL разрешён в Dashboard)|
| SEC-9 | 🟢 | сырые ошибки Postgres пользователю|✅|04.08.2026 (utils/errorMapper.ts: mapError/extractMessage; применён в useWorkoutSession, program/[id], goals; auth остаётся на mapAuthError)|
| SEC-10 | 🟢 | прямые supabase.* в UI|✅|04.08.2026 (history.tsx ✅ useHistory; history/[id].tsx ✅ historyService.getWorkoutDetail; injuries.tsx ✅ useInjuries)|

## 🏗️ Архитектура (ARCH)

| ID | Приоритет | Описание | Статус | Дата / Комментарий |
|---|---|---|---|---|
| ARCH-1 | 🟠 | централизация Bottom Sheet на SheetShell|✅|01.08.2026 (DaySettingsSheet, ExerciseSettingsSheet, ScheduleEditorSheet переведены; ExercisePickerSheet, ImportProgramSheet, ShareProgramSheet — кастомный оверлей сохранён)|
| ARCH-2 | 🟠 | две системы Toast (useToast + мёртвый ToastProvider context)|✅|01.08.2026 (мёртвый ToastProvider удалён из _layout; канон = hooks/useToast + компонент Toast на экране)|
| ARCH-3 | 🟡 | дубли маппинга уровень→цвет | ✅ |01.08.2026 (ProgramCard ✅, ProgramFormSheet ✅ — LEVEL_COLORS из semanticCol
| ARCH-4 | 🟡 | Reanimated v3 vs легаси Animated (FadeIn/Toast/SwipeableCard/BottomSheet)|✅|01.08.2026 (FadeIn/Toast/Skeleton → Reanimated v3; ToastProvider/SwipeableCard/BottomSheet удалены как мёртвые; grep по маркерам легаси пуст)|
| ARCH-5 | 🟡 | хардкод цветов в UI-компонентах | ✅ | 04.08.2026 (ExercisePickerSheet, ExerciseSettingsSheet, ShareProgramSheet, ImportProgramSheet, ProgramProgressCard, EquipmentIcon, EquipmentSheet — заменено на colors.overlay/textTertiary/textInverse/success/warning/error) |
| ARCH-6 | 🟡 | систематический any в мапперах сервисов|✅|01.08.2026 (programsService/exercisesService/warmupService/useWorkoutSession/useProgramEditor/historyService — мапперы типизированы локальными row-интерфейсами / выводом supabase; catch:any оставлены под SEC-9; getList/getString в lib/supabase — вне скоупа)|
| ARCH-7 | 🟢 | types/index.ts vs types/workout.ts дублирование|✅|01.08.2026 (types/index.ts удалён как мёртвый — 0 импортов; types/workout.ts остался единственным источником ExerciseData/AlternativeExercise/SetData)|
| ARCH-8 | 🟢 | противопоказания через keyword-эвристики|✅|01.08.2026 (уровень 1 → lookup по injury_exercise_warnings; computeExerciseWarnings/warmupService/useInjuryWarnings переключены; matchesContraindication @deprecated)|
| ARCH-9 | 🟡 | рассинхрон EQUIPMENT_SVG_MAP ↔ ICON_MAP + case-sensitivity названий оборудования|✅|03.08.2026 (73 файла синхронизированы; dev-time assert; EQUIPMENT_SVG_MAP_LOWER; дубли по регистру убраны)|

## ⚡ Производительность (PERF)

| ID | Приоритет | Описание | Статус | Дата / Комментарий |
|---|---|---|---|---|
| PERF-1 | 🟡 | N+1 в легаси createWorkoutsFromProgram|✅|01.08.2026 (функция удалена, нигде не использовалась)|
| PERF-2 | 🟡 | клиентский пересчёт getFilterOptions |✅|01.08.2026 (RPC get_exercise_filter_counts: агрегация GROUP BY+unnest на сервере, клиентский цикл удалён)|
| PERF-3 | 🟢 | тяжёлые поля в warmupService.generateWarmup | ✅ |01.08.2026 (двухфазный запрос: лёгкий select для 80 кандидатов + тяжёлые поля только для финальных 7)|
| PERF-4 | 🟡 | двойные запросы на упражнение в saveProgram|✅|01.08.2026 (RPC save_program_snapshot — 1 запрос вместо N×2)|
| PERF-5 | 🟢 | SCREEN_WIDTH не реагирует на Split View |✅|01.08.2026 (ExerciseSlider/WarmupBlock → useWindowDimensions; workoutExerciseCard.width убран из фабрики; мёртвые SwipeableCard/BottomSheet удалены; theme.ts — осознанное исключение для portrait)|
| PERF-6 | 🟡 | нет транзакции в saveProgram (Promise.all не откатывается)|✅|01.08.2026 (RPC save_program_snapsh
| PERF-7 | 🟢 | Оптимизация страницы тренировки (TTI + фризы) | ✅ | 05.08.2026 (useWorkoutSession.ts: Promise.all для loadWorkout + flushPendingLogs; [id].tsx: FlatList removeClippedSubviews + батчинг; ExerciseCard.tsx: useMemo на borderColor/completedSets/allSetsDone; ExerciseSlider.tsx: removeClippedSubviews + stagger-загрузка альтернатив) |

## 📈 Масштабируемость (SCALE)

| ID | Приоритет | Описание | Статус | Дата / Комментарий |
|---|---|---|---|---|
| SCALE-1 | 🟡 | ноль автотестов||🔲|отложено 04.08.2026 (тесты и jest удалены: конфликт типов ~64 ошибки tsc); чистые функции macroCalculator/errorMapper готовы к тестированию|
| SCALE-2 | 🟡 | нет Sentry/crash-мониторинга|🔲|отложено до первого production-билда: dev в Expo Go (нативный Sentry не работает), DSN нет; eas.json настроен — вернуться при релизе|
| SCALE-3 | 🟢 | мёртвый код/ассеты|✅|useActiveProgram.ts удалён|
| SCALE-4 | 🟢 | секреты/конфиг в 3 местах|✅|04.08.2026 (src/lib/config.ts — единый источник через Constants.expoConfig.extra; supabase.ts читает оттуда; app.json — единственный источник истины)|
| SCALE-5 | 🟡 | модули > 500 строк | ✅|04.08.2026 (useProgramEditor + program/[id].tsx + goals.tsx + ExerciseCard + WarmupBlock разбиты)|
| SCALE-6 | 🟡 | RPC не под ревью | ✅ | 29.07.2026 (аудит) |
| SCALE-7 | 🟢 | дрейф документации | 🟢 | дрейф документации|✅|05.08.2026 (структура стабилизирована: ROADMAP.md — планирование, refactoring_guide.md заморожен архивом, TASKS_STATUS/FILE_INVENTORY/CLAUDE/PROMPTS — активные)|

## 🗄️ Серверная логика (RPC)

| ID | Приоритет | Описание | Статус | Дата / Комментарий |
|---|---|---|---|---|
| RPC-1 | 🟢 | явный SECURITY INVOKER + search_path (update_*_position) | ✅ | 29.07.2026 |
| RPC-2 | 🟢 | дубли RLS 34→12 | ✅ | 29.07.2026 |
| RPC-3|🟡|RPC upsert_workout_logs (транзакционный upsert логов)|✅|01.08.2026 (SECURITY DEFINER + auth.uid() проверка + INSERT ON CONFLICT + удаление отсутствующих)|
## 🎯 Продуктовые фичи / целостность данных (сессия 31.07.2026, вне аудита)

| ID | Описание | Статус | Комментарий |
|---|---|---|---|
| FEAT-1.1 | Prefill подходов из последней тренировки + подсказка прогрессии | ✅ | 05.08.2026; v2 06.08.2026: прошлые данные пер-сет (prevLogsByExerciseId по set_number, recentLogs исключает текущую тренировку); хинт активного сета; чипы пер-сет и по единицам: кг +2.5…+20, lb +5…+45; custom-ввод удалён || FEAT-1.2.1 | Pill-режим таймера + пресеты + вибрация до сброса | ✅ | 05.08.2026 (RestTimer.tsx v2 + [id].tsx sticky + useTimerSettings + settings.tsx + SetsGrid.tsx; автостарт после каждого подхода опционально) |
| FEAT-1.3 | Стрик 🔥 на Dashboard (недельный, grace на текущую неделю) | ✅ | 06.08.2026 (utils/streak.ts + dashboardService.streak + StreakCard.tsx) |
| FEAT-1.4 | e1RM (Epley) в PR-карточке | ✅ | 06.08.2026 (utils/e1rm.ts; profileService: лучший e1RM по всем сетам; PersonalRecordsCard: «1RM ≈ N кг» + фикс «Invalid Date») |
| FEAT-1.9 | Pain flag: боль 0–3 + тип + часть тела + stop + caution в user_injuries | ✅ | 06.08.2026 (painService.ts + PainSheet.tsx; кнопка HeartPulse в ExerciseCard; level ≥ 2 → caution по умолчанию) |
| FEAT-1.5 | Plate-калькулятор (визуал блинов) | 🟡 | 06.08.2026 (utils/plates.ts: жадный расчёт по сторонам; UI — после встраивания) |
| FEAT-1.6 | CSV-экспорт истории (Share.share) | 🟡 | 06.08.2026 (utils/csv.ts: билдер; сервис/UI — после встраивания) |
| FEAT-1.8 | Daily readiness check-in (сон/усталость/боль/стресс → readiness 1–5; rule-guard при ≤ 2) | ✅ | 06.08.2026 (readinessService.ts + ReadinessSheet.tsx; перехват handleStartWorkout/handleRepeatWorkout в index.tsx) |
| FEAT-1.9 | Pain flag: боль 0–3 + тип + часть тела + stop + caution в user_injuries | ✅ | 06.08.2026 (painService.ts + PainSheet.tsx; HeartPulse в ExerciseCard; level ≥ 2 → caution по умолчанию) |
| UX-1 | Разгрузка экрана тренировки: UnitToggle в шапку рядом с таймером | ✅ | 06.08.2026 ([id].tsx) |
| FIT-2 | Синхронизация правок программы → будущие тренировки (RPC sync_program_changes_to_workouts) | ✅ | syncProgramChanges вызывается в saveProgram; завершённые/в процессе не трогаются |
| FIT-3 | Робастное удаление программы (отвязка workouts, удаление user_programs → 0 активных, защита от FK-падения) | ✅ | deleteProgram(id, userId); deleteMutation инвалидирует dashboard/workouts |
| FIT-4 | Плейсхолдер «Нет активной программы» на Dashboard | ✅ | index.tsx → AppCard + кнопка «Выбрать программу» |
| FIT-5 | Строка «Следующая: Фаза N, Неделя X» в workouts.tsx | ✅ | renderHeader |
| FIT-6|Название программы + фаза в шапке тренировки|✅|workout/[id].tsx → getWorkoutProgramInfo (React Query)|
| FEAT-7 | RPE/RIR feedback: шкала 1–10 + авто-RIR/difficulty после подхода | ✅ | 05.08.2026 (SetsGrid.tsx + SetFeedbackControl.tsx + utils/rpe.ts; патч через updateSetFeedback → debounce-RPC upsert_workout_logs; чип-индикатор в ряду подходов). v2 05.08.2026: драг-ползунок заменён тапабельной шкалой (дефолт 7, явное «Готово», фикс рассинхрона делений и фризов); дубли консолидированы в SetFeedbackControl |
🤖 AI-тренер (AI) — в плане, roadmap rev.2 Этап 3
| ID|Приоритет|Описание|Статус|Дата / Комментарий|
| ---|---|---|---|---|
| AI-1|🔴|AI-фундамент: Edge Function llm-proxy (ключи серверно), согласие, PII-фильтр|🔲|roadmap 3.1|
| AI-2|🟡|AI-прогрессия: рекомендации вес/повторы на следующую тренировку|🔲|roadmap 3.2|
| AI-3|🟡|Чат-коуч: RAG по базе упражнений (pgvector) + хард-фильтры безопасности|🔲|roadmap 3.3|
| AI-4|🟡|Генератор программ из естественного языка|🔲|roadmap 3.4|
| AI-5|🟢|Объяснимость разминки/дилоудов|🔲|roadmap 3.5|

## Итоговая сводка
Закрыто полностью: SEC-1,2,4,5,6,8,9,10 · RPC-1,2,3 · SCALE-3,4,5,6 · ARCH-1..9 · PERF-1..7 · FIT-1..6 · FEAT-1.1 (+v2),1.2,1.2.1,1.3,1.4,1.8,1.9
Частично: SCALE-7
Открыто (отложено): SCALE-1 (автотесты), SCALE-2 (Sentry до production-билда)
В плане (roadmap rev.2): AI-1..5 (Этап 3 «AI-тренер»)