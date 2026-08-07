# TASKS_STATUS.md — статусы задач

Срез: 06.08.2026 · Владелец темы: статусы
Описание правил → CLAUDE.md · План этапов → ROADMAP.md · Файлы → FILE_INVENTORY.md
Легенда: ✅ закрыто · 🟡 частично · 🔲 открыто (осознанно отложено). Приоритет: 🔴 критично · 🟠 высокий · 🟡 средний · 🟢 низкий.

| ID | Трек | Пр. | Описание | Статус | Дата / комментарий |
|---|---|---|---|---|---|
| SEC-1 | Безопасность | 🔴 | service_role в .env → publishable keys, legacy JWT отключены | ✅ | 29.07.2026 |
| SEC-2 | Безопасность | 🔴 | updateSet() не персистил до saveWorkout | ✅ | 01.08.2026 — debounce 500 мс + RPC upsert_workout_logs + flush при размонтировании |
| SEC-3 | Безопасность | 🟠 | вложенный VirtualizedList без scrollEnabled={false} (DayCard) | ✅ | 29.07.2026 |
| SEC-4 | Безопасность | 🟠 | .single() на пустой выборке | ✅ | 29.07.2026 — .maybeSingle() + guard |
| SEC-5 | Безопасность | 🟠 | сброс пароля без redirectTo | ✅ | 29.07.2026 |
| SEC-6 | Безопасность | 🟡 | неатомарный DELETE+INSERT workout_logs | ✅ | 01.08.2026 — RPC upsert_workout_logs в одной транзакции |
| SEC-7 | Безопасность | 🟡 | ошибка advanceProgramProgress маскировалась под «Успех» | ✅ | 31.07.2026 — честный Alert «Повторить / Позже» + Haptics.Warning |
| SEC-8 | Безопасность | 🟡 | схема fittracker:// вместо Universal/App Links | ✅ | 04.08.2026 — схема в app.json, PASSWORD_RECOVERY в _layout; Universal Links осознанно не используются |
| SEC-9 | Безопасность | 🟢 | сырые ошибки Postgres пользователю | ✅ | 04.08.2026 — utils/errorMapper.ts; auth остаётся на mapAuthError |
| SEC-10 | Безопасность | 🟢 | прямые supabase.* в UI | ✅ | 04.08.2026 — history.tsx → useHistory, history/[id].tsx → historyService.getWorkoutDetail, injuries.tsx → useInjuries |
| ARCH-1 | Архитектура | 🟠 | централизация шторок на SheetShell | ✅ | 01.08.2026 — DaySettingsSheet, ExerciseSettingsSheet, ScheduleEditorSheet; ExercisePickerSheet/ImportProgramSheet/ShareProgramSheet осознанно на кастомном оверлее |
| ARCH-2 | Архитектура | 🟠 | две системы Toast | ✅ | 01.08.2026 — канон useToast + компонент Toast |
| ARCH-3 | Архитектура | 🟡 | дубли маппинга уровень → цвет | ✅ | 01.08.2026 — LEVEL_COLORS |
| ARCH-4 | Архитектура | 🟡 | Reanimated v3 vs легаси Animated | ✅ | 01.08.2026 — FadeIn/Toast/Skeleton переведены; ToastProvider/SwipeableCard/BottomSheet удалены |
| ARCH-5 | Архитектура | 🟡 | хардкод цветов в UI | ✅ | 04.08.2026 — переведены 7 компонентов; остаток по стилям (badge/button/common/dashboard/history) — не добавлять новый |
| ARCH-6 | Архитектура | 🟡 | систематический any в мапперах | ✅ | 01.08.2026 — row-интерфейсы; catch: any намеренно (см. SEC-9) |
| ARCH-7 | Архитектура | 🟢 | дубль types/index.ts vs types/workout.ts | ✅ | 01.08.2026 — types/index.ts удалён |
| ARCH-8 | Архитектура | 🟢 | противопоказания через keyword-эвристики | ✅ | 01.08.2026 — lookup по injury_exercise_warnings; matchesContraindication → @deprecated |
| ARCH-9 | Архитектура | 🟡 | рассинхрон EQUIPMENT_SVG_MAP ↔ ICON_MAP | ✅ | 03.08.2026 — 73 файла, dev-time assert, EQUIPMENT_SVG_MAP_LOWER |
| PERF-1 | Производительность | 🟡 | N+1 в легаси createWorkoutsFromProgram | ✅ | 01.08.2026 — функция удалена |
| PERF-2 | Производительность | 🟡 | клиентский пересчёт getFilterOptions | ✅ | 01.08.2026 — RPC get_exercise_filter_counts |
| PERF-3 | Производительность | 🟢 | тяжёлые поля в generateWarmup | ✅ | 01.08.2026 — двухфазный запрос (80 кандидатов → 7 финальных) |
| PERF-4 | Производительность | 🟡 | двойные запросы в saveProgram | ✅ | 01.08.2026 — RPC save_program_snapshot |
| PERF-5 | Производительность | 🟢 | SCREEN_WIDTH не реагирует на Split View | ✅ | 01.08.2026 — useWindowDimensions(); theme.ts — осознанное исключение |
| PERF-6 | Производительность | 🟡 | нет транзакции в saveProgram | ✅ | 01.08.2026 — единый PL/pgSQL-блок |
| PERF-7 | Производительность | 🟢 | TTI и фризы экрана тренировки | ✅ | 05.08.2026 — Promise.all в loadWorkout, FlatList + removeClippedSubviews, useMemo в ExerciseCard, stagger в ExerciseSlider |
| SCALE-1 | Масштабируемость | 🟡 | ноль автотестов | 🔲 | отложено 04.08.2026 — тесты и jest удалены (конфликт типов); чистые функции macroCalculator/errorMapper/rpe/streak/e1rm готовы к покрытию |
| SCALE-2 | Масштабируемость | 🟡 | нет Sentry / crash-мониторинга | 🔲 | до первого production-билда (dev в Expo Go, DSN не заведён; eas.json настроен) |
| SCALE-3 | Масштабируемость | 🟢 | мёртвый код / ассеты | ✅ | useActiveProgram.ts, AnimatedButton, SwipeableCard, BottomSheet удалены |
| SCALE-4 | Масштабируемость | 🟢 | конфиг дублировался в 3 местах | ✅ | 04.08.2026 — src/lib/config.ts, app.json — источник истины |
| SCALE-5 | Масштабируемость | 🟡 | модули > 500 строк | ✅ | 04.08.2026 — useProgramEditor, program/[id].tsx, goals.tsx, ExerciseCard, WarmupBlock разбиты |
| SCALE-6 | Масштабируемость | 🟡 | RPC создавались без ревью | ✅ | 29.07.2026 — правила в PROMPTS.md |
| SCALE-7 | Масштабируемость | 🟢 | дрейф документации | ✅ | 06.08.2026 — матрица владения тем; дубли между CLAUDE/PROMPTS/ROADMAP устранены |
| RPC-1 | RPC | 🟢 | явный SECURITY INVOKER + search_path | ✅ | 29.07.2026 |
| RPC-2 | RPC | 🟢 | дубли RLS: 34 → 12 политик | ✅ | 29.07.2026 |
| RPC-3 | RPC | 🟡 | upsert_workout_logs | ✅ | 01.08.2026, расширен FEAT-7 05.08.2026 |
| FIT-1 | Продукт | 🟡 | активация программ | ✅ | activateProgram(+reset), getUserProgramsStatus, deactivateAllPrograms |
| FIT-2 | Продукт | 🟡 | синхронизация правок → будущие тренировки | ✅ | RPC sync_program_changes_to_workouts из saveProgram() |
| FIT-3 | Продукт | 🟡 | робастное удаление программы | ✅ | deleteProgram(id, userId) + инвалидация dashboard/workouts |
| FIT-4 | Продукт | 🟢 | плейсхолдер «Нет активной программы» | ✅ | Dashboard: AppCard + «Выбрать программу» |
| FIT-5 | Продукт | 🟢 | строка «Следующая: Фаза N, Неделя X» | ✅ | workouts.tsx → renderHeader |
| FIT-6 | Продукт | 🟢 | название программы + фаза в шапке тренировки | ✅ | getWorkoutProgramInfo (React Query) |
| FEAT-1.1 | Данные для AI | 🟠 | prefill подходов + подсказка прогрессии | ✅ | 05.08.2026; v2 06.08.2026 — пер-сет previous* по set_number, чипы прогрессии (кг +2.5…+20 / lb +5…+45) |
| FEAT-1.2 | Продукт | 🟡 | автостарт таймера отдыха + Pill-режим | ✅ | 05.08.2026 — RestTimer v2, sticky-оверлей, useTimerSettings.autoStartRest |
| FEAT-1.3 | Продукт | 🟢 | streak на Dashboard | ✅ | 06.08.2026 — utils/streak.ts + StreakCard |
| FEAT-1.4 | Продукт | 🟢 | e1RM (Эпли) в PR-карточке | ✅ | 06.08.2026 — utils/e1rm.ts, фикс «Invalid Date» |
| FEAT-1.5 | Продукт | 🟡 | Plate-калькулятор | 🟡 | 06.08.2026 — utils/plates.ts готов; UI в экране тренировки не сделан |
| FEAT-1.6 | Продукт | 🟢 | CSV-экспорт истории | 🟡 | 06.08.2026 — utils/csv.ts готов; сервис и UI отложены в бэклог |
| FEAT-1.7 (=FEAT-7) | Данные для AI | 🔴 | RPE/RIR feedback: шкала 1–10 + авто-RIR/difficulty | ✅ | 05.08.2026 — SetsGrid + SetFeedbackControl + utils/rpe.ts; v2 — тапабельная шкала вместо драг-ползунка |
| FEAT-1.8 | Данные для AI | 🟠 | daily readiness check-in + rule-guard при ≤ 2 | ✅ | 06.08.2026 — readinessService + ReadinessSheet, перехват старта/повтора в Dashboard |
| FEAT-1.9 | Данные для AI | 🟠 | pain flag + осторожность в user_injuries | ✅ | 06.08.2026 — painService + PainSheet, кнопка HeartPulse в ExerciseCard |
| FEAT-2.2 | Графики: тренд веса + чипы-тумблеры замеров (спарклайны в своём масштабе, выбор в AsyncStorage) + форма по группам | ✅ | 06.08.2026 (utils/trend.ts, WeightTrendChart, MetricSparkline, metrics.tsx) |
| UX-1 | UX | 🟢 | разгрузка шапки тренировки (UnitToggle рядом с таймером) | ✅ | 06.08.2026 — workout/[id].tsx |
| AI-1 | AI | 🔴 | Edge Function llm-proxy, согласие, PII-фильтр | 🔲 | план: ROADMAP.md §3.1 |
| AI-2 | AI | 🟡 | AI-прогрессия (вес/повторы на след. тренировку) | 🔲 | ROADMAP.md §3.2 |
| AI-3 | AI | 🟡 | чат-коуч: RAG по базе упражнений + хард-фильтры | 🔲 | ROADMAP.md §3.3 |
| AI-4 | AI | 🟡 | генератор программ из естественного языка | 🔲 | ROADMAP.md §3.4 |
| AI-5 | AI | 🟢 | объяснимость разминки/дилоудов | 🔲 | ROADMAP.md §3.5 |

## Сводка

| Категория | Список ID |
|---|---|
| Закрыто | SEC-1…10, ARCH-1…9, PERF-1…7, SCALE-3,4,5,6,7, RPC-1,2,3, FIT-1…6, FEAT-1.1, 1.2, 1.3, 1.4, 1.7, 1.8, 1.9, UX-1 |
| Частично | FEAT-1.5, FEAT-1.6 (утилиты готовы, UI нет) |
| Открыто осознанно | SCALE-1 (до стабилизации tsc), SCALE-2 (до production-билда) |
| В плане | AI-1…5 |