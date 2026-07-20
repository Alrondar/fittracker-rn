# FitTracker RN — Полные инструкции для AI-ассистента

## 🎯 О проекте

Приложение для ведения тренировок на React Native (Expo).

- **Язык:** TypeScript ~5.9 (строгая типизация)
- **Навигация:** Expo Router ~6.0 (файловая, группы маршрутов `(tabs)`, `(auth)`)
- **Бэкенд:** Supabase (PostgreSQL + RLS + RPC), `@supabase/supabase-js` ^2.110. Project ID: `trgiihqqcovidwcqwdkl`
- **Стейт-менеджмент:**
  - `@tanstack/react-query` ^5.101 — для ВСЕХ серверных данных (списки, CRUD, пагинация).
  - `zustand` ^5 — ТОЛЬКО для UI-стейта (`isAuthenticated`, `userId`, `themePreferences`).
- **Стилизация:** Единая дизайн-система через `useTheme()` + атомарные UI-компоненты.
- **Анимации:** `react-native-reanimated` ^3.16 + `react-native-gesture-handler` ~2.28.
- **Иконки:** `lucide-react-native` ^1.24 + кастомные SVG (`react-native-svg` 15.12 + `react-native-svg-transformer`).
- **Изображения:** `expo-image` ~3.0 (замена Image из RN).
- **Тактильность:** `expo-haptics` ~15.0.
- **Drag & Drop:** `react-native-draggable-flatlist` ^4.0.
- **Runtime:** Expo SDK ~54, React Native 0.81.5, React 19.1.

---

## 🏗️ Архитектура

### Структура папок
app/ # Expo Router (экраны)
(auth)/ # Группа авторизации
(tabs)/ # Главный таб-бар
_layout.tsx # Таб-бар layout
index.tsx # Dashboard
exercises.tsx # Справочник упражнений (infinite scroll, фильтры)
history.tsx # История тренировок
programs.tsx # Программы тренировок
workouts.tsx # Тренировки
profile.tsx # Профиль пользователя
exercise/[id].tsx # Детальный экран упражнения (hero-слайдер, аккордеоны)
history/ # Детали истории
profile/ # Экраны профиля (без таб-бара)
goals.tsx # Цели и макросы
injuries.tsx # Травмы пользователя
metrics.tsx # Замеры тела
settings.tsx # Настройки (тема, профиль)
program/[id].tsx # Детальный экран программы
workout/[id].tsx # Экран тренировки (сессия + авторазминка)
src/
assets/equipment-icons/ # SVG-иконки оборудования (44 шт.)
components/
ui/ # Атомарные UI-компоненты (AppButton, AppCard, AppBadge, AppInput)
workout/ # Компоненты тренировки
ExerciseCard.tsx # Карточка упражнения (memo, аккордеоны, подходы)
ExerciseSlider.tsx # Горизонтальный слайдер: основная + альтернативы (memo)
ExerciseInfoAccordion.tsx # Аккордеон без обводки: цветной значок + шеврон
MuscleBubbles.tsx # Баблы мышц (окраска через getMuscleColor)
EquipmentBubbles.tsx # Чипы оборудования с SVG-иконками
TechniqueMediaSlider.tsx # Слайдер техники (media_url, автоплей 3с)
WarmupBlock.tsx # Блок разминки (таймеры, ленивые слайдеры)
RestTimer.tsx # Таймер отдыха
WorkoutTimer.tsx # Таймер тренировки
exercises/ # Компоненты справочника
CategoryStrip.tsx # Лента категорий + триггер оборудования
EquipmentSheet.tsx # Шкаф оборудования (поиск, мультиселект)
program/ # Компоненты программ
DayCard.tsx # Карточка дня программы
sheets/ # Модалки (DaySettings, ExercisePicker, ExerciseSettings, ScheduleEditor)
profile/ # Компоненты профиля (MacroPieChart)
Dashboard-компоненты: # ActivityCalendar, ExerciseProgressCard, LastWorkoutCard,
# PersonalRecordsCard, WeeklyStatsCard, ProgramProgressCard
Общие компоненты: # AnimatedButton, BottomSheet, CustomTabBar, EquipmentIcon,
# FadeIn, ProgramCard, ProgramFormSheet, SectionHeader,
# Skeleton, SwipeableCard, Toast/ToastProvider
hooks/
useBodyMetrics.ts # Замеры тела (CRUD, графики)
useExerciseDetail.ts # Детальный экран упражнения (React Query, staleTime: Infinity)
useExercises.ts # Справочник (useInfiniteQuery, debounce, фильтры)
useInjuryWarnings.ts # Предупреждения о травмах (avoid/caution)
useProfile.ts # Профиль пользователя
useProgramEditor.ts # Редактор программ (drag & drop, CRUD)
usePrograms.ts # Список программ (useInfiniteQuery)
useTheme.tsx # Тема (цвета, градиенты, отступы)
useToast.ts # Тосты
useWarmup.ts # Разминка (таймеры, отметки, генерация)
useWorkoutSession.ts # Сессия тренировки (useCallback + ref-зеркала для memo)
services/
exercisesService.ts # Упражнения: постраничный список, словари фильтров, по ID
metricsService.ts # Замеры тела
profileService.ts # Профиль, цели, травмы
programsService.ts # Программы (вложенные запросы)
warmupService.ts # Автогенерация разминки по целевым мышцам
store/ # Zustand (только UI-стейт!)
constants/
equipmentIcons.ts # Маппинг оборудование → SVG-файл
exerciseCategories.ts # Категории упражнений (value/label/icon)
injuries.ts # Маппинг травма → предупреждение (avoid/caution)
muscleColors.ts # Цвета групп мышц + getMuscleColor/getMuscleGroup
muscleGroups.ts # Группы мышц для фильтрации
theme.ts # Темы (5 акцентов × 2 режима), SPACING, BORDER_RADIUS
styles/
common.ts # Общие стили
typography.ts # Типографика
index.ts # Экспорт
components/
card/ # Модульная структура стилей карточек
base.ts, program.ts, workout.ts, exercise.ts,
filter.ts, sheet.ts, profile.ts, empty.ts, dynamic.ts
index.ts # Реэкспорт (createCardStyles)
workout.ts # Стили тренировки (createWorkoutStyles → RestTimer)
types/
database.types.ts # Автогенерация типов Supabase
index.ts # Общие типы (Exercise, Workout, SetLog...)
metrics.ts # Типы замеров тела
workout.ts # ExerciseData / AlternativeExercise (с media_url)
lib/
supabase.ts # Supabase клиент + хелперы getList/getString
Корневые скрипты (вспомогательные, Python):
apply_verified_mapping.py, extract_names.py, verified_mapping.json,
exercise_names_comparison.txt


