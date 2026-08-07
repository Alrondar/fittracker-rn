# FitTracker RN — Инструкции для AI-ассистента

Срез: 06.08.2026 · Владелец темы: правила разработки
Статусы задач → TASKS_STATUS.md · Инвентарь файлов → FILE_INVENTORY.md
Рецепты/команды/карта зависимостей → PROMPTS.md · План → ROADMAP.md
Архив аудита → refactoring_guide.md (заморожен, не обновлять)

## 1. Стек

| Слой | Решение |
|---|---|
| Язык | TypeScript ~5.9, строгая типизация |
| Runtime | Expo SDK ~54, React Native 0.81.5, React 19.1 |
| Навигация | Expo Router ~6.0, файловая, группы (tabs), (auth) |
| Бэкенд | Supabase (PostgreSQL + RLS + RPC + Auth), @supabase/supabase-js ^2.110 |
| Серверный стейт | @tanstack/react-query ^5.101 — ВСЕ серверные данные |
| UI-стейт | zustand ^5 — ТОЛЬКО UI (isAuthenticated, userId) |
| Стилизация | useTheme() + атомарные UI-компоненты |
| Анимации | react-native-reanimated ^3.16 + react-native-gesture-handler ~2.28 |
| Иконки / изображения | lucide-react-native ^1.24 + кастомные SVG; expo-image ~3.0 (не Image из RN) |
| Прочее | expo-haptics ~15.0, react-native-draggable-flatlist ^4.0 |

## 2. Структура папок

app/ — _layout.tsx (QueryClient вне компонента, провайдеры, auth-гейт, deep links), (auth)/ (login, reset-password, update-password), (tabs)/ (index, exercises, history, programs, workouts, profile, а также вложенные exercise/[id], history/[id], profile/{goals,injuries,metrics,settings}, program/[id], workout/[id], workout/create).
src/ — components/{ui,workout,program,dashboard,exercises,goals}, hooks/, services/, constants/, styles/, types/, utils/, lib/, store/.
supabase/ — SQL-миграции.
Назначение каждого файла — FILE_INVENTORY.md (здесь не дублируется).

## 3. Архитектурные инварианты

| № | Правило |
|---|---|
| 1 | Серверные данные — только React Query; в Zustand серверных данных нет |
| 2 | Запросы — только в src/services/; supabase.from() и supabase.auth.* в UI запрещены |
| 3 | Auth — единый слой authService.ts: signIn, signUp, signOut, sendPasswordReset, updatePassword, getSession, onAuthStateChange, mapAuthError. Редиректы делает корневой _layout.tsx через onAuthStateChange |
| 4 | Профиль создаётся триггером БД handle_new_user; ensureProfile(userId) — идемпотентный upsert({ id }, { onConflict: 'id' }), ошибку 23505 игнорирует |
| 5 | Конфиг — единственный источник src/lib/config.ts через Constants.expoConfig.extra; app.json — источник истины (SCALE-4) |
| 6 | User-facing ошибки — только mapError/extractMessage (utils/errorMapper.ts) и mapAuthError |
| 7 | Файл ≤ 500 строк; при > 450 строк новый функционал не добавлять, сначала разбиение (SCALE-5) |

## 4. Данные и безопасность

### Ключи

Клиент использует publishable key (sb_publishable_…), защищён RLS. Legacy JWT (eyJ…) отключены. Secret key в проекте не хранится; .env в .gitignore, коммитится только .env.example.

### RLS (консолидировано 34 → 12 политик)

| Таблица(ы) | Политика |
|---|---|
| user_programs, workouts, body_metrics, daily_readiness, user_injuries, nutrition_logs, pain_events | ALL: auth.uid() = user_id |
| profiles | auth.uid() = id |
| programs | SELECT: created_by IS NULL OR created_by = auth.uid(); INSERT/UPDATE/DELETE: created_by = auth.uid() |
| program_phases, program_days, program_exercises | через связь с programs |
| workout_exercises | через workouts.user_id |
| workout_logs | через workout_exercises → workouts.user_id |
| exercises, equipment, exercise_equipment, injury_exercise_warnings | SELECT для всех |

Новая таблица → сразу добавить строку в этот список.

### Правила RPC

