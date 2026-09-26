import { TextStyle } from 'react-native';
import { FONT_FAMILIES } from '../constants/fonts';

// UX-3 (audit-1): пара Space Grotesk (h1–h5 — заголовки и крупные позиции) +
// Inter (весь текст/лейблы/кнопки). Веса задаются ИМЕНЕМ семейства: RN не
// синтезирует bold из custom-font, fontWeight оставлен как fallback для
// инлайновых мест без fontFamily.
export const typography = {
  h1: {
    fontSize: 28,
    fontFamily: FONT_FAMILIES.displayBold,
    fontWeight: 'bold' as const,
    lineHeight: 34,
  },
  h2: {
    fontSize: 24,
    fontFamily: FONT_FAMILIES.displayBold,
    fontWeight: 'bold' as const,
    lineHeight: 30,
  },
  h3: {
    fontSize: 20,
    fontFamily: FONT_FAMILIES.displayBold,
    fontWeight: 'bold' as const,
    lineHeight: 26,
  },
  h4: {
    fontSize: 18,
    fontFamily: FONT_FAMILIES.displayBold,
    fontWeight: 'bold' as const,
    lineHeight: 24,
  },
  h5: {
    fontSize: 16,
    fontFamily: FONT_FAMILIES.displaySemiBold,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  h6: {
    fontSize: 14,
    fontFamily: FONT_FAMILIES.textSemiBold,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  body: {
    fontSize: 14,
    fontFamily: FONT_FAMILIES.textRegular,
    fontWeight: 'normal' as const,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 13,
    fontFamily: FONT_FAMILIES.textRegular,
    fontWeight: 'normal' as const,
    lineHeight: 18,
  },
  caption: {
    fontSize: 12,
    fontFamily: FONT_FAMILIES.textRegular,
    fontWeight: 'normal' as const,
    lineHeight: 16,
  },
  captionSmall: {
    fontSize: 11,
    fontFamily: FONT_FAMILIES.textRegular,
    fontWeight: 'normal' as const,
    lineHeight: 14,
  },
  label: {
    fontSize: 14,
    fontFamily: FONT_FAMILIES.textMedium,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  labelBold: {
    fontSize: 14,
    fontFamily: FONT_FAMILIES.textSemiBold,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  button: {
    fontSize: 16,
    fontFamily: FONT_FAMILIES.textBold,
    fontWeight: 'bold' as const,
    lineHeight: 22,
  },
  buttonSmall: {
    fontSize: 14,
    fontFamily: FONT_FAMILIES.textSemiBold,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  buttonTiny: {
    fontSize: 12,
    fontFamily: FONT_FAMILIES.textSemiBold,
    fontWeight: '600' as const,
    lineHeight: 16,
  },
  overline: {
    fontSize: 12,
    fontFamily: FONT_FAMILIES.textSemiBold,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
};

export type TypographyKey = keyof typeof typography;

// Функция для применения цвета
export const withColor = (style: TextStyle, color: string): TextStyle => ({
  ...style,
  color,
});

export const withColorAndSize = (style: TextStyle, color: string, size: number): TextStyle => ({
  ...style,
  color,
  fontSize: size,
});
