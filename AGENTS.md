# AGENTS.md — правила для AI-агента

Точка входа. Core — 5 рабочих документов: `PRODUCT.md`, `CLAUDE.md`, `ROADMAP.md`, `STATUS.md`, `INVENTORY.md`. Вспомогательные: `DOCS_GUIDE.md` (карта документов), `UX_AUDIT_PLAN.md` (аудит экранов), `refactoring_guide.md` (архив, не обновлять).

## Обязательное чтение

Перед любой задачей читать в этом порядке:

| № | Документ | Что искать | Обязательность |
|---|---|---|---|
| 1 | `CLAUDE.md` | архитектура, state, дизайн-система, performance, security, workflow gates | всегда |
| 2 | `PRODUCT.md` | продуктовый intent, UX-принципы, дизайн-скилл (§3.1–3.5) | всегда |
| 3 | `INVENTORY.md` | роли экранов, blast-radius, навигация по коду (§0) | всегда |
| 4 | `STATUS.md` | фактический статус задачи, метрики, tech debt | всегда |
| 5 | `ROADMAP.md` | входит ли задача в текущий этап | по требованию |
| 6 | `DOCS_GUIDE.md` | карта документов, MCP / без-MCP правила | по требованию |
| 7 | `UX_AUDIT_PLAN.md` | чеклист аудита, 2026 trends | для UI-задач |
| 8 | `refactoring_guide.md` | архив; не обновлять | справочно |

## Правило владения

Один факт — один владелец. Дубли запрещены.

| Документ | Владеет темой | Не должен содержать |
|---|---|---|
| `CLAUDE.md` | технические правила, архитектура, security, performance, workflow gates | статусы задач, roadmap, product vision |
| `PRODUCT.md` | позиционирование, UX-принципы, дизайн-скилл | статусы задач, детали кода |
| `ROADMAP.md` | последовательность этапов, цели, зависимости | фактические статусы |
| `STATUS.md` | фактический статус задач, метрики, tech debt | длинные архитектурные правила |
| `INVENTORY.md` | роли экранов, blast-radius, навигация по коду | продуктовые решения, архитектурные правила |
| `AGENTS.md` | точка входа, workflow, порядок чтения | деталей кода, статусов, инвентаря |
| `DOCS_GUIDE.md` | карта документов, MCP/без-MCP правила | дублей правил из `CLAUDE.md` |
| `UX_AUDIT_PLAN.md` | чеклист аудита и 2026 trends | дублей продуктовой модели |

## Workflow: spec → code → review

Любое существенное изменение проходит три стадии. Технические gates — в `CLAUDE.md §14`; здесь — продуктовая логика workflow.

### UI/UX задача

1. **Spec без кода**: user goal, уровни информации L1/L2/L3 (PRODUCT.md §3.2), состояния (loading/error/empty/data), варианты (minimal / balanced).
2. **Подтверждение spec** пользователем (или явное «делай»).
3. **Реализация**: существующие компоненты/токены, lazy mount, минимальный diff.
4. **Review**:
   - сверка с `PRODUCT.md §3.1–3.5` (дизайн-скилл);
   - сверка с performance gate `CLAUDE.md §8`;
   - обновление `STATUS.md` / `INVENTORY.md` если изменились статус/роль/blast-radius.

### Кодовая задача

1. **Читаем файл**, ищем потребителей через code search (MCP) или по карте `INVENTORY.md §0`.
2. **План impact и риски**: re-render, mount cost, запросы, sync/safety semantics.
3. **Минимальный diff**; файл >450 строк — рассмотреть split.
4. **Review**:
   - сверка с `CLAUDE.md §2` (инварианты), `§9` (антипаттерны), `§8` (performance);
   - `tsc --noEmit` + `eslint` обязательны;
   - обновление `STATUS.md` / `INVENTORY.md`.

## Skills

Agent skills живут внутри документов (отдельных файлов скиллов нет):

- **Design skill** → `PRODUCT.md §3.1–3.5` + `UX_AUDIT_PLAN.md` (2026 trends checklist).
- **Performance skill** → `CLAUDE.md §8` (performance gate) + `STATUS.md §12` (метрики).
- **Code review** → `CLAUDE.md §14` (workflow gates) + `CLAUDE.md §13` (checklist).

## Веб-порт: отдельный worktree

Веб-версия живёт не в этом дереве, а в git worktree:

