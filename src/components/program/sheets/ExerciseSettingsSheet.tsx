import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Plus, Minus, TrendingUp, TrendingDown, Target } from 'lucide-react-native';
import { ProgramExercise } from '../../../services/programsService';
import { FONT_FAMILIES } from '../../../constants/fonts';
import { ProgressionPolicy } from '../../../types/workout';
import { SPACING, BORDER_RADIUS, withAlpha } from '../../../constants/theme';
import { typography } from '../../../styles/typography';

interface ExerciseSettingsSheetProps {
  exercise: ProgramExercise | null;
  colors: any;
  buttonStyles: any;
  onSave: (params: any) => void;
  onClose: () => void;
}

export function ExerciseSettingsSheet({
  exercise,
  colors,
  buttonStyles,
  onSave,
  onClose: _onClose,
}: ExerciseSettingsSheetProps) {
  const [sets, setSets] = useState(exercise?.sets || 3);
  const [repsRange, setRepsRange] = useState(exercise?.reps_range || '8-12');
  const [targetRpe, setTargetRpe] = useState<number | null>(exercise?.target_rpe || null);
  const [restSeconds, setRestSeconds] = useState(exercise?.rest_seconds || 90);
  const [intensity, setIntensity] = useState<'high' | 'medium' | 'low'>(
    (exercise?.intensity as 'high' | 'medium' | 'low') || 'medium'
  );
  const [progressionPolicy, setProgressionPolicy] = useState<ProgressionPolicy>(
    (exercise?.progression_policy as ProgressionPolicy) || 'linear'
  );

  const policies: { value: ProgressionPolicy; label: string; description: string }[] = [
    { value: 'linear', label: 'Линейная', description: 'Достиг повторов → повысил вес' },
    { value: 'double_progression', label: 'Двойная', description: 'Сначала повторы, потом вес' },
    { value: 'greyskull', label: 'Greyskull', description: '2 рабочих + 1 на максимум' },
    { value: 'time_based', label: 'Время', description: 'Прогрессия за счёт времени' },
  ];

  const intensities = [
    { value: 'low' as const, label: 'Низкая', color: colors.success, icon: TrendingDown },
    { value: 'medium' as const, label: 'Средняя', color: colors.warning, icon: Minus },
    { value: 'high' as const, label: 'Высокая', color: colors.error, icon: TrendingUp },
  ];

  return (
    <>
      {/* Подходы */}
      <View style={{ marginBottom: SPACING.lg }}>
        <Text style={[typography.label, { color: colors.textSecondary, marginBottom: SPACING.md }]}>
          Подходы
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: SPACING.lg,
          }}
        >
          <TouchableOpacity
            onPress={() => setSets(Math.max(1, sets - 1))}
            accessibilityRole="button"
            accessibilityLabel="Уменьшить количество подходов"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.surfaceSecondary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Minus size={20} color={colors.textPrimary} strokeWidth={2} />
          </TouchableOpacity>
          <Text
            style={[
              typography.h3,
              { color: colors.textPrimary, minWidth: 40, textAlign: 'center' },
            ]}
          >
            {sets}
          </Text>
          <TouchableOpacity
            onPress={() => setSets(Math.min(10, sets + 1))}
            accessibilityRole="button"
            accessibilityLabel="Увеличить количество подходов"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.surfaceSecondary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Plus size={20} color={colors.textPrimary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Повторения */}
      <View style={{ marginBottom: SPACING.lg }}>
        <Text style={[typography.label, { color: colors.textSecondary, marginBottom: SPACING.md }]}>
          Повторения
        </Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BORDER_RADIUS.md,
            padding: SPACING.md,
            fontSize: 16,
            fontFamily: FONT_FAMILIES.textMedium,
            color: colors.textPrimary,
            backgroundColor: colors.surface,
          }}
          value={repsRange}
          onChangeText={setRepsRange}
          placeholder="например: 8-12"
          placeholderTextColor={colors.textTertiary}
        />
      </View>

      {/* Целевой RPE (Фича 2) */}
      <View style={{ marginBottom: SPACING.lg }}>
        <Text style={[typography.label, { color: colors.textSecondary, marginBottom: SPACING.md }]}>
          Целевой RPE (опционально)
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: SPACING.lg,
          }}
        >
          <TouchableOpacity
            onPress={() => setTargetRpe((prev) => (prev != null && prev > 1 ? prev - 1 : null))}
            accessibilityRole="button"
            accessibilityLabel="Снизить целевой RPE или сбросить"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.surfaceSecondary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Minus size={20} color={colors.textPrimary} strokeWidth={2} />
          </TouchableOpacity>
          <Text
            style={[
              typography.h3,
              {
                color: targetRpe != null ? colors.primary : colors.textTertiary,
                minWidth: 40,
                textAlign: 'center',
              },
            ]}
          >
            {targetRpe != null ? targetRpe : '—'}
          </Text>
          <TouchableOpacity
            onPress={() => setTargetRpe((prev) => (prev != null && prev < 10 ? prev + 1 : 1))}
            accessibilityRole="button"
            accessibilityLabel="Увеличить целевой RPE"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.surfaceSecondary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Plus size={20} color={colors.textPrimary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <Text
          style={[
            typography.captionSmall,
            { color: colors.textTertiary, marginTop: SPACING.xs, textAlign: 'center' },
          ]}
        >
          {targetRpe != null
            ? `Движок предложит прогресс, если RPE будет ≤ ${targetRpe - 2}`
            : 'Без RPE прогрессия считается только по повторениям'}
        </Text>
      </View>

      {/* Отдых */}
      <View style={{ marginBottom: SPACING.lg }}>
        <Text style={[typography.label, { color: colors.textSecondary, marginBottom: SPACING.md }]}>
          Отдых (секунды)
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: SPACING.lg,
          }}
        >
          <TouchableOpacity
            onPress={() => setRestSeconds(Math.max(30, restSeconds - 15))}
            accessibilityRole="button"
            accessibilityLabel="Уменьшить время отдыха на 15 секунд"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.surfaceSecondary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Minus size={20} color={colors.textPrimary} strokeWidth={2} />
          </TouchableOpacity>
          <Text
            style={[
              typography.h3,
              { color: colors.textPrimary, minWidth: 60, textAlign: 'center' },
            ]}
          >
            {restSeconds}с
          </Text>
          <TouchableOpacity
            onPress={() => setRestSeconds(Math.min(300, restSeconds + 15))}
            accessibilityRole="button"
            accessibilityLabel="Увеличить время отдыха на 15 секунд"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.surfaceSecondary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Plus size={20} color={colors.textPrimary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Политика прогрессии (P1.1) */}
      <View style={{ marginBottom: SPACING.lg }}>
        <Text style={[typography.label, { color: colors.textSecondary, marginBottom: SPACING.md }]}>
          Политика прогрессии
        </Text>
        <View style={{ gap: SPACING.sm }}>
          {policies.map((item) => (
            <TouchableOpacity
              key={item.value}
              onPress={() => setProgressionPolicy(item.value)}
              accessibilityRole="button"
              accessibilityLabel={`Политика прогрессии: ${item.label}${progressionPolicy === item.value ? ', выбрано' : ''}`}
              accessibilityState={{ selected: progressionPolicy === item.value }}
              style={{
                padding: SPACING.md,
                borderRadius: BORDER_RADIUS.md,
                borderWidth: 2,
                borderColor: progressionPolicy === item.value ? colors.primary : colors.border,
                backgroundColor:
                  progressionPolicy === item.value
                    ? withAlpha(colors.primary, 0.082)
                    : colors.surface,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                <Target
                  size={16}
                  color={progressionPolicy === item.value ? colors.primary : colors.textSecondary}
                  strokeWidth={2}
                />
                <Text
                  style={[
                    typography.labelBold,
                    {
                      color:
                        progressionPolicy === item.value ? colors.primary : colors.textSecondary,
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </View>
              <Text
                style={[
                  typography.captionSmall,
                  { color: colors.textTertiary, marginTop: SPACING.xs },
                ]}
              >
                {item.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Интенсивность */}
      <View style={{ marginBottom: SPACING.lg }}>
        <Text style={[typography.label, { color: colors.textSecondary, marginBottom: SPACING.md }]}>
          Интенсивность
        </Text>
        <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
          {intensities.map((item) => (
            <TouchableOpacity
              key={item.value}
              onPress={() => setIntensity(item.value)}
              accessibilityRole="button"
              accessibilityLabel={`Интенсивность: ${item.label}${intensity === item.value ? ', выбрано' : ''}`}
              accessibilityState={{ selected: intensity === item.value }}
              style={{
                flex: 1,
                padding: SPACING.md,
                borderRadius: BORDER_RADIUS.md,
                borderWidth: 2,
                borderColor: intensity === item.value ? item.color : colors.border,
                backgroundColor:
                  intensity === item.value ? withAlpha(item.color, 0.082) : colors.surface,
                alignItems: 'center',
              }}
            >
              <item.icon
                size={20}
                color={intensity === item.value ? item.color : colors.textSecondary}
                strokeWidth={2}
              />
              <Text
                style={[
                  typography.labelBold,
                  {
                    color: intensity === item.value ? item.color : colors.textSecondary,
                    marginTop: SPACING.xs,
                  },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Сохранить */}
      <TouchableOpacity
        onPress={() =>
          onSave({
            sets,
            reps_range: repsRange,
            target_rpe: targetRpe,
            rest_seconds: restSeconds,
            intensity,
            progression_policy: progressionPolicy,
          })
        }
        accessibilityRole="button"
        accessibilityLabel="Сохранить настройки упражнения"
        style={[buttonStyles.primary, { backgroundColor: colors.primary }]}
      >
        <Text style={buttonStyles.textPrimary}>Сохранить</Text>
      </TouchableOpacity>
    </>
  );
}
