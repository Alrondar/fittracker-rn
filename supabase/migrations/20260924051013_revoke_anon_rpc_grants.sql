-- Блокировать анонимный EXECUTE на SECURITY DEFINER RPC.
-- У каждой из семи функций был и прямой грант anon, и грант PUBLIC (=X/postgres),
-- поэтому revoke только от anon не закрыл бы вызов через PostgREST.
-- Грант authenticated сохранён: все пять прикладных RPC вызываются только после входа.

revoke execute on function public.copy_program_for_user(p_program_id text, p_user_id uuid) from anon, public;
revoke execute on function public.create_workouts_for_program(p_user_id uuid, p_program_id text) from anon, public;
revoke execute on function public.generate_share_code(p_program_id text) from anon, public;
revoke execute on function public.handle_new_user() from anon, public;
revoke execute on function public.rls_auto_enable() from anon, public;
revoke execute on function public.save_program_snapshot(p_program_id text, p_schedule jsonb, p_deleted_phase_ids jsonb, p_deleted_day_ids jsonb, p_deleted_exercise_ids jsonb, p_phases jsonb) from anon, public;
revoke execute on function public.sync_program_changes_to_workouts(p_program_id text) from anon, public;
