# FitTracker RN — Полные инструкции для AI-ассистента

## 🎯 О проекте

Приложение для ведения тренировок на React Native (Expo).

- **Язык:** TypeScript ~5.9 (строгая типизация)
- **Навигация:** Expo Router ~6.0 (файловая, группы маршрутов `(tabs)`, `(auth)`)
- **Бэкенд:** Supabase (PostgreSQL + RLS + RPC), `@supabase/supabase-js` ^2.110
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

## 🏗️ Архитектура

### Структура папок
app/ # Expo Router (экраны)
(auth)/ # Группа авторизации
(tabs)/ # Главный таб-бар
_layout.tsx # Таб-бар layout
index.tsx # Dashboard (главный экран)
exercises.tsx # База упражнений (поиск, фильтры)
history.tsx # История тренировок
programs.tsx # Программы тренировок
workouts.tsx # Тренировки
profile.tsx # Профиль пользователя
exercise/[id].tsx # Детальный экран упражнения
history/ # Детали истории
profile/ # Экраны профиля (без таб-бара)
goals.tsx # Цели и макросы
injuries.tsx # Травмы пользователя
metrics.tsx # Замеры тела
settings.tsx # Настройки (тема, профиль)
program/[id].tsx # Детальный экран программы
workout/[id].tsx # Экран тренировки (сессия + разминка)
src/
assets/equipment-icons/ # SVG-иконки оборудования (barbell, dumbbell, kettlebell, cable, machine, bodyweight, bands, foam_roll, exercise_ball, medicine_ball, e-z_curl_bar, mat, partner, push-up_bar, smith_machine и др.)
components/
ui/ # Атомарные UI-компоненты (AppButton, AppCard, AppBadge, AppInput)
workout/ # Компоненты тренировки (ExerciseCard, ExerciseSlider, CollapsibleSection, GroupedSection, RestTimer, WorkoutTimer)
program/ # Компоненты программ
DayCard.tsx # Карточка дня программы
sheets/ # Модалки (DaySettingsSheet, ExercisePickerSheet, ExerciseSettingsSheet, ScheduleEditorSheet)
profile/ # Компоненты профиля (MacroPieChart)
# Dashboard-компоненты:
ActivityCalendar.tsx # Календарь активности
ExerciseProgressCard.tsx # Прогресс упражнения
LastWorkoutCard.tsx # Последняя тренировка
PersonalRecordsCard.tsx # Личные рекорды
ProgramProgressCard.tsx # Прогресс программы
WeeklyStatsCard.tsx # Недельная статистика
# Общие компоненты:
AnimatedButton.tsx # Кнопка с анимацией
BottomSheet.tsx # Кастомный bottom sheet
CustomTabBar.tsx # Кастомный таб-бар
EquipmentIcon.tsx # Иконка оборудования (SVG)
FadeIn.tsx # Анимация появления
ProgramCard.tsx # Карточка программы
ProgramFormSheet.tsx # Форма создания/редактирования программы
SectionHeader.tsx # Заголовок секции
Skeleton.tsx # Скелетон загрузки
SwipeableCard.tsx # Свайпаемая карточка
Toast.tsx / ToastProvider.tsx # Система уведомлений
hooks/
useBodyMetrics.ts # Замеры тела (CRUD, графики)
useInjuryWarnings.ts # Предупреждения о травмах (avoid/caution)
useProfile.ts # Профиль пользователя
useProgramEditor.ts # Редактор программ (drag & drop, CRUD)
usePrograms.ts # Список программ (useInfiniteQuery)
useTheme.tsx # Тема (цвета, градиенты, отступы)
useToast.ts # Тосты
useWorkoutSession.ts # Сессия тренировки (таймер, подходы, разминка)
services/
metricsService.ts # Supabase: замеры тела
profileService.ts # Supabase: профиль, цели, травмы
programsService.ts # Supabase: программы (вложенные запросы)
store/ # Zustand (только UI-стейт!)
constants/
equipmentIcons.ts # Маппинг оборудования → SVG-иконка
injuries.ts # Маппинг травм → предупреждения (avoid/caution)
muscleColors.ts # Цвета групп мышц
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
index.ts # Реэкспорт
workout.ts # Стили тренировки
types/
database.types.ts # Автогенерация типов Supabase
index.ts # Общие типы
metrics.ts # Типы замеров тела
workout.ts # Типы тренировок и упражнений
lib/
supabase.ts # Supabase клиент (с AsyncStorage для сессии)
Корневые скрипты (вспомогательные):
apply_verified_mapping.py # Применение верифицированного маппинга упражнений
extract_names.py # Извлечение имён упражнений для сравнения
verified_mapping.json # Верифицированный маппинг EN→RU
exercise_names_comparison.txt # Сравнение имён

