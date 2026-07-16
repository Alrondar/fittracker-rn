import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { createDashboardStyles } from '../styles/components/dashboard';
import { useTheme } from '../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../constants/theme';
import { typography } from '../styles/typography';
import { ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface ProgramProgressCardProps {
  programName: string;
  dayName: string;
  currentWeek: number;
  currentDay: number;
  totalDays: number;
  onStartPress: () => void;
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
  const styles = createDashboardStyles(colors);
  
  const progress = ((currentDay - 1) / totalDays) * 100;

  return (
    <View style={styles.programCard}>
      <Text style={styles.programTitle}>{programName}</Text>
      <Text style={styles.programDay}>
        Неделя {currentWeek}, {dayName}
      </Text>
      
      <View style={styles.programProgress}>
        <View style={[styles.programProgressBar, { width: `${progress}%` }]} />
      </View>
      
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onStartPress();
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'rgba(255,255,255,0.2)',
          padding: SPACING.md,
          borderRadius: BORDER_RADIUS.md,
        }}
      >
        <Text style={styles.programButtonText}>Начать тренировку</Text>
        <ChevronRight size={20} color="#fff" strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
}