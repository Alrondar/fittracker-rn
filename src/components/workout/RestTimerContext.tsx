// src/components/workout/RestTimerContext.tsx
// MORF-REST (26.09): отдых больше не шторка на весь низ экрана. Состояние
// таймера раздаётся через контекст, поэтому тик (restTimeLeft каждые 250 мс)
// ре-рендерит только мелких потребителей — inline-строку в ActionsRow
// карточки-владельца и глобальный чип-индикатор. ExerciseSlider/ExerciseCard
// остаются memo (тик не течёт через их props) — уроки SCR-1/PR8.
import React, { createContext, useContext, memo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { SPACING, BORDER_RADIUS, withAlpha, SHADOWS } from '../../constants/theme';
import { typography } from '../../styles/typography';

export interface RestState {
  /** Полный интервал отдыха (сек) или null — отдыха нет. */
  total: number | null;
  timeLeft: number;
  isFinished: boolean;
  /** exerciseIndex карточки-инициатора (inline-строка рендерится только в ней). */
  ownerIndex: number | null;
  stop: () => void;
  adjust: (delta: number) => void;
}

const RestCtx = createContext<RestState | null>(null);

export function RestTimerProvider({
  total,
  timeLeft,
  isFinished,
  ownerIndex,
  stop,
  adjust,
  children,
}: RestState & { children: React.ReactNode }) {
  return (
    <RestCtx.Provider value={{ total, timeLeft, isFinished, ownerIndex, stop, adjust }}>
      {children}
    </RestCtx.Provider>
  );
}

export function useRestState(): RestState | null {
  return useContext(RestCtx);
}

export const formatRestTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

/**
 * Мини-кольцо прогресса отдыха. Дискретное (тик 250 мс), без Reanimated —
 * дёргается раз в секунду на число, сравнимое с часами шапки.
 */
export const MiniRing = memo(function MiniRing({
  progress,
  size,
  strokeWidth,
  color,
  trackColor,
}: {
  progress: number;
  size: number;
  strokeWidth: number;
  color: string;
  trackColor: string;
}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={trackColor}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${c} ${c}`}
        strokeDashoffset={c * (1 - Math.min(1, Math.max(0, progress)))}
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
});

/**
 * Глобальный чип-индикатор: маленькое кольцо + время в правом нижнем углу,
 * когда карточка-владелец уехала за экран. НЕ интерактивный (pointerEvents
 * none) — управление отдыхом живёт в строке карточки. Исчезает по завершении
 * (isFinished) — там уже вибрация/звук + «Продолжить» в строке.
 */
export const RestChip = memo(function RestChip({ colors }: { colors: any }) {
  const rest = useRestState();
  if (!rest || rest.total == null || rest.isFinished) return null;
  const progress = rest.total > 0 ? rest.timeLeft / rest.total : 0;
  const color =
    rest.timeLeft <= 10 ? colors.error : rest.timeLeft <= 30 ? colors.warning : colors.primary;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        bottom: SPACING.lg,
        right: SPACING.lg,
        zIndex: 900,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: withAlpha(color, 0.376),
        ...SHADOWS.md,
      }}
    >
      <MiniRing
        progress={progress}
        size={22}
        strokeWidth={3}
        color={color}
        trackColor={colors.surfaceSecondary}
      />
      <Text
        style={[
          typography.captionSmall,
          { color, fontWeight: '700', fontVariant: ['tabular-nums'] },
        ]}
      >
        {formatRestTime(rest.timeLeft)}
      </Text>
    </View>
  );
});