---

## 🏋️ Данные упражнений (Supabase)

- Таблица `exercises` — **870+ записей**, названия на русском.
- **Категории** (поле `category`, скаляр): `strength`, `stretching`, `plyometrics`, `olympic weightlifting`, `powerlifting`, `cardio`. Русские подписи и иконки — в `constants/exerciseCategories.ts`.
- **Мышцы** (`primary_muscles`, `secondary_muscles` — массивы) на русском: «Грудь», «бицепс», «широчайшие»... Группы для фильтра — в `constants/muscleGroups.ts`.
- **Оборудование** (`equipment` — массив) на русском: «Штанга», «Кроссовер», «Тренажер»... (68 значений).
- **`media_url`** — одиночный URL в формате free-exercise-db: `.../exercises/Rowing_Stationary/0.jpg`. Клиент сам генерирует пару `0.jpg + 1.jpg` через `parseMediaUrls` в `TechniqueMediaSlider.tsx` (поддержаны также JSON-массив и список через запятую).
- ⚠️ **Колонки `description` в таблице НЕТ** — не включать в select (явный select несуществующей колонки роняет запрос ошибкой 42703).
- **Справочник:** пагинация 40/страница (`useInfiniteQuery`), лёгкий select (`id, name, primary_muscles, equipment`), серверные фильтры: `overlaps` (мышцы, оборудование), `in` (категория), `ilike` + `.or()` (поиск), debounce 300 мс, `keepPreviousData`, `staleTime: Infinity` для словарей фильтров.
- **Альтернативы упражнения:** поле `alternatives` (массив ID) + fallback по `overlaps('primary_muscles', ...)`.

---

## 🎨 Дизайн-система и стили

- **Темы:** 5 акцентов (purple, orange, blue, neon, pink), 2 режима (light, dark).
- **Правила стилизации:**
  - Все цвета через `const { colors } = useTheme()`.
  - СТРОГО ЗАПРЕЩЁН хардкод цветов (`#7c3aed`, `'white'`, `'#333'`) — использовать `colors.primary`, `colors.textInverse`, `colors.textPrimary`. (Остаточный исторический хардкод есть в `badge.ts`, `button.ts`, `common.ts`, `dashboard.ts` — не добавлять новый, постепенно вычищать.)
  - Отступы: `SPACING.xs/sm/md/lg/xl/xxl`. Радиусы: `BORDER_RADIUS.sm/md/lg/xl/full`.
  - Альфа-суффиксы — паттерн проекта: `colors.warning + '12'`, `colors.primary + '15'`.
