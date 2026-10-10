-- ============================================================================
-- ILL-4 (шаг 2 подготовки к волнам иллюстраций): заполнить name_eng там, где он
-- пуст и английское имя из папки в собственном media_url (а) свободно и (б) описывает
-- то же движение, что русское имя строки.
--
-- Зачем: имя папки на нашем хосте выводится из name_eng
-- (media_url = .../exercises/<name_eng с «_»>/0.jpg), поэтому позиция без
-- name_eng не может получить собственный кадр по механическому правилу. Плюс
-- после CAT-Q7 (522aa34) `search_exercises` матчит `name_eng` — заполнение делает
-- эти позиции находимыми по-английски.
--
-- Список строит `spark-output/export/preflight-name-eng.py` по живому проду (08.10),
-- он же перепроверяется перед применением. Из 47 строк с пустым name_eng идут
-- ТОЛЬКО 12. Остальные разобраны и ОСОЗНАННО не тронуты:
--   * 28 — кадр одолжен у ДРУГОЙ позиции (имя занято): запись дала бы 28 коллизий
--     `name_eng` вместо существующих 2 (CAT-Q2) → дедупликация каталога, вердикт
--     владельца (STATUS.md ILL-Q2);
--   *  4 — имя свободно, но описывает другое движение («прямая рукоять» ← V-Bar,
--     «жим гантелей перед собой» ← Dumbbell Incline Shoulder Raise и ещё 2):
--     id и причины зафиксированы в `SUSPECT` того же скрипта → вердикт (ILL-Q3);
--   *  3 — нет ни name_eng, ни media_url → вердикт (ILL-Q4).
--
-- Побочные эффекты (намеренные):
--   * `trg_fill_search_text` пересчитает `search_text` (приложение его не читает — CAT-Q4);
--   * `name_eng` в UI не рендерится: в коде встречается только в
--     `src/types/database.types.ts`, видимый текст карточки не меняется;
--   * `program_exercises` хранит собственный снимок имени — тренировкам правка не видна.
--
-- Реверс (откатывает ровно эти же 12):
--   UPDATE public.exercises SET name_eng = NULL WHERE id = ANY(ARRAY['d493fde1-7223-4bf9-a121-bfa1f7ebd42b', '59bc6807-51d8-41e6-9855-1954d01d32c2', 'e2fa44ff-8ef5-4ab6-bb69-db6abf95c2dd', 'cb315b69-45bf-4e8b-9f98-9dca7bf2be0d', '7e3e802f-b8b5-4e80-a7d5-aab5d4254f29', '2ddedfdd-7ccf-4334-a0c6-600dd7fb9ef3', '17c88780-5e54-4ee0-92da-67e0968a5a8f', 'c7053107-e075-4644-ac3e-7be97f1e242e', 'c7180f08-97da-4252-b316-dd3984a6259d', 'a6889080-f234-4d8f-a779-ab953b98de26', '822f7bec-bd5e-4cce-83bc-8fb0a4537864', '24a1cd79-3e3d-48ac-8341-c6e1b02f8548']);
--
-- Снимок «до»: name_eng IS NULL = 47 → «после» = 35.
-- ============================================================================

UPDATE public.exercises e
SET name_eng = v.name_eng
FROM (VALUES
  ('d493fde1-7223-4bf9-a121-bfa1f7ebd42b'::uuid, 'Cable Incline Triceps Extension'),
  ('59bc6807-51d8-41e6-9855-1954d01d32c2', 'Dips - Triceps Version'),
  ('e2fa44ff-8ef5-4ab6-bb69-db6abf95c2dd', 'Dumbbell One-Arm Triceps Extension'),
  ('cb315b69-45bf-4e8b-9f98-9dca7bf2be0d', 'External Rotation'),
  ('7e3e802f-b8b5-4e80-a7d5-aab5d4254f29', 'Glute Kickback'),
  ('2ddedfdd-7ccf-4334-a0c6-600dd7fb9ef3', 'Lying Cable Curl'),
  ('17c88780-5e54-4ee0-92da-67e0968a5a8f', 'Smith Machine Overhead Shoulder Press'),
  ('c7053107-e075-4644-ac3e-7be97f1e242e', 'Standing Cable Wood Chop'),
  ('c7180f08-97da-4252-b316-dd3984a6259d', 'Standing Calf Raises'),
  ('a6889080-f234-4d8f-a779-ab953b98de26', 'Standing One-Arm Cable Curl'),
  ('822f7bec-bd5e-4cce-83bc-8fb0a4537864', 'Thigh Abductor'),
  ('24a1cd79-3e3d-48ac-8341-c6e1b02f8548', 'Triceps Overhead Extension with Rope')
) AS v(id, name_eng)
WHERE e.id = v.id
  AND e.name_eng IS NULL;          -- идемпотентность: повторный apply не меняет ничего

-- Пост-проверка 1 (ждём filled=12 / still_null=0):
--   SELECT count(*) FILTER (WHERE name_eng IS NOT NULL) filled,
--          count(*) FILTER (WHERE name_eng IS NULL) still_null
--   FROM public.exercises WHERE id = ANY(ARRAY['d493fde1-7223-4bf9-a121-bfa1f7ebd42b', '59bc6807-51d8-41e6-9855-1954d01d32c2', 'e2fa44ff-8ef5-4ab6-bb69-db6abf95c2dd', 'cb315b69-45bf-4e8b-9f98-9dca7bf2be0d', '7e3e802f-b8b5-4e80-a7d5-aab5d4254f29', '2ddedfdd-7ccf-4334-a0c6-600dd7fb9ef3', '17c88780-5e54-4ee0-92da-67e0968a5a8f', 'c7053107-e075-4644-ac3e-7be97f1e242e', 'c7180f08-97da-4252-b316-dd3984a6259d', 'a6889080-f234-4d8f-a779-ab953b98de26', '822f7bec-bd5e-4cce-83bc-8fb0a4537864', '24a1cd79-3e3d-48ac-8341-c6e1b02f8548']);
--
-- Пост-проверка 2 (коллизий не стало больше, было 2 — CAT-Q2):
--   SELECT name_eng, count(*) FROM public.exercises
--   WHERE name_eng IS NOT NULL GROUP BY name_eng HAVING count(*) > 1;
--
-- Пост-проверка 3 (папка под каждое имя есть в датасете и отдаёт 200 — локально):
--   python spark-output/export/check-media-names.py --http
