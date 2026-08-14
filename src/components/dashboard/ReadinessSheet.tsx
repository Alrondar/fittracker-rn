// src/components/dashboard/ReadinessSheet.tsx
// FEAT-1.8: чек-ин состояния перед тренировкой (раз в день).
import React, { useState, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SheetShell } from '../ui/SheetShell';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { readinessService } from '../../services/readinessService';

const SCALE = [1, 2, 3, 4, 5];

function ScaleRow({
  label,
  value,
  onChange,
  colors,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  colors: any;
}) {
  return (
    <View style={{ marginBottom: SPACING.md }}>
      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: SPACING.xs }]}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', gap: SPACING.xs }}>
        {SCALE.map((v) => {
          const active = value === v;
          return (
            <TouchableOpacity
              key={v}
              onPress={() => onChange(v)}
              style={{
                flex: 1,
                paddingVertical: SPACING.sm,
                borderRadius: BORDER_RADIUS.md,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? colors.primary + '20' : colors.surfaceSecondary,
              }}
            >
              <Text
                style={[
                  typography.captionSmall,
                  { color: active ? colors.primary : colors.textSecondary, fontWeight: '700', textAlign: 'center' },
                ]}
              >
                {v}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

interface ReadinessSheetProps {
  visible: boolean;
  userId: string | null;
  onDone: (proceed: boolean) => void;
}

export function ReadinessSheet({ visible, userId, onDone }: ReadinessSheetProps) {
  const { colors } = useTheme();
  const [sleepHours, setSleepHours] = useState('7');
  const [sleepQuality, setSleepQuality] = useState(3);
  const [fatigue, setFatigue] = useState(3);
  const [soreness, setSoreness] = useState(3);
  const [stress, setStress] = useState(3);
  const [saving, setSaving] = useState(false);

  // готовность: качество сна + инверсии усталости/боли/стресса
  const readiness = Math.round(
    (sleepQuality + (6 - fatigue) + (6 - soreness) + (6 - stress)) / 4,
  );
  const readinessColor =
    readiness <= 2 ? colors.error : readiness === 3 ? colors.warning : colors.success;

  const handleSave = useCallback(async () => {
    if (!userId) {
      onDone(true);
      return;
    }
    setSaving(true);
    try {
      await readinessService.upsertToday(userId, {
        sleepHours: parseFloat(sleepHours.replace(',', '.')) || null,
        sleepQuality,
        fatigue,
        soreness,
        stress,
        readiness,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (readiness <= 2) {
        Alert.alert(
          'Готовность низкая',
          'Сегодня лучше снизить рабочие веса ~на 10% или выбрать лёгкие варианты упражнений',
        );
      }
      onDone(true);
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message || 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  }, [userId, sleepHours, sleepQuality, fatigue, soreness, stress, readiness, onDone]);

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={() => onDone(true)}>
      <SheetShell title="Как ты сегодня?" onClose={() => onDone(true)}>
        <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: SPACING.md }]}>
          30 секунд — и тренировка адаптируется под твоё состояние
        </Text>

        <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
          Сон, часов
        </Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BORDER_RADIUS.md,
            backgroundColor: colors.surfaceSecondary,
            color: colors.textPrimary,
            padding: SPACING.md,
            marginBottom: SPACING.md,
          }}
          keyboardType="decimal-pad"
          value={sleepHours}
          onChangeText={setSleepHours}
          placeholderTextColor={colors.textTertiary}
        />

        <ScaleRow label="Качество сна (5 — отлично)" value={sleepQuality} onChange={setSleepQuality} colors={colors} />
        <ScaleRow label="Усталость (1 — свежий)" value={fatigue} onChange={setFatigue} colors={colors} />
        <ScaleRow label="Боль в мышцах (1 — нет)" value={soreness} onChange={setSoreness} colors={colors} />
        <ScaleRow label="Стресс (1 — спокойно)" value={stress} onChange={setStress} colors={colors} />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: SPACING.sm,
            marginBottom: SPACING.lg,
          }}
        >
          <Text style={[typography.labelBold, { color: colors.textPrimary }]}>Готовность</Text>
          <Text style={[typography.h3, { color: readinessColor, fontWeight: '800' }]}>
            {readiness}/5
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{
            paddingVertical: SPACING.md,
            borderRadius: BORDER_RADIUS.lg,
            backgroundColor: readinessColor,
            alignItems: 'center',
          }}
        >
          {saving ? (
            <ActivityIndicator color={colors.textInverse} size="small" />
          ) : (
            <Text style={[typography.button, { color: colors.textInverse }]}>Сохранить</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onDone(true)}
          style={{ marginTop: SPACING.sm, paddingVertical: SPACING.md, alignItems: 'center' }}
        >
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Пропустить</Text>
        </TouchableOpacity>
      </SheetShell>
    </Modal>
  );
}