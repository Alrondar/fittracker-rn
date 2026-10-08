# Формат входных данных для переноса тренировочной программы в БД FitTracker

Документ-контракт: что именно нужно передать, чтобы программа корректно легла в прод и корректно читалась приложением. Написан для машинного потребления — другим агентом/человеком без контекста проекта.

Проверено по проду 07.10.2026: `information_schema.columns`, `pg_constraint`, `pg_get_functiondef('create_workouts_for_program')`, `src/constants/phaseTypes.ts`, `src/types/workout.ts`, `.cursor/skills/program-seeding/SKILL.md`.

---

## 1. Модель данных: 4 уровня, вложенность обязательна

```
programs (1)
└── program_phases (N)          -- фазы/мезоциклы
    └── program_days (N)        -- дни; ПРИНАДЛЕЖАТ фазе
        └── program_exercises (N) -- упражнения дня с параметрами
```

| Таблица | PK | FK | Каскад |
|---|---|---|---|
| `programs` | `id` **text** (uuid-строка) | `created_by` → `auth.users` | — |
| `program_phases` | `id` **text** | `program_id` → `programs` | `ON DELETE CASCADE` |
| `program_days` | `id` **uuid** | `program_id` → `programs`; `phase_id` → `program_phases` | `ON DELETE CASCADE` (оба) |
| `program_exercises` | `id` **uuid** | `program_day_id` → `program_days`; `exercise_id` → `exercises` | CASCADE; `exercise_id`: `ON DELETE SET NULL` |

Обязательные NOT NULL: `programs.name`, `programs.level`, `programs.duration`; `program_phases.phase_number`, `name`, `phase_type`, `weeks_count`; `program_days.program_id`, `day_number`, `name`, `week_number`; `program_exercises.program_day_id`, `exercise_name`, `sets`, `reps_range`, `rest_seconds`, `intensity`, `position`.

CHECK: `program_exercises.intensity ∈ {low, medium, high}`; `program_exercises.target_rpe ∈ [1,10]`.

---

## 2. Как приложение читает программу (это и есть настоящие требования)

Функция `create_workouts_for_program(p_user_id uuid, p_program_id text)` вызывается при старте программы и порождает строки `workouts` + `workout_exercises`. Из её тела следуют правила, которые нельзя нарушать:

1. **Обход фаз:** `order by phase_number, position nulls last`. Для каждой фазы генерируются недели `1..greatest(weeks_count, 1)`.
2. **Выбор дней:** `WHERE phase_id = <id фазы> AND week_number = <неделя>`; если для этой недели дней нет — **fallback на `week_number = 1` этой же фазы**; если и недели 1 нет — неделя молча пропускается.
3. **Порядок дней:** `order by day_number, position nulls last`. Название тренировки = `program_days.name`, `workouts.day_index = day_number`, `workouts.phase_number = phase_number`.
4. **Копируются только упражнения с `exercise_id IS NOT NULL`** (`where pe.exercise_id is not null`). Упражнение с именем, которого нет в каталоге, **исчезает из тренировки без ошибки**.
5. **Порядок упражнений:** `order by pe.position` (дубли `position` дают недетерминированный порядок).
6. **Перенос параметров в снимок тренировки:** `sets → target_sets`, `reps_range → target_reps_range`, `rest_seconds`, `intensity`, `target_rpe`, `progression_policy`. То есть все шесть подей доезжают до сессии; `exercise_name` в снимок не копируется (там резолвится по `exercise_id`).
7. **Программы без фаз** обрабатываются fallback-веткой (дни по `program_id`, все в `phase_number = 1`). Для каталога это не вариант: держи фазы всегда.

Следствие для правок: уже созданные тренировки — снимки. Изменение `program_exercises` не переписывает прошлые/сгенерированные тренировки пользователя, только будущие копирования.

---

## 3. Формат входа: JSON (предпочтительный)

