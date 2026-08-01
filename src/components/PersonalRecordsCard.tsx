import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Trophy } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../constants/theme';
import { typography } from '../styles/typography';

interface PersonalRecord {
  exerciseName: string;
  maxWeight: number;
  maxReps: number;
  recordDate: string;
}

interface PersonalRecordsCardProps {
  records: PersonalRecord[];
  colors: any;
}

export function PersonalRecordsCard({ records, colors }: PersonalRecordsCardProps) {
  if (records.length === 0) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <View style={{
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      borderWidth: 1,
      borderColor: colors.border,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
        <Trophy size={20} color={colors.warning} strokeWidth={2} />
        <Text style={[typography.h5, { color: colors.textPrimary, marginLeft: SPACING.sm }]}>
          Личные рекорды
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {records.map((record, index) => (
          <View
            key={index}
            style={{
              backgroundColor: colors.primaryLight,
              borderRadius: BORDER_RADIUS.md,
              padding: SPACING.md,
              marginRight: SPACING.md,
              minWidth: 120,
            }}
          >
            <Trophy size={24} color={colors.primary} strokeWidth={2} style={{ marginBottom: SPACING.sm }} />
            <Text style={[typography.labelBold, { color: colors.textPrimary }]} numberOfLines={2}>
              {record.exerciseName}
            </Text>
            <Text style={[typography.h3, { color: colors.primary, marginTop: SPACING.xs }]}>
              {record.maxWeight} кг
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              × {record.maxReps} раз
            </Text>
            <Text style={[typography.captionSmall, { color: colors.textTertiary, marginTop: SPACING.xs }]}>
              {formatDate(record.recordDate)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}