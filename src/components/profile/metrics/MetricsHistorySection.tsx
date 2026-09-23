// app/profile/metrics.tsx split (DA-P2-8): история замеров (AUDIT-4: пагинация + «Показать ещё»).
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Trash2, Calendar, Weight } from 'lucide-react-native';
import { useTheme } from '../../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { typography } from '../../../styles/typography';
import { AppCard } from '../../ui/AppCard';
import { SectionHeader } from '../../SectionHeader';
import { METRIC_FIELDS, type BodyMetric } from '../../../types/metrics';

const HISTORY_PAGE = 30;

interface Props {
  metrics: BodyMetric[];
  onDelete: (id: string) => void;
}

export function MetricsHistorySection({ metrics, onDelete }: Props) {
  const { colors } = useTheme();
  const [showAllHistory, setShowAllHistory] = useState(false);

  const handleDelete = (id: string) => {
    Alert.alert('Удалить замер?', 'Это действие нельзя отменить', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => onDelete(id) },
    ]);
  };

  return (
    <>
      <SectionHeader title="История" style={{ paddingHorizontal: 0, paddingTop: 0 }} />
      {metrics.length === 0 ? (
        <AppCard variant="compact" style={{ alignItems: 'center', paddingVertical: SPACING.xl }}>
          <Weight size={48} color={colors.textTertiary} />
          <Text
            style={[
              typography.body,
              { color: colors.textSecondary, marginTop: SPACING.md, textAlign: 'center' },
            ]}
          >
            Пока нет записей о замерах. Добавьте первый замер, чтобы отслеживать прогресс!
          </Text>
        </AppCard>
      ) : (
        // ✅ map вместо FlatList: список короткий, скроллится внешний ScrollView —
        //    вложенный VirtualizedList запрещён правилами и здесь не нужен.
        <>
          {(showAllHistory ? metrics : metrics.slice(0, HISTORY_PAGE)).map((item) => (
            <AppCard key={item.id} variant="compact" style={{ marginBottom: SPACING.sm }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: SPACING.md,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Calendar size={18} color={colors.primary} style={{ marginRight: SPACING.sm }} />
                  <Text style={[typography.labelBold, { color: colors.textPrimary }]}>
                    {new Date(item.metric_date).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(item.id)}
                  accessibilityRole="button"
                  accessibilityLabel="Удалить замер"
                  style={{ padding: 4 }}
                >
                  <Trash2 size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
                {METRIC_FIELDS.map((field) => {
                  const value = item[field.key as keyof typeof item];
                  if (!value) return null;
                  return (
                    <View
                      key={field.key}
                      style={{
                        backgroundColor: colors.surfaceSecondary,
                        paddingHorizontal: SPACING.md,
                        paddingVertical: SPACING.xs,
                        borderRadius: BORDER_RADIUS.sm,
                      }}
                    >
                      <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
                        {field.label}:{' '}
                        <Text
                          style={[
                            typography.caption,
                            { color: colors.textPrimary, fontWeight: '600' },
                          ]}
                        >
                          {value} {field.unit}
                        </Text>
                      </Text>
                    </View>
                  );
                })}
              </View>
              {item.notes && (
                <Text
                  style={[
                    typography.caption,
                    {
                      color: colors.textSecondary,
                      marginTop: SPACING.sm,
                      fontStyle: 'italic',
                    },
                  ]}
                >
                  📝 {item.notes}
                </Text>
              )}
            </AppCard>
          ))}
          {!showAllHistory && metrics.length > HISTORY_PAGE && (
            <TouchableOpacity
              onPress={() => setShowAllHistory(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Показать ещё (${metrics.length - HISTORY_PAGE})`}
              style={{
                paddingVertical: SPACING.md,
                alignItems: 'center',
                backgroundColor: colors.surface,
                borderRadius: BORDER_RADIUS.md,
                marginTop: SPACING.sm,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={[typography.labelBold, { color: colors.primary }]}>
                Показать ещё ({metrics.length - HISTORY_PAGE})
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </>
  );
}
