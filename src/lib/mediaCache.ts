// src/lib/mediaCache.ts
// Локальное хранилище кадров техники: на экране тренировки и в блоке разминки
// картинка берётся со телефона, а не с хоста, если мы её уже скачали.
//
// Потолок — по умолчанию 25 МБ, пользователь меняет его в настройках (25 / 50 / 100).
// Вытеснение по давности обращения. Рама ~54 КБ, день тренировки — 6–10 упражнений ×
// 2 кадра ≈ до 1,1 МБ, программа с её заменами ≈ 12–14 МБ (замер 26.10 по графу замен
// прода: 117–131 упражнение на программу). Три ПОХОЖИЕ программы — 183 уникальных
// упражнения вместо 352: замены пересекаются, поэтому это ~19 МБ, а не 38; три разные
// по фокусу — ближе к 35 МБ. То есть 25 МБ держит одну-две, на три нужен 50. Справочник
// целиком на телефон не ездит: 1950 рамок это ~105 МБ.
//
// Потолок относится ТОЛЬКО к кадрам. Снимок справочника (~1,9 МБ) и снимки программ
// (~0,1–0,2 МБ на программу) живут вне него и не вытесняются: их размер мал, а
// потеря означала бы потерю истории тренировок, а не картинки.
//
// Почему своя папка, а не штатный кэш загрузки: `expo-image` 3.0.11 не отдаёт
// настройку объёма дискового кэша, то есть его рост нам не ограничить. Здесь рост
// ограничен по построению.
//
// Ключ записи — полный адрес, включая `?v=N` из media_url: перезаписал кадр на хосте
// и поднял версию → старый ключ не совпадает, качаем заново. Запись предыдущей версии
// того же пути выбрасывается при скачивании, чтобы пересъёмки не копились.
//
// Веб — пустая операция: там кэширует браузер, файловой системы нет.
import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';

const TAG = '[mediaCache]';
const DIR_NAME = 'exercise-frames';
const INDEX_NAME = 'index.json';
/** Меняй при несовместимой форме индекса — старый снимок выбрасывается целиком. */
const INDEX_VERSION = 1;
/** Варианты потолка, которые предлагает настройка: 25 МБ ≈ 450 рамок. */
export const FRAME_CAP_OPTIONS_MB = [25, 50, 100] as const;
export const DEFAULT_FRAME_CAP_MB: number = FRAME_CAP_OPTIONS_MB[0];

/**
 * Текущий потолок в байтах. Живёт модульной переменной, а не константой, потому что
 * его меняет пользователь: настройки читают сохранённое значение при старте и зовут
 * `setFrameCacheLimitBytes` до первого подогрева кадров. Меньше выбранного хранилище
 * не ужимается силой — вытеснение до нового потолка происходит по мере записи.
 */
let limitBytes = DEFAULT_FRAME_CAP_MB * 1024 * 1024;

export function setFrameCacheLimitBytes(bytes: number): void {
  if (Number.isFinite(bytes) && bytes > 0) limitBytes = Math.round(bytes);
}

export function frameCacheLimitBytes(): number {
  return limitBytes;
}
/** Параллельных скачиваний: хост — raw.githubusercontent, не надо его злить. */
const DOWNLOAD_CONCURRENCY = 3;
/** Отсрочка записи индекса: метку обращения трогаем на каждый показ кадра. */
const INDEX_FLUSH_DELAY_MS = 5000;

type Entry = { name: string; bytes: number; used: number };
type IndexShape = { v: number; entries: Record<string, Entry> };

const isRemote = (uri: string) => /^https?:\/\//i.test(uri);
const pathOf = (uri: string) => uri.split('?')[0];

/** Имя файла из адреса: хеш полного URL (версия входит) + исходное расширение. */
function fileNameFor(uri: string): string {
  let fnv = 0x811c9dc5;
  let djb = 5381;
  for (let i = 0; i < uri.length; i++) {
    const code = uri.charCodeAt(i);
    fnv = Math.imul(fnv ^ code, 0x01000193) >>> 0;
    djb = ((djb << 5) + djb + code) >>> 0;
  }
  const ext =
    pathOf(uri)
      .match(/\.(jpg|jpeg|png|webp)$/i)?.[1]
      ?.toLowerCase() ?? 'jpg';
  return `${fnv.toString(36)}${djb.toString(36)}.${ext}`;
}

let entries: Record<string, Entry> | null = null;
let boot: Promise<void> | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const framesDir = () => new Directory(Paths.document, DIR_NAME);
const frameFile = (name: string) => new File(framesDir(), name);
/**
 * Адрес файла для источника картинки: `File.uri` на части устройств отдаёт путь без
 * схемы, а `source={{ uri }}` и `Image.getSize` схему требуют.
 */
