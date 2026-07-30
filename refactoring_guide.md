# Master Refactoring Guide — FitTracker RN

*Аудит проведён по фактическому коду из контекста, сверен с `CLAUDE.md`. Там, где я не могу проверить факт без доступа к live-БД (например, реальные RLS-политики), я это явно помечаю как «требует проверки», а не выдаю за подтверждённый факт.*

---

## ЧАСТЬ 1. Глобальный отчёт о состоянии

**Ядро приложения:** трекер тренировок на Expo/RN + Supabase. Ключевые бизнес-процессы: периодизированные программы (`programs → program_phases → program_days → program_exercises`), сессия тренировки с логированием подходов, авто-разминка с учётом травм, справочник из 870+ упражнений с нечётким поиском, цели/КБЖУ, шаринг программ по коду. Стейт: React Query для сервера, Zustand для UI. Архитектурно проект уже прошёл несколько раундов чистки (SEC-1/3/4/5/10, RPC-1/2 закрыты) — база в целом здоровая, но именно поэтому оставшиеся проблемы стоит добивать так же системно.

### 🔴 Топ-5 критических проблем (стабильность/безопасность)

| # | Проблема | Где |
| --- | --- | --- |
| 1 | **Пробел в документации RLS для чувствительных таблиц.** В `CLAUDE.md` расписаны политики для `profiles/programs/.../body_metrics/exercises`, но таблицы **`user_injuries`** (`injuriesService.ts`) и **`nutrition_logs`** (`profileService.ts`) в списке RLS **отсутствуют**. Это медицинские/диетические данные пользователя. Не могу подтвердить факт утечки без доступа к БД, но это ровно тот класс пробела, который аудит обязан поднять красным флагом. | `src/services/injuriesService.ts`, `src/services/profileService.ts` |
| 2 | **SEC-2 (подтверждено кодом).** `updateSet()` в `useWorkoutSession.ts` — чисто локальный `setExercises()`, ни одного сетевого вызова. Краш = потеря всей тренировки. |  `src/hooks/useWorkoutSession.ts` |
| 3 | **SEC-7 (подтверждено дословно).** В `saveWorkout()` при падении `advanceProgramProgress` catch-блок показывает `Alert.alert('Успех', ...)` — то есть **явно врёт** пользователю об успехе при сбое продвижения программы. | `src/hooks/useWorkoutSession.ts` |
| 4 | **Неатомарные множественные записи без транзакций** — системный паттерн, не единичный случай. `useProgramEditor.saveProgram()` шлёт десятки промисов через `Promise.all`; т.к. Supabase-JS **резолвит** промис даже при ошибке (не реджектит), `Promise.all` не прерывается — часть мутаций применяется, часть падает, наружу летит только `errors[0]`. Тот же паттерн (delete+insert без транзакции) — в `saveWorkout()` (SEC-6). | `src/hooks/useProgramEditor.ts`, `src/hooks/useWorkoutSession.ts` |
| 5 | **Систематическая ошибка в алгоритме личных рекордов на дашборде.** `personalRecordsResult` в `dashboardService.ts` берёт `ORDER BY weight_kg DESC LIMIT 50` **по всем упражнениям сразу**, потом группирует по `exercise_id`. Если пользователь делает тяжёлый присед/жим ногами, эти 50 строк могут целиком состоять из одного-двух упражнений — рекорды по изоляционным/лёгким упражнениям физически не попадут в выборку и не покажутся, хотя fallback (`profileService.getPersonalRecords`) сработает только при **нулевом** результате, а не при перекошенном. | `src/services/dashboardService.ts` |

### 🟠 Топ-3 архитектурных долга (тормозят разработку)