## 🎨 Дизайн-система и Стили

- **Темы:** 5 акцентов (purple, orange, blue, neon, pink), 2 режима (light, dark).
- **Правила стилизации:**
  - Все цвета брать через `const { colors } = useTheme()`.
  - **СТРОГО ЗАПРЕЩЕНО** хардкодить цвета (`#7c3aed`, `'white'`, `'#333'`) — использовать `colors.primary`, `colors.textInverse`, `colors.textPrimary`.
  - Отступы: `SPACING.xs/sm/md/lg/xl/xxl`. Радиусы: `BORDER_RADIUS.sm/md/lg/xl/full`.
- **Модульность стилей:** Файл `card.ts` разбит на папку `src/styles/components/card/` (base, program, workout, exercise, filter, sheet, profile, empty, dynamic). Импорт через `index.ts`.
- **Иконки оборудования:** Использовать компонент `<EquipmentIcon type="..." />` из `src/components/EquipmentIcon.tsx`. Маппинг в `constants/equipmentIcons.ts`.

## ⚡ Производительность (ОБЯЗАТЕЛЬНО)

- Никогда не вкладывай VirtualizedLists (FlatList, DraggableFlatList) в ScrollView. Используй `ListHeaderComponent`.
- Никаких `console.log` в PanResponder, onScroll, анимациях.
- QueryClient создаётся ВНЕ компонента (в `_layout.tsx`).
- Файлы не должны превышать 500 строк (God Objects запрещены).
- Использовать `expo-image` вместо `Image` из React Native.

## 🚫 Анти-паттерны (НЕ ДЕЛАЙ ТАК)

- ❌ Хранить серверные данные в Zustand.
- ❌ Делать N+1 запросов к Supabase (используй вложенные `select('*, days(*, exercises(*))')`).
- ❌ Писать `supabase.from()` прямо в UI-компонентах (выноси в `services/` или хуки).
- ❌ Использовать `Math.random()` в `keyExtractor`.
- ❌ Использовать `LayoutAnimation` (no-op в New Architecture).
- ❌ Использовать `Image` из `react-native` (используй `expo-image`).

## 📝 ФОРМАТ ОТВЕТА AI (СТРОГО СОБЛЮДАТЬ)

При генерации кода или рефакторинге AI обязан использовать следующий формат ответа:

### 💡 Основное решение / Код

[Здесь сам код, архитектура или объяснение]

### 🔍 1. Самопроверка и сверка с контекстом

- ✅ **Стейт:** Серверные данные через React Query, UI через Zustand.
- ✅ **Архитектура:** Запросы вынесены в `src/services/`, в UI нет `supabase.from()`.
- ✅ **UI/UX:** Использован `useTheme()`, атомарные компоненты (AppButton), нет хардкода цветов.
- ✅ **Производительность:** Нет FlatList в ScrollView, нет console.log в жестах/анимациях.
- ✅ **Лимиты:** Файл не превышает 500 строк.

### 🛡️ 2. Поиск галлюцинаций и ошибок

- **API/Библиотеки:** Проверено, что используются только методы из Expo SDK 54+, RN 0.81+, Reanimated v3.
- **Типизация:** Проверено соответствие типам Supabase (`database.types.ts`), нет кастов к `any`.
- **Логика:** Проверены edge-cases (пустые списки, состояния loading/error, обработка null/undefined).

### ✅ 3. Отчёт о сохранении функционала (Чек-лист)

