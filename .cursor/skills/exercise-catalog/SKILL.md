---
name: exercise-catalog
description: Как собирать тренировочные программы по БД упражнений FitTracker — семантика колонок exercises, справочники снаряжения/рёбер/противопоказаний, поиск через search_exercises, отбор движений под сплит и уровень, ловушки каталога. Использовать при задачах «подбери упражнения», «собери день/программу», «фильтр ничего не нашёл», «чем заменить упражнение», правке каталога.
---

# Skill: Exercise Catalog (сбор программ по БД упражнений)

## Overview

`exercises` — единственный допустимый источник списка движений для любой программы (каталожной или личной). Всё, что видит пользователь в пикере упражнений, подборе замены и разминке, читается из этой таблицы и трёх справочников вокруг неё: `exercise_equipment`, `exercise_relationships`, `injury_exercise_warnings`.

Цифры в скилле — **срез прода на 11.10.2026** (825 строк, 448 `approved` / 377 `needs_review`) и приведены только как порядок величин. Каталог живой: перед работой переспрашивай БД запросами из раздела «Запросы», а не доверяй числам здесь.

## Семантика полей (что реально определяет выбор)

| Поле | Тип / значения | Как использовать при сборке программы |
|---|---|---|
| `name` | text NOT NULL | Канон. `program_exercises.exercise_name` копируется **дословно** из него: каталог смешан по «ё/е» («Жим ногами в тренажёре» и «Сведение ног в тренажере»), правила на букву нет |
| `status` | `approved` / `needs_review` (default `needs_review`) | Брать `approved`. `needs_review` — только осознанное исключение, число таких строк называется в отчёте |
| `difficulty` | `beginner` / `intermediate` / `advanced`, CHECK нет | Ориентир уровня движения; в программе уровень задаёт `programs.level`, поэтому «advanced» в beginner-программе — красный флаг, а не запрет |
| `category` | `strength` (default), `stretching`, `plyometrics`, `olympic weightlifting`, `powerlifting`, `cardio` | Разминка/активация смотрит `stretching` + `can_be_activation`; плио и олимп. — только для программ с соответствующей целью |
| `movement_pattern` | свободный text, CHECK нет; на срезе 32 значения + 85 NULL (почти все NULL — растяжка) | **Баланс программы считать по паттернам** (push_horizontal/pull_vertical/squat/hinge/lunge/core…), а не по мышцам. У 9 паттернов на срезе 0 `approved` строк — такие движения недоступны для чистого seed'а |
| `primary_muscles` / `secondary_muscles` | text[], отдельной таблицы мышц нет | Объём на группу мышц: primary вес 1.0, secondary 0.5 (методология `weeklySummary`). Словарь названий в коде — `src/constants/muscleGroups.ts` |
| `can_be_activation` | boolean NOT NULL | Флаг разминочной/активационной позиции, используется движком `warmupPlan` |
| `reps_range` | text, **заполнен у 5 строк из 825** | Подсказка в каталоге почти мёртвая: диапазоны повторов задаёт автор программы, а не данные упражнения |
| `settings`, `technique`, `benefits`, `risks` | text, заполнены у всех | Материал для объяснений и для проверки, что движение подходит (например хват/опора в `settings`). Не фильтры |
| `aliases[]`, `short_name`, `name_eng`, `search_text` | поиск | Влияют на выдачу пикера, в программу не попадают |
| `media_url` | text, 819 из 824 | Кадр справочника; правится только отдельными CAT-задачами, перевыпуск — секция «Медиа» ниже (память проекта о медиа-профиле — про состав каталога) |

**Снаряжения колонкой в `exercises` нет**: оно нормализовано через `exercise_equipment` (связь many-to-many) → `equipment.name`. На срезе 1 exercise вообще без снаряжения и **32 строки `equipment` из 132 не имеют ни одного связанного упражнения** — преимущественно кейс-дубли («Тренажер Для Жима На Плечи» vs «Тренажер для жима на плечи»): фильтр по снаряжению строить по именам с ненулевым `count(exercise_equipment)` (запрос 4).

## Как каталог читает приложение