1. **ARCH-1 — фрагментация Bottom Sheet, теперь с конкретными доказательствами.** Насчитал **три разных поведения затемнения фона** у шторок: через `colors.overlay` (правильно, `SheetShell.tsx`, модалки в `profile.tsx`/`metrics.tsx`), через хардкод `'rgba(0,0,0,0.5)'` (`EquipmentSheet.tsx`, `ExercisePickerSheet.tsx` — дважды, `ProgramFormSheet.tsx`) и **вообще без затемнения** (`DaySettingsSheet.tsx`, `ExerciseSettingsSheet.tsx`, `ScheduleEditorSheet.tsx` — у них просто нет `backgroundColor` на подложке). Это не только хардкод цвета, это заметный пользователю визуальный баг: одни шторки в редакторе программы тёмный фон дают, другие — нет.
2. **ARCH-2 — два Toast, оба с захардкоженными и продублированными цветами.** `useToast.ts` и `ToastProvider.tsx` — независимые системы; `ToastProvider`'s React Context (`useToast` из него) нигде не импортируется (везде используют `hooks/useToast.ts`) → чистый мёртвый код, при этом оба файла хардкодят одну и ту же палитру `#10b981/#ef4444/#7c3aed` по отдельности.
3. **🆕 Рассинхронизация таблиц иконок оборудования (`EQUIPMENT_SVG_MAP` ↔ `ICON_MAP`).** Обе таблицы должны быть зеркальны, но разошлись в обе стороны без какой-либо runtime/type-проверки этого инварианта (см. Часть 2.F).

---

## ЧАСТЬ 2. Детальная инструкция по переработке

### A. Безопасность и контроль доступа

**Файл/Модуль:** `src/services/injuriesService.ts`, `src/services/profileService.ts` (секции `nutrition_logs`)
**Текущая проблема:** Таблицы `user_injuries` и `nutrition_logs` активно читаются/пишутся из кода, но отсутствуют в консолидированном списке RLS-политик `CLAUDE.md` (12 политик, покрывающих 9 групп таблиц). Либо политики есть, но не задокументированы, либо их нет вовсе — второй вариант означает, что любой авторизованный пользователь потенциально может прочитать/изменить чужие травмы и дневники питания.
**Требуемое действие:** Выполнить `SELECT * FROM pg_policies WHERE tablename IN ('user_injuries','nutrition_logs');` через SQL Editor. Если политик нет — завести их по образцу `body_metrics` (`ALL` по `auth.uid() = user_id`). В любом случае — дописать раздел RLS в `CLAUDE.md`.
**Пример кода (миграция, если политик нет):**
```sql
ALTER TABLE user_injuries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own injuries" ON user_injuries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- аналогично для nutrition_logs
```

---

### B. Целостность данных при записи (атомарность)

**Файл/Модуль:** `src/hooks/useWorkoutSession.ts`
**Текущая проблема:** Три связанные проблемы в одном файле:
1. SEC-2 — `updateSet` не персистит ничего до `saveWorkout`.
2. SEC-7 — ошибка `advanceProgramProgress` в `catch` показывается пользователю как `Alert.alert('Успех', ...)`.
3. 🆕 Эффект «сохранить прогресс при размонтировании» на самом деле привязан к массиву зависимостей `[isWorkoutActive, isFinishing, workoutId]`, а не только к unmount — cleanup срабатывает и при обычной смене `isFinishing` на `true` внутри `saveWorkout`, отправляя лишний (хоть и безобидный по значению) `UPDATE workouts.duration_seconds` прямо в момент финализации тренировки.

**Требуемое действие:**
- Добавить debounce-автосохранение подходов (500кг веса/повторы) через RPC `upsert_workout_logs` (уже спроектирован в `CLAUDE.md` как RPC-3) — закрывает SEC-2 и заодно делает `saveWorkout` идемпотентным без `DELETE`+`INSERT` (закрывает SEC-6).
- В `catch (progressError)` показывать реальную ошибку и НЕ писать «Успех»; предложить повторить `advanceProgramProgress` отдельной кнопкой.
- Вынести таймер/cleanup-эффект «сохранить длительность» в отдельный `useEffect(() => () => {...}, [])` с пустым массивом зависимостей + читать `isFinishing`/`isWorkoutActive` через ref, а не через замыкание.

**Пример кода (текущий баг, дословно):**
```ts
} catch (progressError: any) {
  console.error('Ошибка обновления прогресса:', progressError);
  Alert.alert(
    'Успех', // ← должно быть 'Ошибка' + progressError.message
    `Тренировка завершена!\nВремя: ${formattedTime}\nСохранено подходов: ${totalLogs}`
  );
  router.replace('/(tabs)/history');
}
```

---

