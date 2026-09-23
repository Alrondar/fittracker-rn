// src/components/workout/sections/ExerciseCardTags.tsx
// UX-16 D2 + F5 + F6 + O1: TagsRow — exclusive toggle для equipment и muscles.
//
// Свёрнутое состояние: 1 primary equipment + 1 primary muscle на противоположных
// концах строки. Тап по equipment → expand equipment ВПРАВО, мышцы СКРЫТЫ.
// Тап по muscle → expand muscles ВЛЕВО, оборудование СКРЫТО.
// Только одно семейство развёрнуто одновременно (O1: восстановление D2).
//
// F5: secondary muscle текст читаемый — colors.textSecondary + цветная точка
//     (без хардкод rgba); primary — полный акцент цветом мышцы.
// F6: overflow protection — numberOfLines={1} + ellipsis + maxWidth; в expanded
//     состоянии flexWrap + maxWidth '60%' (все баблы сразу видны, без скролла).
//
// Анимации через Reanimated (fade+slide 200ms).
import React, { memo, useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ChevronDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SPACING, BORDER_RADIUS, withAlpha } from '../../../constants/theme';
import { typography } from '../../../styles/typography';
import { getMuscleColor } from '../../../constants/muscleColors';
import { EquipmentIcon } from '../../EquipmentIcon';

type ExpandedFamily = 'none' | 'equipment' | 'muscles';

interface ExerciseCardTagsProps {
  equipment: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  colors: any;
}

// Чистая функция форматирования названия оборудования
const formatEquipmentName = (name: string) =>
  name.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Generic bubble — универсальный бабл с опциональной иконкой, текстом,
 * цветом мышцы (для точек) и chevron.
 *
 * Variants:
 * - primary (equipment): акцент primary color, иконка, chevron
 * - primary (muscle): акцент цветом мышцы, цветная точка, chevron
 * - secondary (equipment): нейтральный фон, иконка, цвет primary
 * - secondary (muscle): нейтральный фон, цветная точка, textSecondary
 */
const Bubble = memo(function Bubble({
  label,
  onPress,
  icon,
  dotColor,
  variant,
  isExpanded,
  colors,
  accessibilityLabel,
}: {
  label: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  /** Если задан — цветная точка слева от текста (для мышц) */
  dotColor?: string;
  variant: 'primary-equipment' | 'primary-muscle' | 'secondary-equipment' | 'secondary-muscle';
  isExpanded?: boolean;
  colors: any;
  accessibilityLabel?: string;
}) {
  const accentColor =
    variant === 'primary-equipment' || variant === 'secondary-equipment'
      ? colors.primary
      : (dotColor ?? colors.primary);

  const textColor =
    variant === 'primary-equipment'
      ? colors.primary
      : variant === 'primary-muscle'
        ? accentColor
        : variant === 'secondary-equipment'
          ? colors.textPrimary
          : colors.textSecondary; // F5: secondary muscle text readable

  const bgColor =
    variant === 'primary-equipment' || variant === 'primary-muscle'
      ? withAlpha(accentColor, 0.102)
      : colors.surfaceSecondary;

  const borderColor =
    variant === 'primary-equipment' || variant === 'primary-muscle'
      ? withAlpha(accentColor, 0.333)
      : colors.border;

  const inner = (
    <>
      {icon}
      {dotColor && (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: dotColor,
            marginLeft: icon ? 4 : 0,
          }}
        />
      )}
      <Text
        style={[
          typography.captionSmall,
          {
            color: textColor,
            fontWeight: '700',
            marginLeft: icon || dotColor ? 4 : 0,
            flexShrink: 1, // F6: shrink with ellipsis
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {isExpanded !== undefined && (
        <Animated.View
          style={{
            transform: [{ rotate: isExpanded ? '180deg' : '0deg' }],
            marginLeft: 4,
          }}
        >
          <ChevronDown size={12} color={textColor} strokeWidth={2} />
        </Animated.View>
      )}
    </>
  );

  const style = [
    styles.bubble,
    {
      backgroundColor: bgColor,
      borderWidth: 1,
      borderColor: borderColor,
    },
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded: isExpanded }}
        style={style}
      >
        {inner}
      </TouchableOpacity>
    );
  }
  return <View style={style}>{inner}</View>;
});

