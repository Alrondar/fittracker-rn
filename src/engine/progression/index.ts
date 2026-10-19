// src/engine/progression/index.ts
// Публичная поверхность движка прогрессии (ENG-1/2/3/4, P1.1, PLATE-SNAP).
// Нарезка CTR-3 (19.10) пути импорта не меняет: consumers по-прежнему пишут
// `engine/progression`. Внутренности — по модулям:
//   types.ts        контракт: вход, результат, причина, контекст сессии
//   core.ts         дерево решений + округление под снаряд (PLATE-SNAP)
//   policies.ts     альтернативные политики (double / greyskull / time-based)
//   overrides.ts    приоритет безопасности (ENG-4) и готовности (ENG-3)
//   explanations.ts структурированные объяснения «Почему?» (ENG-2)
//   sets.ts, rounding.ts — общие хелперы движка, наружу не торчат
export type {
  ProgressionAction,
  ProgressionContext,
  ProgressionInput,
  ProgressionReason,
  ProgressionResult,
} from './types';
export { calculateProgression, parseRepsRange } from './core';
export { applyReadinessContext, applySafetyPrecedence } from './overrides';
export type {
  ReadinessContext,
  ReadinessOverride,
  SafetyContext,
  SafetyOverride,
} from './overrides';
export { explainProgression } from './explanations';
export type { ExplanationItem, ExplanationItemKind } from './explanations';