- RPC `search_exercises(q, muscle_filter, category_filter, equipment_filter, activation_filter, sort_by, page_limit, page_offset)` — вызов в `src/services/exercisesServiceNormalized.ts:40`, тело в `supabase/migrations/20261008233000_search_exercises_relevance_tiers.sql` (реверс к `20261008170000`). Ключевое: ё/е нормализуются, запрос ищется по имени, мышцам, снаряжению, алиасам и trgm-похожести; релевантность ярусами (имя начинается с запроса > имя покрывает все слова запроса > алиасы/`short_name`/`name_eng` > только trgm); внутри яруса — `popularity` (сколько раз упражнение реально встречается в `workout_exercises`), затем `sort_by`.
- Счётчики для чипов фильтра — RPC `get_exercise_filter_counts` (категории + снаряжение с числом упражнений).
- Пикер в редакторе программы — `src/components/program/sheets/ExercisePickerSheet.tsx` поверх `src/hooks/useExercises.ts`: поиск срабатывает от 2 символов, страница 40, сортировка `name-asc` / `name-desc` / `popularity`.
- Мышечные чипы берутся из `src/constants/muscleGroups.ts` — это **словарь в коде, не запрос к БД**. В нём есть названия, у которых нет ни одного упражнения с этим `primary_muscles` (на срезе: «малая грудная», «широчайшие (верх)», «подостная», «многораздельные мышцы», «локтевая мышца», «сгибатели пальцев» и др.). Поэтому «фильтр ничего не нашёл» — часто не баг, а дыра словаря: прежде чем обещать подбор по мышце, проверь запросом.

## Медиа: где лежит кадр и как его перевыпустить

Кадры обслуживает **отдельный публичный репозиторий `Alrondar/fittracker-exercise-media`** — адрес `https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/<папка>/<файл>`. В проекте приложения бинарников нет: он читает адрес из `media_url`, а `parseMediaUrls` достраивает второй кадр пары из имени. Значит перевыпуск кадра — это пуш в репозиторий медиа плюс одна `UPDATE` строки; пересборка приложения не нужна ни при каком изменении картинки.

- Позиции, которые ссылались на `.../Alrondar/fittracker-rn/main/data/exercises/`, переехали миграцией `20261025180000_repoint_frames_to_media_repo.sql` (56 строк, применена 25.10). Старый хост с этой поры мёртв: папки в ветке `main` нет, её адреса отдают 404 — любую новую строку `media_url` заводим только на `fittracker-exercise-media`.
- Оставшиеся 758 легаси-строк переехали следом (`20261025200000_repoint_upstream_frames_to_media_repo.sql`, 25.10): ссылок на `yuhonas/free-exercise-db` в каталоге **ноль**, все 819 кадров отдаём мы. Четыре из них были битыми и до переезда (в пути потерялся дефис: `Back_Flyes_-With_Bands` против `Back_Flyes_-_With_Bands` в репозитории) — переезд чинится не `replace`-ом префикса, а точечной правкой по id, держи это в уме при следующих сменах хоста.
- **Хост больше не признак авторства.** И наша рисовка, и зеркало апстрима лежат на одном адресе; различает их только имя файла: `00f/01f/00m/01m` — наша гендерная схема (61 позиция), `0.jpg/1.jpg` — зеркало чужой рисовки (758). Скрипты, которые считали готовность по хосту, после переезда врют: `check-media-names.py` сыпал 358 ложных «папки нет» (проверял по папке из `name_eng`, а рендер ходит в папку из URL) и навязывал зеркалу нормы 850×567 и 8–120 КБ; `build-illustration-manifest.py` считал готовыми 711 позиций вместо 61. Оба исправлены 25.10, но если пишешь новый сверочный скрипт — ветвись по имени схемы, не по хосту.
- Зеркало апстрима теперь наша ответственность: если они обновят картинку, мы об этом не узнаем. Сверка md5 — `spark-output/export/check-upstream-mirror.py`; полный прогон доступности всех кадров по базе — `spark-output/export/check-media-names.py --http`.
- Репозиторий медиа обязан быть публичным: `raw.githubusercontent.com` отдаёт файлы без авторизации, приватный даст 404 во всех карточках.
- Локальное зеркало кадров для скриптов — `../fittracker-exercise-media/exercises`; путь отдаёт `spark-output/export/media_root.py` (`FT_MEDIA_ROOT` перебивает; третья попытка — `data/exercises/` в проекте — с 25.10 несуществующий путь, оставлена на случай работы в старом checkout).
- Новый кадр раскладывается в зеркало (или в `vibe_images/` до приёмки), а не в проект: `build-illustrations.py` пишет именно туда. Черновики приёмки в git не нужны (`vibe_images/` игнорируется), готовые кадры версионирует репозиторий медиа.

