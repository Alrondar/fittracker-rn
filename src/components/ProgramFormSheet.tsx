import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { Program } from '../services/programsService';
import { Sprout, Dumbbell, Flame, X, ChevronDown } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../constants/theme';
import { typography } from '../styles/typography';
import { createCardStyles } from '../styles/components/card';
import { createButtonStyles } from '../styles/components/button';

type LevelFilter = 'beginner' | 'intermediate' | 'advanced';

const LEVEL_OPTIONS: { value: LevelFilter; label: string; icon: any; color: string }[] = [
  { value: 'beginner', label: 'Новичок', icon: Sprout, color: '#4CAF50' },
  { value: 'intermediate', label: 'Средний', icon: Dumbbell, color: '#FF9800' },
  { value: 'advanced', label: 'Продвинутый', icon: Flame, color: '#F44336' },
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
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <TouchableWithoutFeedback onPress={() => {}}>
          <View style={[cardStyles.sheetContainer, { maxHeight: '90%' }]}>
            <View style={cardStyles.sheetHeader}>
              <Text style={cardStyles.sheetTitle}>
                {editingProgram ? 'Редактировать программу' : 'Новая программа'}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: SPACING.lg }}>
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

              {/* Сегментированный контрол уровня */}
              <View style={cardStyles.sheetField}>
                <Text style={cardStyles.sheetLabel}>Уровень</Text>
                <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                  {LEVEL_OPTIONS.map((option) => {
                    const isSelected = formLevel === option.value;
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
                          borderColor: isSelected ? option.color : colors.border,
                          backgroundColor: isSelected ? option.color + '15' : colors.surface,
                          alignItems: 'center',
                        }}
                        activeOpacity={0.7}
                      >
                        <option.icon
                          size={20}
                          color={isSelected ? option.color : colors.textTertiary}
                          strokeWidth={2}
                        />
                        <Text
                          style={{
                            marginTop: 4,
                            fontSize: 11,
                            fontWeight: '600',
                            color: isSelected ? option.color : colors.textSecondary,
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
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  );
}