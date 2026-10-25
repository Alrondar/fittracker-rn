// src/lib/localStore.ts
// Одно хранилище для всех локальных снимков приложения: на телефоне — файл в
// документной директории, в браузере — IndexedDB. Тот, кто снимок хранит
// (справочник, активная программа), не должен знать, где именно лежат байты.
//
// Почему не AsyncStorage: там уже живёт per-user кэш запросов, и мегабайты
// справочника поверх него означали бы общий лимит и то же нешифрованное хранилище.
// Файл/IndexedDB — отдельное место, свой объём, своя очистка.
//
// Типы IndexedDB намеренно свободные: в tsconfig нет DOM-библиотеки, а дублировать
// спецификацию браузера на 140 строк незачем — наружу торчит только типизированный
// API этого модуля.
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';

const TAG = '[localStore]';
const DB_NAME = 'fittracker-local';
const DB_VERSION = 1;
const STORE = 'docs';

export type LocalDocMeta = { v: number; takenAt: string; bytes: number; count: number };
export type LocalDoc<T> = { meta: LocalDocMeta; data: T };

/** Байты UTF-8 без зависимости от TextEncoder (в Hermes он не гарантирован). */
function utf8Bytes(text: string): number {
  let total = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x80) total += 1;
    else if (code < 0x800) total += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      total += 4;
      i++;
    } else total += 3;
  }
  return total;
}

const nativeFile = (name: string) => new File(Paths.document, name);

let dbPromise: Promise<unknown> | null = null;

function openDb(): Promise<unknown> {
  if (dbPromise) return dbPromise;
  const factory = (globalThis as { indexedDB?: unknown }).indexedDB;
  if (!factory) return Promise.reject(new Error('IndexedDB недоступен'));
  dbPromise = new Promise((resolve, reject) => {
    const request = (factory as { open: (n: string, v: number) => any }).open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'name' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB не открылся'));
    request.onblocked = () => reject(new Error('IndexedDB заблокирован другой вкладкой'));
  });
  return dbPromise;
}

function idbCall<T>(run: (store: any) => any): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve, reject) => {
        const tx = (db as { transaction: (name: string, mode: string) => any }).transaction(
          STORE,
          'readwrite'
        );
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error ?? new Error('транзакция прервана'));
        const request = run(tx.objectStore(STORE));
        request.onsuccess = () => resolve((request.result ?? null) as T | null);
        request.onerror = () => reject(request.error);
      })
  );
}

/** Снимок с диска; null — если файла нет, он повреждён или версия не та. */
export async function readLocalDoc<T>(name: string): Promise<LocalDoc<T> | null> {
  try {
    if (Platform.OS === 'web') {
      const row = await idbCall<{ meta: LocalDocMeta; data: T }>((store) => store.get(name));
      return row && row.meta && row.data !== undefined ? row : null;
    }
    const file = nativeFile(name);
    if (!file.exists) return null;
    const parsed = JSON.parse(file.textSync()) as LocalDoc<T>;
    return parsed?.meta && parsed.data !== undefined ? parsed : null;
  } catch (e) {
    console.warn(TAG, `${name} не читается:`, e);
    return null;
  }
}

/** Пишет снимок и возвращает занятые байты. */
export async function writeLocalDoc<T>(
  name: string,
  data: T,
  meta: Omit<LocalDocMeta, 'bytes'>
): Promise<number> {
  const payload = JSON.stringify({ meta: { ...meta, bytes: 0 }, data });
  const bytes = utf8Bytes(payload);
  const shape: LocalDoc<T> = { meta: { ...meta, bytes }, data };
  if (Platform.OS === 'web') {
    await idbCall((store) => store.put({ name, ...shape }));
    return bytes;
  }
  // Файл перезаписывается с нуля: append оставил бы два JSON в одном файле.
  const file = nativeFile(name);
  if (file.exists) file.delete();
  file.create({ overwrite: true, intermediates: true });
  file.write(JSON.stringify(shape));
  return bytes;
}

export async function removeLocalDoc(name: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      await idbCall((store) => store.delete(name));
      return;
    }
    const file = nativeFile(name);
    if (file.exists) file.delete();
  } catch (e) {
    console.warn(TAG, `${name} не удалить:`, e);
  }
}
