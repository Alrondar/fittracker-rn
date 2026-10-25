// src/lib/exerciseSnapshot.ts
// Файловый снимок справочника упражнений: одна копия всего каталога на устройстве,
// чтобы без сети открывались карточка упражнения, список, подбор замен и тексты
// разминки. Размер по замеру 24.10 на проде — 1,88 МБ JSON на 825 позиций (средняя
// строка 2,3 КБ, худшая 3,9 КБ); это меньше, чем разрешено занимать кадрам (25 МБ),
// поэтому отдельный потолок снимку не нужен — только возраст.
//
// Хранилище общее (src/lib/localStore.ts): на телефоне — файл в документной
// директории, в браузере — IndexedDB. Читается лениво: парсинг 1,9 МБ (20–40 мс) не
// должен стоять на критическом пути старта.
import { readLocalDoc, removeLocalDoc, writeLocalDoc, type LocalDocMeta } from './localStore';
import type { SnapshotExerciseRow } from '../utils/exerciseSearchLocal';

const DOC_NAME = 'exercise-catalog.json';
/** Меняй при несовместимой форме строк — старый снимок выбрасывается при чтении. */
export const SNAPSHOT_VERSION = 1;
/** Снимок моложе трёх суток не перезагружаем: справочник правится пачками CAT-задач. */
export const SNAPSHOT_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;
/** После неудачной загрузки не стучимся чаще часа (иначе каждый старт офлайн — пачка таймаутов). */
const RETRY_AFTER_FAILURE_MS = 60 * 60 * 1000;

let rows: SnapshotExerciseRow[] | null = null;
let meta: LocalDocMeta | null = null;
let loading: Promise<SnapshotExerciseRow[]> | null = null;
let lastFailureAt = 0;
let inFlight = false;

/** Строки снимка; пустой массив — если снимка нет (не путать с «в справочнике пусто»). */
export function readSnapshotRows(): Promise<SnapshotExerciseRow[]> {
  if (rows) return Promise.resolve(rows);
  if (loading) return loading;
  loading = (async () => {
    const doc = await readLocalDoc<SnapshotExerciseRow[]>(DOC_NAME);
    meta = doc?.meta ?? null;
    rows = doc?.meta.v === SNAPSHOT_VERSION && Array.isArray(doc.data) ? doc.data : [];
    return rows;
  })();
  return loading;
}

/** Занятый объём, число позиций и дата сборки — для строки в настройках. */
export function snapshotStats(): { rows: number; bytes: number; takenAt: string | null } {
  return { rows: rows?.length ?? 0, bytes: meta?.bytes ?? 0, takenAt: meta?.takenAt ?? null };
}

/** Возраст снимка в миллисекундах; Infinity — если снимка нет. */
export function snapshotAgeMs(): number {
  const stamp = Date.parse(meta?.takenAt ?? '');
  return Number.isNaN(stamp) ? Infinity : Math.max(Date.now() - stamp, 0);
}

/** Пишет снимок и подменяет память. */
export async function saveSnapshotRows(
  next: SnapshotExerciseRow[]
): Promise<{ rows: number; bytes: number }> {
  const stamp = new Date().toISOString();
  const bytes = await writeLocalDoc(DOC_NAME, next, {
    v: SNAPSHOT_VERSION,
    takenAt: stamp,
    count: next.length,
  });
  rows = next;
  meta = { v: SNAPSHOT_VERSION, takenAt: stamp, bytes, count: next.length };
  lastFailureAt = 0;
  return { rows: next.length, bytes };
}

export async function clearSnapshot(): Promise<void> {
  rows = [];
  meta = null;
  lastFailureAt = 0;
  await removeLocalDoc(DOC_NAME);
}

/** Нужен ли вообще заход в сеть: снимка нет, он старый, свежей неудачи нет. */
export function snapshotNeedsRefresh(force = false): boolean {
  if (inFlight) return false;
  if (force) return true;
  if (lastFailureAt && Date.now() - lastFailureAt < RETRY_AFTER_FAILURE_MS) return false;
  return !rows?.length || snapshotAgeMs() > SNAPSHOT_MAX_AGE_MS;
}

export function markSnapshotRefreshStart(): void {
  inFlight = true;
}

export function markSnapshotRefreshResult(ok: boolean): void {
  inFlight = false;
  if (!ok) lastFailureAt = Date.now();
}

/**
 * Сеть, а если она молчит — снимок. Пустой ответ сети отказом НЕ считается: «нет
 * совпадений» и «нет связи» должны различаться (вердикт EDGE-ERR 2а), поэтому в
 * fallback мы заходим только по исключению. Если и в снимке ничего нет — исходную
 * ошибку пробрасываем, чтобы экран показал «не удалось загрузить», а не «пусто».
 */
export async function networkOrSnapshot<T>(
  network: () => Promise<T>,
  fallback: (rows: SnapshotExerciseRow[]) => T | null
): Promise<T> {
  try {
    return await network();
  } catch (error) {
    const local = await readSnapshotRows();
    if (local.length === 0) throw error;
    const value = fallback(local);
    if (value === null || value === undefined) throw error;
    return value;
  }
}
