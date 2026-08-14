# FitTracker — Documentation Guide

Срез: 11.08.2026

Цель: один понятный порядок работы с документацией проекта. Старые документы не должны конкурировать друг с другом.

## Source of truth

| Документ | Владелец | Что хранит | Что НЕ хранит |
|---|---|---|---|
| `PRODUCT_VISION.md` | Product / UX | позиционирование, UX-принципы, ownership Tracker/Engine/Coaching/AI | статусы задач, детали кода |
| `ROADMAP.md` | Product plan | последовательность этапов, цели, зависимости | фактические статусы каждой задачи |
| `TASKS_STATUS.md` | Delivery status | что сделано / частично / открыто | длинные архитектурные правила |
| `FILE_INVENTORY.md` | Code inventory | актуальная карта файлов и их технического долга | продуктовые решения |
| `CLAUDE.md` | Engineering rules | стек, архитектурные инварианты, security/performance rules | roadmap и product vision |
| `PROMPTS.md` | Engineering reference | зависимости, RPC, команды, recipes | product strategy и task status |
| `refactoring_guide.md` | Archive | исторический аудит | текущий план; не обновлять |

## Как читать проект перед изменением

1. `PRODUCT_VISION.md` — понять, зачем существует feature.
2. `ROADMAP.md` — понять, входит ли она в ближайший этап.
3. `TASKS_STATUS.md` — проверить фактический статус.
4. `FILE_INVENTORY.md` — найти файлы и известный долг.
5. `CLAUDE.md` — проверить архитектурные ограничения.
6. `PROMPTS.md` — проверить blast radius, RPC и команды.
7. Только после этого менять код.

## Product ownership

```text
Tracker
  └─ core logging / history / programs

Training Engine
  └─ deterministic training logic / progression / safety / alternatives

Coaching Layer
  └─ recommendations / explanations / contextual tips

Optional AI Coach
  └─ analysis / clarification / conversational advice
```

## Документная дисциплина

- Новый продуктовый принцип → `PRODUCT_VISION.md`.
- Новый этап или изменение приоритетов → `ROADMAP.md`.
- Реализация задачи → `TASKS_STATUS.md`.
- Новый/перемещённый файл → `FILE_INVENTORY.md`.
- Архитектурное правило → `CLAUDE.md`.
- Новый RPC/зависимость/рецепт → `PROMPTS.md`.
- Не дублировать одну и ту же информацию в нескольких документах.

## Важное изменение от 11.08.2026

Старая формулировка «Не логгер, а тренер» больше не является позиционированием.

Актуальная формулировка:

> **FitTracker помогает тебе лучше тренироваться и объясняет свои рекомендации.**

AI является опциональным слоем. Базовая ценность должна работать без LLM.
