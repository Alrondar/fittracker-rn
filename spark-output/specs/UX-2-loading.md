# Spec UX-2 — «Честная загрузка» (+ UX-2b persisted queries)

Дата: 25.09.2026 · Статус: **реализовано (A–G), гейты пройдены; device-верификация не сделана**
Закрывает: audit-11, audit-12, audit-13, audit-4, audit-14 (quick-win пришейкой), идеи L-1, L-2, L-3, L-6 · UX-2b: L-4

## User goal

«Приложение никогда не показывает ложь (нули вместо данных) и никогда не показывает мёртвую пустоту (три серых прямоугольника) — в любой момент я вижу либо осмысленный контент, либо осмысленное ожидание, либо осмысленную ошибку».

## Скоуп UX-2

### A. Скелетоны по макету (L-1)
- `DashboardSkeleton`: hero-блок (высота реальной «сегодня»-карточки) + ряд 2 малых стат-карт + строка списка — заменяет `ListSkeleton count={3}` в `app/(tabs)/index.tsx` L116-124.
- `ProgramCardSkeleton` (полоса баннера + 2 строки + бейдж) — в programs.tsx вместо generic ListSkeleton(4).
- `ProgressHeroSkeleton` + `StatsRowSkeleton` — новый skeleton-путь для hero-зоны progress (см. C).
- Реализация: композиция существующего `Skeleton` (форма/радиусы/spacing из тех же токенов, что реальные карточки) — новых токенов не нужно.

### B. Shimmer (L-2 / audit-3)
- В `Skeleton.tsx`: поверх блока — бегущий `LinearGradient` (expo-linear-gradient уже в стеке) white/primary@6% альфа, translateX -width→width, withRepeat 1.4s. One implementation — все скелетоны (включая новые макетные и ListSkeleton) получают его бесплатно.
- Пульс opacity остаётся как base, shimmer — поверх (dark mode: блик weaker, 4%).

### C. Честные данные (audit-11, audit-12)
- **Progress**: hero/Stats рендерят `ProgressHeroSkeleton`/`StatsRowSkeleton` при `isHistoryPending || isProgressPending`; `?? 0` фолбэки остаются только как final-state после загрузки. Ноль больше не показывается до прихода данных.
- **Workout `[id]`**: screen-level состояние: пока сессия не восстановлена (first-pending) — `WorkoutSkeleton` (строка header + 3 карточки упражнений); при error — ErrorState (см. D) с retry. Существующий ListEmptyComponent не трогаем (он про «пустая программа», а не «загрузка»).

### D. Единый EmptyState/ErrorState (audit-4)
- Новый `src/components/ui/StateBlock.tsx`: иконка (lucide, в круге withAlpha(primary,0.08) — как уже на dashboard-empty) + заголовок + описание + CTA(AppButton).
- Замена голых текст+кнопка: dashboard error (index.tsx L126-147), exercises/programs error-блоки, exercise/[id] ErrorState (уже локальный — мигрируем).
- Тексты ошибок — «что случилось + что делать» (вехе error-recovery §9.1).

### E. Dashboard pull-to-refresh (audit-13)
- `ScrollView` index.tsx L153 → `refreshControl` c refetch всех dashboard-запросов (Promise.allSettled, refreshing по любому isRefetching).

### F. Пришейка: MuscleLoadModeToggle → PillToggle (audit-14)
- Удалить компонент, в MuscleStatsSection использовать `PillToggle` options=[Все, Прямые]; проверив, что tap target ≥44 и размер совпадает с фильтром периодов.

### G. Хореография skeleton→data (L-3)
- Данные входят через существующий `FadeIn` stagger 80ms — но только **первый** показ (guard `hasShownRef`), refetch'и — без анимации.
- Anti-flash: skeleton не прячется раньше 250ms с момента появления (стабилизирующий хук `useMinDuration(pending, 250)` в Skeleton.tsx exports).

## Состояния (матрица по затронутым экранам)

| Экран | loading | error | empty | data |
| --- | --- | --- | --- | --- |
| Dashboard | макетный skeleton+shimmer | StateBlock+retry+PTR | как сейчас (уже хорошо) | stagger-вход однократно |
| Progress | skeleton hero/stats | StateBlock | — | однократный stagger |
| Workout | screen-skeleton | StateBlock+retry | ListEmpty (без измен.) | без измен. |
| Programs/Exercises | ListSkeleton→shimmer (свои) | StateBlock | без измен. | без измен. |

## UX-2b — Persisted queries (L-4, отдельный шаг после приземления UX-2)

- `queryAsyncStoragePersister` (@tanstack/query-async-storage-persister, +1 зависимость), AsyncStorage уже в стеке.
- **Приватность (обязательные инварианты)**: персистим только read-запросы с ключом, включающим `userId`; `clearOnLogin`: очистка стораджа при sign-in/sign-out (общий девайс не должен показать чужой дашборд); ничего с форм ввода/profile-PII не кешируем сверх текущих query keys.
- Поведение: cold start → рендер из кэша мгновенно → background refetch → cross-fade значения. `dehydrate/hydrate` стандартным API persister'а.
- Отдельный коммит, чтобы откат не тянул UX-2.

## Файлы

index.tsx, progress.tsx, workout/[id].tsx, programs.tsx, exercises.tsx, Skeleton.tsx, новый StateBlock.tsx, новый набор skeleton-композиций (src/components/ui/skeletons/), MuscleStatsSection.tsx (+удаление MuscleLoadModeToggle.tsx), queryClient wiring (_layout/store).

## Риски

- Shimmer на списке из 20 скелетонов = 20 анимаций — все Reanimated worklet'ы на UI-потоке, ок; но один SharedValue на контейнер, а не на блок (реализуем `ShimmerWrap` вокруг групп).
- Workout screen-skeleton не должен задерживать реальный первый render сессии (проверяем: pending только первый запрос session, не каждый refetch).
- UX-2b устаревшие кэши: `PLACEHOLDER_DATA` + age ceiling 24ч; просроченное не показываем.

## Verification

1. `tsc --noEmit` + eslint.
2. AVD: flight-mode cold start (виден кэш-поведение UX-2b / offline-ошибки), slow 3G emulation для skeleton-времени, переход loading→data без «мигания» (anti-flash), logout→login вторым аккаунтом: чужие данные не мелькнули (UX-2b инвариант).
3. Performance gate: FlashList exercises — skeleton-блоки не внутри виртуализированных строк.
4. PRODUCT.md §3 сверка: «трекер прежде всего», без new-когнитивной нагрузки. STATUS.md — запись UX-2/UX-2b.

## Вне скоупа

L-5 брендовый загрузчик и L-8 cross-fade темы → UX-3 (там же выбор шрифта — нужен ваш approval пары).
