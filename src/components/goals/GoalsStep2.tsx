import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Activity, Calculator, Pill, AlertTriangle } from 'lucide-react-native';
import { SPACING } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { AppButton } from '../ui/AppButton';
import { AppCard } from '../ui/AppCard';
import { GOALS, ACTIVITY_LEVELS, PHARMA_TYPES } from '../../constants/goals';
import { SelectableRow } from './GoalsComponents';
import type { GoalType, PharmaType } from '../../services/goalsService';
import type { ThemeColors } from '../../constants/theme';

interface GoalsStep2Props {
  goal: GoalType | null;
  onGoalChange: (g: GoalType) => void;
  activityLevel: number | null;
  onActivityLevelChange: (v: number) => void;
  usePharma: boolean;
  pharmaType: PharmaType;
  onTogglePharma: () => void;
  onPharmaTypeChange: (v: PharmaType) => void;
  onBack: () => void;
  onCalculate: () => void;
  colors: ThemeColors;
}

export function GoalsStep2({
  goal,
  onGoalChange,
  activityLevel,
  onActivityLevelChange,
  usePharma,
  pharmaType,
  onTogglePharma,
  onPharmaTypeChange,
  onBack,
  onCalculate,
  colors,
}: GoalsStep2Props) {
  return (
    <>
      <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: SPACING.xs }]}>
        Твоя цель
      </Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginBottom: SPACING.xl }]}>
        Выбери, чего хочешь достичь
      </Text>
      <View style={{ marginBottom: SPACING.xl }}>
        {GOALS.map((g) => (
          <SelectableRow
            key={g.value}
            selected={goal === g.value}
            onPress={() => {
              onGoalChange(g.value);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            icon={g.icon}
            title={g.label}
            desc={g.desc}
            accentColor={colors.primary}
            colors={colors}
          />
        ))}
      </View>

      <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: SPACING.xs }]}>
        Уровень активности
      </Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginBottom: SPACING.xl }]}>
        Сколько тренировок в неделю?
      </Text>
      <View style={{ marginBottom: SPACING.xl }}>
        {ACTIVITY_LEVELS.map((level) => (
          <SelectableRow
            key={level.value}
            selected={activityLevel === level.value}
            onPress={() => {
              onActivityLevelChange(level.value);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            icon={Activity}
            title={level.label}
            desc={level.desc}
            accentColor={colors.primary}
            colors={colors}
          />
        ))}
      </View>

      {/* Тумблер фармакологии */}
      <AppCard variant="compact">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Pill
              size={20}
              color={usePharma ? colors.primary : colors.textSecondary}
              style={{ marginRight: SPACING.sm }}
            />
            <View style={{ flex: 1 }}>
              <Text style={[typography.labelBold, { color: colors.textPrimary }]}>
                Использую фармакологию
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                АС, ГР или комбо
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onTogglePharma}
            style={{
              width: 50,
              height: 28,
              borderRadius: 14,
              backgroundColor: usePharma ? colors.primary : colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: colors.textInverse,
                transform: [{ translateX: usePharma ? 12 : -12 }],
              }}
            />
          </TouchableOpacity>
        </View>
      </AppCard>

      {/* Тип фармакологии */}
      {usePharma && (
        <>
          <Text
            style={[
              typography.h3,
              { color: colors.textPrimary, marginBottom: SPACING.xs, marginTop: SPACING.lg },
            ]}
          >
            Тип фармакологии
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginBottom: SPACING.xl }]}>
            Выбери, что используешь
          </Text>
          <View style={{ marginBottom: SPACING.xl }}>
            {PHARMA_TYPES.map((p) => (
              <SelectableRow
                key={p.value}
                selected={pharmaType === p.value}
                onPress={() => {
                  onPharmaTypeChange(p.value);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                icon={Pill}
                title={p.label}
                desc={p.desc}
                accentColor={p.color}
                colors={colors}
              />
            ))}
          </View>

          <AppCard
            variant="compact"
            style={{
              borderColor: colors.warning,
              borderWidth: 1,
              backgroundColor: colors.warning + '10',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <AlertTriangle
                size={20}
                color={colors.warning}
                style={{ marginRight: SPACING.sm, marginTop: 2 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    typography.labelBold,
                    { color: colors.textPrimary, marginBottom: SPACING.xs },
                  ]}
                >
                  Важное предупреждение
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 18 }]}>
                  Использование фармакологических препаратов может нанести серьёзный вред здоровью.
                  Расчет КБЖУ с учетом фармакологии является приблизительным. Настоятельно рекомендуем
                  проконсультироваться с врачом перед началом курса.
                </Text>
              </View>
            </View>
          </AppCard>
        </>
      )}

      {/* Кнопки навигации */}
      <View style={{ flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg }}>
        <AppButton
          title="Назад"
          variant="secondary"
          size="large"
          onPress={onBack}
          style={{ flex: 1 }}
        />
        <AppButton
          title="Рассчитать"
          variant="primary"
          size="large"
          icon={<Calculator size={20} color={colors.textInverse} />}
          onPress={onCalculate}
          style={{ flex: 2 }}
        />
      </View>
    </>
  );
}