import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../constants/theme';
import { typography } from '../styles/typography';
import { Play } from 'lucide-react-native';
import { getPhaseMeta, getPhaseColor } from '../constants/phaseTypes';

interface ProgramProgressCardProps {
  programName: string;
  dayName?: string;
  currentPhase?: number;   // ✅ НОВОЕ
  phaseName?: string;      // ✅ НОВОЕ
  phaseType?: string;      // ✅ НОВОЕ
  totalPhases?: number;    // ✅ НОВОЕ
  currentWeek: number;
  currentDay: number;
  totalDays: number;
  onStartPress?: () => void;
}

export function ProgramProgressCard({
  programName,
  dayName,
  currentPhase,
  phaseName,
  phaseType,
  totalPhases,
  currentWeek,
  currentDay,
  totalDays,
  onStartPress,
}: ProgramProgressCardProps) {
  const { colors } = useTheme();
  const progress = totalDays > 0 ? (currentDay / totalDays) * 100 : 0;
  const phaseColor = phaseType ? getPhaseColor(phaseType, colors) : colors.primary;
  const phaseMeta = phaseType ? getPhaseMeta(phaseType) : null;
  const PhaseIcon = phaseMeta?.icon;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.labelBold, { color: colors.textPrimary }]}>{programName}</Text>

          {/* ✅ Бейдж фазы */}
          {phaseName && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginTop: 4 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: phaseColor + '18',
                  paddingHorizontal: SPACING.sm,
                  paddingVertical: 2,
                  borderRadius: BORDER_RADIUS.sm,
                }}
              >
                {PhaseIcon && <PhaseIcon size={12} color={phaseColor} strokeWidth={2} />}
                <Text style={[typography.captionSmall, { color: phaseColor, fontWeight: '700' }]}>
                  {phaseName}
                </Text>
              </View>
              {!!totalPhases && !!currentPhase && (
                <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>
                  Фаза {currentPhase}/{totalPhases}
                </Text>
              )}
            </View>
          )}

          {dayName && (
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>{dayName}</Text>
          )}
        </View>

        {onStartPress && (
          <TouchableOpacity
            onPress={onStartPress}
            style={[styles.startButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
    <Play size={16} color={colors.textInverse} strokeWidth={2} fill={colors.textInverse} />
    <Text style={[typography.labelBold, { color: colors.textInverse, marginLeft: SPACING.xs }]}>Начать</Text>
  </TouchableOpacity>
        )}
      </View>

      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: colors.surfaceSecondary }]}>
          <View style={[styles.progressFill, { width: `${progress}%` as const, backgroundColor: phaseColor }]} />
        </View>
        <Text style={[typography.captionSmall, { color: colors.textSecondary, marginTop: SPACING.xs }]}>
          Неделя {currentWeek} · День {currentDay} из {totalDays}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  progressContainer: {
    marginTop: SPACING.sm,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden' as const,
  },
  progressFill: {
    height: '100%' as const,
    borderRadius: 4,
  },
});