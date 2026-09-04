# Skill: Workout UX

**Когда использовать:** При работе с `app/workout/[id].tsx`, `useWorkoutSession`, `ExerciseCard`, `SetsGrid`, `RecommendationCard`, `RestTimer`, `PainSheet`.

## Контекст
Workout screen — приоритетная зона performance и UX. Главный принцип: **Tracker first**. Во время тренировки пользователь видит только то, что нужно для текущего действия.

## Ключевые правила
1. **Progressive Disclosure (L1/L2/L3)**:
   - L1 (всегда): название упражнения, текущие подходы, вес, повторы, rest timer, компактная recommendation.
   - L2 (по запросу, lazy mount): история, альтернативы, техника, warm-up, notes, pain/safety. Не монтировать тяжёлый контент до открытия accordion/sheet.
2. **Recommendation Card**:
   - Формат: «Рекомендуем [вес] × [повторы]» → [Принять] [Изменить] [Почему?].
   - Не блокирует тренировку.
   - Safety/readiness overrides используют warning color и не подсвечивают increase-chip.
3. **RPE**:
   - Одна tappable шкала 1–10. Динамическая расшифровка выбранного значения.
   - Быстрый skip доступен.
   - Частота запроса настраивается (always / last-set / off).
4. **Alternatives**:
   - Доступны без перегрузки основного экрана.
   - **Критично**: «Заменить только сегодня» и «Заменить в программе» — визуально и семантически разные действия с разным подтверждением (rollback для seeded программ).
5. **Performance**:
   - `SetsGrid` и карточки списков — `React.memo`.
   - Чип «Разминка» (`is_warmup`) исключает сет из оценки прогрессии и аналитики.
   - `addSet` в `ExerciseCardProps` обязателен для новых потребителей.

## Source of truth
- `PRODUCT.md` §4, §5, §6, §8
- `CLAUDE.md` §6, §8
- `INVENTORY.md` §2 (Workout), §12 (Known implementation notes)