- **Модульность стилей:** `card.ts` разбит на папку `src/styles/components/card/`. Импорт через `index.ts` (`createCardStyles`).
- **Иконки оборудования:** компонент `<EquipmentIcon name="..." size={...} primaryMuscles={[...]} />` (проп **`name`**, не `type`!). Цвет иконки автоматически кодируется по первой целевой мышце через `getMuscleColor`. Маппинг в `constants/equipmentIcons.ts`, fallback — гантель.
- **Цвета мышц:** только через `getMuscleColor(muscle)` из `constants/muscleColors.ts` (детальная мышца → группа → цвет). Никаких локальных маппингов.

### Единый дизайн-язык карточки упражнения

Применяется в тренировке, разминке, справочнике и детальном экране:

- **Живая обводка карточки:** `avoid` → `colors.error`, `caution` → `colors.warning`, заменено → `colors.primary`, все подходы заполнены → `colors.success + '60'`, по умолчанию → `colors.border`.
- **Аккордеоны** (`ExerciseInfoAccordion`): без контурных обводок, цветной значок + uppercase-заголовок + шеврон; анимация `maxHeight` (shared value, без измерения `onLayout`); `pointerEvents="none"` в свёрнутом состоянии; одна открытая секция на карточку (`openSection`).
- **Баблы мышц** (`MuscleBubbles`): primary — насыщенный цвет группы с точкой-маркером, secondary — нейтральный фон с цветной обводкой.
- **Слайдеры техники:** ленивый монтаж (`everOpened` — монтируется при первом открытии), автоплей 3с только в раскрытом аккордеоне (`autoPlay={openSection === 'technique'}`).

---

## ⚡ Производительность (ОБЯЗАТЕЛЬНО)

- Никогда не вкладывай VirtualizedLists (FlatList, DraggableFlatList) в ScrollView. Используй `ListHeaderComponent`.
- Никаких `console.log` в PanResponder, onScroll, анимациях.
- QueryClient создаётся ВНЕ компонента (в `_layout.tsx`).
- Файлы не должны превышать 500 строк (God Objects запрещены).
- Использовать `expo-image` вместо `Image` из React Native.
- **Фабрики стилей** (`createCardStyles(colors)` и др.) — только через `useMemo` на уровне экрана. НИКОГДА внутри `renderItem`.
- **Колбэки в карточки** — только `useCallback`; в хуках с зависимостью от массивов — ref-зеркала (`exercisesRef` в `useWorkoutSession`).
- **Карточки списков** — `React.memo` (работает только в паре с двумя пунктами выше).
- **Тяжёлые данные** (technique, benefits, risks, injuries, settings, alternatives, media_url) — не тянуть в списки; грузить по требованию на детальных экранах.

---

## 🚫 Анти-паттерны (НЕ ДЕЛАЙ ТАК)

- ❌ Хранить серверные данные в Zustand.
- ❌ Делать N+1 запросов к Supabase (используй вложенные `select('*, days(*, exercises(*))')`).
- ❌ Писать `supabase.from()` прямо в UI-компонентах (выноси в `services/` или хуки).
- ❌ Использовать `Math.random()` в `keyExtractor`.
- ❌ Использовать `LayoutAnimation` (no-op в New Architecture).
- ❌ Использовать `Image` из `react-native` (используй `expo-image`).
- ❌ Включать `description` в select из `exercises` (колонки не существует).
- ❌ Монтировать слайдеры/автоплеи в свёрнутых аккордеонах (ленивый монтаж через `everOpened`).

---

## 📝 ФОРМАТ ОТВЕТА AI (СТРОГО СОБЛЮДАТЬ)

При генерации кода или рефакторинге AI обязан использовать следующий формат ответа:

### 💡 Основное решение / Код
[Здесь сам код, архитектура или объяснение]

### 🔍 1. Самопроверка и сверка с контекстом
- ✅ Стейт: Серверные данные через React Query, UI через Zustand.
- ✅ Архитектура: Запросы вынесены в `src/services/`, в UI нет `supabase.from()`.
- ✅ UI/UX: Использован `useTheme()`, атомарные компоненты (AppButton), нет хардкода цветов.
- ✅ Производительность: Нет FlatList в ScrollView, нет console.log в жестах/анимациях.
- ✅ Лимиты: Файл не превышает 500 строк.

