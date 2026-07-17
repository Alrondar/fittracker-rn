import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { typography } from '../../../styles/typography';

interface ScheduleEditorSheetProps {
  schedule: string[];
  onSave: (schedule: string[]) => void;
  onClose: () => void;
  colors: any;
  buttonStyles: any;
  badgeStyles: any;
}

const WEEKDAYS = [
  { value: 'Пн', label: 'Понедельник', short: 'Пн' },
  { value: 'Вт', label: 'Вторник', short: 'Вт' },
  { value: 'Ср', label: 'Среда', short: 'Ср' },
  { value: 'Чт', label: 'Четверг', short: 'Чт' },
  { value: 'Пт', label: 'Пятница', short: 'Пт' },
  { value: 'Сб', label: 'Суббота', short: 'Сб' },
  { value: 'Вс', label: 'Воскресенье', short: 'Вс' },
];

export function ScheduleEditorSheet({
  schedule,
  onSave,
  onClose,
  colors,
  buttonStyles,
  badgeStyles,
}: ScheduleEditorSheetProps) {
  const [selectedDays, setSelectedDays] = useState<string[]>(schedule || []);

  const toggleDay = (day: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const selectAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedDays(WEEKDAYS.map((d) => d.value));
  };

  const clearAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedDays([]);
  };

  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
      <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: SPACING.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg }}>
          <Text style={[typography.h5, { color: colors.textPrimary }]}>Расписание тренировок</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={20} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <Text style={[typography.body, { color: colors.textSecondary, marginBottom: SPACING.lg }]}>
          Выберите дни недели, в которые будут проходить тренировки
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg }}>
          {WEEKDAYS.map((day) => {
            const isSelected = selectedDays.includes(day.value);
            return (
              <TouchableOpacity
                key={day.value}
                onPress={() => toggleDay(day.value)}
                style={{
                  flex: 1,
                  minWidth: 70,
                  padding: SPACING.md,
                  borderRadius: BORDER_RADIUS.md,
                  borderWidth: 2,
                  borderColor: isSelected ? colors.primary : colors.border,
                  backgroundColor: isSelected ? colors.primary + '20' : colors.surfaceSecondary,
                  alignItems: 'center',
                }}
              >
                <Text style={[typography.h4, { color: isSelected ? colors.primary : colors.textSecondary, fontWeight: '700' }]}>
                  {day.short}
                </Text>
                <Text style={[typography.captionSmall, { color: isSelected ? colors.primary : colors.textTertiary, marginTop: 2 }]}>
                  {day.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg }}>
          <TouchableOpacity
            onPress={selectAll}
            style={{ flex: 1, padding: SPACING.sm, borderRadius: BORDER_RADIUS.md, backgroundColor: colors.surfaceSecondary, alignItems: 'center' }}
          >
            <Text style={[typography.labelBold, { color: colors.primary }]}>Выбрать все</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={clearAll}
            style={{ flex: 1, padding: SPACING.sm, borderRadius: BORDER_RADIUS.md, backgroundColor: colors.surfaceSecondary, alignItems: 'center' }}
          >
            <Text style={[typography.labelBold, { color: colors.error }]}>Очистить</Text>
          </TouchableOpacity>
        </View>
        {selectedDays.length > 0 && (
          <View style={{ backgroundColor: colors.primaryLight, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.lg }}>
            <Text style={[typography.caption, { color: colors.primary, marginBottom: SPACING.sm, fontWeight: '600' }]}>
              Выбрано: {selectedDays.length} дн/нед
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
              {selectedDays
                .sort((a, b) => WEEKDAYS.findIndex((d) => d.value === a) - WEEKDAYS.findIndex((d) => d.value === b))
                .map((day) => (
                  <View key={day} style={badgeStyles.dayChip}>
                    <Text style={badgeStyles.dayChipText}>{day}</Text>
                  </View>
                ))}
            </View>
          </View>
        )}
        <TouchableOpacity
          onPress={() => onSave(selectedDays)}
          disabled={selectedDays.length === 0}
          style={[
            buttonStyles.primary,
            {
              backgroundColor: selectedDays.length === 0 ? colors.textTertiary : colors.primary,
              opacity: selectedDays.length === 0 ? 0.5 : 1,
            },
          ]}
        >
          <Text style={buttonStyles.textPrimary}>
            {selectedDays.length === 0 ? 'Выберите хотя бы один день' : 'Сохранить расписание'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}