const frameUri = (name: string) => {
  const uri = frameFile(name).uri;
  return uri.startsWith('file://') ? uri : `file://${uri}`;
};

function exists(file: File): boolean {
  try {
    return file.exists;
  } catch {
    return false;
  }
}

function ensureDir(): boolean {
  try {
    const d = framesDir();
    if (!d.exists) d.create({ intermediates: true, idempotent: true });
    return true;
  } catch (e) {
    console.warn(TAG, 'папка не готова:', e);
    return false;
  }
}

function writeIndex() {
  if (!entries) return;
  try {
    const f = frameFile(INDEX_NAME);
    if (!f.exists) f.create({ overwrite: false, intermediates: true });
    const shape: IndexShape = { v: INDEX_VERSION, entries };
    f.write(JSON.stringify(shape));
  } catch (e) {
    console.warn(TAG, 'индекс не записан:', e);
  }
}

function scheduleIndexWrite() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    writeIndex();
  }, INDEX_FLUSH_DELAY_MS);
}

function readIndex() {
  const f = frameFile(INDEX_NAME);
  if (!exists(f)) return {};
  try {
    const parsed = JSON.parse(f.textSync()) as IndexShape;
    return parsed?.v === INDEX_VERSION && parsed.entries ? parsed.entries : {};
  } catch (e) {
    console.warn(TAG, 'индекс не читается, начинаем с пустого:', e);
    return {};
  }
}

/**
 * Поднимает индекс и приводит папку в порядок: файлы без записи (осиротели после
 * смены схемы или ручного удаления) удаляются, записи без файла вычёркиваются.
 * Иначе за собой мы бы оставляли мусор, а это ровно то, чего нельзя.
 */
function loadOnce(): void {
  if (!ensureDir()) {
    entries = {};
    return;
  }
  const index = readIndex();
  const known = new Set(Object.values(index).map((entry) => entry.name));
  try {
    for (const item of framesDir().list()) {
      if (!(item instanceof File) || item.name === INDEX_NAME || known.has(item.name)) continue;
      try {
        item.delete();
      } catch (e) {
        console.warn(TAG, 'сироту не удалить:', e);
      }
    }
  } catch (e) {
    console.warn(TAG, 'папку не перечислить:', e);
  }
  const alive: Record<string, Entry> = {};
  for (const [url, entry] of Object.entries(index)) {
    if (!exists(frameFile(entry.name))) continue;
    alive[url] = entry;
    verified.add(url);
  }
  entries = alive;
}

/** Читает индекс при первом обращении; повторные вызовы ждут уже идущую загрузку. */
export function initMediaCache(): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  if (!boot) {
    boot = new Promise<void>((resolve) => {
      try {
        loadOnce();
      } catch (e) {
        console.warn(TAG, 'инициализация не завершена:', e);
        entries = entries ?? {};
      }
      resolve();
    });
  }
  return boot;
}

/** Адрес кадра, чьё существование проверили в этом запуске: нативный запрос на
 * каждый рендер не нужен, а исчезнуть файл сам по себе не может — папка в
 * документной директории системой не вычищается. */
const verified = new Set<string>();

/** Локальный адрес скачанного кадра; если его нет — исходный сетевой адрес. */
export function resolveFrame(uri: string): string {
  const table = entries;
  if (Platform.OS === 'web' || !table) return uri;
  const entry = isRemote(uri) ? table[uri] : undefined;
  if (!entry) return uri;
  if (!verified.has(uri)) {
    if (!exists(frameFile(entry.name))) {
      delete table[uri];
      return uri;
    }
    verified.add(uri);
  }
  entry.used = Date.now();
  scheduleIndexWrite();
  return frameUri(entry.name);
}

/** Занятый объём, число кадров и текущий потолок — для строки в настройках. */
export function mediaCacheStats(): { bytes: number; frames: number; limit: number } {
  const list = Object.values(entries ?? {});
  return {
    bytes: list.reduce((sum, entry) => sum + entry.bytes, 0),
    frames: list.length,
    limit: limitBytes,
  };
}

function dropUrl(url: string) {
  if (!entries) return;
  const entry = entries[url];
  if (!entry) return;
  delete entries[url];
  verified.delete(url);
  try {
    frameFile(entry.name).delete();
  } catch (e) {
    console.warn(TAG, 'файл не удалить:', e);
  }
}

/** Старая версия того же кадра не нужна — освобождаем место сразу, не дожидаясь вытеснения. */
function dropSuperseded(url: string) {
  if (!entries) return;
  const path = pathOf(url);
  for (const other of Object.keys(entries)) {
    if (other !== url && pathOf(other) === path) dropUrl(other);
  }
}

