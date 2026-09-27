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
// Нативные платформы: значение совпадает с `useWindowDimensions().width`, то есть
// поведение не меняется.
import { Platform, useWindowDimensions } from 'react-native';
import { webLayoutWidth } from '../constants/theme';

export function useLayoutWidth(): number {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' ? webLayoutWidth(width) : width;
}
