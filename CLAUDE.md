# FitTracker RN — Полные инструкции для AI-ассистента

## 🎯 О проекте
Приложение для ведения тренировок на React Native (Expo).
- **Язык:** TypeScript (строгая типизация)
- **Навигация:** Expo Router v6 (файловая, группы маршрутов `(tabs)`, `(auth)`)
- **Бэкенд:** Supabase (PostgreSQL + RLS + RPC)
- **Стейт-менеджмент:**
  - **React Query (TanStack Query v5)** — для ВСЕХ серверных данных (списки, CRUD, пагинация)
  - **Zustand v5** — ТОЛЬКО для UI-стейта (`isAuthenticated`, `userId`, `themePreferences`)
- **Стилизация:** Единая дизайн-система через `useTheme()` + атомарные UI-компоненты
- **Анимации:** `react-native-reanimated` v3 + `react-native-gesture-handler`

## 🏗️ Архитектура

### Структура папок
app/ # Expo Router (экраны)
(auth)/ # Группа авторизации
(tabs)/ # Главный таб-бар (6 вкладок)
workout/[id].tsx # Детальные экраны (без таб-бара)
program/[id].tsx
history/[id].tsx
exercise/[id].tsx
src/
components/ # Компоненты
ui/ # 🆕 Атомарные UI-компоненты (AppButton, AppCard)
workout/ # Компоненты тренировки (ExerciseSlider, RestTimer, WorkoutTimer)
hooks/ # Кастомные хуки (usePrograms, useToast, useTheme)
services/ # Сервисы для работы с Supabase (programsService.ts)
store/ # Zustand (только UI-стейт!)
constants/ # Темы, цвета мышц, группы мышц, иконки оборудования
styles/ # Стили (card.ts, button.ts, workout.ts и т.д.)
types/ # TypeScript типы (workout.ts, index.ts)
lib/ # supabase.ts клиент
assets/ # SVG иконки оборудования (44 файла)

### RPC-функции Supabase
- `copy_program_for_user(p_program_id, p_user_id)` — копирует программу со всеми днями и упражнениями
- `update_exercise_position(p_exercise_id, p_new_position)` — обновляет позицию упражнения
- `advanceProgramProgress(userId, programId)` — продвигает прогресс по программе (неделя/день)

### Система травм и предупреждений
- Таблица `user_injuries` хранит травмы пользователя (body_part, injury_type, severity, status)
- Таблица `injury_exercise_warnings` содержит правила предупреждений
- В `workout/[id].tsx` реализована проверка упражнений на совместимость с травмами
- Два уровня предупреждений: `avoid` (красный ⛔) и `caution` (жёлтый ⚠️)
- Маппинги `BODY_PART_RU` и `INJURY_TYPE_RU` вынесены в константы (нужно перенести в `src/constants/`)

## 🎨 Дизайн-система

### Темы
- 5 акцентов: purple, orange, blue, neon, pink
- 2 режима: light, dark
- Итого 10 тем
- Хранение в AsyncStorage (`@fittracker_theme_mode`, `@fittracker_theme_accent`)
- Динамическая смена через `useTheme()`

### Атомарные UI-компоненты (используй их вместо ручных стилей)
- `<AppButton variant="primary|secondary|danger|ghost" size="small|medium|large" />`
- `<AppCard variant="default|compact|highlighted" />`
- `<AppBadge />`, `<AppInput />` (в разработке)

### Правила стилизации
- Все цвета бери через `const { colors } = useTheme()`
- Никогда не хардкодь цвета (`#7c3aed` и т.д.) — только `colors.primary`, `colors.error`
- Отступы: `SPACING.xs/sm/md/lg/xl/xxl` из `src/constants/theme.ts`
- Радиусы: `BORDER_RADIUS.sm/md/lg/xl/full`

## ⚡ Производительность (ОБЯЗАТЕЛЬНО)

