# Analysis: release-built APK crashes several seconds after launch

## Metadata

> обнаружена неприятная ошибка в собранном мобильном приложении - оно вылетает через несколько секунд. данная ошибка не наблюдалась в expo версии

- Project: fittracker-rn (Expo SDK 54, RN, expo-router, Hermes)
- Date: 2026-09-28
- HEAD: b5e1f16 «fix: PERF-11 + аудит-пакет 28.09 — фризы табов/тренировки, кэш-инвалидации, UTC-даты, гарды, supabase-граница»
- Symptom: app-wide crash ~несколько секунд после запуска в собранном APK; в Expo (Metro dev) не наблюдалось

## Progress

- Phase: 1 (discovery)
- Items Processed: 0
- Total Items: 0
- Current Operation: reproduce crash on emulator + logcat
- Current Focus: получить реальный stack trace краша, не фиксировать вслепую

## Evidence gathered

- Единственный APK: `android/app/build/outputs/apk/debug/app-debug.apk`, собран 2026-09-27 11:24 — ДО коммита b5e1f16 (2026-09-28 12:35). possible stale-bundle грабля (урок из памяти проекта).
- Аdb: устройств не подключено; AVD `Pixel_8` доступен.
- npx devices: нет.

## Hypotheses (ranked, непроверенные)

1. JS fatal (Hermes, production): отложенный mount/prefetch из PERF-11 бросает исключение через N секунд — dev-версия на другом бандле или ошибки видны были бы в redbox (не наблюдалась ⇒ вероятно бандл APK ≠ HEAD).
2. APK собран из устаревшего кода/бандла (September 27), краш уже исправлен/внесён между 27.09 и HEAD — надо репро.
3. Нативный краш (FlashList v2 / expo-image /Fabric) при отложенном рендере — logcat покажет SIGSEGV vs JS Exception.
4. react-query persister: чтение персистированного кэша из AsyncStorage на старте + инвалидации из аудит-пакета → undefined-访问.

## Errors

- `gradlew assembleRelease` ×3 падения: download `react-android-0.81.5-release.aar` / `hermes-android-...` с repo.maven.apache.org → Read timed out. curl-замер: 24 КБ за 180 с (~136 Б/с) — Maven Central троттлит. Debug-варианты AAR уже в gradle-кэше (поэтому 27.09 собирался).
- Обход: временная подмена mavenCentral() на `maven.aliyun.com/repository/public` в android/build.gradle (помечено DIAG-28.09, откачивать) + socketReadTimeout в gradle.properties. Aliyun: 133 МБ на ~10 МБ/с ✅.
- Урок gates: `cmd 2>&1 | tail` съедал exit code — первая «успешная» фоновая сборка на деле BUILD FAILED; смотреть `echo exit=$?`.

## Evidence gathered (updated)

- Владелец подтвердил: вылетает сборка из b5e1f16 (аудит-пакет 28.09), симптом — «просто исчезает» через несколько секунд, без сообщения → типичный uncaught JS fatal в release-бандле (Hermes, __DEV__=false) либо нативный креш; в Metro-dev не воспроизводится.
- Локальный APK 27.09 — debug (тянет JS с Metro) ≠ профилу пользователя; воспроизводить надо release-вариантом HEAD.
- Новые файлы пакета просмотрены: useTabPrefetch (стаггер-таймеры 600/1600/2600/3600 мс — идеально ложатся на «вылет через несколько секунд»), useDeferredTabContent, tickStore, queryInvalidation, LoadingChip, RestTimerContext (workout-экран, не cold start). Прямого throw в таймерах нет; prefetchQuery глотит ошибки в кэш.
- app/_layout.tsx: cold start = getSession → attachQueryPersistence(restore) → useFonts гейт → router-гейт. Ничего специфично-релизного не найдено статикой — ждём logcat.

## Current hypothesis shortlist (до стека)

1. Uncaught JS error из отложенного колбэка (InteractionManager/setTimeout/restore) — в dev тот же код не падает из-за иного тайминга/данных.
2. Нативный креш release-варианта (hermes bytecode / reanimated worklet в LoadingChip на всех 6 табах сразу после splash).
3. Данные: restore персиста из реального кэша пользователя (на эмуляторе кэш пуст → может НЕ воспроизвестись; тогда завести тест-аккаунт/данные).

## Repro procedure (зафиксировано)

1. `gradlew assembleRelease` (зеркало) → app/build/outputs/apk/release/app-release.apk
2. `adb install -r`; `adb logcat -c`; `am start -n com.fittracker.app/.MainActivity` (expo template: expo.MainActivity)
3. `adb logcat -v time | grep -E "ReactNativeJS|AndroidRuntime|F DEBUG|SIGSEGV|com.fittracker"` ~30 с.