### 🛡️ 2. Поиск галлюцинаций и ошибок
- API/Библиотеки: Проверено, что используются только методы из Expo SDK 54+, RN 0.81+, Reanimated v3.
- Типизация: Проверено соответствие типам Supabase (`database.types.ts`), нет кастов к `any`.
- Логика: Проверены edge-cases (пустые списки, состояния loading/error, обработка null/undefined).

### ✅ 3. Отчёт о сохранении функционала (Чек-лист)
Критически важно при рефакторинге. AI явно показывает, что ни одна фича не потеряна.

| Исходный функционал / Поведение | Статус | Комментарий |
| :--- | :---: | :--- |
| Например: Drag & Drop упражнений | ✅ | Перенесено в useProgramEditor, DraggableFlatList |

---

## 📊 Статус задач

### ✅ ЭТАП 1: Фундамент и БД (ЗАВЕРШЁН)
React Query внедрён. N+1 устранены. Dashboard оптимизирован. `usePrograms.ts` на `useInfiniteQuery`.

### ✅ ЭТАП 2: Производительность (ЗАВЕРШЁН)
VirtualizedLists исправлены. `console.log` удалены из горячих путей. ScrollView → FlatList в `workout/[id].tsx`.

### ✅ ЭТАП 3: UI/UX и дизайн-система (ЗАВЕРШЁН)
UI-кит (AppButton, AppCard, AppBadge, AppInput) внедрён. `card.ts` разбит на модульную структуру.

### ✅ ЭТАП 4: Рефакторинг God Objects (ЗАВЕРШЁН)
Разобраны `workout/[id].tsx` и `program/[id].tsx`: хуки, DayCard, модалки в `program/sheets/`.

### ✅ ЭТАП 5: Новые фичи (ЗАВЕРШЁН)
- Замеры тела, система травм (avoid/caution), цели и макросы, настройки, Dashboard-виджеты.
- Программы: CRUD с модалками, drag & drop.
- **База упражнений:** 870+ записей, перевод, категории, `media_url`.
- **Авторазминка:** `warmupService` (ранжирование по целевым мышцам: primary +2 / secondary +1, категория `stretching`, топ-7), `useWarmup`, `WarmupBlock` — таймер на упражнение, техника-аккордеон со слайдером, «Пропустить» / «Показать снова».
- **Карточка упражнения:** полное название, `MuscleBubbles`, `ExerciseInfoAccordion` (техника / оборудование и настройки / польза / риски / противопоказания), `EquipmentBubbles` с SVG, слайдер техники, живая обводка, живой счётчик подходов.
- **Справочник:** `useExercises` + `exercisesService` — infinite query (40/стр), серверные фильтры (мышцы, категории, оборудование), debounce-поиск, словари фильтров со счётчиками из БД, `CategoryStrip`, `EquipmentSheet`.
- **Детальный экран упражнения:** `useExerciseDetail` — hero-слайдер, бейдж категории, карточка мышц с акцентом, альтернативы, skeleton/error/not-found.
- **Общие компоненты:** `TechniqueMediaSlider` (parseMediaUrls: 0.jpg→1.jpg, автоплей), `MuscleBubbles`, `EquipmentBubbles`, `ExerciseInfoAccordion`.
- **Производительность тренировки и справочника:** `useMemo`-стили, `useCallback` + ref-зеркала, `memo`-карточки, ленивые слайдеры, лёгкий select.

### 🚀 ЭТАП 6: Улучшения и полировка (В ПЛАНАХ)
- Разминка + травмы: исключение противопоказанных упражнений из авторазминки.
- Личные рекорды: максимумы из workout_logs на детальном экране упражнения.
- Таймер отдыха: звуковое уведомление + автозапуск следующего подхода.
- Калькулятор блинов: раскладка блинов по весу штанги.
- Тип активности «Активация»: тег для упражнений с резинками/мобилизацией.
- Сортировка «По популярности»: count по workout_exercises (сейчас заглушка).
- Фото прогресса: привязка фото к замерам тела (Supabase Storage).
- Полнотекстовый поиск: pg_trgm + GIN-индекс.
- Аудит тёмной темы: контраст и читаемость во всех 10 комбинациях.
- Чистка мёртвого кода: стилевые ключи, кодировки, database.types.ts.
- Подготовка к релизу: EAS Build, иконки, сплэш-скрин.

### 🔮 ЭТАП 7: Дальнейшее развитие (ИДЕИ)
- Видео техники (mp4 в media_url).
- Избранные упражнения.
- Офлайн-режим (локальный кэш каталога).
- Онбординг первого запуска.
- Аналитика и краш-репортинг (Sentry).
- Экспорт истории тренировок.