```jsonc
{
  "program": {
    "id": "7f3c1a90-0000-4000-8000-000000000001",   // uuid-строка, задаётся явно ради отката
    "name": "Push/Pull/Legs — Рекомпозиция",
    "level": "intermediate",                        // beginner | intermediate | advanced
    "duration": 8,                                  // НЕДЕЛИ, обязан равняться сумме weeks_count
    "description": "Человекочитаемое описание на русском",
    "schedule": ["Пн", "Ср", "Пт", "Сб"],           // строки RU-дней; [] или null допустимы
    "created_by": null,                             // null = готовая программа каталога; uuid = личный экземпляр
    "exercises_status_preference": "approved"       // справочное: из какого статуса каталога брать имена
  },
  "phases": [
    {
      "phase_number": 1,
      "name": "Гипертрофия",
      "phase_type": "hypertrophy",                  // hypertrophy | strength | power | deload | custom
      "weeks_count": 4,
      "position": 1,
      "description": null,
      "days": [
        {
          "day_number": 1,
          "week_number": 1,                         // 1 = шаблон недели, повторяется на все weeks_count
          "name": "Push",
          "position": 0,
          "exercises": [
            {
              "position": 1,
              "exercise_name": "Жим штанги лежа на горизонтальной скамье",
              "sets": 4,
              "reps_range": "6-10",
              "rest_seconds": 120,
              "intensity": "high",
              "target_rpe": 8,
              "progression_policy": "double_progression"
            }
          ]
        }
      ]
    }
  ]
}
```

### 3.1 Поле за полем

| Уровень | Поле | Обязательно | Значения / правило | Если не задано |
|---|---|---|---|---|
| program | `id` | нет (лучше да) | uuid-строка; явный id упрощает откат и повтор | сгенерируется БД |
| program | `name` | **да** | не должно совпадать/конфликтовать с существующими в `programs` | ошибка NOT NULL |
| program | `level` | **да** | `beginner` / `intermediate` / `advanced` (CHECK нет, UI ждёт эти) | ошибка |
| program | `duration` | **да** | целое число **недель** = Σ `weeks_count` | ошибка |
| program | `schedule` | нет | массив RU-строк дней (`"Пн"`, `"Вт"`, …) | `null` → UI покажет `[]` |
| program | `description` | нет | текст RU | `null` |
| program | `created_by` | **да как решение** | `null` = seeded-программа каталога; uuid = личный экземпляр пользователя | по умолчанию `null`, но это семантика — уточни |
| program | `share_code`, `source_program_id` | нет | для seed — `null` | `null` |
| phase | `phase_number` | **да** | 1..N, уникален внутри программы, задаёт порядок обхода | ошибка |
| phase | `name` | **да** | RU: «Гипертрофия», «Сила», «Мощность», «Дилоуд» | дефолт `'Фаза'` |
| phase | `phase_type` | **да** | `hypertrophy` \| `strength` \| `power` \| `deload` \| `custom` | дефолт `'custom'` |
| phase | `weeks_count` | **да** | ≥1; сколько недель генерится по этой фазе | дефолт 1 |
| phase | `position` | нет | вторичная сортировка; обычно = `phase_number` | `null` (last) |
| day | `day_number` | **да** | 1..N внутри недели фазы; становится `workouts.day_index` | ошибка |
| day | `name` | **да** | название тренировки: «Push», «Pull», «Legs», «Upper», «Lower», «Hybrid», «Full Body» | ошибка |
| day | `week_number` | **да** | 1 = повторяемый шаблон; 2..`weeks_count` = волна (см. §4.3) | дефолт 1 |
| day | `position` | нет | порядок внутри `(phase, week)` после `day_number` | 0 |
| exercise | `exercise_name` | **да** | **дословно** `exercises.name` из каталога (см. §5) | ошибка |
| exercise | `sets` | **да** | int ≥ 1, число рабочих подходов | ошибка |
| exercise | `reps_range` | **да** | строка, см. §6 | ошибка |
| exercise | `rest_seconds` | **да** | int, сек; ориентир: база 120–180, подсобка 60–90 | ошибка |
| exercise | `intensity` | **да** | `low` \| `medium` \| `high` (CHECK) | ошибка |
| exercise | `position` | **да** | int, уникален внутри дня, 1..N | ошибка |
| exercise | `target_rpe` | нет (но нужно) | int 1..10; см. §7 | `null` → в сессии нет целевой интенсивности |
| exercise | `progression_policy` | нет | `linear` \| `double_progression` \| `greyskull` \| `time_based` | `'linear'` |
| exercise | `exercise_id` | не присылай | резолвится по имени из каталога | — |