**Файл/Модуль:** `src/hooks/useProgramEditor.ts` → `saveProgram()`
**Текущая проблема:** PERF-4 (два запроса на каждое существующее упражнение: RPC `update_exercise_position` + отдельный `.update()`), PERF-6 (нет транзакции). Технически важная деталь: `supabase-js` не реджектит промис при ошибке API, он резолвит его с `{error}`. Поэтому `Promise.all(updatePromises)` **не остановится** на первой ошибке — все операции будут выполнены (успешные применятся), а пользователю прилетит только `errors[0].error`. Итог: частичное, тихое искажение программы при любом сетевом сбое посреди сохранения.
**Требуемое действие:** Свернуть весь блок сохранения фазы/дня/упражнения в один Postgres RPC с реальной транзакцией (`BEGIN...COMMIT`), принимающий JSON-снапшот дерева программы. Один network round-trip, один источник правды об успехе/неудаче.
**Пример кода (текущее поведение):**
```ts
updatePromises.push(Promise.resolve(supabase.rpc('update_exercise_position', {...})));
updatePromises.push(Promise.resolve(supabase.from('program_exercises').update({...}).eq('id', exercise.id)));
// ...
const results = await Promise.all(updatePromises); // не прерывается на ошибке
const errors = results.filter((r: any) => r && r.error);
if (errors.length > 0) throw errors[0].error; // остальные N-1 успешных мутаций уже применены
```

---

### C. Корректность бизнес-логики

**Файл/Модуль:** `src/services/dashboardService.ts`
**Текущая проблема:**
1. **PR-bias** (см. Топ-5, п.5) — `.order('weight_kg', { ascending: false }).limit(50)` без группировки по упражнению на уровне SQL.
2. **Разные формулы «сожжённых калорий»**: дашборд (`weeklyStats.burnedCalories = workoutsCount * 300`, плоская эвристика) vs профиль (`profileService.getBurnedCalories`, формула `5.0 * вес * длительность_в_часах`). Один и тот же пользователь видит два разных числа для одного и того же понятия на разных экранах.

**Требуемое действие:**
- Заменить `.order('weight_kg')...limit(50)` на RPC/агрегат `SELECT DISTINCT ON (exercise_id) ... ORDER BY exercise_id, weight_kg DESC` (топ-N *по каждому* упражнению), либо честно переиспользовать `profileService.getPersonalRecords` как единственный источник (убрать дублирующий клиентский алгоритм в `dashboardService`).
- Вынести формулу калорий в один общий метод (`profileService.getBurnedCalories`) и дёргать его же из `dashboardService`, удалив константу `* 300`.

---

### D. Дизайн-система: несогласованность оверлеев шторок

**Файлы:** `DaySettingsSheet.tsx`, `ExerciseSettingsSheet.tsx`, `ScheduleEditorSheet.tsx` (без затемнения) vs `EquipmentSheet.tsx`, `ExercisePickerSheet.tsx`, `ProgramFormSheet.tsx` (хардкод `rgba`) vs `SheetShell`-based и модалки в `profile.tsx`/`metrics.tsx` (`colors.overlay`, правильно).
**Текущая проблема:** Три разных визуальных поведения одного и того же UI-паттерна. Конкретно у первой группы фон вообще не темнеет — `<View style={{ flex: 1, justifyContent: 'flex-end' }}>` без `backgroundColor`.
**Требуемое действие:** Согласно ARCH-1 из `CLAUDE.md` — централизовать всё на `SheetShell` (он уже правильно берёт `colors.overlay` из темы). Остальные 6 файлов переписать как «формы внутри `SheetShell`», убрав собственные `<View>`/`<TouchableOpacity>`-обёртки.
**Пример кода (что убрать):**
```ts
// ScheduleEditorSheet.tsx / DaySettingsSheet.tsx / ExerciseSettingsSheet.tsx — нет затемнения:
<View style={{ flex: 1, justifyContent: 'flex-end' }}>
  <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
  ...
// EquipmentSheet.tsx / ExercisePickerSheet.tsx / ProgramFormSheet.tsx — хардкод:
backgroundColor: 'rgba(0,0,0,0.5)', // должно быть colors.overlay
```

---

### E. Дизайн-система: хардкод цветов вне темы

**Файл:** `src/components/EquipmentIcon.tsx`
**Текущая проблема:** Компонент вообще не вызывает `useTheme()`. Цвет-заглушка для иконки без данных о мышцах — `'#6B7280'`, литерал прямо в коде. Это прямое нарушение правила «СТРОГО ЗАПРЕЩЁН хардкод цветов».
**Требуемое действие:** Добавить `const { colors } = useTheme();`, заменить `'#6B7280'` на `colors.textTertiary`.

