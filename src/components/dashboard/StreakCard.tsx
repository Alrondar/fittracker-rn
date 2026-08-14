// src/components/dashboard/StreakCard.tsx
// FEAT-1.3: карточка недельного стрика на Dashboard.
import { memo } from 'react';
import { View, Text } from 'react-native';
import { Flame, Trophy } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { StreakStats } from '../../utils/streak';

/** «неделя / недели / недель» */
function weeksRu(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'неделя';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'недели';
  return 'недель';
}

interface StreakCardProps {
  streak: StreakStats;
  colors: any;
}

export const StreakCard = memo(function StreakCard({ streak, colors }: StreakCardProps) {
  const active = streak.activeThisWeek;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.warning + '12',
        borderWidth: 1,
        borderColor: colors.warning + '35',
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        gap: SPACING.md,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.warning + '20',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Flame
          size={22}
          color={active ? colors.warning : colors.textTertiary}
          strokeWidth={2}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.h4, { color: colors.textPrimary }]}>
          {streak.current} {weeksRu(streak.current)} подряд
        </Text>
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
          {active
            ? 'Серия продолжается — так держать!'
            : 'Потренируйся на этой неделе, чтобы сохранить серию'}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Trophy size={14} color={colors.textTertiary} strokeWidth={2} />
          <Text
            style={[typography.captionSmall, { color: colors.textSecondary, fontWeight: '700' }]}
          >
            {streak.best}
          </Text>
        </View>
        <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>рекорд</Text>
      </View>
    </View>
  );
});