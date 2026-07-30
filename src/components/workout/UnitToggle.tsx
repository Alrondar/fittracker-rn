import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, TextStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { WeightUnit } from '../../hooks/useUnitPreferences';

interface UnitToggleProps {
  unit: WeightUnit;
  onChange: (unit: WeightUnit) => void;
}

const SEGMENT_WIDTH = 52;
const SEGMENT_HEIGHT = 30;

/**
 * Сегментированный ползунок kg / lb с анимированным бегунком (reanimated).
 * Тактильный отклик на переключение. Цвета — только из темы.
 */
export function UnitToggle({ unit, onChange }: UnitToggleProps) {
  const { colors } = useTheme();
  const translateX = useSharedValue(unit === 'lb' ? SEGMENT_WIDTH : 0);

  useEffect(() => {
    translateX.value = withTiming(unit === 'lb' ? SEGMENT_WIDTH : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleSelect = (next: WeightUnit) => {
    if (next === unit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(next);
  };

  // ✅ Явный возвращаемый тип StyleProp<TextStyle> фиксирует литералы
  //    fontWeight/textAlign (иначе TS расширяет '700' до string → TS2769).
  const labelStyle = (active: boolean): StyleProp<TextStyle> => [
    typography.captionSmall,
    {
      fontWeight: '700',
      color: active ? colors.textInverse : colors.textSecondary,
      textAlign: 'center',
    },
  ];

  return (
    <View
      style={{
        flexDirection: 'row',
        width: SEGMENT_WIDTH * 2,
        height: SEGMENT_HEIGHT,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: colors.surfaceSecondary,
        padding: 3,
        position: 'relative',
      }}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 3,
            left: 3,
            width: SEGMENT_WIDTH,
            height: SEGMENT_HEIGHT - 6,
            borderRadius: BORDER_RADIUS.full,
            backgroundColor: colors.primary,
          },
          thumbStyle,
        ]}
      />
      <TouchableOpacity
        onPress={() => handleSelect('kg')}
        activeOpacity={0.8}
        style={{ width: SEGMENT_WIDTH, height: '100%', justifyContent: 'center', zIndex: 1 }}
      >
        <Text style={labelStyle(unit === 'kg')}>кг</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => handleSelect('lb')}
        activeOpacity={0.8}
        style={{ width: SEGMENT_WIDTH, height: '100%', justifyContent: 'center', zIndex: 1 }}
      >
        <Text style={labelStyle(unit === 'lb')}>lb</Text>
      </TouchableOpacity>
    </View>
  );
}