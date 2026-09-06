// src/components/PersonalRecordsCard.tsx
// FEAT-1.4: строка «1RM ≈ N кг» (e1rm из сервиса); дата — только при непустой recordDate.
//
// Фича 1: Strength Standards
// - Бейдж уровня рядом с e1RM
// - Тап → SheetShell с нормативами
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Trophy } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../constants/theme';
import { typography } from '../styles/typography';
import { useStore } from '../store/useStore';
import { useStrengthStandards } from '../hooks/useStrengthStandards';
import { StrengthLevelBadge } from './progress/StrengthLevelBadge';

import { useQuery } from '@tanstack/react-query';
import { profileService } from '../services/profileService';

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
  const { userId } = useStore();

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
          <PersonalRecordCard key={index} record={record} colors={colors} userId={userId} />
        ))}
      </ScrollView>
    </View>
  );
}

/**
 * Карточка одного рекорда с бейджем уровня силы.
 * Вынесено в отдельный компонент, чтобы использовать хуки внутри map.
 */
function PersonalRecordCard({
  record,
  colors,
  userId,
}: {
  record: PersonalRecord;
  colors: any;
  userId: string | null;
}) {
  // Расчёт уровня силы (Фича 1)
  const standardResult = useStrengthStandards({
    exerciseName: record.exerciseName,
    e1rm: record.e1rm ?? 0,
    userId,
  });

  // Получаем вес пользователя для отображения в sheet
  const { data: profile } = useQuery({
    queryKey: ['profile-weight-pr', userId],
    queryFn: () => profileService.getProfileData(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
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
    <View
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
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
          <Text style={[typography.captionSmall, { color: colors.success, fontWeight: '700' }]}>
            1RM ≈ {record.e1rm} кг
          </Text>
          <StrengthLevelBadge
            result={standardResult}
            exerciseName={record.exerciseName}
            e1rm={record.e1rm ?? 0}
            bodyWeightKg={profile?.weight ?? null}
          />
        </View>
      )}
      {record.recordDate ? (
        <Text
          style={[typography.captionSmall, { color: colors.textTertiary, marginTop: SPACING.xs }]}
        >
          {formatDate(record.recordDate)}
        </Text>
      ) : null}
    </View>
  );
}
