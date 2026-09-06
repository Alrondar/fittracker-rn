// src/components/progress/StrengthLevelBadge.tsx
// Лаконичный цветной чип: «Средний · 1.2× веса».
// Тап → SheetShell с таблицей 5 уровней и объяснением (L2).
//
// Используется в:
// - StrengthTrendChart (Progress Hub) — рядом с e1RM
// - Workout Report — в PR-карточке
//
// Правила:
// - null result (нет норматива / нет веса / e1rm<=0) → ничего не рендерится;
// - цвета читаемы в светлой и тёмной темах (STRENGTH_LEVEL_COLORS);
// - SheetShell — единый паттерн раскрытия (INVENTORY.md §6).
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { SheetShell } from '../ui/SheetShell';
import type { StrengthStandardResult } from '../../utils/strengthStandards';

interface StrengthLevelBadgeProps {
  /** Результат расчёта. При null — компонент ничего не рендерит. */
  result: StrengthStandardResult | null;
  /** Название упражнения — для заголовка sheet. */
  exerciseName: string;
  /** e1RM (кг) — для отображения в sheet. */
  e1rm: number;
  /** Вес пользователя (кг) — для отображения в sheet. */
  bodyWeightKg: number | null;
}

export function StrengthLevelBadge({
  result,
  exerciseName,
  e1rm,
  bodyWeightKg,
}: StrengthLevelBadgeProps) {
  const { colors } = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!result) return null;
  if (!bodyWeightKg || bodyWeightKg <= 0) return null;

  const levelColor = result.color;
  const levelBg = levelColor + '1A'; // 10% opacity

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => setSheetOpen(true)}
        style={[
          styles.badge,
          {
            backgroundColor: levelBg,
            borderColor: levelColor + '60',
          },
        ]}
      >
        <Text style={[typography.buttonTiny, { color: levelColor, fontWeight: '600' }]}>
          {result.levelLabel}
        </Text>
        <Text
          style={[typography.captionSmall, { color: colors.textSecondary, marginLeft: SPACING.xs }]}
        >
          · {result.ratio.toFixed(1)}× веса
        </Text>
      </TouchableOpacity>

      <SheetShell
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={`Уровень силы: ${exerciseName}`}
      >
        <View style={{ padding: SPACING.lg }}>
          {/* Текущий результат */}
          <View
            style={{
              backgroundColor: colors.surfaceSecondary,
              borderRadius: BORDER_RADIUS.md,
              padding: SPACING.md,
              marginBottom: SPACING.lg,
            }}
          >
            <Text
              style={[
                typography.captionSmall,
                { color: colors.textSecondary, marginBottom: SPACING.xs },
              ]}
            >
              Твой результат
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'baseline',
                justifyContent: 'space-between',
              }}
            >
              <View>
                <Text style={[typography.h4, { color: levelColor, fontWeight: '700' }]}>
                  {result.levelLabel}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                  e1RM {e1rm.toFixed(0)} кг · вес {bodyWeightKg.toFixed(0)} кг
                </Text>
              </View>
              <Text style={[typography.labelBold, { color: colors.textPrimary, fontSize: 18 }]}>
                {result.ratio.toFixed(2)}×
              </Text>
            </View>
          </View>

          {/* Таблица нормативов */}
          <Text
            style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.sm }]}
          >
            Ориентировочные нормативы
          </Text>
          <Text
            style={[
              typography.captionSmall,
              {
                color: colors.textTertiary,
                marginBottom: SPACING.md,
                fontStyle: 'italic',
              },
            ]}
          >
            Отношение 1ПМ к собственному весу
          </Text>

          {result.standards.map((std) => {
            const isCurrent = std.level === result.level;
            const rowBg = isCurrent ? std.color + '15' : 'transparent';
            return (
              <View
                key={std.level}
                style={[
                  styles.standardRow,
                  {
                    backgroundColor: rowBg,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.levelDot, { backgroundColor: std.color }]} />
                  <Text
                    style={[
                      typography.body,
                      {
                        color: isCurrent ? std.color : colors.textPrimary,
                        fontWeight: isCurrent ? '700' : '400',
                      },
                    ]}
                  >
                    {std.label}
                  </Text>
                </View>
                <Text
                  style={[
                    typography.body,
                    {
                      color: isCurrent ? std.color : colors.textSecondary,
                      fontWeight: isCurrent ? '700' : '400',
                    },
                  ]}
                >
                  {std.ratio.toFixed(2)}×
                </Text>
              </View>
            );
          })}

          {/* Disclaimer */}
          <Text
            style={[
              typography.captionSmall,
              {
                color: colors.textTertiary,
                marginTop: SPACING.lg,
                fontStyle: 'italic',
                lineHeight: 16,
              },
            ]}
          >
            Нормативы ориентировочные и основаны на данных StrengthLevel / ExRx. Они не являются
            медицинским стандартом и не учитывают возраст, стаж или индивидуальные особенности.
          </Text>
        </View>
      </SheetShell>
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  standardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  levelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.sm,
  },
});
