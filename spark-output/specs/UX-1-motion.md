# Spec UX-1 — «Движение» (без кода, до утверждения)

Дата: 25.09.2026 · Статус: **на утверждении** · Владелец пакета: UX-1 из spark-output/audit/fittracker-rn.md
Закрывает: audit-5, audit-6, audit-8, audit-9, идея I-3 (полировка RestTimer) · Связан: I-4 (вынесен в UX-1h — см. «Вне скоупа»)

## User goal

«Приложение ощущается живым: каждый тап отвечает движением, каждый переход — плавным, ни один экран не появляется телепортом». Текущая боль пользователя: «нет красивых анимаций, переходов».

## Скоуп

### A. Переходы экранов (audit-5) — quick-win
- `app/_layout.tsx`: root Stack получает `screenOptions` c `animation`:
  - `workout/[id]`, `progress/[id]`, drill-in страницы программ — `'slide_from_right'`;
  - модальные presenting-экраны (`exercise/[id]`) — `'modal'`-жест: `gestureEnabled: true` (свайп-сверху вниз закрывает — добавляет жест под реальную задачу);
  - `(tabs)` ↔ корень — `'fade'`.
- Никаких новых навигационных библиотек: только опции react-native-screens/expo-router.

### B. PressableScale (audit-6) — ядро пакета
- Новый примитив `src/components/ui/PressableScale.tsx`: Reanimated `useSharedValue` scale, `withSpring({ damping: 20, stiffness: 400 })` → 0.97 на press-in, 1.0 на release; проп `haptic?: 'light'|'medium'`; `accessibilityRole` обязательно; memo.
- Внедрение (balanced): внутри `AppButton` и `AppCard` (onPress-ветки) — автоматически покрывает error/retry, dashboard empty-CTA; точечно: FAB programs, карточки programs.tsx, WorkoutListItemCard, строки exercises.
- Minimal-вариант: только AppButton + AppCard (без точечных миграций).

### C. Двойная анимация Modal+SheetShell (audit-8) — ✅ реализовано иначе (уточнение 25.09)
- Реализация: `SheetShell` получил `animateEnter?: boolean` с дефолтом **`!isModal`** — внутри нативного Modal собственный enter выключен автоматически, все 12 Modal-host'ов чинятся одной правкой без изменений в хостах. Exit-анимация сохранена везде: ранний unmount контента внутри закрывающегося transparent-Modal показал бы «пустую скользящую шторку», а одновременный fade одного направления с native slide артефактов не даёт.

### D. Таб-бар (audit-9)
- `CustomTabBar`: `withTiming(250)` → `withSpring({ damping: 22, stiffness: 260 })` на pill; активной иконке — scale-pop 1→1.12→1 (withSequence) при фокусе.

### E. RestTimer polish (I-3)
- Кольцо: `SvgLinearGradient` из `colors.gradients.primary` (panel-режим; pill остаётся monochrome — мелкий).
- Последние 3 секунды: тикающий `Haptics.impactAsync(Light)` на каждый тик (сейчас тишина до конца).
- Момент `isFinished`: одноразовая вспышка кольца (scale 1→1.06→1, 250ms) + `NotificationFeedbackType.Success` один раз (не конфликтует с vibrateUntilDismissed — тот цикл стартует после вспышки).

## Состояния (states)

Пакет не меняет loading/error/empty — это UX-2. Единственное требование: PressableScale корректно ведёт себя в disabled (без spring-отклика, opacity как сейчас) и в `isFinished`-состоянии RestTimer (пульсация гаснет, вспышка одна).

## Информационные уровни

L1/L2/L3 не меняются — чистый motion-слой. Ни один элемент не переезжает и не исчезает.

## Файлы (оценка diff)

| Файл | Изменение |
| --- | --- |
| app/_layout.tsx | +~15 строк (screenOptions) |
| src/components/ui/PressableScale.tsx | новый, ~70 строк |
| src/components/ui/AppButton.tsx / AppCard.tsx | замена TouchableOpacity → PressableScale |
| src/components/ui/SheetShell.tsx | +prop animateEnter, ~10 строк |
| 4 Modal-хоста | +animateEnter={false} |
| src/components/CustomTabBar.tsx | spring + icon pop, ~15 строк |
| src/components/workout/RestTimer.tsx | градиент + тики + вспышка, ~40 строк |

## Риски и меры

- **Android gestureEnabled для modal**: на screens 4.x работает, но проверяем на AVD (тестовый аккаунт — блокер из памяти, верификацию делаем после его решения или на web-риалтере нет — только device).
- **PressableScale в FlashList-строках**: shared value на строку; memo + отсутствие inline-функций в onPress, иначе re-render при скролле (performance gate CLAUDE.md §8).
- **RestTimer тики**: setInterval на 3 сек — гарантированно cleanup при unmount/сворачивании pill.
- Откат: пакет чисто UI, один коммит, revert безопасен.

## Verification (review-stage)

1. `tsc --noEmit` + `eslint` — чисто.
2. Ручной прогон на AVD: переходы (tabs↔drill-in↔modal), 10 быстрых тапов FAB (нет дребезга), RestTimer от 3с до dismiss (тики, вспышка одна), сворачивание pill во время тиков.
3. Performance gate: FPS-просадок в exercises FlashList при скролле нет (pressable не добавляет render'ов — проверяем React DevTools Profiler на одной строке).
4. STATUS.md: запись пакета UX-1.

## Вне скоупа UX-1

- **I-4 hero-морфинг** (Dashboard→workout shared element) — самый заметный, но и самый рискованный кусок; выношу в **UX-1h** отдельным шагом после приземления A–E, чтобы не мешать честному тестированию.
- **L-7 график+тултип** — UX-1b, нужен микро-spec взаимодействия (что в тултипе, поведение на границах).
- **I-6a long-press альтернативы** — ждёт вашего решения.
