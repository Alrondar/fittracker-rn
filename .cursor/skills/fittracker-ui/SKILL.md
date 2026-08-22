---
name: fittracker-ui
description: Implement approved FitTracker UI/UX changes in React Native/Expo. Before changing code, read PRODUCT.md, ROADMAP.md, STATUS.md, INVENTORY.md, and CLAUDE.md. Follow progressive disclosure, Tracker-first hierarchy, semantic design tokens, 44pt touch targets, dark-theme support, React Query/server-state boundaries, and performance gates. Reuse existing components and patterns before creating new ones. Search consumers and assess blast radius before refactoring. Do not invent architecture or bypass existing services/RLS. Implementation must follow an approved spec or explicit user request; do not turn an audit into an unsolicited rewrite. Run TypeScript and relevant lint/tests after changes and report the files changed and validation results. Use when the user asks to implement FitTracker UI/UX, apply an approved spec, «делай», or ship visual/interaction changes on a screen.
---

# FitTracker UI

Implement approved FitTracker UI/UX changes in React Native/Expo. Before changing code, read PRODUCT.md, ROADMAP.md, STATUS.md, INVENTORY.md, and CLAUDE.md. Follow progressive disclosure, Tracker-first hierarchy, semantic design tokens, 44pt touch targets, dark-theme support, React Query/server-state boundaries, and performance gates. Reuse existing components and patterns before creating new ones. Search consumers and assess blast radius before refactoring. Do not invent architecture or bypass existing services/RLS. Implementation must follow an approved spec or explicit user request; do not turn an audit into an unsolicited rewrite. Run TypeScript and relevant lint/tests after changes and report the files changed and validation results.

This skill **writes code**. Read-only review is `fittracker-audit`. Do not start a rewrite from an audit unless the user confirmed the spec or said to implement.

## Gate: spec first

Proceed only if one of these is true:

- The user confirmed a spec (or said «делай» / implement / ship this).
- The user named a concrete UI change with enough product intent (screen, L1/L2 behavior, states).

If intent is an audit, findings, or «что не так» → do not implement; use audit output and ask to confirm a slice.

UI/UX workflow (CLAUDE.md §14): spec (user goal, L1/L2, loading/error/empty/data, minimal vs balanced) → user confirm → minimal diff → review against PRODUCT.md §3.1–§3.5 and CLAUDE.md §8.

## Pre-flight (before any edit)

Read in this order, then the target files:

1. `PRODUCT.md` — §1–§3.5 always; matching surface §4–§15 when touching workout, RPE, programs, history/progress, dashboard, AI, safety.
2. `ROADMAP.md` — stage, dependencies; do not pull Stage E AI or Stage G into a tracker/UI slice. Do not expand a UI task into a later roadmap stage unless the user explicitly asks for it. Do not pull Optional AI, future Coaching features, or later-stage architecture into a current Tracker/UI implementation.
3. `STATUS.md` — task IDs; do not reopen closed UX-* without evidence the code diverged.
4. `INVENTORY.md` — real routes (code wins), role, blast-radius §11, known notes §12, search patterns §0.
5. `CLAUDE.md` — §2, §7–§9, §14; workout/`useWorkoutSession` → also §8 mount/render.

Then: read the file you will change; code-search consumers; for RPC/schema check `supabase/migrations/` and `types/database.types.ts`. Do not infer the current schema from old migrations alone. Verify the current generated types and, when available, the live Supabase schema.

High blast-radius (INVENTORY §11): `useWorkoutSession`, `useProgramEditor`, `programsService`, `historyService`, `useTheme` / theme constants, `types/workout.ts`.

## Product / UX invariants

