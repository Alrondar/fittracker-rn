import { View, Text, TouchableOpacity } from 'react-native';
import { SPACING } from '../../constants/theme';
import { createCardStyles } from '../../styles/components/card';

interface RestTimerProps {
  timeLeft: number;
  onStop: () => void;
  colors: any;
  cardStyles: ReturnType<typeof createCardStyles>;
}

export function RestTimer({ timeLeft, onStop, colors, cardStyles }: RestTimerProps) {
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const formatted = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <View style={[cardStyles.workoutTimerContainer, { backgroundColor: colors.warningLight, borderBottomColor: colors.warning }]}>
      <Text style={[cardStyles.workoutTimerText, { color: colors.warning }]}>Отдых</Text>
      <Text style={[cardStyles.workoutTimerTime, { color: colors.warning }]}>{formatted}</Text>
      <TouchableOpacity style={[cardStyles.workoutTimerButton, { backgroundColor: colors.warning }]} onPress={onStop}>
        <Text style={cardStyles.workoutTimerButtonText}>Пропустить</Text>
      </TouchableOpacity>
    </View>
  );
}