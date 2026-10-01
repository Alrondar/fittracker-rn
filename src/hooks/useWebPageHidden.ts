// src/hooks/useWebPageHidden.ts
// WEB-FZ-2 (вердикт владельца 01.10 — вариант «в»: точечно, не unmount).
// В браузере нет freezeOnBlur (react-native-screens заморозка — нативная ветка,
// см. WEB-FZ-2): тикеры незримых экранов жгут main thread, пока вкладка
// лежит в фоне. Полный unmount тяжёлых экранов отклонён сознательно: на вебе
// уход из тренировки и так = back = unmount, а единственная легитимная ситуация
// «экран живёт под другим» — модалка упражнения поверх тренировки, где таймер
// обязан продолжать (решение владельца, freezeOnBlur:false в нативе).
// Поэтому — пауза интервалов при document.hidden: со схемой endsAt/elapsed
// это потери-нулевое (на возврате остаток пересчитывается от wall-clock времени),
// а на нативе хук возвращает всегда false и поведение не меняется.
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export function useWebPageHidden(): boolean {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    const onChange = () => setHidden(document.visibilityState === 'hidden');
    onChange();
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return hidden;
}