1. **Никогда не вкладывай VirtualizedLists** (`FlatList`, `DraggableFlatList`) в `ScrollView`. Используй `ListHeaderComponent` / `ListFooterComponent`.
2. **Для длинных списков — только `FlatList`**, не `ScrollView + map`.
3. **Никаких `console.log` в `PanResponder`, `onScroll`, анимациях** — это блокирует JS-поток.
4. **`QueryClient` создавай ВНЕ компонента** (в `_layout.tsx`), чтобы не пересоздавался при рендере.
5. **Используй `React.memo`** для тяжёлых компонентов (карточки упражнений, списки).
6. **Сортируй данные на клиенте**, а не в БД (для небольших массивов).
7. **Используй `Promise.allSettled`** для параллельных запросов + проверяй `status === 'fulfilled'`.

## 📱 Навигация (Expo Router)

- Роуты определяются структурой папок в `app/`
- Группы `(tabs)` и `(auth)` — для разных лейаутов
- Детальные экраны (`workout/[id]`, `program/[id]`) — на уровне `app/`, чтобы не показывать таб-бар
- Модалки: `options={{ presentation: 'modal' }}` в `_layout.tsx`
- ⚠️ **Удалить мертвый роут** `workout/create` из `_layout.tsx` (файл не существует)

## 🐛 Отладка

- Используй `console.error` для реальных ошибок
- `console.warn` для не критичных проблем
- `console.log` — только в `__DEV__` режиме и вне горячих путей
- ️ **Удалить все console.log** из `_layout.tsx`, `BottomSheet.tsx`, `SwipeableCard.tsx`

## 🚫 Анти-паттерны (НЕ ДЕЛАЙ ТАК)

1. ❌ Хранить серверные данные в Zustand
2. ❌ Делать N+1 запросов к Supabase
3.  Вкладывать `FlatList` в `ScrollView`
4. ❌ Использовать `console.log` в `PanResponder`
5. ❌ Хардкодить цвета вместо `colors.primary`
6. ❌ Создавать `QueryClient` внутри компонента
7.  Писать `supabase.from()` прямо в UI-компонентах
8. ❌ Использовать `Math.random()` в `keyExtractor`
9. ❌ Создавать файлы-монстры (>500 строк) — разбивай на хуки и компоненты
10.  Использовать `LayoutAnimation` (no-op в New Architecture)

## ✅ Паттерны (ДЕЛАЙ ТАК)

1. ✅ Выноси бизнес-логику в кастомные хуки (`useWorkoutSession`, `useProgramEditor`)
2. ✅ Используй `useInfiniteQuery` для пагинации
3. ✅ Используй `useMutation` для CRUD + `queryClient.invalidateQueries()` для обновления кэша
4. ✅ Применяй атомарные UI-компоненты (`AppButton`, `AppCard`)
5. ✅ Сортируй данные на клиенте, а не в БД (для небольших массивов)
6. ✅ Используй `Promise.allSettled` для параллельных запросов
7. ✅ Проверяй `status === 'fulfilled'` при работе с `Promise.allSettled`
8. ✅ Используй вложенные запросы Supabase: `select('*, days(*, exercises(*))')`
9. ✅ Батч-вставки: `.insert([array_of_objects])`

## 📦 Зависимости (важные)

- `@tanstack/react-query` v5 — серверный стейт
- `zustand` v5 — UI-стейт
- `expo-router` v6 — навигация
- `react-native-reanimated` v3 — анимации (UI-поток)
- `react-native-draggable-flatlist` — drag & drop
- `lucide-react-native` — иконки
- `@supabase/supabase-js` — клиент БД
- `expo-haptics` — тактильная обратная связь

## 📝 Типизация БД

- Сгенерировать типы: `npx supabase gen types typescript --project-id trgiihqqcovidwcqwdkl > src/types/database.types.ts`
- Подключить в `src/lib/supabase.ts`: `createClient<Database>(...)`
- Это избавит от `any` и улучшит автодополнение

## 📊 Статус задач

### ✅ ЭТАП 1: Фундамент и БД (ЗАВЕРШЁН)
- [x] React Query внедрён в `_layout.tsx` (QueryClientProvider)
- [x] N+1 запросы устранены в `getProgramWithDays` (вложенные запросы)
- [x] Dashboard оптимизирован (`Promise.allSettled` для 8 параллельных запросов)
- [x] `usePrograms.ts` переписан на `useInfiniteQuery`
- [x] Исправлен маппинг данных в `getProgramWithDays` (явные поля вместо `...program`)

