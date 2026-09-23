// app/profile/metrics.tsx split (DA-P2-8): sheet добавления замера (FEAT-2.2: поля по группам).
import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { SPACING } from '../../../constants/theme';
import { typography } from '../../../styles/typography';
import { AppButton } from '../../ui/AppButton';
import { AppInput } from '../../ui/AppInput';
import { SheetShell } from '../../ui/SheetShell';
import { METRIC_FIELDS, METRIC_GROUPS, MetricFormData, MetricGroup } from '../../../types/metrics';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreate: (data: MetricFormData, options?: { onSuccess?: () => void }) => void;
  isCreating: boolean;
}

const emptyForm = (): MetricFormData => ({
  metric_date: new Date().toISOString().split('T')[0],
  weight_kg: '',
  shoulder_cm: '',
  chest_cm: '',
  waist_cm: '',
  abdomen_cm: '',
  hips_cm: '',
  neck_cm: '',
  biceps_left_cm: '',
  biceps_right_cm: '',
  forearm_left_cm: '',
  forearm_right_cm: '',
  thigh_left_cm: '',
  thigh_right_cm: '',
  thigh_cm: '',
  calf_left_cm: '',
  calf_right_cm: '',
  arm_cm: '',
  notes: '',
});

export function MetricAddSheet({ visible, onClose, onCreate, isCreating }: Props) {
  const { colors } = useTheme();
  const [formData, setFormData] = useState<MetricFormData>(emptyForm);

  const handleSave = () => {
    if (!formData.weight_kg) {
      Alert.alert('Ошибка', 'Вес является обязательным полем');
      return;
    }
    onCreate(formData, {
      onSuccess: () => {
        onClose();
        setFormData(emptyForm());
      },
    });
  };

  return (
    <SheetShell visible={visible} title="Новый замер" onClose={onClose}>
      <AppInput
        label="Дата"
        value={formData.metric_date}
        onChangeText={(text) => setFormData({ ...formData, metric_date: text })}
      />
      {(Object.keys(METRIC_GROUPS) as MetricGroup[]).map((group) => (
        <View key={group}>
          <Text
            style={[
              typography.labelBold,
              { color: colors.textSecondary, marginTop: SPACING.md, marginBottom: SPACING.xs },
            ]}
          >
            {METRIC_GROUPS[group]}
          </Text>
          {METRIC_FIELDS.filter((f) => f.group === group).map((field) => (
            <AppInput
              key={field.key}
              label={`${field.label} (${field.unit})`}
              placeholder="0"
              value={formData[field.key]}
              onChangeText={(text) => setFormData({ ...formData, [field.key]: text })}
              keyboardType="decimal-pad"
            />
          ))}
        </View>
      ))}
      <AppInput
        label="Заметки"
        placeholder="Самочувствие, условия замера..."
        value={formData.notes}
        onChangeText={(text) => setFormData({ ...formData, notes: text })}
        multiline
        style={{ minHeight: 80, textAlignVertical: 'top' }}
      />
      <AppButton
        title={isCreating ? 'Сохранение...' : 'Сохранить замер'}
        variant="primary"
        size="large"
        loading={isCreating}
        disabled={isCreating}
        onPress={handleSave}
        style={{ marginTop: SPACING.md }}
      />
    </SheetShell>
  );
}