## Assumption Validations

- [ ] APK on device = этот ли файл тестировал владелец? — уточнить при репро.
- [ ] «expo версия» = Expo Go или dev client с Metro — влияет на сравнение.

## Memory Management

- Все находки — сюда, не только в контекст чата.

## Processed Files

(Phase 1B — после получения stack trace, читать файлы из трейса)

## File List

- android/app/build/outputs/apk/debug/app-debug.apk (2026-09-27)
- (пополняется)

## Knowledge Graph

(по мере анализа)

## Root Cause Analysis

### PRIMARY ROOT CAUSE (verified stack 29.09, dev-прогон с аккаунтом 5b770d3b)

`ERROR [ReanimatedError: Invalid color value: rgba(NaN, NaN, 10, 0.125)]` в Call Stack:
processColor → StyleBuilder.buildFrom → AnimatedComponent.shouldComponentUpdate → **PressableScale → StatusCard → DashboardScreen**.

Цепочка (evidence):
1. `src/utils/cycle.ts:198` — `getCyclePhaseColor()` возвращает **ключ** `keyof ThemeColors` ('error'|'success'|'warning'|'primary'), не hex-значение.
2. `src/components/dashboard/StatusCard.tsx:414,416` — `withAlpha(getCyclePhaseColor(phase), …)` пропускает **ключ** вместо `colors[...]`: `theme.ts:591 withAlpha` режет строку как hex → `rgba(NaN, NaN, 10, 0.125)` (0.125 — alpha чипа цикла, совпадает со стеком 1:1).
3. PressableScale (reanimated Animated component) валидирует цвет в стиле → ReanimatedError **во время render**.
4. Корректный паттерн уже есть в проекте: `CycleCalendar.tsx:212` — `withAlpha(colors[getCyclePhaseColor(phase)], …)`.
5. Там же `StatusCard.tsx:422` — `Droplet color={getCyclePhaseColor(...)}` (ключ вместо значения; SVG не крашится, но цвет чипа иконки неверный — попутно).

Почему data-dependent: чип рендерится только при `gender==='female' && currentPhase != null` (есть события цикла) — только аккаунт 5b770d3b; у else-ветки `colors.primary` корректен.
Почему «через несколько секунд»: чип появляется, когда приходят cycle-данные/срабатывает deferred mount дашборда.
Почему только в собранном приложении: в dev RN логирует throw как console ERROR и переживает; в release-бандле неперехваченный JS-fatal в render ⇒ тихий exit процесса.

## Fix Strategy

**Фикс (recommended, минимальный diff)**: `StatusCard.tsx` — резолвить ключ в цвет: вычислить один `const phaseColor = colors[getCyclePhaseColor(currentPhase.phase)]` и подставить в 414/416 (`withAlpha(phaseColor, …)`) и 422 (`color={phaseColor}`).
- Risk: Low; регрессий нет (то же значение, что задумывалось); паттерн = CycleCalendar.
- Verification: дев-прогон тем же аккаунтом — ERROR исчезает, чип окрашен в фазовый цвет; затем release-APK на том же аккаунте — вылета нет.
- Rollback: git revert одной правки.

**Опционально (отдельное решение)**: hardening `withAlpha` — возвращать color без изменений (или `colors.transparent`) при не-hex входе + dev-warning; превращает такие баги из «тихий kill» в «неверный цвет + варнинг». Не обязательно для этого фикса.

## Facts (28.09 вечер, до стека)

- Тот же APK на двух телефонах: вылетает только на аккаунте 5b770d3b-cf21-4c98-9976-3c22fc35b4f5 (Маргарита) ⇒ **data-dependent**, не сборка.
- Вылет только на Главная; уход на другой таб отменяет вылет ⇒ фатал в **первом рендере тяжёлого дерева дашборда с данными** (deferred commit useDeferredTabContent + приход RQ-ответов), freezeOnBlur замораживает unfocus-экран → рендера нет → краша нет.
- Эмулятор (release-APK из HEAD, собранный 28.09 18:19 через aliyun-зеркало): без сессии — живёт >25 с, краша нет (соответствует data-dependent).
- Данные аккаунта: 91 workouts (27 с dangling program_id; у рабочих аккаунтов 136/48 таких же — не триггер), 1 pain_event (08.09), 2 readiness (август), 0 nutrition_logs, 0 injuries, цикл: 1 пара событий 26.08–31.08 (сегодня ~33-й день, next start нет), profile female, onboarding_data null, avatar null; cycle_settings/warmup_prefs = 0 у всех. suspicious_workouts (отрицательная длительность/будущее/started без finished) — нет.
- utils/cycle.ts, dashboardService прочитаны — null-guarded, crash-очевидного deref нет.
