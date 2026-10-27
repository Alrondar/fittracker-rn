// src/hooks/useOnline.tsx
// CONN-1 (27.10): одно подписание к состоянию сети на всё приложение. До этого
// «нет связи» воспроизводилось только постфактум по тексту упавшего запроса
// (src/utils/errorMapper.ts:36-40), поэтому экран не мог отличить «сети нет» от
// «сервер ответил отказом» и не мог дождаться возврата связи, чтобы дослать
// неподтверждённые подходы.
import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import NetInfo from '@react-native-community/netinfo';

const OnlineContext = createContext<boolean>(true);

export function OnlineProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    void NetInfo.fetch().then((state) => setOnline(state.isConnected === true));
    // В версии 11.4.1 подписка — это функция отписки, а не объект с remove().
    return NetInfo.addEventListener((state) => setOnline(state.isConnected === true));
  }, []);

  return <OnlineContext.Provider value={online}>{children}</OnlineContext.Provider>;
}

/**
 * Есть ли связь. До первого события — `true`: состояние ещё неизвестно, а
 * повесить «нет сети» на экран без подтверждения хуже, чем задержать плашку на
 * мгновение мгновенного чтения.
 */
export function useOnline(): boolean {
  return useContext(OnlineContext);
}
