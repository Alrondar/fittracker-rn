import { useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';

// PERF-11 (28.09): отложенный монтаж тяжёлого контента таба.
// Root cause фризов: тяжёлый таб (Прогресс/Профиль/Главная) монтируется
// синхронно в момент переключения — большой JS-коммит попадает на путь
// таб-анимации и роняет кадры. Хук держит экран на лёгком фолбэке
// (skeleton + LoadingChip) до конца анимации + одного кадра, после чего
// тяжёлое дерево монтируется уже «на спокойном» JS-тредe.
// Повторные визиты не гейтятся: состояние ready живёт в незамораживаемом
// хуке экрана (react-freeze сохраняет состояние при blur).
export function useDeferredTabContent(maxWaitMs = 600): boolean {
  const [ready, setReady] = useState(false);
  // Guard: commit может быть запрошен и InteractionManager'ом, и страховым
  // таймером — планируем ровно один каскад кадров (аудит-находка FZ-10).
  const plannedRef = useRef(false);

  useEffect(() => {
    let raf1 = -1;
    let raf2 = -1;
    const commit = () => {
      if (plannedRef.current) return;
      plannedRef.current = true;
      // Второй кадр — гарантированно после завершения нативной анимации.
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setReady(true));
      });
    };
    const task = InteractionManager.runAfterInteractions(commit);
    // Страховка: непрерывная анимация-«владелица» интеракции не должна
    // превращать фолбэк в вечный — отдаём контент по таймеру.
    const timer = setTimeout(commit, maxWaitMs);
    return () => {
      task.cancel();
      clearTimeout(timer);
      if (raf1 >= 0) cancelAnimationFrame(raf1);
      if (raf2 >= 0) cancelAnimationFrame(raf2);
    };
  }, [maxWaitMs]);

  return ready;
}
