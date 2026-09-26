// src/components/workout/RpeEditor.tsx
// UX-RPE-1 (26.09): инлайн-редактор RPE — морфится НА МЕСТЕ таблицы подходов
// (SETSGrid), а не тёмной карточкой поверх (старый RpeOverlay удалён).
// Двойной тап: первый тап по значению — выбор (selection-хаптика, описание
// обновляется); второй тап ПО ТОМУ ЖЕ значению — подтверждение (запись
// {rpe, rir, difficulty} + medium-хаптика, родитель морфит таблицу обратно);
// тап по другому значению — перенос выбора. Авто-коммита по таймеру больше
// нет. Отмена — ✕ в шапке SetsGrid; «Сбросить» — для уже введённого значения.
// Высота — естественная (контент в flow): родитель позиционирует absolute без
// bottom и измеряет onLayout для height-морфинга.
import React, { memo, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { RotateCcw } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS, withAlpha } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { SetFeedbackPatch } from '../../types/workout';
import {
  RPE_DESCRIPTIONS,
  rpeZone,
  deriveRir,
  deriveDifficulty,
  DIFFICULTY_LABELS,
} from '../../utils/rpe';
import type { WeightUnit } from '../../hooks/useUnitPreferences';

const RPE_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

interface RpeEditorProps {
  rpe: number | null;
  weight: string;
  unit: WeightUnit;
  reps: string;
  /** Подтверждение вторым тапом: патч + закрытие (закрывает родитель). */
  onConfirm: (patch: SetFeedbackPatch) => void;
  /** Сброс уже введённого значения. */
  onReset: () => void;
  colors: any;
}

export const RpeEditor = memo(function RpeEditor({
  rpe,
  weight,
  unit,
  reps,
  onConfirm,
  onReset,
  colors,
}: RpeEditorProps) {
  // БЕЗ преселекта: первый тап обязан быть осознанным выбором — иначе второй
  // тап по дефолту записал бы выдуманное значение.
  const [selected, setSelected] = useState<number | null>(rpe);

  const handleTap = useCallback(
    (v: number) => {
      if (selected === v) {
        // Двойной тап по выбранному = подтвердить.
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onConfirm({ rpe: v, rir: deriveRir(v), difficulty: deriveDifficulty(v) });
      } else {
        Haptics.selectionAsync();
        setSelected(v);
      }
    },
    [selected, onConfirm]
  );

  const zoneColor = useCallback(
    (v: number): string => {
      const z = rpeZone(v);
      return z === 'easy' ? colors.success : z === 'hard' ? colors.warning : colors.error;
    },
    [colors]
  );

  const selectedColor = selected != null ? zoneColor(selected) : colors.textTertiary;

  return (
    <View>
      {/* Контекст: рабочие данные сета (номер сета — в морфнутой шапке) */}
      <Text style={[typography.captionSmall, { color: colors.textSecondary, marginBottom: 8 }]}>
        {weight ? `${weight} ${unit === 'kg' ? 'кг' : 'lb'}` : 'вес —'} × {reps || '—'}
      </Text>

      {/* Шкала 1–10: 2 ряда по 5, tap target ≥44pt */}
      <View style={{ gap: SPACING.xs }}>
        {[0, 1].map((rowIndex) => (
          <View key={rowIndex} style={{ flexDirection: 'row', gap: SPACING.xs }}>
            {RPE_VALUES.slice(rowIndex * 5, rowIndex * 5 + 5).map((v) => {
              const isSel = v === selected;
              const zc = zoneColor(v);
              return (
                <TouchableOpacity
                  key={v}
                  onPress={() => handleTap(v)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isSel ? `RPE ${v} — нажмите ещё раз, чтобы подтвердить` : `RPE ${v}`
                  }
                  accessibilityState={{ selected: isSel }}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 10,
                    borderRadius: BORDER_RADIUS.md,
                    backgroundColor: isSel ? zc : colors.surfaceSecondary,
                    borderWidth: 2,
                    borderColor: isSel ? zc : colors.border,
                    minHeight: 44,
                  }}
                >
                  <Text
                    style={[
                      typography.h6,
                      {
                        fontWeight: isSel ? '700' : '600',
                        color: isSel ? colors.textInverse : zc,
                      },
                    ]}
                  >
                    {v}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Живое описание выбранного значения (или подсказка про двойной тап) */}
      <View
        style={{
          marginTop: SPACING.sm,
          padding: SPACING.sm,
          backgroundColor: withAlpha(selectedColor, selected != null ? 0.082 : 0),
          borderRadius: BORDER_RADIUS.md,
          borderWidth: 1,
          borderColor: withAlpha(selectedColor, selected != null ? 0.251 : 0),
          minHeight: 56,
        }}
      >
        {selected != null ? (
          <>
            <Text
              style={[
                typography.bodySmall,
                { color: selectedColor, fontWeight: '700', marginBottom: 2 },
              ]}
            >
              RPE {selected} — {RPE_DESCRIPTIONS[selected]}
            </Text>
            <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
              Сложность: {DIFFICULTY_LABELS[deriveDifficulty(selected)]} · RIR {deriveRir(selected)}{' '}
              · тапните ещё раз, чтобы подтвердить
            </Text>
          </>
        ) : (
          <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>
            Тап — выбрать RPE · второй тап по той же ячейке — подтвердить
          </Text>
        )}
      </View>

      {/* Сброс уже введённого значения (отмена без записи — ✕ в шапке) */}
      {rpe != null && (
        <View style={{ marginTop: SPACING.sm, flexDirection: 'row', justifyContent: 'center' }}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onReset();
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Сбросить RPE"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: SPACING.xs,
              paddingVertical: SPACING.sm,
              paddingHorizontal: SPACING.lg,
              borderRadius: BORDER_RADIUS.md,
              borderWidth: 1,
              borderColor: colors.border,
              minHeight: 40,
            }}
          >
            <RotateCcw size={14} color={colors.textSecondary} strokeWidth={2} />
            <Text
              style={[typography.bodySmall, { color: colors.textSecondary, fontWeight: '600' }]}
            >
              Сбросить RPE {rpe}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});
