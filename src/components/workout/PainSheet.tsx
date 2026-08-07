// src/components/workout/PainSheet.tsx
// FEAT-1.9: шторка «Боль во время упражнения»: уровень 0–3, тип, часть тела,
// stop-тумблер, осторожность в профиль травм, заметка.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SheetShell } from '../ui/SheetShell';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { BODY_PARTS, BODY_PART_LABELS, BodyPart, targetsInjuredMuscle } from '../../constants/injuries';
import { painService, PainType } from '../../services/painService';
import { ExerciseData } from '../../types/workout';

const PAIN_TYPES: { key: PainType; label: string }[] = [
  { key: 'sharp', label: 'острая' },
  { key: 'dull', label: 'ноющая' },
  { key: 'pulling', label: 'тянущая' },
  { key: 'joint', label: 'в суставе' },
  { key: 'muscle', label: 'мышечная' },
];

const LEVELS = [
  { value: 0, label: 'нет' },
  { value: 1, label: 'лёгкая' },
  { value: 2, label: 'средняя' },
  { value: 3, label: 'сильная' },
];

function ToggleRow({
  label,
  value,
  onChange,
  colors,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  colors: any;
}) {
  return (
    <TouchableOpacity
      onPress={() => onChange(!value)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.sm,
      }}
    >
      <Text style={[typography.caption, { color: colors.textPrimary, flex: 1, marginRight: SPACING.sm }]}>
        {label}
      </Text>
      <View
        style={{
          width: 44,
          height: 26,
          borderRadius: 13,
          backgroundColor: value ? colors.success : colors.surfaceSecondary,
          borderWidth: 1,
          borderColor: colors.border,
          justifyContent: 'center',
          paddingHorizontal: 2,
        }}
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: colors.textInverse,
            alignSelf: value ? 'flex-end' : 'flex-start',
          }}
        />
      </View>
    </TouchableOpacity>
  );
}

interface PainSheetProps {
  exercise: ExerciseData | null;
  workoutId: string;
  userId: string | null;
  onClose: () => void;
}

