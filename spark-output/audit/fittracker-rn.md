# Audit — FitTracker RN

- **Генерация**: 2026-09-25
- **Объект обхода**: код `C:/projects/fittracker-rn` (6 tabs-экранов + workout/exercise + дизайн-система `src/styles`, `src/components/ui`)
- **Режим**: автоматический обход кода (Reanimated/haptics/states grep + чтение примитивов)

## Итог

| Severity | Кол-во |
| --- | --- |
| 🔴 Blocker | 0 |
| 🟠 Major | 7 |
| 🟡 Minor | 7 |

> 25.09.2026, после ревью с пользователем: добавлен audit-14 (рассинхрон размеров переключателей в «Мышцах»).

Хорошая новость: фундамент зрелый — 5 акцентных тем с WCAG-контракстом, токены SPACING/BORDER_RADIUS/scale/fontScale, канон SheetShell на Reanimated, широкое покрытие haptics (90+ вызовов), skeleton-загрузка на большинстве списков. «Топорность» — это не отсутствие системы, а **четыре конкретных дыры**: движение, шрифт, состояния загрузки, три реализации кнопки.

**Распределение по размерам**: consistency 4 · visibility 3 · aesthetic 3 · flexibility 3.

## Темы редизайна (по приоритету)

### 🥇 Высокий приоритет

**Тема 1: Слой живости — переходы, pressed-состояния, микродвижения**
- findings: audit-5, audit-6, audit-7, audit-8, audit-9
- Обоснование: прямой ответ на «нет красивых анимаций и переходов». Корневой Stack не настраивался ни разу (`app/_layout.tsx` L120-126), нажатия — только activeOpacity (AppButton L64, AppCard L61, FAB programs L477), списки «телепортируются». Всё на уже установленном Reanimated 4 — максимальный воспринимаемый эффект при минимальном риске.
- Затрагиваемые области: все переходы экранов, все карточки/кнопки, листы внутри Modal, таб-бар.

**Тема 2: Честные состояния загрузки**
- findings: audit-11, audit-12, audit-13, audit-3
- Обоснование: Progress показывает `0` до загрузки данных (`?? 0` фолбэки, progress.tsx L323-337) — это враньё, а не только нехватка прелоадера; экран активной тренировки (главный сценарий) не имеет screen-level loading/error (workout/[id].tsx); Dashboard без pull-to-refresh, тогда как все остальные tabs имеют.

### 🥈 Средний приоритет

**Тема 3: Визуальная идентичность — шрифт, тени, empty/error-стиль**
- findings: audit-1, audit-2, audit-4
- Обоснование: системный шрифт — главный источник «шаблонного» вида, хотя expo-font уже подключён; тени дублируются инлайном с `#000` в 6+ местах; error-стейты — голый текст+кнопка.

**Тема 4: Консолидация кнопок**
- findings: audit-10
- Обоснование: `createButtonStyles` (colors:any) + `AppButton` + ~616 сырых TouchableOpacity. Без этого Тема 1 не раскатывается автоматически. Мигрировать пакетами по экранам, не big-bang.

## Полный список находок

### visibility (видимость состояния системы)

1. **audit-11 · major** — Progress до загрузки отображает нули вместо skeleton.
   Позиция: `app/(tabs)/progress.tsx` L323-337. Рекомендация: skeleton для hero/Stats. Cost: quick-win.
2. **audit-12 · major** — Нет screen-level loading/error на активном workout.
   Позиция: `app/workout/[id].tsx` L153, L371, L482. Рекомендация: skeleton структуры подходов + error с retry. Cost: medium.
3. **audit-13 · minor** — Dashboard без pull-to-refresh (все остальные tabs имеют).
   Позиция: `app/(tabs)/index.tsx` L153. Cost: quick-win.

### consistency (согласованность и стандарты)

4. **audit-5 · major** — Переходы экранов не настроены (дефолтный плоский push).
   Позиция: `app/_layout.tsx` L120-126. Рекомендация: `stackAnimation` по типам + `gestureEnabled` для модалок. Cost: quick-win.
5. **audit-8 · minor** — Двойная анимация листов в Modal (Modal slide + SheetShell 240ms).
   Позиция: NutritionAddModal L127, ProgramEditorModals L82-162, InjuryFormSheet L60. Cost: medium.
6. **audit-2 · minor** — Нет теневых токенов, `shadowColor:'#000'` инлайном.
   Позиция: common.ts L83/129/153/171, AppCard L75, Toast L85. Рекомендация: `SHADOWS = {sm,md,lg}`. Cost: quick-win.
7. **audit-10 · major** — Три реализации кнопки + 616 сырых TouchableOpacity.
   Позиция: styles/components/button.ts L5/L40/L75; grep-счётчики. Cost: major-rework (поэкранно).
14. **audit-14 · major** — В одном ряду секции «Мышцы» «Все/Прямые» в ~1.5 раза меньше фильтра периодов; нарушен критерий tap target ≥44px.
    Позиция: MuscleLoadModeToggle.tsx L100-107 vs PillToggle.tsx L115. Рекомендация: заменить на PillToggle (тот же API) или выровнять масштаб. Cost: quick-win. (Замечание пользователя 25.09)

### aesthetic (эстетика и минимализм)

8. **audit-1 · major** — Системный шрифт, нет собственной типографики.
   Позиция: typography.ts L3-85 (нет fontFamily), expo-font не вызывается. Рекомендация: шрифтовая пара через expo-font. Cost: medium.
9. **audit-3 · minor** — Skeleton без shimmer, только opacity-пульс.
   Позиция: Skeleton.tsx L29-44. Cost: quick-win.
10. **audit-4 · minor** — Error/empty без иерархии (иконка+заголовок+CTA).
    Позиция: index.tsx L126-147. Рекомендация: единый EmptyState/ErrorState. Cost: medium.

### flexibility (эффективность взаимодействия)

11. **audit-6 · major** — Pressed-состояния без spring-масштаба (только activeOpacity).
    Позиция: AppButton L64, AppCard L61, FAB L477. Рекомендация: `PressableScale` примитив. Cost: medium.
12. **audit-7 · minor** — Нет entering/exiting-анимаций списков при CRUD.
    Позиция: grep LayoutAnimation пуст. Cost: quick-win.
13. **audit-9 · minor** — Таб-бар: withTiming вместо spring + без микро-масштаба иконки.
    Позиция: CustomTabBar L16-30. Cost: quick-win.

## Рекомендуемый порядок пакетов (spec → code → review)

1. **UX-1 «Движение»** (Тема 1 + audit-3,9): stackAnimation, PressableScale, spring таб-бар, фикс двойной анимации Modal+SheetShell, entering-анимации CRUD. ~1 день, нулевой продуктовый риск.
2. **UX-2 «Честная загрузка»** (Тема 2): skeleton для Progress-hero, loading/error для workout, PTR на Dashboard, shimmer-скелетон, единый EmptyState/ErrorState.
3. **UX-3 «Идентичность»** (audit-1,2): шрифтовая пара + SHADOWS-токены. Требует подтверждения выбора шрифта пользователем.
4. **UX-4 «Консолидация кнопок»** (audit-10): поэтапная поэкранная миграция, темп задаётся roadmap.

## Замечания по next step

- Находки audit-5/6/9 противоречат ощущению «дёшево» сильнее, чем цвета — начинать стоит с движения.
- Выбор шрифта (Тема 3) — вкусовское решение, нужен пользовательский approval до кода.
- Реальные статусы задач после принятия пакета рекомендуется зафиксировать в `STATUS.md` (секция 4) — этот отчёт живёт в `spark-output/` и не заменяет его.
