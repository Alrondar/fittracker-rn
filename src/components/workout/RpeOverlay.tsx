// src/components/workout/RpeOverlay.tsx
// UX-16 D4 + F3: RPE onboarding-overlay над таблицей с анимацией разворота
// из тапнутой колонки. Тап по RPE-чипу → centered overlay над SetsGrid,
// таблица затемняется (opacity ~0.3). Шкала 1–10 в 2 ряда по 5 (tap target ≥44pt).
// F3: анимация scale 0.85→1 с origin из тапнутой колонки (translate math);
// F3: overlay покрывает весь блок SetsGrid (включая header сетов);
// O2: явная кнопка закрытия ✕ с hit area ≥44pt; Skip/Reset тоже ≥44pt.
import React, { memo, useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { X, RotateCcw } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { SetFeedbackPatch } from '../../types/workout';
import {
  RPE_DESCRIPTIONS,
  rpeZone,
  deriveRir,
  deriveDifficulty,
  DIFFICULTY_LABELS,
} from '../../utils/rpe';
import type { WeightUnit } from '../../hooks/useUnitPreferences';

const RPE_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const DEFAULT_RPE = 7;
const AUTO_CLOSE_DELAY = 700;

interface RpeOverlayProps {
  setNumber: number;
  // UX-16 F3: индекс сета в таблице для вычисления origin анимации
  setIndex: number;
  totalSets: number;
  rpe: number | null;
  weight: string;
  /** Единица отображения веса (хранилище всегда кг; подписи «кг»/«lb»). */
  unit: WeightUnit;
  reps: string;
  onChange: (patch: SetFeedbackPatch) => void;
  onClose: () => void;
  colors: any;
}

export const RpeOverlay = memo(function RpeOverlay({
  setNumber,
  setIndex,
  totalSets,
  rpe,
  weight,
  unit,
  reps,
  onChange,
  onClose,
  colors,
}: RpeOverlayProps) {
  const [selected, setSelected] = useState<number>(rpe ?? DEFAULT_RPE);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  // F3: ширина контейнера для вычисления origin анимации
  const [containerWidth, setContainerWidth] = useState(0);

  // Анимация появления/исчезновения
  const progress = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
    backdropOpacity.value = withTiming(0.3, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });

    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, [progress, backdropOpacity]);

  const handleClose = useCallback(() => {
    progress.value = withTiming(0, {
      duration: 150,
      easing: Easing.in(Easing.cubic),
    });
    backdropOpacity.value = withTiming(0, {
      duration: 150,
      easing: Easing.in(Easing.cubic),
    });

    // Даем время на анимацию закрытия
    setTimeout(() => {
      onClose();
    }, 150);
  }, [onClose, progress, backdropOpacity]);

  const zoneColor = useCallback(
    (v: number): string => {
      const z = rpeZone(v);
      return z === 'easy' ? colors.success : z === 'hard' ? colors.warning : colors.error;
    },
    [colors]
  );

  const handleSelect = useCallback(
    (v: number) => {
      Haptics.selectionAsync();
      setSelected(v);

      // Очищаем предыдущий таймер
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }

      // Автозакрытие через 700ms
      autoCloseTimerRef.current = setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onChange({
          rpe: v,
          rir: deriveRir(v),
          difficulty: deriveDifficulty(v),
        });
        handleClose();
      }, AUTO_CLOSE_DELAY);
    },
    [onChange, handleClose]
  );

  const handleSkip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleClose();
  }, [handleClose]);

  const handleReset = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange({ rpe: null, rir: null, difficulty: null });
    handleClose();
  }, [onChange, handleClose]);

  const handleContainerLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  const selectedColor = zoneColor(selected);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  // F3: анимация разворота — scale 0.85→1 с origin из тапнутой колонки.
  // Вычисляем центр колонки относительно центра overlay:
  // columnCenterX = (setIndex + 0.5) / totalSets * containerWidth
  // originX = columnCenterX - containerWidth / 2
  // Translate для сохранения origin при scale: tx = originX * (1 - scale)
  const contentStyle = useAnimatedStyle(() => {
    const s = 0.85 + progress.value * 0.15;
    let tx = 0;
    if (containerWidth > 0 && totalSets > 0) {
      const originX = ((setIndex + 0.5) / totalSets - 0.5) * containerWidth;
      tx = originX * (1 - s);
    }
    return {
      opacity: progress.value,
      transform: [{ translateX: tx }, { scale: s }],
    };
  });

  return (
    <View style={StyleSheet.absoluteFill} onLayout={handleContainerLayout} pointerEvents="box-none">
      {/* Backdrop — закрывает overlay при тапе.
          Используем фиксированный rgba для консистентного затемнения
          в обеих темах (colors.overlay различается между темами). */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleClose}
        accessibilityRole="button"
        accessibilityLabel="Закрыть"
        style={StyleSheet.absoluteFill}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(0, 0, 0, 0.7)' },
            backdropStyle,
          ]}
        />
      </TouchableOpacity>

      {/* Content */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            justifyContent: 'center',
            alignItems: 'center',
            padding: SPACING.md,
          },
          contentStyle,
        ]}
        pointerEvents="box-none"
      >
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: BORDER_RADIUS.lg,
            padding: SPACING.lg,
            width: '100%',
            maxWidth: 400,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {/* Header с явной кнопкой ✕ (O2: hit area ≥44pt) */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              marginBottom: SPACING.md,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  typography.h6,
                  { color: colors.textPrimary, fontWeight: '700', marginBottom: 4 },
                ]}
              >
                RPE для подхода {setNumber}
              </Text>
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                {weight} {weight ? (unit === 'kg' ? 'кг' : 'lb') : ''} × {reps}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Закрыть RPE"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                minWidth: 44,
                minHeight: 44,
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: SPACING.sm,
                borderRadius: BORDER_RADIUS.full,
                backgroundColor: colors.surfaceSecondary,
              }}
            >
              <X size={18} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Scale: 2 rows of 5 */}
          <View style={{ gap: SPACING.xs }}>
            {[0, 1].map((rowIndex) => (
              <View key={rowIndex} style={{ flexDirection: 'row', gap: SPACING.xs }}>
                {RPE_VALUES.slice(rowIndex * 5, rowIndex * 5 + 5).map((v) => {
                  const isSel = v === selected;
                  const zc = zoneColor(v);
                  return (
                    <TouchableOpacity
                      key={v}
                      onPress={() => handleSelect(v)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`RPE ${v}`}
                      accessibilityState={{ selected: isSel }}
                      style={{
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 12,
                        borderRadius: BORDER_RADIUS.md,
                        backgroundColor: isSel ? zc : colors.surfaceSecondary,
                        borderWidth: 2,
                        borderColor: isSel ? zc : colors.border,
                        minHeight: 44,
                      }}
                    >
                      <Text
                        style={[
                          typography.h6,
                          {
                            fontWeight: isSel ? '700' : '600',
                            color: isSel ? colors.textInverse : zc,
                          },
                        ]}
                      >
                        {v}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Dynamic description */}
          <View
            style={{
              marginTop: SPACING.md,
              padding: SPACING.md,
              backgroundColor: selectedColor + '15',
              borderRadius: BORDER_RADIUS.md,
              borderWidth: 1,
              borderColor: selectedColor + '40',
            }}
          >
            <Text
              style={[
                typography.bodySmall,
                { color: selectedColor, fontWeight: '700', marginBottom: 4 },
              ]}
            >
              RPE {selected} — {RPE_DESCRIPTIONS[selected]}
            </Text>
            <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
              Сложность: {DIFFICULTY_LABELS[deriveDifficulty(selected)]} · RIR {deriveRir(selected)}
            </Text>
          </View>

          {/* Footer: skip/reset button (O2: minHeight 44) */}
          <View style={{ marginTop: SPACING.md, flexDirection: 'row', justifyContent: 'center' }}>
            {rpe != null ? (
              <TouchableOpacity
                onPress={handleReset}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Сбросить RPE"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: SPACING.xs,
                  paddingVertical: SPACING.md,
                  paddingHorizontal: SPACING.lg,
                  borderRadius: BORDER_RADIUS.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  minHeight: 44,
                }}
              >
                <RotateCcw size={16} color={colors.textSecondary} strokeWidth={2} />
                <Text
                  style={[typography.bodySmall, { color: colors.textSecondary, fontWeight: '600' }]}
                >
                  Сбросить
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleSkip}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Пропустить RPE"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: SPACING.xs,
                  paddingVertical: SPACING.md,
                  paddingHorizontal: SPACING.lg,
                  borderRadius: BORDER_RADIUS.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  minHeight: 44,
                }}
              >
                <X size={16} color={colors.textSecondary} strokeWidth={2} />
                <Text
                  style={[typography.bodySmall, { color: colors.textSecondary, fontWeight: '600' }]}
                >
                  Пропустить
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>
    </View>
  );
});