Критически важно при рефакторинге. AI явно показывает, что ни одна фича не потеряна.

| Исходный функционал / Поведение | Статус | Комментарий |
| :--- | :---: | :--- |
| Например: Drag & Drop упражнений | ✅ | Перенесено в useProgramEditor, DraggableFlatList |
| Например: Проверка травм (avoid/caution) | ✅ | Вынесено в useInjuryWarnings |

## 📊 Статус задач

### ✅ ЭТАП 1: Фундамент и БД (ЗАВЕРШЁН)

- React Query внедрён в `_layout.tsx`.
- N+1 запросы устранены (вложенные запросы).
- Dashboard оптимизирован (Promise.allSettled).
- `usePrograms.ts` переписан на `useInfiniteQuery`.

### ✅ ЭТАП 2: Производительность (ЗАВЕРШЁН)

- VirtualizedLists исправлены (FlatList + DraggableFlatList).
- Удалены все `console.log` из PanResponder и горячих путей.
- Заменён ScrollView на FlatList в `workout/[id].tsx`.
- Удалён мёртвый роут `workout/create`.

### ✅ ЭТАП 3: UI/UX и дизайн-система (ЗАВЕРШЁН)

- Создан UI-кит (AppButton, AppCard, AppBadge, AppInput).
- Внедрён во все основные экраны и детальные страницы.
- Убран хардкод цветов из всех файлов стилей.
- Файл `card.ts` (1750 строк) разбит на модульную структуру `card/`.
- Добавлены стили filter для карточек.

### ✅ ЭТАП 4: Рефакторинг God Objects (ЗАВЕРШЁН)

- Разобран `workout/[id].tsx`: вынесены `useWorkoutSession`, `useInjuryWarnings`, маппинги в `constants/injuries.ts`.
- Разобран `program/[id].tsx`: вынесен `useProgramEditor`, `DayCard`, модалки в `program/sheets/`.

### ✅ ЭТАП 5: Новые фичи (ЗАВЕРШЁН)

- **Замеры тела:** `useBodyMetrics`, `metricsService`, экран `profile/metrics.tsx`, типы `metrics.ts`, компонент `MacroPieChart`.
- **Система травм:** `useInjuryWarnings`, `constants/injuries.ts`, экран `profile/injuries.tsx`. Предупреждения avoid/caution при выборе упражнений.
- **Цели и макросы:** Экран `profile/goals.tsx`, расчёт БЖУ, `MacroPieChart`.
- **Настройки профиля:** Экран `profile/settings.tsx` (тема, данные пользователя).
- **Dashboard:** ActivityCalendar, ExerciseProgressCard, LastWorkoutCard, PersonalRecordsCard, WeeklyStatsCard, ProgramProgressCard.
- **База упражнений:** Поиск, фильтрация по группам мышц (чипы + аккордеон), сортировка.
- **Иконки оборудования:** SVG-набор + компонент `EquipmentIcon`.
- **Разминка:** Функциональность разминки интегрирована в экран тренировки `workout/[id].tsx`.
- **Программы:** CRUD с модалками (DaySettingsSheet, ExercisePickerSheet, ExerciseSettingsSheet, ScheduleEditorSheet), drag & drop.
- **Обработка дубликатов:** Скрипты `apply_verified_mapping.py`, `extract_names.py`, `verified_mapping.json`.

### 🚀 ЭТАП 6: Дальнейшие улучшения (В ПЛАНАХ)

- **Автогенерация разминки:** Алгоритм, который на основе основных упражнений в тренировочном дне автоматически подбирает и формирует блок разминки (целевые мышцы + суставы).
- **Тип активности «Активация»:** Новый тег/тип для упражнений (работа с резинками, мобилизация).
- **Фото прогресса:** Привязка фото к замерам тела.
- **Подготовка к релизу:** EAS Build, иконки, сплэш-скрин.

## 🔧 Генерация типов Supabase

При обновлении схемы БД:

```powershell
# PowerShell (UTF-16 проблема) — использовать:
npx supabase gen types typescript --project-id <ID> --schema public | Out-File -Encoding utf8 src/types/database.types.ts