- Перезаписал файл под тем же именем → **подними версию в хвосте адреса** (`...00f.jpg?v=4`). Без этого телефон продолжает показывать байты своего кэша: и штатный кэш загрузки, и наше локальное хранилище кадров ключуются полному адресу. Хост на хвост согласен (отдаёт те же байты, край ключует по полному адресу).
- Разборщик срезает хвост перед сопоставлением со схемой и возвращает его на каждый выведенный кадр (`src/utils/mediaScheme.ts`); версия относится сразу к обоим кадрам пары.
- Кадры дня и разминки скачиваются на телефон заранее и живут в потолке 25 / 50 / 100 МБ с вытеснением по давности — потолок выбирает пользователь в настройках («Место на устройстве»), он относится ТОЛЬКО к кадрам (`src/lib/mediaCache.ts`, `src/hooks/useOfflineSettings.ts`). Скачанная программа приносит ещё и кадры своих замен; справочник целиком на устройство ездит текстом (~1,9 МБ, секция ниже), но не картинками.
- Скачивание программы — не в настройках: кнопка в футере каждой карточки на экране «Программы» (`src/components/program/ProgramOfflineChip.tsx`), там же прогресс в процентах, «Обновить» (докачивает только новые и пересъёмленные рамки) и «Очистить». Настройки держат только автоматику и потолок.

## Офлайн-копия справочника

На устройстве лежит полный снимок каталога (≈1,9 МБ, замер 24.10: 1,88 МБ на 825 позиций; с 25.10 в каталоге 824, файл `exercise-catalog.json`, обновление фоновое раз в три суток) — `src/lib/exerciseSnapshot.ts`. При отказе сети карточка упражнения, список, счётчики фильтров, ссылки замен, противопоказания и тексты разминки берутся из него через `networkOrSnapshot`; локальная выборка — `src/utils/exerciseSearchLocal.ts`.

Что нужно знать, сверяя выдачу с базой: локально нет trgm-похожести (опечатка, которую сервер нашёл, офлайн даст пусто) и нет `popularity` (внутри яруса решает алфавит, «Популярные» офлайн = «Я-А»). При пустом запросе оба эти ключа выключены и на сервере, поэтому порядок подбора замен совпадает строго. Неполное покрытие снимком (в каталоге нет одной из запрошенных позиций) = отказ, а не частичный ответ: иначе «не знаем, можно ли» превратилось бы в «противопоказаний нет».

Структуру дня справочник не покрывает (`workouts`, `workout_exercises` — данные пользователя). Её доносит снимок активной программы: `src/lib/programSnapshot.ts` + скачивание по кнопке «Активная программа» (`src/services/programSnapshotService.ts`), ~0,2 МБ данных плюс кадры программы и её замен. Без этого снимка день офлайн не откроется, даже если справочник на устройстве лежит.

## Запросы (переспрашивать состояние каталога)

```sql
-- 1. Объём и качество каталога
select status, category, count(*) from exercises group by 1,2 order by 3 desc;

-- 2. Паттерны с проверкой доступности по status (для баланса сплита)
select coalesce(movement_pattern,'(null)') mp, count(*) n,
       count(*) filter (where status='approved') n_approved,
       count(*) filter (where difficulty='beginner') n_beginner,
       count(*) filter (where can_be_activation) n_activation
  from exercises group by 1 order by 2 desc;

-- 3. Реальные названия мышц в данных (первичные и вторичные)
select m muscle, count(*) filter (where prim) n_primary, count(*) n_total
  from (select unnest(primary_muscles) m, true prim from exercises
        union all select unnest(secondary_muscles) m, false prim from exercises) x
 group by 1 order by 3 desc;

-- 4. Снаряжение, по которому вообще есть упражнения
select eq.name, count(ee.exercise_id) n
  from equipment eq left join exercise_equipment ee on ee.equipment_id = eq.id
 group by 1 having count(ee.exercise_id) > 0 order by 2 desc;

-- 5. Опорный фонд: чем реально заполнены каталожные программы (лучшая база для личной)
select e.name, e.status, e.movement_pattern, e.difficulty, count(*) n_used
  from programs p
  join program_days pd on pd.program_id = p.id and pd.phase_id is not null
  join program_exercises pe on pe.program_day_id = pd.id
  join exercises e on e.id = pe.exercise_id
 where p.created_by is null
 group by 1,2,3,4 order by 5 desc limit 60;

-- 6. Подбор на позицию дня: паттерн + уровень + только approved + снаряд
select e.id, e.name, e.difficulty, eq_agg.names
  from exercises e
  cross join lateral (
    select array_agg(eq.name order by eq.name) names
      from exercise_equipment ee join equipment eq on eq.id = ee.equipment_id
     where ee.exercise_id = e.id
  ) eq_agg
 where e.status = 'approved'
   and e.movement_pattern = 'hinge'
   and e.category = 'strength'
   and e.difficulty in ('beginner','intermediate')
 order by e.name;
```