### 3.2 Чего во входе быть не должно

- **Весов** — программа весов не хранит; нагрузка выводится из `target_rpe`/политики и истории подходов.
- `exercise_id`, uuid-дни, uuid-практрисы — кроме явного `program.id`.
- «100% от 1ПМ», «RPE 8 = 2 повтора в запасе» в числовом поле: это текст, а не колонка.
- Тайминг-подходы вида «30 сек» (см. §6.3).
- Отсутствующие в каталоге названия «своими словами» (см. §5).

---

## 4. Фазы: как их задавать правильно

### 4.1 Инвариант, который ломают чаще всего

**Каждая фаза имеет собственный набор строк `program_days` с заполненным `phase_id`.** Дни между фазами не переиспользуются и не «наследуются». Если для фазы 2 дней нет — фаза 2 не даст ни одной тренировки (молча). Значит: 3 фазы × 5 дней = 15 строк дней, даже когда состав упражнений повторяется.

Практическое следствие: в JSON `days` обязано быть внутри **каждой** фазы. Если ты хочешь «те же дни, что в фазе 1» — это не ссылка, а явное копирование массива (я развёрну в отдельные строки сам).

### 4.2 Согласованность объёма и цикла

- `program.duration = Σ phases[].weeks_count` — проверю до вставки, при расхождении верну вопрос.
- Канонический порядок: `hypertrophy` → `strength` → (опц. `power`) → `deload` последней.
- `deload`: **−30% объёма** (меньше подходов, RPE 6, отдых короче) — это про планирование; движок на deload-неделе дополнительно сам снижает предложенный вес до **baseWeight × 0.9** (−10%), в seed-данных вес не закладывается.
- Смысловые ориентиры `phase_type` (беру из UI-подсказок, чтобы фактура не противоречила типу): hypertrophy 3–4×8–12, strength 4–5×3–6, power 3–5×1–3, deload 2–3×8–10.
- **`phase_type` влияет на шаг прогрессии** (`src/engine/progression.ts:457`): `hypertrophy` → шаг 1.25 кг, `strength` → 2.5 кг (дефолт), `endurance` → 1.0 кг. `endurance` движок понимает, но в UI-перечислении фаз его нет (см. §7.3) — в seed не использовать; `power` и `custom` дают дефолтный шаг 2.5 кг.

### 4.3 Недели внутри фазы (волны)

`week_number` у дня позволяет differing-недели. Правила:

- Один набор дней с `week_number = 1` → он повторяется все `weeks_count` недель. Это дефолтный и предпочтительный вариант.
- Хочешь лёгкую/тяжёлую волну — присылай для фазы два набора дней: `week_number: 1` и `week_number: 2` (при `weeks_count: 4` недели 3 и 4 возьмут набор недели 1 через fallback).
- `day_number` должен быть осмысленным в пределах одной недели (1..5), иначе порядок дней в календаре поедет.

### 4.4 Что я пересппрошу, если данные неполные

(1) seeded (`created_by = null`) или личный экземпляр (какой uuid пользователя); (2) если `duration` ≠ Σ недель; (3) если фаза без дней; (4) если в фазе `deload` объём не ниже объёма предыдущей фазы; (5) если имя дня в разных фазах различается для одного `day_number` (потеря преемственности в UI).

---

## 5. Упражнения: имена — единственная точка отказа

- Источник имени — **только** реальный `exercises.name`. Каталог смешан по «ё/е»: рядом живут «Жим ногами в тренажёре» и «Сведение ног в тренажере»; есть латинская `e` вместо кириллической. Глазом не видно, резолв молча падает.
- Проверка перед выкладкой (её я и так прогоню, но лучше прислать уже чистые имена):

```sql
select c.nm
from (values ('Жим штанги лежа на горизонтальной скамье'), ('...')) c(nm)
left join exercises x on x.name = c.nm
where x.id is null;   -- должно вернуть 0 строк
```

