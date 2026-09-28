// src/hooks/useLayoutWidth.ts
// WEB-2: ширина макета для компонентов, которые размечают горизонталь по экрану.
//
// `useWindowDimensions()` на вебе отдаёт ширину ОКНА БРАУЗЕРА, а не колонки
// приложения: на десктопе 1280px слайдер из `screenWidth - 32` сделал бы страницу
// шириной 1248px, и альтернативные упражнения уехали бы за правый край (панель
// «Свайпни для замен» выглядит пустой). Поэтому на вебе ширина режется той же
// константой, что и типографика (`WEB_LAYOUT_MAX_WIDTH`) и корневая колонка в
// `app/_layout.tsx`.
//
// WEB-FZ-7: на вебе возвращается `LAYOUT_ANCHOR` — ширина, зафиксированная при
// загрузке. `scale()`/`fontScale()` считаются по такому же snapshot'у (см.
// комментарий у `LAYOUT_ANCHOR`), поэтому живая ширина окна (а) разъезжалась с
// типографикой после resize/поворота и (б) прогоняла re-render всех потребителей
// на каждое событие resize — в мобильном Safari это ещё и каждое схлопывание
// адрес-бара при скролле.
//
// Нативные платформы: значение совпадает с `useWindowDimensions().width`, то есть
// поведение не меняется. Реализация через `useSyncExternalStore` (а не сам хук) —
// чтобы на вебе вообще не подписываться на resize: подписка сама по себе
// re-render'ит каждого потребителя на каждое событие, что и есть вторая половина
// WEB-FZ-7.
import { useSyncExternalStore } from 'react';
import { Dimensions, Platform } from 'react-native';
import { LAYOUT_ANCHOR } from '../constants/theme';

const IS_WEB = Platform.OS === 'web';

function subscribeNative(listener: () => void): () => void {
  const sub = Dimensions.addEventListener('change', listener);
  return () => sub.remove();
}

/** На вебе источник истины — snapshot при загрузке, событий не слушаем. */
function subscribeNone(): () => void {
  return () => {};
}

function getLayoutWidthSnapshot(): number {
  return IS_WEB ? LAYOUT_ANCHOR : Dimensions.get('window').width;
}

export function useLayoutWidth(): number {
  return useSyncExternalStore(
    IS_WEB ? subscribeNone : subscribeNative,
    getLayoutWidthSnapshot,
    getLayoutWidthSnapshot
  );
}
