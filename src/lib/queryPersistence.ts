// src/lib/queryPersistence.ts
// UX-2b (L-4): persist-кэш React Query в AsyncStorage — мгновенные данные при
// холодном старте, «нет прелоадера» вместо прелоадера.
//
// Инварианты приватности (согласованы в спеке UX-2):
//  1. КЛЮЧ ХРАНИЛИША scope'ится по userId (`FTQ::<uid>`) — на shared device
//     второй аккаунт физически не может прочитать кэш первого.
//  2. logout → detach + ERASE: blob старого пользователя удаляется.
//  3. Персим только успешные read-запросы (status==='success'); мутации в
//     dehydrate не попадают по умолчанию ядра.
//  4. maxAge 24ч + buster — протухший/несовместимый кэш выбрасывается самим
//     core'ом.
//  5. Остаточный риск (осознанный): AsyncStorage на Android не шифрован —
//     в кэше лежат тренировочные метрики владельца устройства. Если потребуется,
//     сужается allow-list'ом shouldDehydrateQuery до аналитических ключей.
//
// Порядок: restore (await) → subscribe. Если наоборот (или параллельно, как
// в convenience-обёртке persistQueryClient), догнавший restore может
// setQueryData'ть устаревший снимок ПОВЕРХ уже прилетевших свежих данных.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import {
  persistQueryClientRestore,
  persistQueryClientSubscribe,
  type Persister,
} from '@tanstack/react-query-persist-client';

/** Меняй при несовместимых изменениях формы кэшируемых ответов. */
export const PERSIST_BUSTER = 'fittracker-ux2b-v1';
export const PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const KEY_PREFIX = 'FTQ::';

type PersistenceSession = {
  unsubscribe: () => void;
  persister: Persister;
};

let session: PersistenceSession | null = null;

function createPersister(userId: string): Persister {
  return createAsyncStoragePersister({
    storage: AsyncStorage,
    key: `${KEY_PREFIX}${userId}`,
    throttleTime: 1000,
  });
}

/**
 * Подключает per-user персист к queryClient. Повторный вызов для другой/той же
 *userId сначала корректно отключает текущую сессию (без erase — это тот же или
 * ещё не вошедший пользователь; стирание — только по logout).
 */
export async function attachQueryPersistence(
  queryClient: QueryClient,
  userId: string
): Promise<void> {
  await detachQueryPersistence();

  const persister = createPersister(userId);

  try {
    await persistQueryClientRestore({
      queryClient,
      persister,
      maxAge: PERSIST_MAX_AGE_MS,
      buster: PERSIST_BUSTER,
    });
  } catch (e) {
    // Повреждённый blob core чистит сам (removeClient); стартовое
    // восстановление не должно ронять приложение.
    console.warn('[queryPersistence] restore failed:', e);
  }

  const unsubscribe = persistQueryClientSubscribe({
    queryClient,
    persister,
    buster: PERSIST_BUSTER,
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => query.state.status === 'success',
    },
  });

  session = { unsubscribe, persister };
}

/**
 * Отключает подписку. erase=true — стирает persist-blob (logout!).
 * Идемпотентна.
 */
export async function detachQueryPersistence(options?: { erase?: boolean }): Promise<void> {
  const current = session;
  if (!current) return;
  session = null;
  current.unsubscribe();
  if (options?.erase) {
    try {
      await current.persister.removeClient();
    } catch (e) {
      console.warn('[queryPersistence] erase failed:', e);
    }
  }
}
