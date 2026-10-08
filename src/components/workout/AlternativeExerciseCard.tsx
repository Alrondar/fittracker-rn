// src/components/workout/AlternativeExerciseCard.tsx
// ALT-L2 (08.10): карточка замены = L1-сводка + Info-блок, тем же механизмом, что
// в основной карточке (UX-16 D3/D6): кнопка Info открывает inline-блок с табами
// «Техника» / «Важно знать» (InfoButton + ExerciseCardInfo — общие с основной
// карточкой носители). Info стоит в одном ряду с «Заменить», как в ActionsRow
// основной карточки («Таймер» + Info).
//
// Почему переработана: страница слайдера ограничена высотой основной карточки
// (ExerciseSlider: maxHeight = mainHeight, наследие SP-1/FX-2). Раньше сюда
// рендерилась вся база знаний (Польза ~5 строк + Риски + Противопоказания +
// аккордеон техники) — контент не влезал, а за клип уходило главное: CTA
// «Заменить» (вложенный вертикальный ScrollView без nestedScrollEnabled на
// Android не скроллится).
//
// На L1: название, бейдж связи, снаряды и мышцы, описание (benefits) ЦЕЛИКОМ без
// усечения и противопоказания чипом (PRODUCT.md §8: ограничения видны ДО нажатия
// «Заменить»). Ряд «Заменить» + Info идёт за описанием, а табы — под рядом, так
// что раскрытие Info ничего не сдвигает.
import React, { memo, useState, useCallback } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { PressableScale } from '../ui/PressableScale';
import { RotateCcw, ShieldAlert, BookOpen, ChevronRight } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS, withAlpha } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { createCardStyles } from '../../styles/components/card';
import { EquipmentBubbles } from './EquipmentBubbles';
import { MuscleBubbles } from './MuscleBubbles';
import { InfoButton } from './sections/ExerciseCardActions';
import { ExerciseCardInfo } from './sections/ExerciseCardInfo';
import { AlternativeRelationBadge } from './sections/AlternativeRelationBadge';
import { AlternativeExercise } from '../../types/workout';

interface AlternativeExerciseCardProps {
  exercise: AlternativeExercise;
  exerciseIndex: number;
  // UX-5 Feature 1: запрос на замену — caller выбирает тип (temp vs program)
  onRequestReplace: (exIndex: number, altId: string) => void;
  colors: any;
  cardStyles: ReturnType<typeof createCardStyles>;
}