- **Tracker first.** On workout, logging beats analytics (PRODUCT.md §3).
- **Progressive disclosure.** L1 always visible (workout logging L1 ≤ 3–4); L2 sheet/accordion, heavy content **unmounted until open**; L3 separate screen, not for frequent actions. Pain/safety warnings stay L1 when active; they do not block logging.
- **Sheets.** Context → `SheetShell` (INVENTORY.md §6). Modal only for critical attention or complex forms (PRODUCT.md §3.2). New sheets use `SheetShell` unless there is a documented reason.
- **Recommendation card.** Weight × reps primary; Принять/Изменить secondary; Почему? tertiary. User can accept, change, or reject. Temporary replacement ≠ program replacement.
- **RPE.** One tappable 1–10 scale; do not reintroduce draggable RPE as default.
- **AI.** Optional, on demand, never required to finish a workout. Do not add LLM UI in this skill unless the approved spec is an AI-stage task.
- **Stability.** Prefer existing screens/components over a new entity (PRODUCT.md §3.1).

Visual: `useTheme()` semantic tokens only (primary, textPrimary/Secondary/Tertiary, textInverse, overlay, error, warning, success, LEVEL_COLORS, getMuscleColor, getPhaseColor). Spacing/radius from canonical constants. Tap targets ≥ 44pt. Dark theme is first-class. Async UI needs loading (skeleton, no jump), error (retry/fallback), empty (next step), data.

Do not add a new UI kit. Reuse `src/components/ui/` (`AppButton`, `AppCard`, `AppBadge`, `AppInput`, `SheetShell`, `Skeleton`, `Toast`, `SectionHeader`, `FadeIn`) and feature folders under `src/components/<feature>/`.

## Architecture (do not invent)

- Server data → React Query only. Zustand → UI/auth only (`useStore`).
- `supabase.from()` / `supabase.auth.*` / `rpc` → `src/services/` (or existing service helpers). Not from `app/` UI.
- User-facing errors → `mapError` / `extractMessage` / `mapAuthError`.
- Images → `expo-image`, not RN `Image`.
- No LayoutAnimation (New Architecture). No `Math.random()` in `keyExtractor`. No VirtualizedList inside ScrollView (DraggableFlatList with `scrollEnabled={false}` is the known exception).
- Do not bypass RLS, injury/`injury_exercise_warnings`, or safety precedence. Do not put secrets or LLM keys on the client.
- File approaching 450 lines → consider split before growing past 500.
- Program edits sync only to future/unstarted workouts (`started_at` and `finished_at` null). Do not rewrite history.

## Performance gate (before done)

CLAUDE.md §8, especially workout:

- List cards `React.memo`; handlers `useCallback`; no new inline objects/arrays into memoized children.
- Media, sliders, charts, pickers mount only when opened.
- New server data via React Query; grouped/nested fetches, no N+1. Do not introduce a new query solely to obtain data that an existing service/query already provides.
- Stable list keys.
- Reanimated `.value` in worklets/animated styles; JS via `runOnJS`; no logging in animation/scroll/gesture loops.
- Changes to `app/workout/[id].tsx` or `useWorkoutSession`: state mount/render impact in the completion report.

## Implement

1. Smallest diff that matches the approved spec.
2. Match existing visual patterns on that surface (workout sections, dashboard cards, program sheets).
3. After behavior change: update `STATUS.md` if an ID’s status changed; `INVENTORY.md` if role, blast-radius, route, or gotcha changed. One fact, one owner. Do not update archived `UX_AUDIT_PLAN.md` or `refactoring_guide.md`. 
If code and documentation contradict each other:
- treat code/schema as the source of factual implementation state;
- do not silently rewrite product or architecture documentation;
- report the contradiction;
- update STATUS.md / INVENTORY.md only when the change itself actually changes their owned facts.
4. Do not commit unless the user asked.

## Validate and report

Run:

- `npx tsc --noEmit`
- eslint on touched files (project config; new warnings are not allowed) Run the project's configured lint command or eslint on touched files according to package.json/config. Do not invent a new lint setup.

Run relevant tests if they exist for the slice. There is no full automated suite yet (STATUS SCALE-1) — do not invent a test harness.

Completion report:

```markdown
## Done
- Spec / request:
- Files changed:
- STATUS / INVENTORY:

## Validation
- tsc --noEmit:
- eslint:
- tests:

## Performance / blast-radius
- Mount/re-render notes (required if workout session touched):
- Consumers checked:
```