| № | Правило |
|---|---|
| 1 | Обходит RLS → SECURITY DEFINER + явная проверка auth.uid() внутри |
| 2 | Подчиняется RLS → SECURITY INVOKER + SET search_path TO 'public' |
| 3 | Идемпотентность: IF EXISTS / ON CONFLICT DO NOTHING |
| 4 | Транзакционность: единый PL/pgSQL-блок, не клиентский Promise.all |
| 5 | Батчинг: INSERT … SELECT вместо вложенных циклов |
| 6 | Новая RPC — только supabase/migrations, ревью наравне с клиентским кодом (SCALE-6) |

Инвентарь RPC, шаблоны и команда регенерации типов — PROMPTS.md.

### Ограничения схемы (частые 42703)

| Ограничение |
|---|
| В exercises НЕТ колонки description — не включать в select |
| В profiles НЕТ колонки email — триггер и ensureProfile пишут только id |
| program_days.id, program_exercises.id — uuid (gen_random_uuid()); programs.id, program_phases.id — text (gen_random_uuid()::text) |
| workout_logs: rpe (smallint 1–10), rir (smallint 0–5), difficulty (text: easy/moderate/hard/max), created_at (timestamptz) — FEAT-7 |
| exercises — 870+ записей, названия/мышцы/оборудование на русском; media_url — одиночный URL, клиент строит пару 0.jpg + 1.jpg; can_be_activation — 62 упражнения |

## 5. Домены

### Периодизация

programs → program_phases (phase_number, name, phase_type, weeks_count, position) → program_days (phase_id, week_number, day_number) → program_exercises.
user_programs: current_phase/current_week/current_day, is_active, started_at, completed_at.
workouts: phase_number/week_number/day_index, started_at/finished_at/duration_seconds.
Типы фаз — constants/phaseTypes.ts (hypertrophy, strength, power, deload, custom); цвет/иконка/подпись только через getPhaseMeta/getPhaseColor.

### Тренировки

| Сценарий | Реализация |
|---|---|
| Upfront (канон) | RPC create_workouts_for_program при старте программы |
| Точечно | workoutService.startProgramWorkout — текущий день, идемпотентно |
| Повтор | workoutService.repeatWorkout — копия как ad-hoc |
| Прогрессия | advanceProgramProgress — день → неделя → фаза → завершение |

### Программы

activateProgram(programId, userId, reset?), getUserProgramsStatus(userId) (один запрос на список), deactivateAllPrograms(userId), deleteProgram(programId, userId) (отвязка workouts + удаление user_programs + каскад), syncProgramChanges(programId) → RPC sync_program_changes_to_workouts (только started_at IS NULL AND finished_at IS NULL).
Шаринг: programs.share_code + RPC generate_share_code + programSharingService (generateShareCode, importProgramByCode, formatShareCode).
Готовых засеянных программ — 6 (created_by IS NULL): Full Body — Старт, StrongLifts 5×5, PPL Классический, Upper/Lower, PPLUL, PPL 6-day.

### Справочник упражнений

Пагинация 40/страница (useInfiniteQuery), лёгкий select, серверные фильтры, debounce 300 мс, staleTime: Infinity для словарей.

## 6. Дизайн-система

Канон: const { colors } = useTheme(); → style={{ backgroundColor: colors.primary }}.

| Задача | Токен |
|---|---|
| Акцент | colors.primary |
| Текст на тёмном | colors.textInverse |
| Основной / вторичный / третичный текст | colors.textPrimary / textSecondary / textTertiary |
| Оверлей шторки | colors.overlay |
| Ошибка / предупреждение / успех | colors.error / warning / success |
| Уровни программ | LEVEL_COLORS (constants/semanticColors.ts) |
| Мышцы | getMuscleColor (constants/muscleColors.ts) |
| Фазы | getPhaseColor (constants/phaseTypes.ts) |

Хардкод ('#7c3aed', 'white', '#4CAF50', 'rgba(0,0,0,0.5)') запрещён. Остаточный долг ARCH-5 — только badge.ts, button.ts, common.ts, dashboard.ts, history.tsx: новый хардкод не добавлять, старый вычищать по касанию.
Отступы и радиусы — SPACING / BORDER_RADIUS из constants/theme (значения — в PROMPTS.md).
Фабрики стилей — только useMemo на уровне экрана, никогда внутри renderItem.
EquipmentIcon: проп name (не type), цвет — автоматически по первой целевой мышце; EQUIPMENT_SVG_MAP ↔ ICON_MAP синхронизированы (73 SVG), нормализация через EQUIPMENT_SVG_MAP_LOWER, dev-time assert внутри компонента.

