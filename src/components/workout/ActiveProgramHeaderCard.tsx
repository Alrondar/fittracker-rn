// src/components/workout/ActiveProgramHeaderCard.tsx
// DA-P2-8: шапка со списком тренировок — карточка прогресса активной программы.
import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import type { ActiveProgram } from '../../services/workoutsService';
import { SPACING, BORDER_RADIUS, withAlpha } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { AppCard } from '../ui/AppCard';
import { getPhaseMeta, getPhaseColor } from '../../constants/phaseTypes';

interface ActiveProgramHeaderCardProps {
  activeProgram: ActiveProgram;
  progress: { completed: number; total: number };
}

export function ActiveProgramHeaderCard({ activeProgram, progress }: ActiveProgramHeaderCardProps) {
  const { colors } = useTheme();
  const currentPhaseObj = activeProgram.phases.find(
    (p: any) => p.phase_number === activeProgram.currentPhase
  );
  const phaseColor = currentPhaseObj
    ? getPhaseColor(currentPhaseObj.phase_type, colors)
    : colors.primary;
  const phaseMeta = currentPhaseObj ? getPhaseMeta(currentPhaseObj.phase_type) : null;
  const PhaseIcon = phaseMeta?.icon;
  const progressPct = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  return (
    <View style={{ padding: SPACING.lg, paddingBottom: 0 }}>
      <AppCard variant="default">
        <Text style={[typography.labelBold, { color: colors.textPrimary }]}>
          {activeProgram.name}
        </Text>

        {currentPhaseObj && (
          <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginTop: 4 }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: withAlpha(phaseColor, 0.09),
                paddingHorizontal: SPACING.sm,
                paddingVertical: 2,
                borderRadius: BORDER_RADIUS.sm,
              }}
            >
              {PhaseIcon && <PhaseIcon size={12} color={phaseColor} strokeWidth={2} />}
              <Text style={[typography.captionSmall, { color: phaseColor, fontWeight: '700' }]}>
                {currentPhaseObj.name}
              </Text>
            </View>
            <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>
              Фаза {activeProgram.currentPhase}/{activeProgram.phases.length} · Неделя{' '}
              {activeProgram.currentWeek}
            </Text>
          </View>
        )}
        <View style={{ marginTop: SPACING.md }}>
          <View
            style={{
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.surfaceSecondary,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${progressPct}%`,
                backgroundColor: phaseColor,
                borderRadius: 4,
              }}
            />
          </View>
          <Text
            style={[
              typography.captionSmall,
              { color: colors.textSecondary, marginTop: SPACING.xs },
            ]}
          >
            Выполнено {progress.completed} из {progress.total} тренировок
          </Text>
        </View>
      </AppCard>
    </View>
  );
}
