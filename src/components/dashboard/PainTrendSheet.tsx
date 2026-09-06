// src/components/dashboard/PainTrendSheet.tsx
// Фича 4: L2 SheetShell с трендом боли по зонам тела за последние 4 недели.
// Показывает хронические зоны (≥2 недель боли) + визуализацию по неделям.
// Не ставит медицинских диагнозов (PRODUCT.md §8, §14) — только наблюдение
// с рекомендацией обратиться к специалисту или пересмотреть нагрузку.
import React from 'react';
import { View, Text } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { SheetShell } from '../ui/SheetShell';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { AppCard } from '../ui/AppCard';
import { BODY_PART_LABELS } from '../../constants/injuries';
import { BODY_PART_COLORS } from '../../constants/semanticColors';
import type { PainTrendResult } from '../../utils/painTrend';

interface PainTrendSheetProps {
  visible: boolean;
  onClose: () => void;
  result: PainTrendResult;
}

function bodyPartLabel(bp: string): string {
  return (BODY_PART_LABELS as Record<string, string>)[bp] ?? bp;
}

function bodyPartColor(bp: string, fallback: string): string {
  return (BODY_PART_COLORS as Record<string, string>)[bp] ?? fallback;
}

export function PainTrendSheet({ visible, onClose, result }: PainTrendSheetProps) {
  const { colors } = useTheme();

  const hasChronic = result.chronicZones.length > 0;
  const totalEvents = result.weeks.reduce((acc, w) => acc + w.total, 0);

  return (
    <SheetShell visible={visible} onClose={onClose} title="Боль: тренд по зонам">
      {/* Summary */}
      <View style={{ marginBottom: SPACING.md }}>
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          Последние 4 недели · всего записей: {totalEvents}
        </Text>
      </View>

      {/* Хронические зоны */}
      {hasChronic && (
        <AppCard
          variant="default"
          style={{
            borderColor: colors.error,
            borderWidth: 1,
            marginBottom: SPACING.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <AlertTriangle
              size={20}
              color={colors.error}
              style={{ marginRight: SPACING.sm, marginTop: 2 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={[typography.labelBold, { color: colors.error, marginBottom: 4 }]}>
                Устойчивая боль
              </Text>
              {result.chronicZones.map((z) => (
                <View
                  key={z.bodyPart}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: 2,
                  }}
                >
                  <Text style={[typography.body, { color: colors.textPrimary }]}>
                    {bodyPartLabel(z.bodyPart)}
                  </Text>
                  <Text style={[typography.labelBold, { color: colors.error }]}>
                    {z.weeks} из 4 нед.
                  </Text>
                </View>
              ))}
              <Text
                style={[typography.caption, { color: colors.textSecondary, marginTop: SPACING.sm }]}
              >
                Повторяющаяся боль может сигнализировать о перегрузке или развивающейся проблеме.
                Рассмотри снижение веса в этих упражнениях, замену на менее нагрузочный вариант или
                консультацию со специалистом.
              </Text>
            </View>
          </View>
        </AppCard>
      )}

      {!hasChronic && totalEvents > 0 && (
        <AppCard
          variant="default"
          style={{
            borderColor: colors.success + '88',
            borderWidth: 1,
            marginBottom: SPACING.md,
          }}
        >
          <Text style={[typography.labelBold, { color: colors.success, marginBottom: 4 }]}>
            Устойчивой боли нет
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Записи есть, но они эпизодические — ни в одной зоне боль не повторялась чаще одной
            недели.
          </Text>
        </AppCard>
      )}

      {totalEvents === 0 && (
        <AppCard variant="default" style={{ marginBottom: SPACING.md }}>
          <Text style={[typography.body, { color: colors.textTertiary }]}>
            За последние 4 недели записей о боли нет.
          </Text>
        </AppCard>
      )}

      {/* Недели — визуализация */}
      <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
        По неделям
      </Text>
      <View
        style={{
          backgroundColor: colors.surfaceSecondary,
          borderRadius: BORDER_RADIUS.md,
          padding: SPACING.md,
        }}
      >
        {result.weeks.map((week) => {
          const parts = Object.entries(week.eventsByPart);
          return (
            <View
              key={week.weekStart}
              style={{
                paddingVertical: SPACING.xs,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text
                style={[typography.captionSmall, { color: colors.textTertiary, marginBottom: 4 }]}
              >
                {week.label}
              </Text>
              {parts.length === 0 ? (
                <Text
                  style={[typography.caption, { color: colors.textTertiary, fontStyle: 'italic' }]}
                >
                  нет записей
                </Text>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {parts.map(([bp, count]) => {
                    const c = bodyPartColor(bp, colors.warning);
                    return (
                      <View
                        key={bp}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: BORDER_RADIUS.full,
                          backgroundColor: c + '1A',
                          borderWidth: 1,
                          borderColor: c + '66',
                        }}
                      >
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: c,
                            marginRight: 4,
                          }}
                        />
                        <Text style={[typography.captionSmall, { color: c, fontWeight: '700' }]}>
                          {bodyPartLabel(bp)}
                          {count > 1 ? ` ×${count}` : ''}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </SheetShell>
  );
}
