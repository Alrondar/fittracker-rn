---
name: fittracker-audit
description: Audits FitTracker RN screens and related code against PRODUCT.md UX, CLAUDE.md architecture/performance/security, and INVENTORY.md roles/blast-radius. Use when the user asks for an audit, UX/UI review, screen review, AUDIT-N, постраничный аудит, or to evaluate a screen against progressive disclosure, safety, or performance gates.
---

# FitTracker Audit

Read-only review unless the user explicitly asks to implement fixes.

If the target is unspecified, identify the highest-priority relevant AUDIT-* item using ROADMAP.md and STATUS.md. Do not choose a target from `STATUS.md` alone.

## When this applies

- User names a screen, route, AUDIT-N, or says «аудит» / UX review / screen review.
- Reviewing workout, program editor, programs, dashboard, progress, exercises, profile, or a shared component that feeds those surfaces.

If the target is unspecified, identify the highest-priority relevant AUDIT-* item using ROADMAP.md and STATUS.md. Do not choose a target from STATUS.md alone.

## Pre-flight (always)

1. Read `ROADMAP.md` to understand the current stage, priorities, dependencies, and whether the target belongs to the active work.
2. Read `PRODUCT.md` §1–§3.5 (north star, hierarchy, design skill). For workout/program/history/dashboard/AI also read the matching PRODUCT section (§4–§15).
3. Read `CLAUDE.md` §2, §7–§9, §12, §14 (invariants, tokens, performance gate, anti-patterns, AI, workflow).
4. Read `INVENTORY.md`: screen map §1, role + blast-radius + known notes for the target; §0 search patterns.
5. Read `STATUS.md` for current AUDIT-* / UX status of that surface.
6. Open the screen file and its feature components/hooks from INVENTORY. Find consumers via code search. Do not invent file contents.

Workout (`app/(tabs)/workout/[id].tsx`, `useWorkoutSession`) and Program Editor (`app/program/[id]/edit.tsx`, `useProgramEditor`) are high blast-radius: inspect INVENTORY §2 and §11 before judging.

## Audit scheme (every screen)

Score the same 14 points. Skip a point only if it cannot apply; say so.

1. Цель экрана (роль из INVENTORY, intent из PRODUCT).
2. Главный пользовательский сценарий.
3. Информационная нагрузка.
4. Progressive disclosure (L1 / L2 / L3).
5. Навигация и контекст.
6. UI hierarchy (PRODUCT §3.1–3.3).
7. Тренерская логика (Training Engine vs coaching vs optional AI).
8. Performance / TTI (CLAUDE.md §8).
9. Что оставить.
10. Что убрать или перенести.
11. Что сделать sheet/modal (`SheetShell`; bottom sheet vs modal — PRODUCT §3.2).
12. Что отдать Training Engine (детерминированно, без LLM).
13. Где AI уместен / неуместен (PRODUCT §13–§14, CLAUDE.md §12).
14. Приоритет: 🔴 / 🟠 / 🟡 / 🟢.

### Definition of a good screen

```text
Я понимаю, где я нахожусь.
Я понимаю, что могу сделать сейчас.
Я вижу только нужную информацию.
Остальное доступно по запросу.
Рекомендации понятны.
Я могу их отклонить.
Приложение не заставляет меня общаться с AI.
```

### L1 / L2 / L3

- **L1**: always visible; workout logging L1 ≤ 3–4 elements.
- **L2**: tap to open (sheet/accordion); heavy media/slider/charts **not mounted until open**.
- **L3**: separate screen; not for frequent actions.

Pain/safety warnings stay L1 if active. They do not block logging.

## Cross-cutting checks

Copy and fill. Failures become findings.

```
Cross-cut:
- [ ] Tracker first; analytics not competing with the primary action
- [ ] Progressive disclosure; L2 heavy content lazy-mounted
- [ ] Training Engine can do this without AI
- [ ] If AI: why here, on-demand, not required to complete the flow
- [ ] User can accept / change / reject recommendations; «Почему?» available
- [ ] No UI path bypasses injury/pain constraints
- [ ] Temporary replacement vs program replacement are distinct
- [ ] Semantic tokens only; no hardcoded colors
- [ ] loading / error / empty / data states
- [ ] Tap ≥ 44pt; destructive actions confirmed
- [ ] Gestures have a tap alternative
- [ ] Supabase only via src/services/; no server data in Zustand
- [ ] Performance gate: memo/useCallback, no VirtualizedList in ScrollView,
      stable keys, no N+1, Reanimated .value in worklets
```

### Workout-specific (if target is workout flow)

```
Workout:
- [ ] Set → Rest → Next — few taps
- [ ] Previous results on demand, not always-visible history
- [ ] Recommendation: weight × reps primary; Принять/Изменить secondary; Почему? tertiary
- [ ] RPE tappable 1–10, not draggable
- [ ] Rest timer auto-start, cancellable; not its own screen
- [ ] History / alternatives / technique / warm-up on tap
- [ ] Pain/safety visible when relevant
```

Do not re-litigate already-shipped behavior documented in INVENTORY §12 (e.g. tappable RPE, lazy ExerciseSlider) unless the code diverges.

### Product test (new feature on the screen)

PRODUCT.md §15: faster/better training or logging? deterministic without AI? no overload? disclosure? user keeps the decision? explainable? no extra network/mount cost on workout flow?

## Output format

Lead with verdict, then findings. Cite files with `start:end:path`.

```markdown
# Audit: [screen / route]

**Роль:** …
**Статус в STATUS.md:** …
**Этап ROADMAP:** текущий этап
**Вердикт:** 🔴 | 🟠 | 🟡 | 🟢 — one sentence.

## Good screen
- pass / fail vs the seven-line definition

## Findings
- 🔴 **Critical** — must fix before treating the screen as done
- 🟠 **Should fix** — UX/perf/safety debt with clear user impact
- 🟡 **Suggestion**
- 🟢 **Keep** — what already matches PRODUCT/CLAUDE

Each finding: evidence (file + behavior), which rule (PRODUCT/CLAUDE section), proposed direction (not a large patch unless asked).

## L1 / L2 / L3 map
| Layer | Now | Should be |
|---|---|---|

## Performance
Mount/re-render/query notes. For workout/[id] and useWorkoutSession: explicit mount/render impact.

## Safety / AI
Injury bypass? AI required? PII?

## Suggested next slice
Smallest change that moves the screen. Do not implement unless the user says to.
```

## Rules of engagement

- Minimal speculation: if a file was not read, mark the claim as assumption.
- Do not copy file lists, RPC lists, or screen maps into new docs; point to INVENTORY / types / migrations.
- Do not update `UX_AUDIT_PLAN.md` or `refactoring_guide.md`.
- After an agreed implementation, update `STATUS.md` / `INVENTORY.md` only if status, role, blast-radius, or gotchas changed.
- This skill is review, not implementation. Spec → confirm → code still follows CLAUDE.md §14.