- Предпочтителен `exercises.status = 'approved'`; `needs_review` допустим (существующие программы его используют), но количество таких строк я назову в отчёте.
- Прислать несколько названий одного и того же движения (`"жим лежа"`, `"bench press"`, `"Жим штанги лёжа"`) — плохо: я буду матчить по точному совпадению. Дай канон, синонимы — отдельным списком, я подберу по `aliases`/`search_text` и верну тебе таблицу соответствий на подтверждение.
- Если упражнения в каталоге нет — **не создаю его молча**. Варианты: заменить существующим движением или отдельный запрос на добавление в каталог.

---

## 6. `reps_range`: синтаксис и семантика

### 6.1 Разрешённые формы

| Форма | Пример | Как парсится | Когда использовать |
|---|---|---|---|
| Диапазон | `"6-10"`, `"12-15"` | `{min,max}` | базовый вариант, почти всегда |
| Одно число | `"10"` | `{min:10,max:10}` | дилоуд, жёсткая цель |
| С плюсом | `"8+"` | `{min:8,max:8}` (плюс игнорируется) | «8 и больше» — цель станет жёсткой |
| Без цифр | `"do fail"`, `"до отказа"` | `null` — цели по повторам нет | осознанно, на подсобке |

Разделитель — **дефис `-`**, не `–` и не `—`, без пробелов. Парсер терпит `[-–—+]` между числами, но конвенция seed'а — дефис; любое число после разделителя будет прочитано как верхняя граница, поэтому «RIR 0» парсится как `{min:0,max:0}`, а не как «до отказа» — так писать нельзя. `5 x 8` не поддерживается: `sets` и `reps_range` — отдельные поля.

### 6.2 Числовые ориентиры по фазам

hypertrophy `8-12`/`10-15`, strength `4-6`/`5-8`, power `1-3` (+ взрывные `3-5`), изоляция/дельты `12-20`, дилоуд `8-10` или `10`.

### 6.3 Чего избегать

Тайминг (`"30 сек"`, `"45с"`) парсится как `{min:30,max:30}`, и движок прогрессии начнёт «поднимать вес по повторам» — концепции timed-упражнений в приложении нет (известный долг FD-SEED-2a). Если движение действительно временное (планка, удержание) — скажи явно, обсудим замену или явную договорённость, а не молча ставь тайминг.

---

## 7. Целевая интенсивность и политика прогрессии

### 7.1 `target_rpe` (1–10)

Единственный способ выразить «запас до отказа». Ориентиры: база силы 7–8, гипертрофия-база 8, подсобка 8–9, изоляция-памп 9, дилоуд 6. Формальная шкала: RPE 8 ≈ 2 повтора в запасе, RPE 9 ≈ 1, RPE 10 = отказ.

`intensity` (`low/medium/high`) **не заменяет** `target_rpe`: это отдельный UI/подход-маркер. Заполняй оба, если фаза задаёт логику нагрузки; если сомневаешься — ставь `target_rpe`, `intensity` по правилу: база `high`, многосуставной средний `medium`, изоляция `low`.

Важно: с 25.09 оба поля доезжают до тренировки (`copy_program_for_user`, `create_workouts_for_program`, `save_program_snapshot`). Исторические строки до 25.09 остались `NULL` и заполнятся только при следующем сохранении программы.

### 7.2 `progression_policy`

| Значение | UI-метка | Что делает движок | Когда |
|---|---|---|---|
| `linear` | Линейная | достиг коридор повторов → повысил вес | новичковые/силовые базы, StrongLights-подобные |
| `double_progression` | Двойная | сначала поднимаешь повторы внутри коридора, потом вес | гипертрофия, почти весь каталог для intermediate |
| `greyskull` | Greyskull | 2 рабочих + 1 на максимум, +повторы на последних подходах | подъёмы на бицепс, разгибания, жим лёжа в силе |
| `time_based` | Время | прогрессия за счёт времени | планки/удержания (и помни про §6.3) |

Не задано → `linear`. Для программ, где нужен осознанный шаг нагрузки, задавай явно по каждому упражнению, а не «на всю программу». Точные правила повышения веса/повторов живут в `src/engine/progression.ts` (`calculateDoubleProgression`, `calculateGreyskull:192`, `calculateTimeBased:253`) — не пересказывай их в присылаемой программе, достаточно выбрать значение из четырёх.

