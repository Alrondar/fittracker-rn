// src/utils/intensityInfo.tsx
// PR8: чистая функция getIntensityInfo — вынесена из workout/[id].tsx.
// Возвращает label/color/bgColor/icon для intensity badge.
import React from 'react';
import { TrendingUp, Minus, TrendingDown } from 'lucide-react-native';

export interface IntensityInfo {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}

export function getIntensityInfo(intensity: string, colors: any): IntensityInfo {
  switch (intensity) {
    case 'high':
      return {
        label: 'Высокая',
        color: colors.error,
        bgColor: colors.error + '20',
        icon: <TrendingUp size={14} color={colors.error} strokeWidth={2} />,
      };
    case 'medium':
      return {
        label: 'Средняя',
        color: colors.warning,
        bgColor: colors.warning + '20',
        icon: <Minus size={14} color={colors.warning} strokeWidth={2} />,
      };
    case 'low':
      return {
        label: 'Низкая',
        color: colors.success,
        bgColor: colors.success + '20',
        icon: <TrendingDown size={14} color={colors.success} strokeWidth={2} />,
      };
    default:
      return {
        label: intensity,
        color: colors.textSecondary,
        bgColor: colors.textSecondary + '20',
        icon: <Minus size={14} color={colors.textSecondary} strokeWidth={2} />,
      };
  }
}