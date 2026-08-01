import { TextStyle } from 'react-native';

export const typography = {
  h1: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    lineHeight: 34,
  },
  h2: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    lineHeight: 30,
  },
  h3: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    lineHeight: 26,
  },
  h4: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    lineHeight: 24,
  },
  h5: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  h6: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  body: {
    fontSize: 14,
    fontWeight: 'normal' as const,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: 'normal' as const,
    lineHeight: 18,
  },
  caption: {
    fontSize: 12,
    fontWeight: 'normal' as const,
    lineHeight: 16,
  },
  captionSmall: {
    fontSize: 11,
    fontWeight: 'normal' as const,
    lineHeight: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  labelBold: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  button: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    lineHeight: 22,
  },
  buttonSmall: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  buttonTiny: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
  },
  overline: {
    fontSize: 12,
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

export const withColorAndSize = (
  style: TextStyle,
  color: string,
  size: number
): TextStyle => ({
  ...style,
  color,
  fontSize: size,
});