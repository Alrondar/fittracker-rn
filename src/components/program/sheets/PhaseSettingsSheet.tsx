import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Plus, Minus } from 'lucide-react-native';
import { ProgramPhase } from '../../../services/programsService';
import { PHASE_TYPES, getPhaseColor, PhaseType } from '../../../constants/phaseTypes';
import { SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { typography } from '../../../styles/typography';

interface PhaseSettingsSheetProps {
  phase: ProgramPhase | null;
  colors: any;
  buttonStyles: any;
  onSave: (settings: {
    name: string;
    phase_type: PhaseType;
    weeks_count: number;
    description: string;
  }) => void;
  onClose: () => void;
}

export function PhaseSettingsSheet({
  phase,
  colors,
  buttonStyles,
  onSave,
  onClose,
}: PhaseSettingsSheetProps) {
  const [name, setName] = useState(phase?.name || '');
  const [phaseType, setPhaseType] = useState<PhaseType>(
    (phase?.phase_type as PhaseType) || 'custom',
  );
  const [weeksCount, setWeeksCount] = useState(phase?.weeks_count || 1);
  const [description, setDescription] = useState(phase?.description || '');

  const selectedMeta = PHASE_TYPES.find((p) => p.value === phaseType);

  return (
    <>
      {/* Название */}
      <View style={{ marginBottom: SPACING.lg }}>
        <Text style={[typography.label, { color: colors.textSecondary, marginBottom: SPACING.md }]}>
          Название
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
          value={name}
          onChangeText={setName}
          placeholder="например: Гипертрофия"
          placeholderTextColor={colors.textTertiary}
        />
      </View>

      {/* Тип фазы */}
      <View style={{ marginBottom: SPACING.lg }}>
        <Text style={[typography.label, { color: colors.textSecondary, marginBottom: SPACING.md }]}>
          Тип фазы
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
          {PHASE_TYPES.map((meta) => {
            const isSelected = phaseType === meta.value;
            const phaseColor = getPhaseColor(meta.value, colors);
            const Icon = meta.icon;
            return (
              <TouchableOpacity
                key={meta.value}
                onPress={() => setPhaseType(meta.value)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: SPACING.sm,
                  paddingHorizontal: SPACING.md,
                  borderRadius: BORDER_RADIUS.md,
                  borderWidth: 2,
                  borderColor: isSelected ? phaseColor : colors.border,
                  backgroundColor: isSelected ? phaseColor + '15' : colors.surface,
                }}
              >
                <Icon size={16} color={isSelected ? phaseColor : colors.textSecondary} strokeWidth={2} />
                <Text
                  style={[
                    typography.labelBold,
                    { color: isSelected ? phaseColor : colors.textSecondary },
                  ]}
                >
                  {meta.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {selectedMeta && (
          <Text style={[typography.caption, { color: colors.textTertiary, marginTop: SPACING.sm }]}>
            {selectedMeta.description}
          </Text>
        )}
      </View>

      {/* Длительность */}
      <View style={{ marginBottom: SPACING.lg }}>
        <Text style={[typography.label, { color: colors.textSecondary, marginBottom: SPACING.md }]}>
          Длительность (недель)
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
            onPress={() => setWeeksCount(Math.max(1, weeksCount - 1))}
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
          <Text style={[typography.h3, { color: colors.textPrimary, minWidth: 40, textAlign: 'center' }]}>
            {weeksCount}
          </Text>
          <TouchableOpacity
            onPress={() => setWeeksCount(Math.min(12, weeksCount + 1))}
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

      {/* Описание */}
      <View style={{ marginBottom: SPACING.lg }}>
        <Text style={[typography.label, { color: colors.textSecondary, marginBottom: SPACING.md }]}>
          Описание (опционально)
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
            minHeight: 90,
            textAlignVertical: 'top',
          }}
          value={description}
          onChangeText={setDescription}
          placeholder="Краткое описание фазы"
          placeholderTextColor={colors.textTertiary}
          multiline
        />
      </View>

      {/* Сохранить */}
      <TouchableOpacity
        onPress={() =>
          onSave({
            name: name.trim() || 'Фаза',
            phase_type: phaseType,
            weeks_count: weeksCount,
            description: description.trim(),
          })
        }
        style={[buttonStyles.primary, { backgroundColor: colors.primary }]}
      >
        <Text style={buttonStyles.textPrimary}>Сохранить</Text>
      </TouchableOpacity>
    </>
  );
}