// src/components/cycle/CycleCheckInSheet.tsx
// L2: Единый Bottom Sheet для ввода событий цикла (менструация/овуляция)
import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Droplet, Egg } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { typography } from '../../styles/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { AppButton } from '../ui/AppButton';
import { SheetShell } from '../ui/SheetShell';
import type { CycleEvent, CycleEventType } from '../../types/cycle';

interface CycleCheckInSheetProps {
  visible: boolean;
  onClose: () => void;
  events: CycleEvent[];
  onSave: (eventType: CycleEventType, date: string, isStart: boolean) => Promise<void>;
  onDelete?: (eventId: string) => Promise<void>;
  defaultDate?: string;
}

export function CycleCheckInSheet({
  visible,
  onClose,
  events,
  onSave,
  onDelete,
  defaultDate = new Date().toISOString().split('T')[0],
}: CycleCheckInSheetProps) {
  const { colors } = useTheme();
  const [selectedType, setSelectedType] = useState<CycleEventType | null>(null);
  const [isStart, setIsStart] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Проверяем, есть ли уже событие этого типа на выбранную дату
  const existingEvent = useMemo(() => {
    if (!selectedType) return null;
    return events.find(
      (e) => e.event_type === selectedType && e.event_date === defaultDate
    );
  }, [events, selectedType, defaultDate]);

  const handleSave = async () => {
    if (!selectedType) return;
    setIsSaving(true);
    try {
      await onSave(selectedType, defaultDate, isStart);
      onClose();
      setSelectedType(null);
      setIsStart(true);
    } catch (e) {
      console.error('Ошибка сохранения события цикла:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingEvent || !onDelete) return;
    setIsSaving(true);
    try {
      await onDelete(existingEvent.id);
      onClose();
      setSelectedType(null);
      setIsStart(true);
    } catch (e) {
      console.error('Ошибка удаления события цикла:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SheetShell visible={visible} title="Отметить событие цикла" onClose={onClose}>
      <View style={{ padding: SPACING.md }}>
        {/* Выбор типа события */}
        <View style={{ flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg }}>
          <TouchableOpacity
            onPress={() => {
              setSelectedType('menstruation_start');
              setIsStart(true);
            }}
            style={{
              flex: 1,
              padding: SPACING.md,
              borderRadius: BORDER_RADIUS.md,
              borderWidth: 2,
              borderColor: selectedType?.includes('menstruation') ? colors.error : colors.border,
              backgroundColor: selectedType?.includes('menstruation') ? colors.error + '1A' : colors.surface,
              alignItems: 'center',
            }}
          >
            <Droplet size={24} color={selectedType?.includes('menstruation') ? colors.error : colors.textSecondary} style={{ marginBottom: SPACING.xs }} />
            <Text
              style={[
                typography.labelBold,
                { color: selectedType?.includes('menstruation') ? colors.error : colors.textPrimary },
              ]}
            >
              Менструация
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setSelectedType('ovulation_start');
              setIsStart(true);
            }}
            style={{
              flex: 1,
              padding: SPACING.md,
              borderRadius: BORDER_RADIUS.md,
              borderWidth: 2,
              borderColor: selectedType?.includes('ovulation') ? colors.warning : colors.border,
              backgroundColor: selectedType?.includes('ovulation') ? colors.warning + '1A' : colors.surface,
              alignItems: 'center',
            }}
          >
            <Egg size={24} color={selectedType?.includes('ovulation') ? colors.warning : colors.textSecondary} style={{ marginBottom: SPACING.xs }} />
            <Text
              style={[
                typography.labelBold,
                { color: selectedType?.includes('ovulation') ? colors.warning : colors.textPrimary },
              ]}
            >
              Овуляция
            </Text>
          </TouchableOpacity>
        </View>

        {selectedType && (
          <>
            {/* Переключатель Начало / Конец */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: colors.surfaceSecondary,
                borderRadius: BORDER_RADIUS.full,
                padding: 4,
                marginBottom: SPACING.lg,
              }}
            >
              <TouchableOpacity
                onPress={() => setIsStart(true)}
                style={{
                  flex: 1,
                  paddingVertical: SPACING.sm,
                  borderRadius: BORDER_RADIUS.full,
                  backgroundColor: isStart ? colors.primary : 'transparent',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={[
                    typography.label,
                    { color: isStart ? colors.textInverse : colors.textSecondary },
                  ]}
                >
                  Начало
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsStart(false)}
                style={{
                  flex: 1,
                  paddingVertical: SPACING.sm,
                  borderRadius: BORDER_RADIUS.full,
                  backgroundColor: !isStart ? colors.primary : 'transparent',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={[
                    typography.label,
                    { color: !isStart ? colors.textInverse : colors.textSecondary },
                  ]}
                >
                  Конец
                </Text>
              </TouchableOpacity>
            </View>

            {/* Дата */}
            <View style={{ marginBottom: SPACING.lg }}>
              <Text style={[typography.label, { color: colors.textSecondary, marginBottom: SPACING.xs }]}>
                Дата
              </Text>
              <View
                style={{
                  padding: SPACING.md,
                  borderRadius: BORDER_RADIUS.md,
                  backgroundColor: colors.surfaceSecondary,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={[typography.body, { color: colors.textPrimary }]}>
                  {new Date(defaultDate).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              <Text style={[typography.caption, { color: colors.textTertiary, marginTop: SPACING.xs }]}>
                * В текущей версии дата фиксируется на сегодня. Выбор даты через календарь будет добавлен позже.
              </Text>
            </View>

            {/* Кнопки действий */}
            <View style={{ gap: SPACING.sm }}>
              <AppButton
                title={existingEvent ? 'Обновить отметку' : 'Сохранить'}
                variant="primary"
                size="large"
                onPress={handleSave}
                loading={isSaving}
              />
              {existingEvent && onDelete && (
                <AppButton
                  title="Удалить отметку"
                  variant="danger"
                  size="large"
                  onPress={handleDelete}
                  loading={isSaving}
                />
              )}
            </View>
          </>
        )}
      </View>
    </SheetShell>
  );
}