import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { ProgramDay } from '../../../services/programsService';
import { SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { typography } from '../../../styles/typography';

interface DaySettingsSheetProps {
  day: ProgramDay | null;
  colors: any;
  buttonStyles: any;
  onSave: (params: any) => void;
  onClose: () => void;
}

export function DaySettingsSheet({
  day,
  colors,
  buttonStyles,
  onSave,
  onClose,
}: DaySettingsSheetProps) {
  const [dayName, setDayName] = useState(day?.name || '');

  return (
    <>
      <View style={{ marginBottom: SPACING.lg }}>
        <Text
          style={[typography.label, { color: colors.textSecondary, marginBottom: SPACING.md }]}
        >
          Название дня
        </Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BORDER_RADIUS.md,
            padding: SPACING.md,
            fontSize: 16,
            color: colors.textPrimary,
            backgroundColor: colors.surface,
          }}
          value={dayName}
          onChangeText={setDayName}
          placeholder="например: День 1: Push"
          placeholderTextColor={colors.textTertiary}
        />
      </View>

      <TouchableOpacity
        onPress={() => onSave({ name: dayName })}
        style={[buttonStyles.primary, { backgroundColor: colors.primary }]}
      >
        <Text style={buttonStyles.textPrimary}>Сохранить</Text>
      </TouchableOpacity>
    </>
  );
}