Дизайн-язык карточки упражнения: живая обводка (avoid → error, caution → warning, замена → primary, все подходы закрыты → success + '60', иначе border); аккордеоны без контурных обводок, цветной значок + uppercase-заголовок + шеврон, pointerEvents="none" в свёрнутом состоянии; баблы мышц — primary насыщенный, secondary нейтральный с обводкой; слайдеры техники — ленивый монтаж (everOpened), автоплей 3 с только в раскрытом аккордеоне.

## 7. Производительность (обязательно)

| № | Правило |
|---|---|
| 1 | Никогда не вкладывать VirtualizedList в ScrollView. Исключение: DraggableFlatList с scrollEnabled={false} |
| 2 | QueryClient создаётся вне компонента |
| 3 | Карточки списков — React.memo; колбэки — useCallback; тяжёлые поля не тянуть в списки |
| 4 | useWindowDimensions() вместо Dimensions.get('window') (Split View). Осознанное исключение — theme.ts (portrait-only) |
| 5 | useFocusEffect для обновления при возврате на вкладку |
| 6 | Reanimated: .value — только внутри useAnimatedStyle/worklet; коммит в React-стейт — через runOnJS, в жестах — на onEnd |
| 7 | Gesture Handler: simultaneousWithExternalGesture(Gesture.Native()) внутри скроллов |
| 8 | Никаких console.log в PanResponder, onScroll, анимациях |

## 8. Анти-паттерны (НЕ ДЕЛАТЬ)

| Категория | Запрет |
|---|---|
| Стейт | Серверные данные в Zustand; supabase.from() / supabase.auth.* в UI |
| Запросы | N+1 вместо вложенных select('…, days(…, exercises(*))') |
| UI | Math.random() в keyExtractor; LayoutAnimation (no-op в New Architecture); Image из RN |
| Схема | description в select из exercises; email в profiles; gen_random_uuid()::text для program_days.id/program_exercises.id |
| Анимации | Монтировать слайдеры в свёрнутых аккордеонах |
| Ошибки | Сырые ошибки Postgres пользователю; маскировать сбой бизнес-логики под «Успех» |
| БД | Неатомарные delete + insert без транзакции; дублирующиеся RLS-политики; SECURITY DEFINER без проверки auth.uid() |
| Секреты | Коммитить service_role/secret-ключи; регенерировать типы через --project-id / --linked |
| AI | Ключи LLM на клиенте (только Edge Functions); AI-рекомендации в обход injury_exercise_warnings; PII/детали фармакологии в LLM без явного согласия |
| Константы | Дублировать маппинги «уровень → цвет», «фаза → цвет» вместо канонических констант |

## 9. PRE-FLIGHT (перед изменением файла)

| № | Шаг |
|---|---|
| 1 | Подтвердить версию файла; при двух вариантах или пометке «разнобой версий» — спросить пользователя, не угадывать |
| 2 | grep -r "имя_файла" src/ app/ — найти всех потребителей; изменение экспорта = проверка всех импортов (карта — PROMPTS.md) |
| 3 | Проверить лимит строк: > 450 → сначала разбиение (SCALE-5) |
| 4 | Проверить долг файла в FILE_INVENTORY.md — не усугублять |
| 5 | Новая RPC → предупредить о рассинхроне database.types.ts, вызов делать строковым |
| 6 | Новая таблица → добавить в список RLS (§4) |

## 10. Формат ответа AI

| № | Блок ответа |
|---|---|
| 1 | Решение / код — целиком или в формате было/стало, в блоках с подсветкой синтаксиса |
| 2 | Самопроверка: стейт (React Query / Zustand), архитектура (нет supabase в UI), UI (useTheme, атомарные компоненты, нет хардкода), производительность (нет FlatList в ScrollView), лимит 500 строк |
| 3 | Поиск галлюцинаций: только API Expo SDK 54+/RN 0.81+/Reanimated v3; соответствие database.types.ts; edge-cases (пустые списки, loading/error, null) |
| 4 | Чек-лист сохранения функционала — таблица «функционал → статус → комментарий» |
| 5 | Обновление документов в том же ответе: статус → TASKS_STATUS.md, файл → FILE_INVENTORY.md, правило/архитектура → CLAUDE.md. Дублировать один факт в двух документах запрещено — ставить ссылку на ID |