/** Вытеснение по давности обращения, пока не влезем под потолок. */
function evictFor(incomingBytes: number) {
  if (!entries) return;
  let total = Object.values(entries).reduce((sum, entry) => sum + entry.bytes, 0) + incomingBytes;
  const byAge = Object.entries(entries).sort((a, b) => a[1].used - b[1].used);
  for (const [url, entry] of byAge) {
    if (total <= limitBytes) break;
    total -= entry.bytes;
    dropUrl(url);
  }
}

async function downloadOne(url: string): Promise<string> {
  const name = fileNameFor(url);
  const downloaded = await File.downloadFileAsync(url, frameFile(name), { idempotent: true });
  if (!entries) entries = {};
  entries[url] = { name, bytes: downloaded.size, used: Date.now() };
  verified.add(url);
  return url;
}

/** Что вернул подогрев: сколько рамок докачалось и сколько байт это заняло. */
export type StageResult = { fetched: number; bytes: number };

/**
 * Прогресс скачивания: `(готово, план)` — число готовых рамок и весь план, который
 * передал вызывающий. Считается по плану, а не по «недостающим»: иначе повторное
 * нажатие «Обновить» показывало бы 0 % вместо «всё уже на месте».
 */
export type FrameProgress = (done: number, planned: number) => void;

/**
 * Веб: своего файлового хранилища там нет, поэтому подогрев = запрос кадра, ответ
 * которого остаётся в браузерном кэше. Перезагрузку страницы такой кэш переживает,
 * а отсутствие сети — не гарантированно: чтобы кадр открывался без интернета, нужен
 * перехватчик запросов (service worker), и он вне этого модуля.
 */
async function stageFramesWeb(urls: string[], onProgress?: FrameProgress): Promise<StageResult> {
  const queue = [...new Set(urls.filter(isRemote))];
  const planned = queue.length;
  let fetched = 0;
  let bytes = 0;
  onProgress?.(0, planned);
  for (let i = 0; i < queue.length; i += DOWNLOAD_CONCURRENCY) {
    const batch = queue.slice(i, i + DOWNLOAD_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.blob()).size;
      })
    );
    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      fetched += 1;
      bytes += result.value;
    }
    onProgress?.(fetched, planned);
  }
  return { fetched, bytes };
}

/**
 * Скачивает недостающие кадры: уже лежащие в хранилище не перекачиваются, старая
 * версия того же пути выбрасывается, переполнение потолка решается вытеснением по
 * давности. Ошибки (нет связи, 404, полный диск) глушит: подогрев — улучшение, а не
 * зависимость, интерфейс продолжает ходить в сеть.
 */
export async function stageFrames(
  urls: (string | null | undefined)[],
  onProgress?: FrameProgress
): Promise<StageResult> {
  const list = urls.filter((u): u is string => !!u);
  if (Platform.OS === 'web') return stageFramesWeb(list, onProgress);
  await initMediaCache();
  if (!entries) return { fetched: 0, bytes: 0 };
  const planned = [...new Set(list.filter(isRemote))];
  const queue = planned.filter((url) => !entries![url]);
  // Уже скачанное засчитывается в прогресс сразу: «Обновить» без новых кадров
  // обязано показать 100 %, а не зависнуть на нуле.
  let fetched = planned.length - queue.length;
  onProgress?.(fetched, planned.length);
  if (queue.length === 0) return { fetched: 0, bytes: 0 };
  if (!ensureDir()) return { fetched: 0, bytes: 0 };
  let bytes = 0;
  for (let i = 0; i < queue.length; i += DOWNLOAD_CONCURRENCY) {
    const batch = queue.slice(i, i + DOWNLOAD_CONCURRENCY);
    const results = await Promise.allSettled(batch.map(downloadOne));
    results.forEach((result, index) => {
      if (result.status !== 'fulfilled') return;
      const entry = entries?.[result.value];
      if (!entry) return;
      dropSuperseded(batch[index]);
      evictFor(0);
      fetched += 1;
      bytes += entry.bytes;
    });
    onProgress?.(fetched, planned.length);
  }
  if (bytes > 0) writeIndex();
  return { fetched, bytes };
}

/** Полная очистка: файлы и индекс. Вызывается из настроек. */
export async function clearMediaCache(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  entries = {};
  verified.clear();
  if (Platform.OS === 'web') return;
  try {
    const d = framesDir();
    if (d.exists) d.delete();
  } catch (e) {
    console.warn(TAG, 'папку не очистить:', e);
  }
}