### 7.3 Справочник значений и что будет при ошибке

| Поле | Канонический источник | Значения | Последствие неизвестного значения |
|---|---|---|---|
| `phase_type` | `src/constants/phaseTypes.ts` | `hypertrophy` (Гипертрофия), `strength` (Сила), `power` (Мощность), `deload` (Дилоуд), `custom` (Произвольная) | CHECK-констрейнта на колонке **нет**; опечатка сохранится в БД, а UI откатится на «Произвольная» и потеряет цвет/иконку/подсказку |
| `progression_policy` | `src/types/workout.ts:4` | `linear`, `double_progression`, `greyskull`, `time_based` | CHECK нет; в UI дефолт `linear`, в БД останется мусор |
| `intensity` | CHECK в БД | `low`, `medium`, `high` | вставка упадёт с ошибкой — это один из двух жёстких CHECK-констрейнтов схемы (второй — `target_rpe`) |
| `level` | UI-ожидание (CHECK нет) | `beginner`, `intermediate`, `advanced` | фильтр вкладок перестанет подхватывать программу |
| `target_rpe` | CHECK 1–10 | целое 1..10 или `null` | вставка упадёт |

---

## 8. Альтернативные форматы входа (тоже принимаю)

### 8.1 Markdown-таблица (один блок на фазу)

```
Программа: «PPL Repecomp» · level: intermediate · duration: 6 · schedule: Пн,Ср,Пт,Сб · seeded
Фаза 1: Гипертрофия (hypertrophy), 3 недели
День 1 — Push (week 1)
| # | Упражнение | Подходы | Повторы | Отдых | Интенсивность | RPE | Прогрессия |
| 1 | Жим штанги лежа на горизонтальной скамье | 4 | 6-10 | 120 | high | 8 | double_progression |
```

Читается 1-в-1 как §3.1: `#` = `position`, «Отдых» = секунды, «Повторы» = `reps_range`.

### 8.2 CSV

```
phase_number,phase_type,phase_name,weeks_count,day_number,week_number,day_name,position,exercise_name,sets,reps_range,rest_seconds,intensity,target_rpe,progression_policy
1,hypertrophy,Гипертрофия,4,1,1,Push,1,Жим штанги лежа на горизонтальной скамье,4,6-10,120,high,8,double_progression
```

Заголовки колонок = имена полей JSON. `phase_*`/`day_*` поля повторяются в каждой строке (денормализация допустима — я сверну в дерево сам).

### 8.3 Что я точно NOT приму как «формат»

Скриншот, PDF без извлекаемого текста, «как в PPLUL только поменяй X» (правлю только по явному списку), описание текстом без числовых параметров, веса в кг.

---

## 9. Порядок моих действий после получения данных (прозрачность)

1. Разбор → дерево program/phase/day/exercise; проверка §3.1, §4.
2. Резолв имён по каталогу (SQL из §5) → таблица соответствий; при `unresolved > 0` останавливаюсь и спрашиваю.
3. Генерация seed-SQL по шаблону `.cursor/skills/program-seeding/assets/seed_template.sql` (декларативный CTE, `insert…returning` по уровням, фаза = отдельный WITH-блок).
4. Запись файла в `supabase/migrations/` (`ГГГГММДДЧЧММСС_seed_program_<slug>.sql`) **и** применение того же SQL на прод через `apply_migration` — с явным подтверждением пользователя, потому что это запись в прод. `execute_sql` для INSERT заблокирован политикой, обходить не буду.
5. Транспортное ограничение: `apply_migration` не везёт ~10 КБ кириллического SQL — кладу **по фазам** (3–4 вызова). Записей в истории миграций будет больше, чем файлов; отмечу это.
6. Не читаю ту же таблицу, куда только что вставил: значение `phase_id` передаю литералом блока, иначе вставка упражнений даёт 0 строк без ошибки (реальный сбой 25.09 на «Домашней»).
7. Валидация (`references/validate.sql`, запросы 1–9) + E2E: `copy_program_for_user('<id>', '<auth.uid>')` внутри `begin; … rollback;` и сравнение счётчиков оригинала/копии.