export const AlternativeExerciseCard = memo(function AlternativeExerciseCard({
  exercise,
  exerciseIndex,
  onRequestReplace,
  colors,
  cardStyles,
}: AlternativeExerciseCardProps) {
  // UX-16 D3/D6 (как в ExerciseCard): state живёт в карточке, контент Info
  // монтируется только при открытии и размонтируется при «Скрыть».
  const [infoOpen, setInfoOpen] = useState(false);
  const handleToggleInfo = useCallback(() => setInfoOpen((v) => !v), []);
  const router = useRouter();

  const mediaUrl = exercise.media_url ?? null;
  const settingsText = exercise.settings || '';
  const hasMuscles = exercise.primary_muscles.length > 0 || exercise.secondary_muscles.length > 0;
  const hasInjuries = exercise.injuries.length > 0;
  const hasTechniqueContent = !!(exercise.technique || mediaUrl || settingsText);
  // «Важно знать» в табе = то, чего нет на L1: риски и противопоказания целиком.
  // Описание (benefits) показываем выше полностью, дублировать его в табе нельзя.
  const hasKnowledgeContent = !!(exercise.risks || hasInjuries);
  const hasInfoContent = hasTechniqueContent || hasKnowledgeContent;

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

      {/* ENG-5: бейдж типа замены (L1 — семантика варианта) */}
      <AlternativeRelationBadge relation={exercise.relation_type} compact />

      {/* Summary: мышцы + оборудование */}
      {hasMuscles && (
        <View style={{ marginBottom: SPACING.xs }}>
          <MuscleBubbles
            primaryMuscles={exercise.primary_muscles}
            secondaryMuscles={exercise.secondary_muscles}
          />
        </View>
      )}
      <View style={{ marginBottom: SPACING.sm }}>
        <EquipmentBubbles
          equipment={exercise.equipment}
          primaryMuscles={exercise.primary_muscles}
        />
      </View>

      {/* Описание упражнения — целиком, без усечения (вердикт владельца 08.10).
          В табе «Важно знать» его нет: там только то, что не влезло на L1 */}
      {!!exercise.benefits && (
        <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18 }]}>
          {exercise.benefits}
        </Text>
      )}

      {/* Safety (PRODUCT.md §8): противопоказания видимы до нажатия «Заменить» —
          списком названий в чипе, а не абзацем. */}
      {hasInjuries && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: SPACING.xs,
            marginTop: SPACING.sm,
            paddingHorizontal: SPACING.sm,
            paddingVertical: 6,
            borderRadius: SPACING.sm,
            backgroundColor: withAlpha(colors.error, 0.082),
          }}
        >
          <ShieldAlert size={13} color={colors.error} strokeWidth={2} style={{ marginTop: 1 }} />
          <Text
            style={[typography.captionSmall, { color: colors.error, flex: 1, lineHeight: 16 }]}
            numberOfLines={2}
          >
            Нельзя при: {exercise.injuries.join(', ')}
          </Text>
        </View>
      )}

      {/* Действия в один ряд — та же композиция, что в ActionsRow основной
          карточки («Таймер» + Info), только вместо таймера — «Заменить».
          Ряд НАД Info-блоком: раскрытие табов не уводит кнопку за клип. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'stretch',
          gap: SPACING.sm,
          marginTop: SPACING.md,
        }}
      >
        <PressableScale
          style={[
            cardStyles.replaceButton,
            {
              flex: 1,
              marginTop: 0,
              marginBottom: 0,
              borderColor: colors.primary,
              backgroundColor: colors.primaryLight,
            },
          ]}
          onPress={() => onRequestReplace(exerciseIndex, exercise.id)}
          accessibilityRole="button"
          accessibilityLabel={`Заменить на ${exercise.name}`}
        >
          <RotateCcw size={16} color={colors.primary} strokeWidth={2} />
          <Text style={[cardStyles.replaceButtonText, { color: colors.primary }]}>Заменить</Text>
        </PressableScale>

        {/* UX-16 D6: та же кнопка Info, что в ActionsRow (общий носитель — InfoButton) */}
        {hasInfoContent && (
          <InfoButton onOpenInfo={handleToggleInfo} infoVisible={infoOpen} colors={colors} />
        )}
      </View>

      {/* L3: страница упражнения в справочнике — id замены это id упражнения из
          справочника (тот же маршрут, что у «Полной карточки упражнения» в листе
          разминки). Тertiary-действие: контурная кнопка тише primary «Заменить». */}
      <PressableScale
        onPress={() => router.push(`/exercise/${exercise.id}`)}
        accessibilityRole="link"
        accessibilityLabel={`Открыть страницу упражнения: ${exercise.name}`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: SPACING.xs,
          marginTop: SPACING.sm,
          paddingVertical: SPACING.md,
          paddingHorizontal: SPACING.md,
          minHeight: 44, // PRODUCT.md §3.1 — тач-таргет не меньше 44 pt
          borderRadius: BORDER_RADIUS.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: 'transparent',
        }}
      >
        <BookOpen size={15} color={colors.textSecondary} strokeWidth={2} />
        <Text
          style={[typography.captionSmall, { color: colors.textSecondary, fontWeight: '700' }]}
          numberOfLines={1}
        >
          Открыть страницу упражнения
        </Text>
        <ChevronRight size={14} color={colors.textTertiary} />
      </PressableScale>

      {/* UX-16 D3: тот же Info-блок, что в основной карточке: PillToggle
          «Техника» / «Важно знать», демонстрация, описание техники, настройки
          оборудования, риски, противопоказания, empty-состояния */}
      {infoOpen && hasInfoContent && (
        <ExerciseCardInfo
          technique={exercise.technique}
          mediaUrl={mediaUrl}
          settingsText={settingsText}
          benefits=""
          risks={exercise.risks}
          injuries={exercise.injuries}
          colors={colors}
        />
      )}
    </View>
  );
});
