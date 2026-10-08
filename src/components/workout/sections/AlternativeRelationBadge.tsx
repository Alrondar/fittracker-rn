// src/components/workout/sections/AlternativeRelationBadge.tsx
// ALT-L2 (08.10): бейдж типа замены вынесен из AlternativeExerciseCard, чтобы сама
// карточка осталась про решение, а не про вёрстку чипа (в файле и так аккордеон).
// ENG-5: семантика связи (↗ прогрессия / ↘ упрощение / вариант) — L1, видна сразу.
import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { TrendingUp, TrendingDown, Shuffle } from 'lucide-react-native';
import { useTheme } from '../../../hooks/useTheme';
import { SPACING, withAlpha } from '../../../constants/theme';
import { typography } from '../../../styles/typography';
import { AlternativeExercise } from '../../../types/workout';

type RelationType = NonNullable<AlternativeExercise['relation_type']>;

const RELATION_META: Record<
  RelationType,
  { label: string; Icon: typeof Shuffle; tone: 'primary' | 'warning' | 'neutral' }
> = {
  progression: { label: 'Прогрессия', Icon: TrendingUp, tone: 'primary' },
  regression: { label: 'Упрощение', Icon: TrendingDown, tone: 'warning' },
  variation: { label: 'Вариант', Icon: Shuffle, tone: 'neutral' },
  alternative: { label: 'Вариант', Icon: Shuffle, tone: 'neutral' },
};

interface AlternativeRelationBadgeProps {
  relation?: AlternativeExercise['relation_type'];
  /** Компактный режим — для превью в слайдере (меньше отступ снизу). */
  compact?: boolean;
}

export const AlternativeRelationBadge = memo(function AlternativeRelationBadge({
  relation,
  compact = false,
}: AlternativeRelationBadgeProps) {
  const { colors } = useTheme();
  if (!relation) return null;
  const meta = RELATION_META[relation];
  if (!meta) return null;

  const color =
    meta.tone === 'primary'
      ? colors.primary
      : meta.tone === 'warning'
        ? colors.warning
        : colors.textSecondary;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        backgroundColor:
          meta.tone === 'neutral' ? colors.surfaceSecondary : withAlpha(color as string, 0.082),
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
        borderRadius: SPACING.sm,
        marginBottom: compact ? SPACING.xs : SPACING.sm,
      }}
    >
      <meta.Icon size={12} color={color as string} strokeWidth={2} />
      <Text
        style={[
          typography.captionSmall,
          {
            color: color as string,
            fontWeight: meta.tone === 'neutral' ? '600' : '700',
          },
        ]}
      >
        {meta.label}
      </Text>
    </View>
  );
});