### 🔄 ЭТАП 2: Производительность (В ПРОЦЕССЕ)
- [x] VirtualizedLists исправлены в `program/[id].tsx` (FlatList + DraggableFlatList)
- [x] Исправлены ключи в `DayCard` (стабильные ключи вместо `Math.random()`)
- [x] Удалить `console.log` из `BottomSheet.tsx` (PanResponder)
- [x] Удалить `console.log` из `SwipeableCard.tsx` (PanResponder)
- [x] Удалить `console.log` из `_layout.tsx` (отладочные логи)
- [x] Заменить `ScrollView` на `FlatList` в `workout/[id].tsx`
- [x] Удалить `LayoutAnimation` из `usePrograms.ts` (no-op в New Architecture)
- [x] Удалить мертвый роут `workout/create` из `_layout.tsx`

###  ЭТАП 3: UI/UX и дизайн-система
- [x] Создан `AppButton` в `src/components/ui/`
- [x] Создан `AppCard` в `src/components/ui/`
- [x] Внедрён в `goals.tsx`
- [x] Создать `AppBadge`, `AppInput`
- [ ] Постепенно заменить старые стили на UI-кит в остальных экранах

### ⏳ ЭТАП 4: Рефакторинг God Objects
- [ ] Разобрать `workout/[id].tsx` (~600 строк):
  - Вынести `useWorkoutSession` хук
  - Вынести `useInjuryWarnings` хук
  - Перенести маппинги `BODY_PART_RU`, `INJURY_TYPE_RU` в `src/constants/injuries.ts`
- [ ] Разобрать `program/[id].tsx` (~800 строк):
  - Вынести `DayCard` в отдельный файл
  - Вынести `ExerciseSettingsSheet`, `DaySettingsSheet`, `ExercisePickerSheet`, `ScheduleEditorSheet` в `src/components/program/sheets/`
  - Создать `useProgramEditor` хук

## 🔧 Критические файлы для рефакторинга

| Файл | Строк | Проблема | Приоритет |
|------|-------|----------|-----------|
| `app/workout/[id].tsx` | ~600 | God Object, ScrollView вместо FlatList | P0 |
| `app/program/[id].tsx` | ~800 | God Object, вложенные модалки | P0 |
| `src/hooks/usePrograms.ts` | ~250 | Старый код без React Query (нужно обновить) | P1 |
| `src/components/BottomSheet.tsx` | ~150 | console.log в PanResponder | P1 |
| `src/components/SwipeableCard.tsx` | ~120 | console.log в PanResponder | P1 |
| `app/_layout.tsx` | ~100 | 20+ console.log, мертвый роут | P1 |

### 💡 Основное решение / Код
[Здесь сам код, архитектура или объяснение]

### 🔍 1. Самопроверка и сверка с контекстом
- ✅ **Стейт:** Серверные данные через React Query, UI через Zustand.
- ✅ **Архитектура:** Запросы вынесены в `src/services/`, в UI нет `supabase.from()`.
- ✅ **UI/UX:** Использован `useTheme()`, атомарные компоненты (`AppButton`), нет хардкода цветов.
- ✅ **Производительность:** Нет `FlatList` в `ScrollView`, нет `console.log` в жестах/анимациях.

### 🛡️ 2. Поиск галлюцинаций и ошибок
- **API/Библиотеки:** Проверено, что используются только методы из Expo SDK 51+, RN 0.74+, Reanimated v3. (Например, не используется устаревший `Animated` вместо `Reanimated`).
- **Типизация:** Проверено соответствие типам Supabase (`database.types.ts`), нет кастов к `any`.
- **Логика:** Проверены edge-cases (пустые списки, состояния loading/error, обработка null/undefined).

### ✅ 3. Отчет о сохранении функционала (Чек-лист)
*Критически важно при рефакторинге. Я явно покажу, что ни одна фича не потеряна.*
| Исходный функционал / Поведение | Статус | Комментарий (как сохранено / куда перенесено) |
| :--- | :---: | :--- |
| *Например: Drag & Drop упражнений* | ✅ | Перенесено в `useProgramEditor`, используется `DraggableFlatList` |
| *Например: Проверка травм (avoid/caution)*| ✅ | Вынесено в кастомный хук `useInjuryWarnings` |
| *Например: Анимация свайпа карточки* | ✅ | Сохранена в `SwipeableCard`, убраны только `console.log` |