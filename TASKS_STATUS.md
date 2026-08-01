TASKS_STATUS.md — Сводная таблица задач FitTracker RN

Срез: 31.07.2026. Статусы = по факту кода на диске, не по намерениям.
Легенда: ✅ закрыто | 🟡 частично | 🔲 открыто

## 🔴 Безопасность (SEC)

| ID | Приоритет | Описание | Статус | Дата / Комментарий |
|---|---|---|---|---|
| SEC-1 | 🔴 | service_role в .env → publishable keys + disable legacy JWT | ✅ | 29.07.2026 |
| SEC-2||updateSet() не персистит до saveWorkout (краш = потеря тренировки)|✅|01.08.2026 (debounce 500мс + RPC upsert_workout_logs + flush при размонтировании)|| SEC-3 | 🟠 | nested VirtualizedList без scrollEnabled={false} (DayCard) | ✅ | 29.07.2026 |
| SEC-4 | 🟠 | .single() на пустой выборке (createWorkoutsFromProgram) | ✅ | 29.07.2026 (.maybeSingle + guard) |
| SEC-5 | 🟠 | сброс пароля без redirectTo | ✅ | 29.07.2026 (sendPasswordReset + deep link) |
| SEC-6|🟡|неатомарный DELETE+INSERT workout_logs в saveWorkout|✅|01.08.2026 (RPC upsert_workout_logs: INSERT ON CONFLICT + удаление отсутствующих в одной транзакции)|| SEC-7 | 🟡 | ошибка advanceProgramProgress маскировалась под «Успех» | ✅ | 31.07.2026 (честный Alert + «Повторить/Позже», Haptics.Warning) |
| SEC-8 | 🟡 | кастомная схема fittracker:// вместо Universal/App Links | 🔲 | |
| SEC-9 | 🟢 | сырые ошибки Postgres пользователю | 🔲 | единый маппер не создан |
| SEC-10 | 🟢 | прямые supabase.* в UI | 🟡 | settings.tsx ✅; history/[id].tsx, injuries.tsx — tech debt |

## 🏗️ Архитектура (ARCH)

| ID | Приоритет | Описание | Статус | Дата / Комментарий |
|---|---|---|---|---|
| ARCH-1 | 🟠 | фрагментация Bottom Sheet (3 поведения затемнения) | 🔲 | SheetShell есть, но 6+ шторок со своими оверлеями (ExercisePicker/Import/Share/ExerciseSettings/DaySettings) |
| ARCH-2 | 🟠 | две системы Toast (useToast + мёртвый ToastProvider context) | 🔲 | |
| ARCH-3 | 🟡 | дубли маппинга уровень→цвет | 🟡 | ProgramCard ✅ (LEVEL_COLORS); ProgramFormSheet — не подтверждено |
| ARCH-4 | 🟡 | Reanimated v3 vs легаси Animated (FadeIn/Toast/SwipeableCard/BottomSheet) | 🔲 | |
| ARCH-5 | 🟡 | хардкод цветов сверх долга | 🟡 | ProgramCard-уровни ✅; НО ProgramProgressCard color="white", ExerciseSettingsSheet #4CAF50/#FFC107/#F44336, оверлеи rgba(0,0,0,0.5) — открыто |
| ARCH-6 | 🟡 | систематический any в мапперах сервисов | 🔲 | |
| ARCH-7 | 🟢 | types/index.ts vs types/workout.ts дублирование | 🔲 | |
| ARCH-8 | 🟢 | противопоказания через keyword-эвристики | 🔲 | |

## ⚡ Производительность (PERF)

| ID | Приоритет | Описание | Статус | Дата / Комментарий |
|---|---|---|---|---|
| PERF-1 | 🟡 | N+1 в легаси createWorkoutsFromProgram|✅|01.08.2026 (функция удалена, нигде не использовалась)|
| PERF-2 | 🟡 | клиентский пересчёт getFilterOptions | 🔲 | |
| PERF-3 | 🟢 | тяжёлые поля в warmupService.generateWarmup | 🔲 | |
| PERF-4 | 🟡 | двойные запросы на упражнение в saveProgram | 🔲 | |
| PERF-5 | 🟢 | SCREEN_WIDTH не реагирует на Split View | 🔲 | |
| PERF-6 | 🟡 | нет транзакции в saveProgram (Promise.all не откатывается) | 🔲 | |

## 📈 Масштабируемость (SCALE)

| ID | Приоритет | Описание | Статус | Дата / Комментарий |
|---|---|---|---|---|
| SCALE-1 | 🟡 | ноль автотестов | 🔲 | |
| SCALE-2 | 🟡 | нет Sentry/crash-мониторинга | 🔲 | |
| SCALE-3 | 🟢 | мёртвый код/ассеты|✅|useActiveProgram.ts удалён|
| SCALE-4 | 🟢 | секреты/конфиг в 3 местах | 🔲 | |
| SCALE-5 | 🟡 | модули > 500 строк | 🟡 | useProgramEditor разбит (+useProgramPhases); useWorkoutSession/ExerciseCard/WarmupBlock — нет |
| SCALE-6 | 🟡 | RPC не под ревью | ✅ | 29.07.2026 (аудит) |
| SCALE-7 | 🟢 | дрейф документации | 🟡 | обновлено 31.07.2026 (этот срез) |

## 🗄️ Серверная логика (RPC)

| ID | Приоритет | Описание | Статус | Дата / Комментарий |
|---|---|---|---|---|
| RPC-1 | 🟢 | явный SECURITY INVOKER + search_path (update_*_position) | ✅ | 29.07.2026 |
| RPC-2 | 🟢 | дубли RLS 34→12 | ✅ | 29.07.2026 |
| RPC-3|🟡|RPC upsert_workout_logs (транзакционный upsert логов)|✅|01.08.2026 (SECURITY DEFINER + auth.uid() проверка + INSERT ON CONFLICT + удаление отсутствующих)|
## 🎯 Продуктовые фичи / целостность данных (сессия 31.07.2026, вне аудита)

| ID | Описание | Статус | Комментарий |
|---|---|---|---|
| FIT-1 | Активация программ (одна активная, бейдж «Текущая», кнопка «Активировать», диалог «начать заново» для завершённых) | ✅ | activateProgram(+reset), getUserProgramsStatus, ProgramCard, programs.tsx |
| FIT-2 | Синхронизация правок программы → будущие тренировки (RPC sync_program_changes_to_workouts) | ✅ | syncProgramChanges вызывается в saveProgram; завершённые/в процессе не трогаются |
| FIT-3 | Робастное удаление программы (отвязка workouts, удаление user_programs → 0 активных, защита от FK-падения) | ✅ | deleteProgram(id, userId); deleteMutation инвалидирует dashboard/workouts |
| FIT-4 | Плейсхолдер «Нет активной программы» на Dashboard | ✅ | index.tsx → AppCard + кнопка «Выбрать программу» |
| FIT-5 | Строка «Следующая: Фаза N, Неделя X» в workouts.tsx | ✅ | renderHeader |
| FIT-6 | Название программы + фаза в шапке тренировки | ✅ | workout/[id].tsx → getWorkoutProgramInfo (React Query) |

## Итоговая сводка

Закрыто полностью: SEC-1,2,3,4,5,6,7 · RPC-1,2,3 · SCALE-3,6 · FIT-1..6
Частично: ARCH-3, ARCH-5, SCALE-5, SCALE-7, SEC-10
Открыто (производительность): PERF-2,3,4,5,6