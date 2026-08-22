// src/components/workout/AlternativeExerciseCard.tsx
// PR5: карточка выбора замены — сравнение и решение.
// Риски и Противопоказания — видимые блоки ПЕРЕД CTA (PRODUCT.md §8: safety сразу,
// пользователь видит ограничения до принятия решения о замене).
// Техника выполнения — аккордеон с lazy mount (CLAUDE.md §8).
import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { RotateCcw, Sparkles, ShieldAlert, AlertTriangle, TrendingUp, TrendingDown, Shuffle } from 'lucide-react-native';
import { SPACING } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { createCardStyles } from '../../styles/components/card';
import { EquipmentBubbles } from './EquipmentBubbles';
import { MuscleBubbles } from './MuscleBubbles';
import { ExerciseCardTechnique } from './sections/ExerciseCardTechnique';
import { AlternativeExercise } from '../../types/workout';

interface AlternativeExerciseCardProps {
  exercise: AlternativeExercise;
  exerciseIndex: number;
  // UX-5 Feature 1: запрос на замену — caller выбирает тип (temp vs program)
  onRequestReplace: (exIndex: number, altId: string) => void;
  colors: any;
  cardStyles: ReturnType<typeof createCardStyles>;
}

/** Главный заголовок видимого блока (без accordion). */
function BlockHeading({
  icon,
  label,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        marginTop: SPACING.md,
        marginBottom: SPACING.sm,
      }}
    >
      {icon}
      <Text style={[typography.labelBold, { color }]}>{label}</Text>
    </View>
  );
}

export const AlternativeExerciseCard = memo(function AlternativeExerciseCard({
  exercise,
  exerciseIndex,
  onRequestReplace,
  colors,
  cardStyles,
}: AlternativeExerciseCardProps) {
const hasTechniqueBlock =
  !!exercise.technique || !!exercise.media_url || !!exercise.settings;
const hasBenefits = !!exercise.benefits;
const hasRisks = !!exercise.risks;
const hasInjuries = exercise.injuries.length > 0;

  return (
    <View
      style={[
        cardStyles.container,
        cardStyles.workoutExerciseCard,
        { borderWidth: 1, borderColor: colors.border },
      ]}
    >
      {/* Header: название */}
      <Text
        style={[
          cardStyles.workoutExerciseName,
          { color: colors.textPrimary, marginBottom: SPACING.xs },
        ]}
        numberOfLines={2}
      >
        {exercise.name}
      </Text>

      {/* ENG-5: бейдж типа замены (L1 — пользователь сразу видит семантику варианта) */}
      {exercise.relation_type === 'progression' && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            gap: 4,
            backgroundColor: colors.primary + '15',
            paddingHorizontal: SPACING.sm,
            paddingVertical: 3,
            borderRadius: SPACING.sm,
            marginBottom: SPACING.sm,
          }}
        >
          <TrendingUp size={12} color={colors.primary} strokeWidth={2} />
          <Text style={[typography.captionSmall, { color: colors.primary, fontWeight: '700' }]}>
            Прогрессия
          </Text>
        </View>
      )}
      {exercise.relation_type === 'regression' && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            gap: 4,
            backgroundColor: colors.warning + '15',
            paddingHorizontal: SPACING.sm,
            paddingVertical: 3,
            borderRadius: SPACING.sm,
            marginBottom: SPACING.sm,
          }}
        >
          <TrendingDown size={12} color={colors.warning} strokeWidth={2} />
          <Text style={[typography.captionSmall, { color: colors.warning, fontWeight: '700' }]}>
            Упрощение
          </Text>
        </View>
      )}
      {exercise.relation_type === 'variation' && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            gap: 4,
            backgroundColor: colors.surfaceSecondary,
            paddingHorizontal: SPACING.sm,
            paddingVertical: 3,
            borderRadius: SPACING.sm,
            marginBottom: SPACING.sm,
          }}
        >
          <Shuffle size={12} color={colors.textSecondary} strokeWidth={2} />
          <Text style={[typography.captionSmall, { color: colors.textSecondary, fontWeight: '600' }]}>
            Вариант
          </Text>
        </View>
      )}

      {/* Summary: мышцы */}
      {(exercise.primary_muscles.length > 0 || exercise.secondary_muscles.length > 0) && (
        <View style={{ marginBottom: SPACING.sm }}>
          <MuscleBubbles
            primaryMuscles={exercise.primary_muscles}
            secondaryMuscles={exercise.secondary_muscles}
          />
        </View>
      )}

      {/* Summary: оборудование */}
      <View style={{ marginBottom: SPACING.md }}>
        <EquipmentBubbles
          equipment={exercise.equipment}
          primaryMuscles={exercise.primary_muscles}
        />
      </View>

      {/* === Блок «Польза» (всегда видимый) === */}
      {hasBenefits && (
        <>
          <BlockHeading
            icon={<Sparkles size={14} color={colors.success} />}
            label="Польза"
            color={colors.success}
          />
          <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18 }]}>
            {exercise.benefits}
          </Text>
        </>
      )}

      {/* === Блок «Риски» (всегда видимый, ПЕРЕД CTA) === */}
      {hasRisks && (
        <>
          <BlockHeading
            icon={<AlertTriangle size={14} color={colors.warning} />}
            label="Риски"
            color={colors.warning}
          />
          <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18 }]}>
            {exercise.risks}
          </Text>
        </>
      )}

      {/* === Блок «Противопоказания» (всегда видимый, ПЕРЕД CTA) === */}
      {hasInjuries && (
        <>
          <BlockHeading
            icon={<ShieldAlert size={14} color={colors.error} />}
            label="Противопоказания"
            color={colors.error}
          />
          {exercise.injuries.map((inj, i) => (
            <View
              key={i}
              style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}
            >
              <Text style={[typography.bodySmall, { color: colors.error, marginRight: 6 }]}>
                •
              </Text>
              <Text
                style={[
                  typography.bodySmall,
                  { color: colors.textSecondary, lineHeight: 18, flex: 1 },
                ]}
              >
                {inj}
              </Text>
            </View>
          ))}
        </>
      )}

      {/* === CTA: Заменить на это === */}
      <TouchableOpacity
        style={[
          cardStyles.replaceButton,
          {
            borderColor: colors.primary,
            backgroundColor: colors.primaryLight,
            marginTop: SPACING.md,
            marginBottom: SPACING.md,
          },
        ]}
        onPress={() => onRequestReplace(exerciseIndex, exercise.id)}
      >
        <RotateCcw size={16} color={colors.primary} strokeWidth={2} />
        <Text style={[cardStyles.replaceButtonText, { color: colors.primary }]}>
          Заменить на это
        </Text>
      </TouchableOpacity>

      {/* === Аккордеон «Техника выполнения» (lazy mount через ExerciseCardTechnique) === */}
      {hasTechniqueBlock && (
        <ExerciseCardTechnique
          technique={exercise.technique}
          mediaUrl={exercise.media_url}
          settingsText={exercise.settings}
          defaultExpanded={false}
          colors={colors}
        />
      )}
    </View>
  );
});