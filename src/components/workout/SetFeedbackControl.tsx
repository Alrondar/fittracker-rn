import React, { memo, useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { Difficulty, SetFeedbackPatch } from '../../types/workout';
import {
  RPE_DESCRIPTIONS,
  rpeZone,
  deriveRir,
  deriveDifficulty,
  DIFFICULTY_LABELS,
} from '../../utils/rpe';

interface SetFeedbackChipProps {
  rpe: number | null;
  onPress: () => void;
  colors: any;
}

export const SetFeedbackChip = memo(function SetFeedbackChip({
  rpe,
  onPress,
  colors,
}: SetFeedbackChipProps) {
  const filled = rpe != null;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        alignItems: 'center',
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.sm,
        backgroundColor: filled ? colors.primary + '15' : colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: filled ? colors.primary + '40' : colors.border,
      }}
    >
      <Text
        style={[
          typography.captionSmall,
          {
            color: filled ? colors.primary : colors.textTertiary,
            fontWeight: '700',
          },
        ]}
      >
        {filled ? `RPE ${rpe}` : 'RPE?'}
      </Text>
    </TouchableOpacity>
  );
});

interface SetFeedbackEditorProps {
  setNumber: number;
  rpe: number | null;
  rir: number | null;
  difficulty: Difficulty | null;
  onChange: (patch: SetFeedbackPatch) => void;
  onClose: () => void;
  colors: any;
}

export const SetFeedbackEditor = memo(function SetFeedbackEditor({
  setNumber,
  rpe,
  rir,
  difficulty,
  onChange,
  onClose,
  colors,
}: SetFeedbackEditorProps) {
  const [local, setLocal] = useState<number>(rpe ?? 6);
  const translateX = useSharedValue((rpe ?? 6) - 1);
  const sliderWidth = 280;
  const stepWidth = sliderWidth / 9;
  const prevRpeRef = useRef(rpe);

  // Синхронизация только при внешнем изменении rpe (не при перетаскивании)
  useEffect(() => {
    if (rpe !== prevRpeRef.current && rpe != null) {
      setLocal(rpe);
      translateX.value = rpe - 1;
      prevRpeRef.current = rpe;
    }
  }, [rpe, translateX]);

  const zoneColor = (v: number): string => {
    const z = rpeZone(v);
    return z === 'easy' ? colors.success : z === 'hard' ? colors.warning : colors.error;
  };
  const zc = zoneColor(local);

  // JS-функция для коммита (только при отпускании)
  const commitValue = useCallback(
    (value: number) => {
      const v = Math.round(value);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange({ rpe: v, rir: deriveRir(v), difficulty: deriveDifficulty(v) });
    },
    [onChange],
  );

  // Обновление локального стейта только при изменении целого значения
  const updateLocalIfNeeded = useCallback((value: number) => {
    setLocal((prev) => {
      const rounded = Math.round(value);
      if (prev !== rounded) return rounded;
      return prev;
    });
  }, []);

  const panGesture = Gesture.Pan()
    .simultaneousWithExternalGesture(Gesture.Native()) // ✅ РАЗРЕШАЕТ СКРОЛЛ ОДНОВРЕМЕННО
    .onUpdate((event) => {
      'worklet';
      const clampedX = Math.max(0, Math.min(event.x, sliderWidth));
      translateX.value = clampedX / stepWidth;
      const value = Math.round(clampedX / stepWidth) + 1;
      // Обновляем JS-стейт только при изменении целого значения
      runOnJS(updateLocalIfNeeded)(value);
    })
    .onEnd(() => {
      'worklet';
      const snappedX = Math.round(translateX.value);
      translateX.value = withSpring(snappedX);
      const value = snappedX + 1;
      runOnJS(commitValue)(value);
    });

  const animatedThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value * stepWidth }],
  }));

  const animatedTrackStyle = useAnimatedStyle(() => ({
    width: translateX.value * stepWidth,
  }));

  const reset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange({ rpe: null, rir: null, difficulty: null });
    translateX.value = 5;
    setLocal(6);
  };

  return (
    <View
      style={{
        marginTop: SPACING.sm,
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.sm,
        backgroundColor: colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: SPACING.xs,
        }}
      >
        <Text
          style={[
            typography.captionSmall,
            { color: colors.textSecondary, fontWeight: '700', flex: 1 },
          ]}
        >
          Подход {setNumber} — как далось?
        </Text>
        {rpe != null && (
          <TouchableOpacity
            onPress={reset}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ marginRight: SPACING.sm }}
          >
            <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>
              Сбросить
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={14} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* Кастомный ползунок */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
        <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>1</Text>
        <View style={{ flex: 1, height: 40 }}>
          <GestureDetector gesture={panGesture}>
            <View
              style={{
                width: '100%',
                height: '100%',
                justifyContent: 'center',
              }}
            >
              {/* Трек */}
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: 4,
                  backgroundColor: zc + '40',
                  borderRadius: 2,
                }}
              />
              {/* Заполненная часть */}
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    left: 0,
                    height: 4,
                    backgroundColor: zc,
                    borderRadius: 2,
                  },
                  animatedTrackStyle,
                ]}
              />
              {/* Ползунок */}
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: zc,
                    borderWidth: 2,
                    borderColor: colors.textInverse,
                    shadowColor: colors.shadow,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 5,
                  },
                  animatedThumbStyle,
                ]}
              />
            </View>
          </GestureDetector>
        </View>
        <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>10</Text>
      </View>

      {/* Метки значений */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 4,
          paddingHorizontal: 12,
        }}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
          <Text
            key={v}
            style={{
              fontSize: 9,
              color: local === v ? zc : colors.textTertiary,
              fontWeight: local === v ? '700' : '400',
            }}
          >
            {v}
          </Text>
        ))}
      </View>

      {/* Живое объяснение */}
      <Text
        style={[
          typography.captionSmall,
          { color: colors.textSecondary, marginTop: SPACING.xs, lineHeight: 16 },
        ]}
      >
        {`RPE ${local} — ${RPE_DESCRIPTIONS[local]} · сложность: ${
          DIFFICULTY_LABELS[difficulty ?? deriveDifficulty(local)]
        } · RIR ${rir ?? deriveRir(local)}`}
      </Text>
      <Text
        style={[typography.captionSmall, { color: colors.textTertiary, marginTop: 2 }]}
      >
        1 — легко · 10 — отказ
      </Text>
    </View>
  );
});