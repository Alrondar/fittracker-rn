// src/components/workout/ExerciseInfoAccordion.tsx
// 05.08.2026 (PERF): аккордеон самодостаточный — expanded/everOpened внутри.
// Тап НЕ ре-рендерит ExerciseCard/соседей; children — стабильная ссылка,
// контент не реконсилируется. Ленивый монтаж: свёрнутая секция ничего не монтирует.
import React, { useState, useEffect, useCallback, memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ChevronDown } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';

const DEFAULT_MAX_HEIGHT = 400;

function ExpandableBody({
  expanded,
  maxHeight,
  children,
}: {
  expanded: boolean;
  maxHeight: number;
  children: React.ReactNode;
}) {
  const progress = useSharedValue(expanded ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);
  const style = useAnimatedStyle(() => ({
    maxHeight: progress.value * maxHeight,
    opacity: 0.1 + progress.value * 0.9,
    transform: [{ translateY: (1 - progress.value) * -6 }],
  }));
  return (
    <Animated.View
      pointerEvents={expanded ? 'auto' : 'none'}
      style={[{ overflow: 'hidden' }, style]}
    >
      <View style={{ paddingTop: SPACING.sm, paddingBottom: SPACING.xs, paddingHorizontal: 2 }}>
        {children}
      </View>
    </Animated.View>
  );
}

interface ExerciseInfoAccordionProps {
  icon: React.ReactNode;
  title: string;
  titleColor: string;
  children: React.ReactNode;
  maxHeight?: number;
  defaultExpanded?: boolean;  // ← добавить
}

export const ExerciseInfoAccordion = memo(function ExerciseInfoAccordion({
  icon,
  title,
  titleColor,
  maxHeight = DEFAULT_MAX_HEIGHT,
  children,
  defaultExpanded = false,
}: ExerciseInfoAccordionProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [everOpened, setEverOpened] = useState(false);

  const onToggle = useCallback(() => {
    setEverOpened(true);
    setExpanded((prev) => !prev);
  }, []);

  return (
    <View style={{ marginTop: SPACING.sm }}>
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: SPACING.xs + 2,
          paddingHorizontal: SPACING.sm,
          borderRadius: BORDER_RADIUS.md,
          backgroundColor: colors.surfaceSecondary,
        }}
      >
        {icon}
        <Text
          style={[
            typography.captionSmall,
            {
              color: titleColor,
              fontWeight: '700',
              marginLeft: 6,
              flex: 1,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            },
          ]}
        >
          {title}
        </Text>
        <View style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}>
          <ChevronDown size={14} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>
{everOpened ? (
  <ExpandableBody expanded={expanded} maxHeight={maxHeight}>
    {children}
  </ExpandableBody>
) : null}
    </View>
  );
});