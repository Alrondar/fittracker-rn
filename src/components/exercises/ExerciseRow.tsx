// app/(tabs)/exercises.tsx split (DA-P2-8): мемоизированная строка списка упражнений.
import { memo } from 'react';
import { View, Text, type StyleProp, type ViewStyle } from 'react-native';
import { ShieldAlert, Flame, Zap } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS, withAlpha } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { AppBadge } from '../ui/AppBadge';
import { PressableScale } from '../ui/PressableScale';
import { EquipmentIcon } from '../EquipmentIcon';
import { getMuscleColor } from '../../constants/muscleColors';
import type { ExerciseListItem } from '../../services/exercisesService';

interface ExerciseRowProps {
  item: ExerciseListItem;
  onPress: (id: string) => void;
  /** SEARCH-ALT: текст противопоказания при активной травме (строка выдачи поиска замен). */
  warning?: string | null;
  /** SEARCH-ALT: панель поиска лежит внутри блока упражнения — там свои отступы. */
  style?: StyleProp<ViewStyle>;
}

export const ExerciseRow = memo(function ExerciseRow({
  item,
  onPress,
  warning = null,
  style,
}: ExerciseRowProps) {
  const { colors } = useTheme();
  const borderColor =
    item.primary_muscles.length > 0 ? getMuscleColor(item.primary_muscles[0]) : colors.border;
  return (
    <PressableScale
      // UX-1 (audit-6): строка каталога — spring-scale вместо activeOpacity.
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          padding: SPACING.md,
          backgroundColor: colors.surface,
          borderRadius: BORDER_RADIUS.lg,
          marginBottom: SPACING.sm,
          marginHorizontal: SPACING.lg,
          borderWidth: 1,
          borderColor: borderColor,
          borderLeftWidth: 4,
        },
        style,
      ]}
      scaleTo={0.98}
      haptic="none"
      onPress={() => onPress(item.id)}
      accessibilityRole="button"
      accessibilityLabel={item.name}
    >
      <View
        style={{
          width: 50,
          height: 50,
          borderRadius: 25,
          backgroundColor: withAlpha(borderColor, 0.13),
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: SPACING.md,
        }}
      >
        <EquipmentIcon
          name={item.equipment[0] || 'Тренажер'}
          primaryMuscles={item.primary_muscles}
          size={32}
          scale={0.9}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.labelBold, { color: colors.textPrimary }]} numberOfLines={2}>
          {item.name}
        </Text>
        {item.primary_muscles.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {item.primary_muscles.slice(0, 2).map((muscle, idx) => (
              <AppBadge
                key={idx}
                variant="default"
                size="small"
                style={{ backgroundColor: withAlpha(getMuscleColor(muscle), 0.08) }}
                textStyle={{ color: getMuscleColor(muscle) }}
              >
                {muscle}
              </AppBadge>
            ))}
          </View>
        )}
        {(item.popularity ?? 0) > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
            <Flame size={11} color={colors.warning} />
            <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>
              {item.popularity}
            </Text>
          </View>
        )}
        {item.can_be_activation && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
            <Zap size={11} color={colors.warning} />
            <Text style={[typography.captionSmall, { color: colors.warning, fontWeight: '600' }]}>
              Активация
            </Text>
          </View>
        )}
        {!!warning && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 4 }}>
            <ShieldAlert size={11} color={colors.error} strokeWidth={2} style={{ marginTop: 2 }} />
            <Text
              style={[typography.captionSmall, { color: colors.error, flex: 1, fontWeight: '600' }]}
              numberOfLines={2}
            >
              Нельзя при: {warning}
            </Text>
          </View>
        )}
      </View>
    </PressableScale>
  );
});