| Что | Значение |
|---|---|
| Каталог | `../fittracker-rn-web` |
| Ветка | `web-port` (создана от `main`) |
| Запуск | `cd ../fittracker-rn-web && npx expo start --web` |
| Проверка | `npx tsc --noEmit`, `npx eslint .`, `npx expo export --platform web` |

Порядок работы: общие правки (нужные и нативной сборке — например, `src/lib/feedback.ts`) делаются в `main` и перетекают в `web-port` через `git merge main`; чисто вебские (кламп ширины макета, веб-колонка, `Platform.OS === 'web'` ветки, `app.json > web`, RNW-зависимости) — только в `web-port`. Причина разделения: в `main` параллельно идут нативные UX-пакеты, и смешивать их с портом нельзя.

### Общие файлы: правило WEB-CTR-9

Вердикт владельца (зафиксирован 06.10). Если дефект обнаружен на вебе, но носитель — **общий файл** (попадает в нативный бандл, т.е. используется без фильтра по платформе), правка делается **один раз в `main`**, внутри файла — на месте, с `Platform.OS === 'web'` guard'ом там, где поведение должно различаться; затем переносится в `web-port` обычным `git merge main`. Веб-клонов файлов и параллельных реализаций в порту не заводим.

| Категория | Где править | Примеры носителей |
|---|---|---|
| Общий файл с веб-симптомом | `main` (+ `Platform`-guard) → merge в `web-port` | `app/program/[id]/edit.tsx` (BackHandler/`beforeunload`), `src/components/workout/ExerciseSlider.tsx` (snapToOffsets), `src/components/workout/WarmupBlock.tsx`, `src/components/workout/SetsGrid.tsx`, `src/hooks/useWarmup.ts`, `src/utils/perf.ts` (флаги), `src/lib/supabase.ts`, `src/lib/queryPersistence.ts`, табы `app/(tabs)/*` |
| Чисто вебская правка | только `web-port` | кламп ширины макета, веб-колонка/`webShell`, `app.json > web`, RNW-зависимости, `Platform.OS === 'web'`-только код |

Под правило попадают, в частности: WEB-BUG-4/6/9, WEB-FZ-4/8/9. Запрещено чинить одно и то же дважды в двух деревьях: патч, живущий только в `web-port`, даёт расхождение поведения натива и веба и merge-конфликты по `STATUS.md` (урок 01.10 — восстановление веб-секций после мержа).

## Навигация

### Без MCP

Агент не должен выдумывать содержимое файлов. Порядок:

1. Прочитать `AGENTS.md` — этот файл.
2. `PRODUCT.md` — продуктовый intent; `§3.1–3.5` — дизайн-скилл.
3. `CLAUDE.md` — инварианты `§2`, performance `§8`, workflow `§14`.
4. `INVENTORY.md` — роли, blast-radius, **`§0 Navigation` даёт карту директорий и поисковые шаблоны**.
5. `STATUS.md` — статус задачи; `§12` — метрики; `§13` — tech debt.
6. Запросить текущие файлы у пользователя, явно пометить предположения.

### С MCP

Код — первичный источник фактов. Документы — источник решений и intent.

1. Прочитать файл, который меняется.
2. Найти потребителей code search'ом.
3. Проверить RPC в `supabase/migrations/` и `types/database.types.ts`.
4. Использовать поисковые шаблоны из `INVENTORY.md §0`.
5. При конфликте документа и кода побеждает код; документ исправляется в том же изменении.

## Запрещено

- Выдумывать содержимое файлов.
- Дублировать правила `CLAUDE.md` в других документах.
- Создавать новые документы без причины.
- Копировать списки файлов/функций/RPC в документы — только указатели, где проверять.
- Игнорировать обязательные gates (`tsc`, `eslint`, performance gate, design skill review).

## MCP-specific instructions

Если filesystem MCP подключен:

- **Mandatory pre-flight**: прочитать файл и найти потребителей перед любым изменением (CLAUDE.md §10).
- **Grep/code search first**: использовать шаблоны из `INVENTORY.md §0`, не изобретать каждый раз.
- **Не доверять документам 100%**: сверять сигнатуры и схемы с реальным кодом (`database.types.ts`, `supabase/migrations/`).
- **Drift fixing**: если обнаружено расхождение документа и кода — исправить документ в том же изменении, где это обнаружено.
