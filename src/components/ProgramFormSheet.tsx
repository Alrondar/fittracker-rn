import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Program } from '../services/programsService';
import { Sprout, Dumbbell, Flame } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../constants/theme';
import { typography } from '../styles/typography';
import { LEVEL_COLORS } from '../constants/semanticColors';
import { createCardStyles } from '../styles/components/card';
import { createButtonStyles } from '../styles/components/button';
import { SheetShell } from './ui/SheetShell';

type LevelFilter = 'beginner' | 'intermediate' | 'advanced';

const LEVEL_OPTIONS: { value: LevelFilter; label: string; icon: any }[] = [
  { value: 'beginner', label: 'Новичок', icon: Sprout },
  { value: 'intermediate', label: 'Средний', icon: Dumbbell },
  { value: 'advanced', label: 'Продвинутый', icon: Flame },
];

interface ProgramFormSheetProps {
  editingProgram: Program | null;
  formName: string;
  formDescription: string;
  formDuration: string;
  formLevel: LevelFilter;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
  onFormNameChange: (v: string) => void;
  onFormDescriptionChange: (v: string) => void;
  onFormDurationChange: (v: string) => void;
  onFormLevelChange: (v: LevelFilter) => void;
  colors: any;
  cardStyles: ReturnType<typeof createCardStyles>;
  buttonStyles: ReturnType<typeof createButtonStyles>;
}

export function ProgramFormSheet({
  editingProgram,
  formName,
  formDescription,
  formDuration,
  formLevel,
  saving,
  onSave,
  onClose,
  onFormNameChange,
  onFormDescriptionChange,
  onFormDurationChange,
  onFormLevelChange,
  colors,
  cardStyles,
  buttonStyles,
}: ProgramFormSheetProps) {
  return (
    <SheetShell
      title={editingProgram ? 'Редактировать программу' : 'Новая программа'}
      onClose={onClose}
    >
      <View style={{ gap: SPACING.lg }}>
        <View style={cardStyles.sheetField}>
          <Text style={cardStyles.sheetLabel}>Название *</Text>
          <TextInput
            style={cardStyles.sheetInput}
            value={formName}
            onChangeText={onFormNameChange}
            placeholder="Например: PPL на 8 недель"
            placeholderTextColor={colors.textTertiary}
          />
        </View>
        <View style={cardStyles.sheetField}>
          <Text style={cardStyles.sheetLabel}>Описание</Text>
          <TextInput
            style={cardStyles.sheetTextarea}
            value={formDescription}
            onChangeText={onFormDescriptionChange}
            placeholder="Краткое описание программы..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
          />
        </View>
        <View style={cardStyles.sheetField}>
          <Text style={cardStyles.sheetLabel}>Недель</Text>
          <TextInput
            style={cardStyles.sheetInput}
            value={formDuration}
            onChangeText={onFormDurationChange}
            placeholder="8"
            placeholderTextColor={colors.textTertiary}
            keyboardType="number-pad"
          />
        </View>
        {/* Сегментированный контрол уровня — ARCH-3 ✅ (LEVEL_COLORS) */}
        <View style={cardStyles.sheetField}>
          <Text style={cardStyles.sheetLabel}>Уровень</Text>
          <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
            {LEVEL_OPTIONS.map((option) => {
              const isSelected = formLevel === option.value;
              const levelColor = LEVEL_COLORS[option.value];
              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => onFormLevelChange(option.value)}
                  style={{
                    flex: 1,
                    paddingVertical: SPACING.md,
                    paddingHorizontal: SPACING.sm,
                    borderRadius: BORDER_RADIUS.md,
                    borderWidth: 2,
                    borderColor: isSelected ? levelColor : colors.border,
                    backgroundColor: isSelected ? levelColor + '15' : colors.surface,
                    alignItems: 'center',
                  }}
                  activeOpacity={0.7}
                >
                  <option.icon
                    size={20}
                    color={isSelected ? levelColor : colors.textTertiary}
                    strokeWidth={2}
                  />
                  <Text
                    style={{
                      marginTop: 4,
                      fontSize: 11,
                      fontWeight: '600',
                      color: isSelected ? levelColor : colors.textSecondary,
                      textAlign: 'center',
                    }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <TouchableOpacity
          style={[
            buttonStyles.primary,
            {
              backgroundColor: saving ? colors.textTertiary : colors.primary,
              marginTop: SPACING.lg,
            },
          ]}
          onPress={onSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={buttonStyles.textPrimary}>
              {editingProgram ? 'Сохранить изменения' : 'Создать программу'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SheetShell>
  );
}