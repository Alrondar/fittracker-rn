// src/components/cycle/CycleSettingsSheet.tsx
// L2: Настройки цикла (длина лютеиновой фазы)
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { typography } from '../../styles/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { AppButton } from '../ui/AppButton';
import { SheetShell } from '../ui/SheetShell';
import type { CycleSettings } from '../../types/cycle';

interface CycleSettingsSheetProps {
  visible: boolean;
  onClose: () => void;
  settings: CycleSettings;
  onSave: (lutealLength: number) => Promise<void>;
}

export function CycleSettingsSheet({ visible, onClose, settings, onSave }: CycleSettingsSheetProps) {
  const { colors } = useTheme();
  const [lutealLength, setLutealLength] = useState(settings.luteal_length_days.toString());
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const value = parseInt(lutealLength, 10);
    if (value >= 10 && value <= 21) {
      setIsSaving(true);
      try {
        await onSave(value);
        onClose();
      } catch (e) {
        console.error('Ошибка сохранения настроек цикла:', e);
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <SheetShell visible={visible} title="Настройки цикла" onClose={onClose}>
      <View style={{ padding: SPACING.md }}>
        <Text style={[typography.body, { color: colors.textSecondary, marginBottom: SPACING.sm }]}>
          Длина лютеиновой фазы используется для автоматического расчёта овуляции, если вы не указали её вручную.
        </Text>

        <View style={{ marginBottom: SPACING.lg }}>
          <Text style={[typography.label, { color: colors.textPrimary, marginBottom: SPACING.xs }]}>
            Дней (10–21)
          </Text>
          <View style={{ flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap' }}>
            {[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21].map((days) => {
              const isSelected = lutealLength === days.toString();
              return (
                <TouchableOpacity
                  key={days}
                  onPress={() => setLutealLength(days.toString())}
                  style={{
                    paddingHorizontal: SPACING.md,
                    paddingVertical: SPACING.sm,
                    borderRadius: BORDER_RADIUS.full,
                    backgroundColor: isSelected ? colors.primary : colors.surfaceSecondary,
                    borderWidth: 1,
                    borderColor: isSelected ? colors.primary : colors.border,
                  }}
                >
                  <Text
                    style={[
                      typography.label,
                      { color: isSelected ? colors.textInverse : colors.textPrimary },
                    ]}
                  >
                    {days}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <AppButton
          title="Сохранить"
          variant="primary"
          size="large"
          onPress={handleSave}
          loading={isSaving}
        />
        
        <Text style={[typography.caption, { color: colors.textTertiary, marginTop: SPACING.md, textAlign: 'center' }]}>
          ⚠️ Это не медицинская рекомендация. Учитывайте своё самочувствие.
        </Text>
      </View>
    </SheetShell>
  );
}