export const ExerciseCardTags = memo(function ExerciseCardTags({
  equipment,
  primaryMuscles,
  secondaryMuscles,
  colors,
}: ExerciseCardTagsProps) {
  const [expanded, setExpanded] = useState<ExpandedFamily>('none');

  const hasEquipment = equipment.length > 0;
  const hasMuscles = primaryMuscles.length > 0 || secondaryMuscles.length > 0;
  const hasMoreEquipment = equipment.length > 1;
  const hasMoreMuscles = primaryMuscles.length + secondaryMuscles.length > 1;

  const handleEquipmentPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded((prev) => (prev === 'equipment' ? 'none' : 'equipment'));
  }, []);

  const handleMusclesPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded((prev) => (prev === 'muscles' ? 'none' : 'muscles'));
  }, []);

  // Анимация перехода между состояниями — простой slide-in с fade.
  // При каждом изменении expanded контент плавно появляется снизу.
  const contentProgress = useSharedValue(1);

  useEffect(() => {
    contentProgress.value = 0;
    contentProgress.value = withTiming(1, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
  }, [expanded, contentProgress]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentProgress.value,
    transform: [{ translateY: (1 - contentProgress.value) * -4 }],
  }));

  const primaryMuscleColor =
    primaryMuscles.length > 0 ? getMuscleColor(primaryMuscles[0]) : colors.primary;

  // Построение содержимого в зависимости от состояния
  const content = useMemo(() => {
    if (expanded === 'equipment' && hasEquipment) {
      // Все equipment items в одной строке (flexWrap), мышца скрыта
      return (
        <View style={styles.expandedRow}>
          {equipment.map((eq, i) => (
            <Bubble
              key={`eq-${i}`}
              label={formatEquipmentName(eq)}
              icon={<EquipmentIcon name={eq} size={14} primaryMuscles={primaryMuscles} />}
              variant={i === 0 ? 'primary-equipment' : 'secondary-equipment'}
              isExpanded={i === 0 ? true : undefined}
              onPress={i === 0 ? handleEquipmentPress : undefined}
              colors={colors}
              accessibilityLabel={
                i === 0
                  ? 'Свернуть список оборудования'
                  : `Оборудование: ${formatEquipmentName(eq)}`
              }
            />
          ))}
        </View>
      );
    }

    if (expanded === 'muscles' && hasMuscles) {
      // Все мышцы в одной строке (flexWrap), оборудование скрыто.
      // Порядок: secondary слева→направо, primary в конце (с ▾).
      // D2: expand ВЛЕВО означает правое якорение (justifyContent: flex-end).
      const items: React.ReactNode[] = [];
      secondaryMuscles.forEach((m, i) => {
        items.push(
          <Bubble
            key={`sm-${i}`}
            label={m}
            dotColor={getMuscleColor(m)}
            variant="secondary-muscle"
            colors={colors}
            accessibilityLabel={`Вспомогательная мышца: ${m}`}
          />
        );
      });
      primaryMuscles.forEach((m, i) => {
        const isMain = i === 0;
        items.push(
          <Bubble
            key={`pm-${i}`}
            label={m}
            dotColor={getMuscleColor(m)}
            variant={isMain ? 'primary-muscle' : 'secondary-muscle'}
            isExpanded={isMain ? true : undefined}
            onPress={isMain ? handleMusclesPress : undefined}
            colors={colors}
            accessibilityLabel={isMain ? 'Свернуть список мышц' : `Основная мышца: ${m}`}
          />
        );
      });
      return <View style={[styles.expandedRow, styles.expandedRowEnd]}>{items}</View>;
    }

    // Collapsed: 1 equipment + 1 muscle на противоположных концах.
    // Баблы без ▾ если у семейства нет вторичных элементов (F6: не тапабельны).
    // F6 fix: каждый бабл обёрнут в wrapper с flexShrink + maxWidth ~48%,
    // чтобы длинные названия сокращались с ellipsis и не вылезали за карточку.
    // space-between убирает необходимость в flex-спейсере и гарантирует, что
    // баблы остаются у краёв даже при сокращении.
    return (
      <View style={styles.collapsedRow}>
        {hasEquipment && (
          <View style={styles.collapsedBubbleWrapper}>
            <Bubble
              label={formatEquipmentName(equipment[0])}
              icon={<EquipmentIcon name={equipment[0]} size={14} primaryMuscles={primaryMuscles} />}
              variant="primary-equipment"
              onPress={hasMoreEquipment ? handleEquipmentPress : undefined}
              isExpanded={hasMoreEquipment ? false : undefined}
              colors={colors}
              accessibilityLabel={
                hasMoreEquipment
                  ? `Оборудование: ${formatEquipmentName(equipment[0])}. Нажмите, чтобы показать все.`
                  : `Оборудование: ${formatEquipmentName(equipment[0])}`
              }
            />
          </View>
        )}
        {hasMuscles && (
          <View style={styles.collapsedBubbleWrapper}>
            <Bubble
              label={primaryMuscles[0] || secondaryMuscles[0]}
              dotColor={primaryMuscleColor}
              variant="primary-muscle"
              onPress={hasMoreMuscles ? handleMusclesPress : undefined}
              isExpanded={hasMoreMuscles ? false : undefined}
              colors={colors}
              accessibilityLabel={
                hasMoreMuscles
                  ? `Мышцы: ${primaryMuscles[0] || secondaryMuscles[0]}. Нажмите, чтобы показать все.`
                  : `Мышцы: ${primaryMuscles[0] || secondaryMuscles[0]}`
              }
            />
          </View>
        )}
      </View>
    );
  }, [
    expanded,
    equipment,
    primaryMuscles,
    secondaryMuscles,
    primaryMuscleColor,
    hasEquipment,
    hasMuscles,
    hasMoreEquipment,
    hasMoreMuscles,
    handleEquipmentPress,
    handleMusclesPress,
    colors,
  ]);

  if (!hasEquipment && !hasMuscles) return null;

  return (
    <View style={styles.container}>
      <Animated.View style={contentStyle}>{content}</Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    minHeight: 28,
    flexShrink: 1, // allow shrinking inside wrapper (F6)
  },
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  collapsedBubbleWrapper: {
    flexShrink: 1,
    maxWidth: '48%',
    overflow: 'hidden',
  },
  expandedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    alignItems: 'center',
  },
  expandedRowEnd: {
    justifyContent: 'flex-end', // D2: expand ВЛЕВО = right-anchored
  },
});
