// src/utils/framePlan.ts
// Что скачивать вместе с программой: кадры её упражнений и кадры упражнений, на
// которые эти можно заменить. Разделён по двум причинам: список замен берётся из
// графа связей справочника (а не из программы), и размеры групп нужно называть
// отдельно — замены весят втрое больше самой программы (замер 25.10: 2,3–3,5 МБ
// против 10–14 МБ).
import { parseMediaUrls, type MediaGender } from './mediaScheme';
import { relationshipsOf, type SnapshotExerciseRow } from './exerciseSearchLocal';

export type FramePlan = { own: string[]; alternatives: string[] };

/**
 * @param rows — строки снимка справочника (нужны id, media_url и рёбра замен)
 * @param exerciseIds — упражнения программы (из строк дней и из строк тренировок)
 * @gender — чью пару кадров брать: вторую пользователь не смотрит
 */
export function planProgramFrames(
  rows: SnapshotExerciseRow[],
  exerciseIds: Iterable<string>,
  gender: MediaGender
): FramePlan {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const own = new Set<string>();
  const programIds = new Set<string>(exerciseIds);
  const alternatives = new Set<string>();

  for (const id of programIds) {
    const row = byId.get(id);
    if (!row) continue;
    for (const url of parseMediaUrls(row.media_url, gender)) own.add(url);
    for (const relation of relationshipsOf(row)) {
      const other = byId.get(relation.related_exercise_id);
      if (!other || programIds.has(other.id)) continue;
      for (const url of parseMediaUrls(other.media_url, gender)) alternatives.add(url);
    }
  }

  // Кадр, который есть и в программе, и в заменах, качается один раз — программой.
  for (const url of own) alternatives.delete(url);
  return { own: [...own], alternatives: [...alternatives] };
}