**Файл:** `src/components/ProgramProgressCard.tsx`
**Текущая проблема:** `<Play size={16} color="white" strokeWidth={2} fill="white" />` — хардкод внутри кнопки «Начать» (уже отмечено в ARCH-5, вот конкретная строка).
**Требуемое действие:** `color={colors.textInverse}`.

---

### F. Мёртвый код и рассинхронизация карт иконок 🆕

**Файлы:** `src/constants/equipmentIcons.ts`, `src/components/EquipmentIcon.tsx`
**Текущая проблема:** Две таблицы (`EQUIPMENT_SVG_MAP`: имя оборудования → файл, `ICON_MAP`: файл → компонент) разошлись в обе стороны:
- `'support.svg'` импортирован и замаплен в `ICON_MAP`, но ни разу не встречается как значение в `EQUIPMENT_SVG_MAP` → недостижимая иконка.
- `'Партнёр': 'partner.svg'` есть в `EQUIPMENT_SVG_MAP`, но `partner.svg` **не импортирован и не замаплен** в `ICON_MAP` → для оборудования «Партнёр» всегда рендерится fallback-гантеля вместо существующей выделенной иконки (файл `partner.svg` реально есть в ассетах).
- Плюс ~12 неиспользуемых SVG-ассетов (`weightlifting-belt`, `Frame`/`Frame-1` — дубликаты друг друга, `treadmill`, `suspension-trainer`, `trx-trainer`, `resistance-bands`, `power-rack`, `stair-climber`, `exercise-bike`, `jump-rope`, `elliptical`, `decline-bench`, `tricep-pushdown`, `ab-bench`, `push-up bar.svg` — с пробелом в имени файла) раздувают бандл без какого-либо использования.

**Требуемое действие:** Добавить `partner.svg` в импорты/`ICON_MAP`. Удалить `support.svg` из `ICON_MAP` или добавить его в `EQUIPMENT_SVG_MAP`. Добавить unit-тест/dev-time assert: «каждое значение `EQUIPMENT_SVG_MAP` есть ключом в `ICON_MAP`» — это ловит весь класс таких багов раз и навсегда. Удалить неиспользуемые ассеты (grep-подтверждение, как уже делается для `AnimatedButton`/`SwipeableCard` по SCALE-3).

**Пример теста:**
```ts
test('every equipment icon reference resolves', () => {
  Object.values(EQUIPMENT_SVG_MAP).forEach(file => {
    expect(ICON_MAP[file]).toBeDefined();
  });
});
```

---

### G. Производительность рендера списков

**Файлы:** `app/(tabs)/workouts.tsx`, `app/(tabs)/history.tsx`
**Текущая проблема:** `renderWorkoutItem`, `renderSectionHeader`, `renderHeader` — обычные функции внутри тела компонента, пересоздаются на каждый рендер. Нарушение собственного правила проекта: «Колбэки в карточки — только `useCallback`».
**Требуемое действие:** Обернуть в `useCallback` с корректными зависимостями (`activeProgram`, `colors`, `navigateToWorkout`).

---

### H. Нарушение слоя данных в UI

**Файл:** `app/history/[id].tsx`
**Текущая проблема:** Единственный экран, где реально остался прямой `supabase.from('workouts').select(...)` в компоненте (упомянутые в `CLAUDE.md` `injuries.tsx`/`workouts.tsx` уже чисты — это стоит поправить в самой документации, см. ниже). Плюс: при сетевой ошибке `catch` просто логирует в консоль, и пользователь видит то же «Тренировка не найдена», что и при настоящем 404 — вводит в заблуждение.
**Требуемое действие:** Вынести запрос в `historyService.getWorkoutDetail(id)`. Различать состояния `not-found` и `error` (последнее — с кнопкой «Повторить», по образцу `ErrorState` в `exercise/[id].tsx`).
**Заодно поправить `CLAUDE.md`:** пункт tech debt «`supabase.from()` в UI: history.tsx, injuries.tsx, workouts.tsx» устарел — сейчас актуален только `history/[id].tsx`.

---

### I. Излишние разрешения / конфигурация

**Файл:** `app.json`
**Текущая проблема:** `android.permissions` включает `RECORD_AUDIO` и `MODIFY_AUDIO_SETTINGS`, но `src/lib/timerSounds.ts` только **воспроизводит** сгенерированные WAV-бипы через `expo-audio` — приложение никогда не записывает звук. Запрос микрофона без реального использования — это (а) риск отказа при ревью в Google Play (sensitive permission без обоснования), (б) снижение доверия пользователей.
**Требуемое действие:** Убрать `RECORD_AUDIO` из `app.json`, если только не планируется голосовой ввод в будущем.

