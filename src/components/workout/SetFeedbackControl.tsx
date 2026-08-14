// src/components/SetFeedbackControl.tsx
// FEAT-7 v2 (05.08.2026): RPE/RIR feedback.
// Драг-ползунок заменён тапабельной шкалой. Закрыто:
//   - рассинхрон меток и ползунка (хардкод sliderWidth=280 vs flex-контейнер);
//   - фризы при перетаскивании (нет Gesture/Animated, нет ре-рендеров на тик);
//   - дефолт 6 → 7 (типичный рабочий RPE), значение готово к коммиту без движения;
//   - явная кнопка «Готово» (коммит + закрытие).
// Единственный источник чипа и редактора (инлайн-дубли из SetsGrid удалены).
import React, { memo, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { X, Check } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { SetFeedbackPatch } from '../../types/workout';
import {
  RPE_DESCRIPTIONS,
  rpeZone,
  deriveRir,
  deriveDifficulty,
  DIFFICULTY_LABELS,
} from '../../utils/rpe';

const RPE_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const DEFAULT_RPE = 7; // типичный рабочий RPE («3 в запасе»)

// ============================================================================
// ЧИП RPE (в ряду подходов)
// ============================================================================
interface SetFeedbackChipProps {
  rpe: number | null;
  onPress: () => void;
  colors: any;
}

export const SetFeedbackChip = memo(function SetFeedbackChip({
  rpe,
  onPress,
  colors,
}: SetFeedbackChipProps) {
  const filled = rpe != null;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        alignItems: 'center',
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.sm,
        backgroundColor: filled ? colors.primary + '15' : colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: filled ? colors.primary + '40' : colors.border,
      }}
    >
      <Text
        style={[
          typography.captionSmall,
          {
            color: filled ? colors.primary : colors.textTertiary,
            fontWeight: '700',
          },
        ]}
      >
        {filled ? `RPE ${rpe}` : 'RPE?'}
      </Text>
    </TouchableOpacity>
  );
});

// ============================================================================
// РЕДАКТОР RPE (тапабельная шкала 1–10)
// ============================================================================
interface SetFeedbackEditorProps {
  setNumber: number;
  rpe: number | null;
  onChange: (patch: SetFeedbackPatch) => void;
  onClose: () => void;
  colors: any;
}

export const SetFeedbackEditor = memo(function SetFeedbackEditor({
  setNumber,
  rpe,
  onChange,
  onClose,
  colors,
}: SetFeedbackEditorProps) {
  // Локальный выбор: существующий RPE либо дефолт 7. НЕ коммитится до «Готово».
  const [selected, setSelected] = useState<number>(rpe ?? DEFAULT_RPE);

  const zoneColor = useCallback(
    (v: number): string => {
      const z = rpeZone(v);
      return z === 'easy' ? colors.success : z === 'hard' ? colors.warning : colors.error;
    },
    [colors],
  );

  const selectedColor = zoneColor(selected);

  const handleSelect = useCallback((v: number) => {
    Haptics.selectionAsync();
    setSelected(v);
  }, []);

  const handleConfirm = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onChange({
      rpe: selected,
      rir: deriveRir(selected),
      difficulty: deriveDifficulty(selected),
    });
    onClose();
  }, [selected, onChange, onClose]);

  const handleReset = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange({ rpe: null, rir: null, difficulty: null });
    onClose();
  }, [onChange, onClose]);

  return (
    <View
      style={{
        marginTop: SPACING.sm,
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.sm,
        backgroundColor: colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {/* Шапка */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: SPACING.sm,
        }}
      >
        <Text
          style={[
            typography.captionSmall,
            { color: colors.textSecondary, fontWeight: '700', flex: 1 },
          ]}
        >
          Подход {setNumber} — как далось?
        </Text>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={16} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* Сегментированная шкала: деление = кнопка (flex:1), рассинхрон невозможен */}
      <View style={{ flexDirection: 'row', gap: SPACING.xs }}>
        {RPE_VALUES.map((v) => {
          const isSel = v === selected;
          const zc = zoneColor(v);
          return (
            <TouchableOpacity
              key={v}
              onPress={() => handleSelect(v)}
              activeOpacity={0.7}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 10,
                borderRadius: BORDER_RADIUS.sm,
                backgroundColor: isSel ? zc : colors.surface,
                borderWidth: 1,
                borderColor: isSel ? zc : colors.border,
              }}
            >
              <Text
                style={[
                  typography.captionSmall,
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

      {/* Живое объяснение выбора */}
      <Text
        style={[
          typography.captionSmall,
          { color: colors.textSecondary, marginTop: SPACING.sm, lineHeight: 16 },
        ]}
      >
        {`RPE ${selected} — ${RPE_DESCRIPTIONS[selected]}`}
      </Text>
      <Text
        style={[
          typography.captionSmall,
          { color: colors.textTertiary, marginTop: 2 },
        ]}
      >
        {`Сложность: ${DIFFICULTY_LABELS[deriveDifficulty(selected)]} · RIR ${deriveRir(selected)}`}
      </Text>

      {/* Футер: сброс + подтвердить */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: SPACING.sm,
          gap: SPACING.sm,
        }}
      >
        {rpe != null && (
          <TouchableOpacity
            onPress={handleReset}
            style={{
              paddingVertical: SPACING.sm,
              paddingHorizontal: SPACING.sm,
              borderRadius: BORDER_RADIUS.sm,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={[
                typography.captionSmall,
                { color: colors.textTertiary, fontWeight: '600' },
              ]}
            >
              Сбросить
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={handleConfirm}
          activeOpacity={0.8}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: 10,
            borderRadius: BORDER_RADIUS.sm,
            backgroundColor: selectedColor,
          }}
        >
          <Check size={16} color={colors.textInverse} strokeWidth={2.5} />
          <Text
            style={[
              typography.captionSmall,
              { color: colors.textInverse, fontWeight: '700' },
            ]}
          >
            Готово — RPE {selected}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});