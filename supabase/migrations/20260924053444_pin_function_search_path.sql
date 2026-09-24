-- SEC-14 (часть 1): зашить search_path в 14 функциях public без proconfig.
--
-- Почему 'public, pg_temp', а не 'pg_catalog, pg_temp':
--   migrate_exercise_equipment обращается к exercises без схемы,
--   normalize_equipment_array вызывает normalize_equipment_item тоже без схемы —
--   без public в пути они перестанут резолвиться.
-- Почему pg_temp указан явно и последним:
--   PostgreSQL неявно добавляет pg_temp в НАЧАЛО пути, если он не перечислен,
--   поэтому временный объект мог бы перехватить резолв имени. Явный pg_temp
--   в конце убирает эту возможность.
-- Все 14 функции SECURITY INVOKER, так что это устойчивость, а не эскалация
-- привилегий (в отличие от SEC-11/SEC-12).
--
-- Функции pg_trgm (similarity, word_similarity, gtrgm_* и др.) не трогаем —
-- они принадлежат расширению, их определяет создатель расширения.

alter function public.update_updated_at_column() set search_path = public, pg_temp;
alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public.handle_workouts_updated_at() set search_path = public, pg_temp;
alter function public.fill_search_text() set search_path = public, pg_temp;
alter function public.set_exercise_search_text() set search_path = public, pg_temp;
alter function public.migrate_exercise_equipment() set search_path = public, pg_temp;
alter function public.normalize_equipment_array(arr text[]) set search_path = public, pg_temp;
alter function public.normalize_equipment_item(item text) set search_path = public, pg_temp;
alter function public.normalize_equipment_item_simple(item text) set search_path = public, pg_temp;
alter function public.normalize_equipment_name(item text) set search_path = public, pg_temp;
alter function public.normalize_equipment_final(item text) set search_path = public, pg_temp;
alter function public.replace_in_array(arr text[], old_val text, new_val text) set search_path = public, pg_temp;
alter function public.split_equipment(item text) set search_path = public, pg_temp;
alter function public.split_equipment_final(item text) set search_path = public, pg_temp;