---

## ЧАСТЬ 3. Продуктовые улучшения и новые фичи

**Быстрые улучшения существующих экранов:**
- Превратить баг с личными рекордами (Часть 2.C) в фичу — отдельный экран «Личные рекорды» с честным per-exercise ранжированием вместо куска на дашборде.
- Единая формула «сожжённых калорий» на дашборде и в профиле (сейчас юзер видит два разных числа за один день).
- Автосохранение подходов (после фикса SEC-2) — добавить баннер «Восстановлено с последнего подхода» при повторном открытии тренировки после краша — превращает технический фикс в заметную для пользователя ценность.
- Учтённые травмы (`excludedByInjury`) сейчас видны только внутри блока разминки — вынести краткую сводку и в историю/итог тренировки («на этой неделе N упражнений заменено из-за травмы плеча»).
- A11y-проход: `accessibilityLabel` для всех icon-only кнопок (back, delete, settings-gear) — сейчас их нет вообще ни в одном UI-ките (`AppButton`/`AppCard`/`AppBadge`).
- Синхронизация настроек таймера (`useTimerSettings.ts`, сейчас только `AsyncStorage`) в `profiles`, чтобы предпочтения (звук/вибрация/порядок разминки) переживали переустановку/смену устройства.
- Реордер фаз перетаскиванием (`DraggableFlatList`), а не только кнопками вверх/вниз — для консистентности с днями/упражнениями внутри той же формы.

**Новые фичи:**
- Оффлайн-очередь логов тренировки (AsyncStorage-буфер + фоновая синхронизация) как MVP-шаг перед полноценным офлайн-first из роадмапа `CLAUDE.md`.
- Интеграция с HealthKit/Google Fit для реального расчёта калорий вместо текущих эвристик — заодно закрывает несоответствие из Части 2.C по-настоящему, а не просто унификацией формул.
- Публичная витрина программ (браузинг, а не только код) поверх уже существующего `share_code`-механизма —더 долгосрочная ставка, требует модерации.
- Стрик/шаринг карточки завершённой тренировки — простой retention-механизм для фитнес-аппа.

---

## ЧАСТЬ 4. Стратегический Roadmap

### 🟢 Quick Wins (дни)
- Проверить/добавить RLS для `user_injuries`, `nutrition_logs` (Часть 2.A)
- Пофиксить SEC-7 (не показывать «Успех» при ошибке прогресса) (Часть 2.B)
- Убрать `RECORD_AUDIO` из `app.json` (Часть 2.I)
- Добавить `partner.svg` в `ICON_MAP`, убрать/переиспользовать `support.svg` (Часть 2.F)
- Хардкод-цвета: `EquipmentIcon.tsx`, `ProgramProgressCard.tsx` (Часть 2.E)
- `useCallback` для `renderItem`/`renderSectionHeader` в `workouts.tsx`/`history.tsx` (Часть 2.G)
- Актуализировать `CLAUDE.md` по факту `history/[id].tsx` (Часть 2.H)

### 🟡 Medium-term (недели)
- RPC `upsert_workout_logs` + автосохранение подходов — закрывает SEC-2 и SEC-6 одновременно (Часть 2.B)
- RPC-транзакция для `saveProgram()` — закрывает PERF-4/PERF-6 (Часть 2.B)
- Консолидация Bottom Sheet на `SheetShell` (Часть 2.D)
- Слияние двух Toast-систем в одну (ARCH-2)
- Единая формула калорий + честные per-exercise PR (Часть 2.C / Часть 3)
- A11y-проход по иконочным кнопкам (Часть 3)
- Тест на согласованность `EQUIPMENT_SVG_MAP`/`ICON_MAP` (Часть 2.F)

### 🔵 Long-term (месяцы)
- Оффлайн-очередь записи тренировок → полноценный offline-first
- Интеграция HealthKit/Google Fit для калорий
- Публичная витрина программ поверх share-кода
- AI-периодизация и умный подбор упражнений (уже в роадмапе `CLAUDE.md`, подтверждаю приоритет)
- Sentry + автотесты для критичных чистых функций (`advanceProgramProgress`, `computeExerciseWarnings`, скоринг разминки, теперь и «PR-алгоритм»)

---
