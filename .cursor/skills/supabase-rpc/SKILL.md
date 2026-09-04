# Skill: Supabase RPC & Boundary

**Когда использовать:** При создании новых RPC, миграций, изменении `src/services/`, работе с RLS или `types/database.types.ts`.

## Контекст
Supabase boundary — жёсткое архитектурное ограничение. `supabase.from()` и `supabase.auth.*` запрещены в UI. Все запросы идут через `src/services/`.

## Ключевые правила
1. **Граница (CLAUDE.md §2)**:
   - Единственное место для прямых вызовов: `src/services/`.
   - Исключения: `authService.ts` и root `_layout.tsx` (auth flow).
2. **RLS & Security (CLAUDE.md §3)**:
   - Новая таблица требует RLS.
   - RLS bypass → `SECURITY DEFINER` + явная проверка `auth.uid()`.
   - RLS-respecting → `SECURITY INVOKER` + `SET search_path TO 'public'`.
   - Idempotency: `IF EXISTS` / `ON CONFLICT`.
   - Transactional operations — внутри одного RPC, не через client `Promise.all`.
3. **Программа синхронизации (CLAUDE.md §5, INVENTORY.md §12)**:
   - Изменения программы синхронизируются **только** с будущими/не начатыми тренировками (`started_at IS NULL AND finished_at IS NULL`).
   - История не переписывается.
   - RPC `sync_program_changes_to_workouts` удаляет `workout_exercises` с `exercise_id`, которого нет в `program_exercises`. Перед вызовом sync обязательно обновлять текущую `workout_exercises.exercise_id`.
4. **Effective Date (CLAUDE.md §4)**:
   - Никогда не использовать `workouts.created_at` как дату тренировки.
   - Эффективная дата: `finished_at ?? started_at ?? created_at`.
5. **Workflow**:
   - Новая RPC создаётся в `supabase/migrations/`.
   - После миграции **обязательно** регенерировать `types/database.types.ts` и проверить `tsc --noEmit`.

## Source of truth
- `CLAUDE.md` §2, §3, §4, §5
- `INVENTORY.md` §10 (Database / migrations)