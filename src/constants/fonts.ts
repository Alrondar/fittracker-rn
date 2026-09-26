// src/constants/fonts.ts
// UX-3 (audit-1): типографика приложения — пара Space Grotesk (дисплейный:
// заголовки/крупные числа) + Inter (текстовый: body/labels/buttons).
// Имена зарегистрированы через @expo-google-fonts (загрузка в app/_layout.tsx
// до релиза splash-гейта). Веса — именованные семейства: RN не синтезирует
// bold из custom-font, поэтому нужный вес выбирается ИМЯНОМ файла, а не
// fontWeight (fontWeight оставлен только как fallback для системного рендера
// и старых мест, где стиль задан инлайном).
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';

export const FONT_FAMILIES = {
  // Дисплейные заголовки (h1–h5, крупные числа)
  displayBold: 'SpaceGrotesk_700Bold',
  displaySemiBold: 'SpaceGrotesk_600SemiBold',
  displayMedium: 'SpaceGrotesk_500Medium',
  // Текст интерфейса
  textRegular: 'Inter_400Regular',
  textMedium: 'Inter_500Medium',
  textSemiBold: 'Inter_600SemiBold',
  textBold: 'Inter_700Bold',
} as const;

/** Экспорт для useFonts/loadAsync в корне. */
export const APP_LOADABLE_FONTS = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
};
