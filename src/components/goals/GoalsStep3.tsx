import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { Beef, Droplet, Flame, Pill, Save, Wheat } from 'lucide-react-native';
import { SPACING } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { AppButton } from '../ui/AppButton';
import { AppCard } from '../ui/AppCard';
import { MACRO_COLORS } from '../../constants/semanticColors';
import { PHARMA_TYPES } from '../../constants/goals';
import { MacroCard } from './GoalsComponents';
import type { GoalType, PharmaType } from '../../services/goalsService';
import type { ThemeColors } from '../../constants/theme';

interface GoalsStep3Props {
  calories: number;
  proteins: number;
  fats: number;
  carbs: number;
  usePharma: boolean;
  pharmaType: PharmaType;
  goal: GoalType | null;
  saving: boolean;
  onBack: () => void;
  onSave: () => void;
  colors: ThemeColors;
}

export function GoalsStep3({
  calories,
  proteins,
  fats,
  carbs,
  usePharma,
  pharmaType,
  goal,
  saving,
  onBack,
  onSave,
  colors,
}: GoalsStep3Props) {
  const macroRatio = useMemo(() => {
    const total = proteins * 4 + fats * 9 + carbs * 4;
    if (!total) {
      return { proteins: 0, fats: 0, carbs: 0 };
    }
    return {
      proteins: Math.round(((proteins * 4) / total) * 100),
      fats: Math.round(((fats * 9) / total) * 100),
      carbs: Math.round(((carbs * 4) / total) * 100),
    };
  }, [proteins, fats, carbs]);

  const pharmaLabel = PHARMA_TYPES.find((p) => p.value === pharmaType)?.label;

  return (
    <>
      <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: SPACING.xs }]}>
        Твоя норма
      </Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginBottom: SPACING.xl }]}>
        Рекомендуемые значения на день
      </Text>

      {/* Плашка фармакологии */}
      {usePharma && pharmaType && pharmaLabel && (
        <AppCard
          variant="compact"
          style={{
            borderColor: colors.warning,
            borderWidth: 1,
            backgroundColor: colors.warning + '10',
            marginBottom: SPACING.lg,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pill size={16} color={colors.warning} style={{ marginRight: SPACING.sm }} />
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Расчет с учетом фармакологии: {pharmaLabel}
            </Text>
          </View>
        </AppCard>
      )}

      {/* Калории */}
      <AppCard variant="highlighted" style={{ backgroundColor: colors.primary, marginBottom: SPACING.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm }}>
          <Flame size={24} color={colors.textInverse} />
          <Text style={[typography.h5, { color: colors.textInverse, marginLeft: SPACING.sm }]}>
            Калории
          </Text>
        </View>
        <Text style={[typography.h1, { color: colors.textInverse, marginBottom: SPACING.xs }]}>
          {calories}
        </Text>
        <Text style={[typography.body, { color: colors.textInverse }]}>ккал / день</Text>
      </AppCard>

      {/* Макросы */}
      <View style={{ flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg }}>
        <MacroCard icon={Beef} value={proteins} label="Белки" color={MACRO_COLORS.proteins} colors={colors} />
        <MacroCard icon={Droplet} value={fats} label="Жиры" color={MACRO_COLORS.fats} colors={colors} />
        <MacroCard icon={Wheat} value={carbs} label="Углеводы" color={MACRO_COLORS.carbs} colors={colors} />
      </View>

      {/* Соотношение макросов */}
      <AppCard variant="compact">
        <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.md }]}>
          Соотношение макросов
        </Text>
        <View
          style={{
            flexDirection: 'row',
            height: 8,
            borderRadius: 4,
            overflow: 'hidden',
            marginBottom: SPACING.sm,
          }}
        >
          <View style={{ width: `${macroRatio.proteins}%`, backgroundColor: MACRO_COLORS.proteins }} />
          <View style={{ width: `${macroRatio.fats}%`, backgroundColor: MACRO_COLORS.fats }} />
          <View style={{ flex: 1, backgroundColor: MACRO_COLORS.carbs }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={[typography.caption, { color: MACRO_COLORS.proteins }]}>
            Б: {macroRatio.proteins}%
          </Text>
          <Text style={[typography.caption, { color: MACRO_COLORS.fats }]}>
            Ж: {macroRatio.fats}%
          </Text>
          <Text style={[typography.caption, { color: MACRO_COLORS.carbs }]}>
            У: {macroRatio.carbs}%
          </Text>
        </View>
      </AppCard>

      {/* Как рассчитано */}
      <AppCard variant="compact" style={{ marginTop: SPACING.lg, marginBottom: SPACING.xl }}>
        <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
          ℹ️ Как рассчитано
        </Text>
        <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 18 }]}>
          Использована формула Миффлина-Сан Жеора с учетом твоего пола, возраста, роста, веса и
          уровня активности.
          {goal === 'lose' && ' Для похудения создан дефицит 15%.'}
          {goal === 'gain' && ' Для набора массы создан профицит 15%.'}{' '}
          Соотношение макросов: белки 2г/кг, жиры 1г/кг, углеводы — остаток калорий.
          {usePharma && pharmaType === 'steroids' && ' С учетом АС: белок увеличен до 3г/кг, калории +10%.'}
          {usePharma && pharmaType === 'gh' && ' С учетом ГР: жиры снижены на 20%.'}
          {usePharma && pharmaType === 'combo' && ' С учетом комбо: белок 3г/кг, жиры -20%.'}
        </Text>
      </AppCard>

      {/* Кнопки */}
      <View style={{ flexDirection: 'row', gap: SPACING.md }}>
        <AppButton
          title="Изменить"
          variant="secondary"
          size="large"
          onPress={onBack}
          style={{ flex: 1 }}
        />
        <AppButton
          title={saving ? 'Сохранение...' : 'Сохранить цели'}
          variant="primary"
          size="large"
          loading={saving}
          disabled={saving}
          icon={!saving ? <Save size={20} color={colors.textInverse} /> : undefined}
          onPress={onSave}
          style={{ flex: 2 }}
        />
      </View>
    </>
  );
}