export function PainSheet({ exercise, workoutId, userId, onClose }: PainSheetProps) {
  const { colors } = useTheme();
  const [painLevel, setPainLevel] = useState(0);
  const [painType, setPainType] = useState<PainType | null>(null);
  const [bodyPart, setBodyPart] = useState<BodyPart | null>(null);
  const [stopExercise, setStopExercise] = useState(false);
  const [addCaution, setAddCaution] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // сброс формы + префилл части тела при открытии
  useEffect(() => {
    if (exercise) {
      setPainLevel(0);
      setPainType(null);
      setStopExercise(false);
      setAddCaution(false);
      setNotes('');
      const pre =
        (Object.keys(BODY_PARTS) as BodyPart[]).find((bp) =>
          targetsInjuredMuscle(exercise.primary_muscles, exercise.secondary_muscles, bp),
        ) ?? null;
      setBodyPart(pre);
    }
  }, [exercise]);

  const handleSave = useCallback(async () => {
    if (!exercise || !userId) return;
    setSaving(true);
    try {
      await painService.logPainEvent({
        userId,
        workoutId,
        exerciseId: exercise.id,
        painLevel,
        painType: painLevel > 0 ? painType : null,
        bodyPart,
        stopExercise,
        notes: notes.trim() ? notes.trim() : null,
      });
      if (addCaution && bodyPart && painLevel >= 2) {
        await painService.addCautionInjury(
          userId,
          bodyPart,
          painLevel === 3 ? 'high' : 'medium',
          notes.trim() || null,
        );
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (stopExercise) {
        Alert.alert('Отмечено', 'Свайпни по карточке влево, чтобы выбрать упражнение-замену');
      }
      onClose();
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message || 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  }, [exercise, userId, workoutId, painLevel, painType, bodyPart, stopExercise, addCaution, notes, onClose]);

  const levelColor = (v: number) =>
    v === 0 ? colors.success : v === 1 ? colors.primary : v === 2 ? colors.warning : colors.error;

  return (
    <Modal transparent visible={!!exercise} animationType="slide" onRequestClose={onClose}>
      <SheetShell title="Боль во время упражнения" onClose={onClose}>
        {exercise && (
          <>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: SPACING.md }]}>
              {exercise.name}
            </Text>

            <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
              Уровень боли
            </Text>
            <View style={{ flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.md }}>
              {LEVELS.map((l) => {
                const active = painLevel === l.value;
                const color = levelColor(l.value);
                return (
                  <TouchableOpacity
                    key={l.value}
                    onPress={() => setPainLevel(l.value)}
                    style={{
                      flex: 1,
                      paddingVertical: SPACING.sm,
                      borderRadius: BORDER_RADIUS.md,
                      borderWidth: 1,
                      borderColor: active ? color : colors.border,
                      backgroundColor: active ? color + '20' : colors.surfaceSecondary,
                    }}
                  >
                    <Text
                      style={[
                        typography.captionSmall,
                        { color: active ? color : colors.textSecondary, fontWeight: '700', textAlign: 'center' },
                      ]}
                    >
                      {l.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {painLevel > 0 && (
              <>
                <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
                  Тип
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.md }}>
                  {PAIN_TYPES.map((t) => {
                    const active = painType === t.key;
                    return (
                      <TouchableOpacity
                        key={t.key}
                        onPress={() => setPainType(active ? null : t.key)}
                        style={{
                          paddingHorizontal: SPACING.md,
                          paddingVertical: SPACING.xs,
                          borderRadius: BORDER_RADIUS.md,
                          borderWidth: 1,
                          borderColor: active ? colors.warning : colors.border,
                          backgroundColor: active ? colors.warning + '20' : colors.surfaceSecondary,
                        }}
                      >
                        <Text style={[typography.captionSmall, { color: active ? colors.warning : colors.textSecondary }]}>
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
              Часть тела
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.md }}>
              {(Object.keys(BODY_PARTS) as BodyPart[]).map((bp) => {
                const active = bodyPart === bp;
                return (
                  <TouchableOpacity
                    key={bp}
                    onPress={() => setBodyPart(active ? null : bp)}
                    style={{
                      paddingHorizontal: SPACING.md,
                      paddingVertical: SPACING.xs,
                      borderRadius: BORDER_RADIUS.md,
                      borderWidth: 1,
                      borderColor: active ? colors.error : colors.border,
                      backgroundColor: active ? colors.error + '20' : colors.surfaceSecondary,
                    }}
                  >
                    <Text style={[typography.captionSmall, { color: active ? colors.error : colors.textSecondary }]}>
                      {BODY_PART_LABELS[bp] ?? bp}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <ToggleRow label="Завершить это упражнение" value={stopExercise} onChange={setStopExercise} colors={colors} />
            {painLevel >= 2 && bodyPart && (
              <ToggleRow
                label="Добавить осторожность в профиль травм"
                value={addCaution}
                onChange={setAddCaution}
                colors={colors}
              />
            )}

            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: BORDER_RADIUS.md,
                backgroundColor: colors.surfaceSecondary,
                color: colors.textPrimary,
                minHeight: 64,
                padding: SPACING.md,
                marginTop: SPACING.sm,
                textAlignVertical: 'top',
              }}
              placeholder="Комментарий (необязательно)"
              placeholderTextColor={colors.textTertiary}
              multiline
              value={notes}
              onChangeText={setNotes}
            />

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={{
                marginTop: SPACING.lg,
                paddingVertical: SPACING.md,
                borderRadius: BORDER_RADIUS.lg,
                backgroundColor: painLevel >= 3 ? colors.error : colors.warning,
                alignItems: 'center',
              }}
            >
              {saving ? (
                <ActivityIndicator color={colors.textInverse} size="small" />
              ) : (
                <Text style={[typography.button, { color: colors.textInverse }]}>Отметить</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </SheetShell>
    </Modal>
  );
}