### 9.1 Обязательные пост-условия (я их проверяю, ты можешь принять как критерий приёмки)

| Проверка | Ожидаемый результат |
|---|---|
| `unresolved_names` | 0 |
| `program_days` с `phase_id IS NULL` в phased-программе | 0 |
| `count(program_exercises)` и `sum(sets)` по каждой фазе | равны плану из входных данных |
| Дни есть в **каждой** фазе | да |
| `exercise_name = exercises.name` 1-в-1 | да, 0 дрейфа |
| `target_rpe` заполнен там, где задуман | да |
| E2E-копия: число дней/упражнений в копии = в оригинале | да |
| `workout_exercises` после копирования имеют `target_rpe`, `progression_policy` | не null |
| `duration` = Σ `weeks_count` | да |

---

## 10. Минимальный complete-пример (2 фазы, 1 день в каждой)

```json
{
  "program": {
    "id": "7f3c1a90-1111-4222-8000-0000000000aa",
    "name": "Full Body — Новичок",
    "level": "beginner",
    "duration": 6,
    "description": "Три тренировки в неделю, весь тело за подход",
    "schedule": ["Пн", "Ср", "Пт"],
    "created_by": null
  },
  "phases": [
    {
      "phase_number": 1, "name": "Гипертрофия", "phase_type": "hypertrophy",
      "weeks_count": 4, "position": 1,
      "days": [{
        "day_number": 1, "week_number": 1, "name": "Full Body A", "position": 0,
        "exercises": [
          {"position": 1, "exercise_name": "Приседания со штангой на плечах", "sets": 3, "reps_range": "8-10", "rest_seconds": 120, "intensity": "high", "target_rpe": 8, "progression_policy": "double_progression"},
          {"position": 2, "exercise_name": "Жим штанги лежа на горизонтальной скамье", "sets": 3, "reps_range": "8-10", "rest_seconds": 120, "intensity": "high", "target_rpe": 8, "progression_policy": "double_progression"},
          {"position": 3, "exercise_name": "Тяга штанги в наклоне", "sets": 3, "reps_range": "10-12", "rest_seconds": 90, "intensity": "medium", "target_rpe": 8, "progression_policy": "linear"}
        ]
      }]
    },
    {
      "phase_number": 2, "name": "Дилоуд", "phase_type": "deload",
      "weeks_count": 2, "position": 2,
      "days": [{
        "day_number": 1, "week_number": 1, "name": "Full Body A", "position": 0,
        "exercises": [
          {"position": 1, "exercise_name": "Приседания со штангой на плечах", "sets": 2, "reps_range": "10", "rest_seconds": 90, "intensity": "low", "target_rpe": 6, "progression_policy": "linear"},
          {"position": 2, "exercise_name": "Жим штанги лежа на горизонтальной скамье", "sets": 2, "reps_range": "10", "rest_seconds": 90, "intensity": "low", "target_rpe": 6, "progression_policy": "linear"},
          {"position": 3, "exercise_name": "Тяга штанги в наклоне", "sets": 2, "reps_range": "12", "rest_seconds": 60, "intensity": "low", "target_rpe": 6, "progression_policy": "linear"}
        ]
      }]
    }
  ]
}
```

Обрати внимание: `duration` 6 = 4 + 2; фаза 2 содержит **свои** строки дня с теми же упражнениями; `sum(sets)` фазы 2 = 6 против 9 в фазе 1 (−33%, дилоуд соблюдён).

---

## 11. Сводка «что обязательно, что по умолчанию»

Обязательный минимум на упражнение: `exercise_name` (дословно из каталога), `sets`, `reps_range` через дефис, `rest_seconds`, `intensity`, `position`.
Обязательный минимум на день: `day_number`, `name`, `week_number`, и он должен висеть внутри конкретной фазы.
Обязательный минимум на фазу: `phase_number`, `name`, `phase_type` из пяти значений, `weeks_count`.
Обязательный минимум на программу: `name`, `level`, `duration = Σ недель`, решение про `created_by`.
Рекомендуется всегда: `target_rpe`, `progression_policy`, `description`, `schedule`.
