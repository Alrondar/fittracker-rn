import { useEffect, useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { BORDER_RADIUS, SPACING } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { AppButton } from '../ui/AppButton';
import { AppInput } from '../ui/AppInput';
import {
  BODY_PARTS,
  INJURY_TYPES,
  SEVERITY_LEVELS,
  getSeverityColor,
  getSeverityLabel,
  type Severity,
} from './injuryOptions';
import type { Injury, InjuryInput } from '../../services/injuriesService';
import { Circle, Save, X } from 'lucide-react-native';

interface InjuryFormSheetProps {
  visible: boolean;
  editingInjury: Injury | null;
  saving: boolean;
  onClose: () => void;
  onSave: (input: InjuryInput, editingId: string | null) => void;
}

export function InjuryFormSheet({
  visible,
  editingInjury,
  saving,
  onClose,
  onSave,
}: InjuryFormSheetProps) {
  const { colors } = useTheme();

  const [bodyPart, setBodyPart] = useState('');
  const [injuryType, setInjuryType] = useState('');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (visible) {
      setBodyPart(editingInjury?.body_part || '');
      setInjuryType(editingInjury?.injury_type || '');
      setSeverity((editingInjury?.severity as Severity) || 'medium');
      setDescription(editingInjury?.description || '');
      setNotes(editingInjury?.notes || '');
    }
  }, [visible, editingInjury]);

  const handleSave = () => {
    onSave(
      { body_part: bodyPart, injury_type: injuryType, severity, description, notes },
      editingInjury?.id ?? null
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.textPrimary + '80', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '90%',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: SPACING.xl,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={[typography.h3, { color: colors.textPrimary }]}>
              {editingInjury ? 'Редактировать травму' : 'Добавить травму'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
            {/* Часть тела */}
            <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
              Часть тела *
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg }}>
              {BODY_PARTS.map((bp) => (
                <TouchableOpacity
                  key={bp.value}
                  onPress={() => setBodyPart(bp.value)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: SPACING.md,
                    paddingVertical: SPACING.sm,
                    borderRadius: BORDER_RADIUS.md,
                    borderWidth: 1,
                    borderColor: bodyPart === bp.value ? bp.color : colors.border,
                    backgroundColor: bodyPart === bp.value ? bp.color + '20' : colors.surface,
                  }}
                >
                  <Circle
                    size={14}
                    color={bp.color}
                    fill={bodyPart === bp.value ? bp.color : 'transparent'}
                    strokeWidth={2}
                    style={{ marginRight: SPACING.xs }}
                  />
                  <Text
                    style={[
                      typography.caption,
                      { color: bodyPart === bp.value ? bp.color : colors.textPrimary },
                    ]}
                  >
                    {bp.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Тип травмы */}
            <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
              Тип травмы *
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg }}>
              {INJURY_TYPES.map((it) => (
                <TouchableOpacity
                  key={it.value}
                  onPress={() => setInjuryType(it.value)}
                  style={{
                    paddingHorizontal: SPACING.md,
                    paddingVertical: SPACING.sm,
                    borderRadius: BORDER_RADIUS.md,
                    borderWidth: 1,
                    borderColor: injuryType === it.value ? colors.primary : colors.border,
                    backgroundColor: injuryType === it.value ? colors.primaryLight : colors.surface,
                  }}
                >
                  <Text
                    style={[
                      typography.caption,
                      { color: injuryType === it.value ? colors.primary : colors.textPrimary },
                    ]}
                  >
                    {it.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Тяжесть */}
            <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
              Тяжесть
            </Text>
            <View style={{ flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg }}>
              {SEVERITY_LEVELS.map((level) => {
                const levelColor = getSeverityColor(level, colors.textSecondary);
                return (
                  <TouchableOpacity
                    key={level}
                    onPress={() => setSeverity(level)}
                    style={{
                      flex: 1,
                      paddingVertical: SPACING.md,
                      borderRadius: BORDER_RADIUS.md,
                      borderWidth: 2,
                      borderColor: severity === level ? levelColor : colors.border,
                      backgroundColor: severity === level ? levelColor + '20' : colors.surface,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={[
                        typography.labelBold,
                        { color: severity === level ? levelColor : colors.textSecondary },
                      ]}
                    >
                      {getSeverityLabel(level)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Описание */}
            <AppInput
              label="Описание"
              placeholder="Опишите травму..."
              value={description}
              onChangeText={setDescription}
              multiline
              style={{ minHeight: 80, textAlignVertical: 'top', marginBottom: SPACING.lg }}
            />

            {/* Заметки */}
            <AppInput
              label="Заметки"
              placeholder="Дополнительная информация..."
              value={notes}
              onChangeText={setNotes}
              multiline
              style={{ minHeight: 80, textAlignVertical: 'top', marginBottom: SPACING.xl }}
            />

            {/* Кнопки */}
            <View style={{ flexDirection: 'row', gap: SPACING.md }}>
              <AppButton
                title="Отмена"
                variant="secondary"
                size="medium"
                onPress={onClose}
                style={{ flex: 1 }}
              />
              <AppButton
                title={editingInjury ? 'Сохранить' : 'Добавить'}
                variant="primary"
                size="medium"
                icon={<Save size={20} color={colors.textInverse} />}
                loading={saving}
                disabled={saving || !bodyPart || !injuryType}
                onPress={handleSave}
                style={{ flex: 2 }}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}