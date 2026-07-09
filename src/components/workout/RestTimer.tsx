import { View, Text, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SPACING } from '../../constants/theme';
import { createWorkoutStyles } from '../../styles/components/workout';

interface RestTimerProps {
  timeLeft: number;
  total: number;
  onStop: () => void;
  onAdjust: (delta: number) => void;
  colors: any;
  workoutStyles: ReturnType<typeof createWorkoutStyles>;
}

export function RestTimer({ timeLeft, total, onStop, onAdjust, colors, workoutStyles }: RestTimerProps) {
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const formatted = `${mins}:${secs.toString().padStart(2, '0')}`;
  const progressPercent = total > 0 ? (timeLeft / total) * 100 : 0;

  // Пульсация в последние 10 секунд
  const isPulsing = timeLeft <= 10 && timeLeft > 0;
  const opacity = isPulsing ? (timeLeft % 2 === 0 ? 1 : 0.4) : 1;

  return (
    <View style={[workoutStyles.workoutTimerContainer, { backgroundColor: colors.warningLight, borderBottomColor: colors.warning + '40' }]}>
      {/* Шапка: ОТДЫХ + крестик */}
      <View style={workoutStyles.workoutTimerHeader}>
        <Text style={[workoutStyles.workoutTimerTitle, { color: colors.warning }]}>
          Отдых
        </Text>
        <TouchableOpacity onPress={onStop} style={workoutStyles.workoutTimerCloseButton}>
          <X size={20} color={colors.warning} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Большие цифры с пульсацией */}
      <Text
        style={[
          workoutStyles.workoutTimerTime,
          {
            color: colors.warning,
            opacity,
          },
        ]}
      >
        {formatted}
      </Text>

      {/* Прогресс-бар */}
      <View style={[workoutStyles.workoutTimerProgressBg, { backgroundColor: colors.border }]}>
        <View
          style={[
            workoutStyles.workoutTimerProgressFill,
            {
              width: `${progressPercent}%`,
              backgroundColor: colors.warning,
            },
          ]}
        />
      </View>

      {/* Кнопки +/- 15 секунд */}
      <View style={workoutStyles.workoutTimerControls}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onAdjust(-15);
          }}
          style={workoutStyles.workoutTimerControlButton}
        >
          <Text style={[workoutStyles.workoutTimerControlText, { color: colors.warning }]}>
            -15с
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onAdjust(15);
          }}
          style={workoutStyles.workoutTimerControlButton}
        >
          <Text style={[workoutStyles.workoutTimerControlText, { color: colors.warning }]}>
            +15с
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}