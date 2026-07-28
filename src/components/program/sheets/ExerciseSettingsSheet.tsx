import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Platform, KeyboardAvoidingView } from 'react-native';
import { X, Plus, Minus, TrendingUp, TrendingDown } from 'lucide-react-native';
import { ProgramExercise } from '../../../services/programsService';
import { SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { typography } from '../../../styles/typography';

interface ExerciseSettingsSheetProps {
  exercise: ProgramExercise | null;
  colors: any;
  buttonStyles: any;
  onSave: (params: any) => void;
  onClose: () => void;
}

export function ExerciseSettingsSheet({ exercise, colors, buttonStyles, onSave, onClose }: ExerciseSettingsSheetProps) {
  const [sets, setSets] = useState(exercise?.sets || 3);
  const [repsRange, setRepsRange] = useState(exercise?.reps_range || '8-12');
  const [restSeconds, setRestSeconds] = useState(exercise?.rest_seconds || 90);
  const [intensity, setIntensity] = useState<'high' | 'medium' | 'low'>((exercise?.intensity as 'high' | 'medium' | 'low') || 'medium');

  const intensities = [
    { value: 'low' as const, label: 'Низкая', color: '#4CAF50', icon: TrendingDown },
    { value: 'medium' as const, label: 'Средняя', color: '#FFC107', icon: Minus },
    { value: 'high' as const, label: 'Высокая', color: '#F44336', icon: TrendingUp },
  ];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: SPACING.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg }}>
            <Text style={[typography.h5, { color: colors.textPrimary }]}>Настройки упражнения</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <View style={{ marginBottom: SPACING.lg }}>
            <Text style={[typography.label, { color: colors.textSecondary, marginBottom: SPACING.md }]}>Подходы</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.lg }}>
              <TouchableOpacity onPress={() => setSets(Math.max(1, sets - 1))} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }}>
                <Minus size={20} color={colors.textPrimary} strokeWidth={2} />
              </TouchableOpacity>
              <Text style={[typography.h3, { color: colors.textPrimary, minWidth: 40, textAlign: 'center' }]}>{sets}</Text>
              <TouchableOpacity onPress={() => setSets(Math.min(10, sets + 1))} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={20} color={colors.textPrimary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ marginBottom: SPACING.lg }}>
            <Text style={[typography.label, { color: colors.textSecondary, marginBottom: SPACING.md }]}>Повторения</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, fontSize: 16, color: colors.textPrimary, backgroundColor: colors.surface }}
              value={repsRange}
              onChangeText={setRepsRange}
              placeholder="например: 8-12"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
          <View style={{ marginBottom: SPACING.lg }}>
            <Text style={[typography.label, { color: colors.textSecondary, marginBottom: SPACING.md }]}>Отдых (секунды)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.lg }}>
              <TouchableOpacity onPress={() => setRestSeconds(Math.max(30, restSeconds - 15))} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }}>
                <Minus size={20} color={colors.textPrimary} strokeWidth={2} />
              </TouchableOpacity>
              <Text style={[typography.h3, { color: colors.textPrimary, minWidth: 60, textAlign: 'center' }]}>{restSeconds}с</Text>
              <TouchableOpacity onPress={() => setRestSeconds(Math.min(300, restSeconds + 15))} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={20} color={colors.textPrimary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ marginBottom: SPACING.lg }}>
            <Text style={[typography.label, { color: colors.textSecondary, marginBottom: SPACING.md }]}>Интенсивность</Text>
            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              {intensities.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => setIntensity(item.value)}
                  style={{
                    flex: 1,
                    padding: SPACING.md,
                    borderRadius: BORDER_RADIUS.md,
                    borderWidth: 2,
                    borderColor: intensity === item.value ? item.color : colors.border,
                    backgroundColor: intensity === item.value ? item.color + '15' : colors.surface,
                    alignItems: 'center',
                  }}
                >
                  <item.icon size={20} color={intensity === item.value ? item.color : colors.textSecondary} strokeWidth={2} />
                  <Text style={[typography.labelBold, { color: intensity === item.value ? item.color : colors.textSecondary, marginTop: SPACING.xs }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TouchableOpacity onPress={() => onSave({ sets, reps_range: repsRange, rest_seconds: restSeconds, intensity })} style={[buttonStyles.primary, { backgroundColor: colors.primary }]}>
            <Text style={buttonStyles.textPrimary}>Сохранить</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}