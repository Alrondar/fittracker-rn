// src/components/PersonalRecordsCard.tsx
// FEAT-1.4: строка «1RM ≈ N кг» (e1rm из сервиса); дата — только при непустой recordDate.
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Trophy } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../constants/theme';
import { typography } from '../styles/typography';

interface PersonalRecord {
  exerciseName: string;
  maxWeight: number;
  maxReps: number;
  /** FEAT-1.4: опционально — карточка переживёт отсутствие поля */
  e1rm?: number;
  recordDate: string;
}

interface PersonalRecordsCardProps {
  records: PersonalRecord[];
  colors: any;
}

export function PersonalRecordsCard({ records, colors }: PersonalRecordsCardProps) {
  if (records.length === 0) return null;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
          marginBottom: SPACING.md,
        }}
      >
        <Trophy size={18} color={colors.primary} strokeWidth={2} />
        <Text style={[typography.h5, { color: colors.textPrimary }]}>Личные рекорды</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {records.map((record, index) => (
          <View
            key={index}
            style={{
              minWidth: 140,
              marginRight: SPACING.md,
              backgroundColor: colors.surface,
              borderRadius: BORDER_RADIUS.lg,
              borderWidth: 1,
              borderColor: colors.border,
              padding: SPACING.md,
              alignItems: 'center',
            }}
          >
            <Trophy size={24} color={colors.primary} strokeWidth={1.8} />
            <Text
              style={[
                typography.caption,
                { color: colors.textSecondary, marginTop: SPACING.sm, textAlign: 'center' },
              ]}
              numberOfLines={2}
            >
              {record.exerciseName}
            </Text>
            <Text style={[typography.h3, { color: colors.primary, marginTop: SPACING.xs }]}>
              {record.maxWeight} кг
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              × {record.maxReps} раз
            </Text>
            {(record.e1rm ?? 0) > 0 && (
              <Text
                style={[
                  typography.captionSmall,
                  { color: colors.success, fontWeight: '700', marginTop: 2 },
                ]}
              >
                1RM ≈ {record.e1rm} кг
              </Text>
            )}
            {record.recordDate ? (
              <Text
                style={[
                  typography.captionSmall,
                  { color: colors.textTertiary, marginTop: SPACING.xs },
                ]}
              >
                {formatDate(record.recordDate)}
              </Text>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}