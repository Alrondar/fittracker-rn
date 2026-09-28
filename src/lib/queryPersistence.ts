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
//  6. WEB (WEB-FZ-1/WEB-BUG-8): персист выключен целиком — на вебе AsyncStorage
//     = синхронный `window.localStorage`, поэтому инварианты #1/#2 там не
//     работают (штатный исход браузера — закрытая вкладка, а не logout), а
//     запись блокирует main thread. См. `WEB_PERSIST_ENABLED`.
//
// Порядок: restore (await) → subscribe. Если наоборот (или параллельно, как
// в convenience-обёртке persistQueryClient), догнавший restore может
// setQueryData'ть устаревший снимок ПОВЕРХ уже прилетевших свежих данных.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
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

/**
 * WEB-FZ-1 / WEB-BUG-8: на вебе персист выключен. Причина не в лени, а в модели
 * платформы: AsyncStorage на вебе — это `window.localStorage`, а его `setItem`
 * выполняется СИНХРОННО на main thread (проверено в
 * `@react-native-async-storage/async-storage/lib/module/AsyncStorage.js:65`),
 * тогда как на нативе та же запись уходит off-thread. Значит каждый тик
 * подписки (`throttleTime: 1000`) = `JSON.stringify` всего кэша (включая
 * справочник из 870 упражнений) плюс блокирующая запись на диск браузера —
 * то есть «страница висит на секунду», которой на устройстве нет. Бонусом
 * уезжает и приватность: в общем браузере в localStorage не остаётся blob'а с
 * метриками следующего пользователя (инварианты #1/#2 сверху работают только
 * при явном logout, а в браузере штатный исход — закрытая вкладка).
 *
 * Цена: на вебе холодный старт всегда идёт через запросы (skeleton виден
 * столько, сколько занимает сеть). Нативный UX-2b («мгновенные данные») не
 * затронут. Возврат — одна строка ниже.
 */
export const WEB_PERSIST_ENABLED = false;

/** Разовая зачистка blob'ов, написанных веб-сборками 27–28.09. */
function sweepWebPersistBlobs(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const stale: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(KEY_PREFIX)) stale.push(key);
    }
    stale.forEach((key) => window.localStorage.removeItem(key));
  } catch (e) {
    // Приватность важнее персиста, но чистка не должна ронять приложение.
    console.warn('[queryPersistence] web sweep failed:', e);
  }
}

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

  // WEB-FZ-1: см. WEB_PERSIST_ENABLED — на вебе подписки на запись нет вообще.
  if (Platform.OS === 'web' && !WEB_PERSIST_ENABLED) {
    sweepWebPersistBlobs();
    return;
  }

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
  if (!current) {
    // WEB-FZ-1 / WEB-BUG-8: на вебе сессии персиста нет (attach делает ранний
    // возврат), но logout обязан вычистить blob'ы сборок 27–28.09, иначе они
    // переживут выход из аккаунта.
    if (options?.erase) sweepWebPersistBlobs();
    return;
  }
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
