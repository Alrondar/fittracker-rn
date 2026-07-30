import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  useAnimatedReaction,
} from 'react-native-reanimated';
import { Flame, Dumbbell } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';

export type WorkoutTabKey = 'warmup' | 'workout';

interface WorkoutTabsProps {
  activeTab: WorkoutTabKey;
  onChange: (tab: WorkoutTabKey) => void;
  warmupCount: number;
  warmupCompleted: boolean;
}

/**
 * Переключатель «Разминка / Тренировка» — паттерн из programs.tsx.
 * Анимированный бегунка‑подложка (reanimated), бейдж количества на разминке.
 */
export function WorkoutTabs({
  activeTab,
  onChange,
  warmupCount,
  warmupCompleted,
}: WorkoutTabsProps) {
  const { colors } = useTheme();
  // Позиция бегунка в долях ширины таба (0 или 1); ширина измеряется onLayout.
  const progress = useSharedValue(activeTab === 'warmup' ? 0 : 1);
  const tabWidth = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(activeTab === 'warmup' ? 0 : 1, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * tabWidth.value }],
    width: tabWidth.value,
  }));

  const handlePress = (tab: WorkoutTabKey) => {
    if (tab === activeTab) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(tab);
  };

  const tabLabel = (active: boolean) => [
    typography.labelBold,
    { color: active ? colors.textInverse : colors.textSecondary },
  ];

  return (
    <View
      style={{
        flexDirection: 'row',
        marginHorizontal: SPACING.lg,
        marginTop: SPACING.md,
        marginBottom: SPACING.sm,
        backgroundColor: colors.surfaceSecondary,
        borderRadius: BORDER_RADIUS.lg,
        padding: 4,
        position: 'relative',
      }}
      onLayout={(e: LayoutChangeEvent) => {
        const w = (e.nativeEvent.layout.width - 8) / 2; // минус padding, два таба
        if (w > 0 && tabWidth.value !== w) tabWidth.value = w;
      }}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 4,
            left: 4,
            bottom: 4,
            borderRadius: BORDER_RADIUS.md,
            backgroundColor: colors.primary,
          },
          indicatorStyle,
        ]}
      />
      <TouchableOpacity
        onPress={() => handlePress('warmup')}
        activeOpacity={0.85}
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          paddingVertical: SPACING.sm,
          zIndex: 1,
        }}
      >
        <Flame
          size={15}
          color={activeTab === 'warmup' ? colors.textInverse : colors.warning}
        />
        <Text style={tabLabel(activeTab === 'warmup')}>Разминка</Text>
        {warmupCount > 0 && (
          <View
            style={{
              backgroundColor:
                activeTab === 'warmup' ? colors.textInverse + '30' : colors.warning + '20',
              borderRadius: BORDER_RADIUS.full,
              paddingHorizontal: 6,
              paddingVertical: 1,
            }}
          >
            <Text
              style={[
                typography.captionSmall,
                {
                  fontWeight: '700',
                  color:
                    activeTab === 'warmup'
                      ? colors.textInverse
                      : warmupCompleted
                      ? colors.success
                      : colors.warning,
                },
              ]}
            >
              {warmupCompleted ? '✓' : warmupCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => handlePress('workout')}
        activeOpacity={0.85}
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          paddingVertical: SPACING.sm,
          zIndex: 1,
        }}
      >
        <Dumbbell
          size={15}
          color={activeTab === 'workout' ? colors.textInverse : colors.textSecondary}
        />
        <Text style={tabLabel(activeTab === 'workout')}>Тренировка</Text>
      </TouchableOpacity>
    </View>
  );
}