-- CAT-Q · строка «Отведение ноги в сторону в верхнем блоке» заведена ошибочно 08.10:
-- верхний трос тянет стопу вверх и почти не создаёт момента отведения в тазобедренном
-- суставе, то есть движения, которое описывает карточка, в такой постановке нет.
-- Вердикт владельца 09.10 — не удалять, а развернуть строку в реальное движение по
-- присланному референсу: отведение ноги назад в кроссовере, на четвереньках на лавке.
--
-- Здесь — содержательная часть (текст, мышцы, алиасы, name_eng, снаряд, связи).
-- media_url МЕНЯЕТСЯ ОТДЕЛЬНОЙ миграцией сразу после пуша кадров: до пуша новая папка
-- Cable_Glute_Kickback_On_Bench на хосте отсутствует, и ссылка выдала бы 404 в карточке.
--
-- Blast-radius строки 237d6d2f-3ad3-4fc9-a83b-c938e82071e2 (замер 09.10):
-- program_exercises 0, workout_exercises 0, warnings 0, exercise_equipment 2,
-- exercise_relationships 2. Откат — откатить миграцию и вернуть поля из комментария ниже.

begin;

-- 1. Содержимое карточки.
update exercises set
  name = 'Отведение ноги назад в кроссовере на лавке',
  name_eng = 'Cable Glute Kickback On Bench',
  technique = $t$Закрепите манжету на щиколотке рабочей ноги и встаньте на четвереньки на скамью, продев ногу в трос. Кисти под плечами, колено опорной ноги на сиденье, спина прямая. Напрягите пресс и, не меняя угла в корпусе, отведите рабочую ногу назад до разгибания в тазобедренном суставе. Задержитесь в верхней точке и верните ногу под контролем, не снимая натяжения троса.$t$,
  settings = $s$Скамья горизонтальная, блок нижний. Колени на сиденье, корпус параллелен скамье. Амплитуда — до момента, когда таз начинает подкручиваться, а поясница уходит в прогиб.$s$,
  primary_muscles = array['большая ягодичная'],
  secondary_muscles = array['бицепс бедра', 'средняя ягодичная'],
  -- алиасы выдуманного движения снимаем: поиск по «отведение в верхнем блоке»
  -- не должен вести на другую технику.
  aliases = array['отведение ноги назад на лавке', 'кикбэк в кроссовере на скамье',
                  'glute kickback on bench', 'cable kickback на лавке'],
  status = 'needs_review'
where id = '237d6d2f-3ad3-4fc9-a83b-c938e82071e2';

-- 2. Снаряд: верхний блок нижнего блока не бывает; берём связку соседа
--    «Отведение ноги назад на полу» (Glute Kickback) + скамья.
delete from exercise_equipment
where exercise_id = '237d6d2f-3ad3-4fc9-a83b-c938e82071e2';

insert into exercise_equipment (exercise_id, equipment_id) values
  ('237d6d2f-3ad3-4fc9-a83b-c938e82071e2', '60ccd5b9-382e-427c-ac39-01f53dc2d035'), -- Нижний Блок
  ('237d6d2f-3ad3-4fc9-a83b-c938e82071e2', 'e1850f7b-1c7b-4656-b126-596aee369195'), -- Манжета
  ('237d6d2f-3ad3-4fc9-a83b-c938e82071e2', '3496e47c-e767-44a9-9801-a5ae7ff0630b')  -- Горизонтальная скамья
on conflict do nothing;

-- 3. Связи: «вариация тренажёра для разведений» больше не про это движение.
delete from exercise_relationships
where '237d6d2f-3ad3-4fc9-a83b-c938e82071e2'::uuid in (exercise_id, related_exercise_id);

-- Варианты — два ближайших реальных движения с тем же вектором сопротивления.
insert into exercise_relationships (exercise_id, related_exercise_id, relation_type, confidence, status)
select a, b, 'variation', 'high', 'suggested'
from (values
  ('237d6d2f-3ad3-4fc9-a83b-c938e82071e2'::uuid, (select id from exercises where name_eng = 'One-Legged Cable Kickback')),
  ((select id from exercises where name_eng = 'One-Legged Cable Kickback'), '237d6d2f-3ad3-4fc9-a83b-c938e82071e2'::uuid),
  ('237d6d2f-3ad3-4fc9-a83b-c938e82071e2'::uuid, (select id from exercises where name_eng = 'Glute Kickback')),
  ((select id from exercises where name_eng = 'Glute Kickback'), '237d6d2f-3ad3-4fc9-a83b-c938e82071e2'::uuid)
) as v(a, b)
where a is not null and b is not null and a <> b
on conflict (exercise_id, related_exercise_id, relation_type) do nothing;

commit;

-- Проверка после применения:
--   select name, name_eng, primary_muscles, aliases from exercises
--     where id = '237d6d2f-3ad3-4fc9-a83b-c938e82071e2';
--   select eq.name from exercise_equipment ee join equipment eq on eq.id = ee.equipment_id
--     where ee.exercise_id = '237d6d2f-3ad3-4fc9-a83b-c938e82071e2';
