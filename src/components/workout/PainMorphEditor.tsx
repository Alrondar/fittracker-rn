// src/components/workout/PainMorphEditor.tsx
// MORF-PAIN (26.09): быстрая отметка боли инлайн — морфится на месте таблицы
// подходов (тот же механизм, что UX-RPE-1 в SetsGrid). Шкала 0–3 — уровни и
// цвета ONE source из PainSheet (PAIN_LEVELS). Двойной тап: первый — выбор,
// второй по тому же — подтверждение (быстрый painState без типа/заметки).
// Глубокий ввод (тип/часть тела/stop/заметка/осторожность) остаётся в
// PainSheet — ссылка «Подробнее…» открывает шторку с prefill'ом.
import React, { memo, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ChevronRight, RotateCcw } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS, withAlpha } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { ExercisePainState } from '../../types/workout';
import { PAIN_LEVELS } from './PainSheet';

interface PainMorphEditorProps {
  painState: ExercisePainState | null;
  /** Часть тела, prefilled по мышцам упражнения (как в PainSheet). */
  defaultBodyPart: string | null;
  /** Быстрая запись: {painLevel, ...} без типа/заметки; stop=false. */
  onConfirm: (painState: ExercisePainState) => void;
  /** Удалить запись боли («Боль прошла»). */
  onClear: () => void;
  /** Открыть PainSheet для детального ввода. */
  onOpenDetail: () => void;
  colors: any;
}

export const PainMorphEditor = memo(function PainMorphEditor({
  painState,
  defaultBodyPart,
  onConfirm,
  onClear,
  onOpenDetail,
  colors,
}: PainMorphEditorProps) {
  // Преселект = уже записанный уровень (как prefill в PainSheet); без записи
  // ничего не выбрано — первый тап обязан быть осознанным.
  const [selected, setSelected] = useState<number | null>(painState?.painLevel ?? null);

  const levelColor = useCallback(
    (v: number) =>
      v === 0 ? colors.success : v === 1 ? colors.primary : v === 2 ? colors.warning : colors.error,
    [colors]
  );

  const handleTap = useCallback(
    (v: number) => {
      if (selected === v) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onConfirm({
          painLevel: v,
          painType: null,
          bodyPart: defaultBodyPart,
          stopExercise: false,
          notes: null,
        });
      } else {
        Haptics.selectionAsync();
        setSelected(v);
      }
    },
    [selected, onConfirm, defaultBodyPart]
  );

  const selectedColor = selected != null ? levelColor(selected) : colors.textTertiary;

  return (
    <View>
      {/* Шкала 0–3: одной строкой, 4 ячейки ≥44pt */}
      <View style={{ flexDirection: 'row', gap: SPACING.xs }}>
        {PAIN_LEVELS.map((l) => {
          const isSel = l.value === selected;
          const lc = levelColor(l.value);
          return (
            <TouchableOpacity
              key={l.value}
              onPress={() => handleTap(l.value)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={
                isSel ? `Боль: ${l.label} — нажмите ещё раз, чтобы подтвердить` : `Боль: ${l.label}`
              }
              accessibilityState={{ selected: isSel }}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 12,
                borderRadius: BORDER_RADIUS.md,
                backgroundColor: isSel ? withAlpha(lc, 0.188) : colors.surfaceSecondary,
                borderWidth: 2,
                borderColor: isSel ? lc : colors.border,
                minHeight: 48,
              }}
            >
              <Text
                style={[
                  typography.captionSmall,
                  {
                    color: isSel ? lc : colors.textSecondary,
                    fontWeight: '700',
                  },
                ]}
              >
                {l.value} · {l.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Описание/подсказка — как в RpeEditor, тот же язык */}
      <View
        style={{
          marginTop: SPACING.sm,
          padding: SPACING.sm,
          backgroundColor: withAlpha(selectedColor, selected != null ? 0.082 : 0),
          borderRadius: BORDER_RADIUS.md,
          borderWidth: 1,
          borderColor: withAlpha(selectedColor, selected != null ? 0.251 : 0),
          minHeight: 48,
          justifyContent: 'center',
        }}
      >
        <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
          {selected != null
            ? 'Тапните ещё раз, чтобы подтвердить · '
            : 'Тап — выбрать уровень · второй тап — подтвердить · '}
          <Text
            onPress={onOpenDetail}
            style={{ color: colors.primary, fontWeight: '700' }}
            accessibilityRole="link"
            accessibilityLabel="Указать тип боли и заметку"
          >
            подробнее…
          </Text>
        </Text>
      </View>

      {/* Сброс записи (боль прошла) — только если она есть */}
      {painState != null && (
        <View style={{ marginTop: SPACING.sm, flexDirection: 'row', justifyContent: 'center' }}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClear();
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Боль прошла — убрать отметку"
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
              Боль прошла
            </Text>
            <ChevronRight size={14} color={colors.textTertiary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});