## Рёбра, замены и safety

- `exercise_relationships(exercise_id → related_exercise_id, relation_type ∈ `variation`|`alternative`|`regression`|`progression`, confidence, status ∈ `suggested`|`approved`). На срезе 3558 рёбер, из них `approved` всего 31 — почти всё `suggested`. Приложение читает **исходящие** рёбра со `status in ('approved','suggested')` (`src/services/exerciseReferenceService.ts`), поэтому сид рёбер заводят в обе стороны. Вывод для подбора: наличие approved-ребра — редкость, замену считать по скорингу `src/engine/alternatives.ts` (совпадение мышц, паттерн, снаряжение, боль/травма, `regression` как приоритет при ограничении), а не по «есть ли ссылка».
- `injury_exercise_warnings(body_part, muscle_group, exercise_id, injury_type, level ∈ avoid|caution, recommendation)`. На срезе 282 строки, 8 частей тела, 259 из них `avoid`. Резолвится **по `exercise_id`**, поэтому `exercise_id IS NULL` в программе = молча выпавшее противопоказание (и не работающие warmup/alternatives).
- `user_injuries` — на срезе прода **0 строк**: травматож конкретного пользователя из БД не берётся, его нужно спросить (или попросить завести в профиле). Чтение в приложении: `injuriesService.getExerciseContraindications`, хук `useInjuryWarnings`, движок `progression/overrides.ts:applySafetyPrecedence`.

## Запрещено

- Придумывать `exercise_name` или uuid упражнений, которых нет в `exercises` (упражнение с нерезолвнутым именем **исчезает из тренировки без ошибки** — `create_workouts_for_program` берёт только `exercise_id IS NOT NULL`).
- Брать движение из паттерна/мышцы, где 0 `approved` строк, «потому что название подходит».
- Строить подбор по мышце из `MUSCLE_GROUPS` без проверки, что такие упражнения в БД есть.
- Править каталог (`insert`/`update exercises`, снаряжение, медиа) ради конкретной программы — каталог живёт отдельными задачами CAT-*; если движения нет, программа строится существующими.
- Заменять отсутствие данных («не нашёл») выводом «в каталоге этого нет» — сначала проверить регистр «ё/е» и кейс-дубли снаряжения.

## Source of truth

- Колонки и типы: `information_schema.columns` (прод) + `src/types/database.types.ts` (`exercises`, `exercise_equipment`, `equipment`, `exercise_relationships`, `injury_exercise_warnings`).
- Поиск и счётчики фильтров: `supabase/migrations/20261008233000_search_exercises_relevance_tiers.sql`, `20261008170000_search_exercises_match_aliases.sql`.
- Пикер и фильтры UI: `src/components/program/sheets/ExercisePickerSheet.tsx`, `src/hooks/useExercises.ts`.
- Нормализация снаряжения/рёбер/противопоказаний: `src/services/exerciseReferenceService.ts`.
- Сырой датасет и дедуп каталога: `../fittracker-exercise-media/exercises/*.json` (путь через `media_root.py`), `supabase/migrations/20261009004500_dedupe_exercises.sql`, секции CAT-* в `STATUS.md`.
- Выкладка программы этими упражнениями: `program-seeding` (каталог) и `program-personal` (личная программа), формат входных данных — `spark-output/specs/program-import-format.md`.
