import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../constants/theme';
import { typography } from '../styles/typography';
import { Play } from 'lucide-react-native';

interface ProgramProgressCardProps {
  programName: string;
  dayName?: string;
  currentWeek: number;
  currentDay: number;
  totalDays: number;
  onStartPress?: () => void; // ✅ ДОБАВЛЕНО: опциональный колбэк
}

export function ProgramProgressCard({
  programName,
  dayName,
  currentWeek,
  currentDay,
  totalDays,
  onStartPress,
}: ProgramProgressCardProps) {
  const { colors } = useTheme();

  const progress = totalDays > 0 ? (currentDay / totalDays) * 100 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.labelBold, { color: colors.textPrimary }]}>
            {programName}
          </Text>
          {dayName && (
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
              {dayName}
            </Text>
          )}
        </View>
        {onStartPress && (
          <TouchableOpacity
            onPress={onStartPress}
            style={[styles.startButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Play size={16} color="white" strokeWidth={2} fill="white" />
            <Text style={[typography.labelBold, { color: 'white', marginLeft: SPACING.xs }]}>
              Начать
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: colors.surfaceSecondary }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress}%` as const,
                backgroundColor: colors.primary,
              },
            ]}
          />
        </View>
        <Text style={[typography.captionSmall, { color: colors.textSecondary, marginTop: SPACING.xs }]}>
          Неделя {currentWeek}, День {currentDay} из {totalDays}
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