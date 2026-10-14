-- CAT-LEGACY · перелинковка трёх легаси-кадров, которые висели не на своих строках.
--
-- Вердикты владельца 12.10 (по списку из аудита одолженных кадров):
--   * «Жим штанги стоя (армейский жим)» — ок;
--   * «Махи гантелями перед собой» — ок;
--   * «Ягодичный мостик на полу» — НЕ менять (остаётся на Barbell_Glute_Bridge);
--   * «Разгибание рук на верхнем блоке (прямая рукоять)» — НЕ менять (остаётся на V-Bar).
--
-- Что было. Каталог импортирован из free-exercise-db, и у части строк `media_url` ведёт в
-- папку ДРУГОЙ записи: кадр подвешивался по похожести названия, а не по соответствию
-- движению. Две строки из этого списка стоят в каталожных программах и видны пользователям:
--   «Жим штанги стоя» показывал жим СИДЯ со спинкой (Seated_Barbell_Military_Press);
--   «Махи гантелями перед собой» показывали чередующийся подъём на дельты
--   (Alternating_Deltoid_Raise), а не подъём гантели перед собой.
--
-- Пункт 3 — не отдельная правка, а следствие пункта 2. Кадр Front_Dumbbell_Raise уже занят
-- строкой «Попеременный подъем гантелей перед собой» (8a813678). Если переставить на него
-- только «Махи гантелями перед собой», обе карточки начнут показывать одно и то же фото.
-- Поэтому строки меняются кадрами, а «Попеременному подъёму» возвращается и `name_eng`:
-- сейчас обе строки носят name_eng = 'Front Dumbbell Raise' — одна из двух коллизий
-- `name_eng` в каталоге (вторая — Smith Machine Hang Power Clean, она здесь не трогается).
-- `name_eng` в UI не рендерится, но его матчит `search_exercises` (CAT-Q7) и из него
-- выводится имя папки по правилу хоста, поэтому оставлять его ошибочным нельзя.
--
-- Проверено перед записью (срез 12.10):
--   * папки Standing_Military_Press, Front_Dumbbell_Raise, Alternating_Deltoid_Raise есть
--     в data/exercises, в каждой лежат оба кадра (0.jpg и 1.jpg) — вторая рамка у
--     `parseMediaUrls` берётся из того же каталога, 404 на ней не появится;
--   * `program_exercises.exercise_name` хранит снимок РУССКОГО имени — оно не меняется,
--     значит уже созданные тренировки и история не видят правки;
--   * у затронутых строк не меняется ни `status`, ни мышцы, ни снаряжение, ни рёбра.
--
-- Blast radius: 3 строки exercises, колонка media_url у всех трёх + name_eng у одной.
-- Ссылки остаются на том же хосте (апстрим free-exercise-db), наш репозиторий не затрагивается,
-- пуш кадров не нужен. Счётчики по хостам до и после идентичны: 778 апстрим / 42 наш / 6 без кадра.
--
-- РЕВЕРС (полный, дословные значения до правки):
--   update exercises set media_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Barbell_Military_Press/0.jpg'
--    where id = 'a673a68c-3b75-46c8-8fcb-da8962a14a80';
--   update exercises set media_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Alternating_Deltoid_Raise/0.jpg'
--    where id = '8a3dd8f1-0d0a-485b-a31a-75921af08be9';
--   update exercises set media_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Front_Dumbbell_Raise/0.jpg',
--                          name_eng = 'Front Dumbbell Raise'
--    where id = '8a813678-628e-4138-9bed-94da2635e629';

begin;

-- 1. «Жим штанги стоя (армейский жим)» → кадр стоячего жима.
update exercises
   set media_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Military_Press/0.jpg'
 where id = 'a673a68c-3b75-46c8-8fcb-da8962a14a80';

-- 2. «Махи гантелями перед собой» → кадр подъёма гантели перед собой.
update exercises
   set media_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Front_Dumbbell_Raise/0.jpg'
 where id = '8a3dd8f1-0d0a-485b-a31a-75921af08be9';

-- 3. Следствие: «Попеременный подъем гантелей перед собой» получает свой кадр и своё имя.
update exercises
   set media_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Alternating_Deltoid_Raise/0.jpg',
       name_eng  = 'Alternating Deltoid Raise'
 where id = '8a813678-628e-4138-9bed-94da2635e629';

commit;
