import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  Activity,
  AlertTriangle,
  Beef,
  Calculator,
  ChevronLeft,
  Droplet,
  Flame,
  Minus,
  Pill,
  Ruler,
  Save,
  TrendingDown,
  TrendingUp,
  User,
  Weight,
  Wheat,
} from 'lucide-react-native';

import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { BORDER_RADIUS, SPACING } from '../../src/constants/theme';
import { commonStyles } from '../../src/styles/common';
import { typography } from '../../src/styles/typography';
import { AppButton } from '../../src/components/ui/AppButton';
import { AppInput } from '../../src/components/ui/AppInput';
import { AppCard } from '../../src/components/ui/AppCard';
import { MACRO_COLORS, PHARMA_COLORS } from '../../src/constants/semanticColors';
import { metricsService } from '../../src/services/metricsService';
import {
  getGoalsProfile,
  saveGoalsProfile,
  type GoalsSavePayload,
  type GoalType,
  type GenderType,
  type PharmaType,
} from '../../src/services/goalsService';

type IconComponent = typeof Activity;
type ThemeColors = ReturnType<typeof useTheme>['colors'];

const GOALS: Array<{
  value: GoalType;
  label: string;
  icon: IconComponent;
  desc: string;
}> = [
  {
    value: 'lose',
    label: 'Похудение',
    icon: TrendingDown,
    desc: 'Дефицит калорий',
  },
  {
    value: 'maintain',
    label: 'Поддержание',
    icon: Minus,
    desc: 'Баланс калорий',
  },
  {
    value: 'gain',
    label: 'Набор массы',
    icon: TrendingUp,
    desc: 'Профицит калорий',
  },
];

const GENDERS: Array<{
  value: GenderType;
  label: string;
  icon: IconComponent;
}> = [
  {
    value: 'male',
    label: 'Мужской',
    icon: User,
  },
  {
    value: 'female',
    label: 'Женский',
    icon: User,
  },
];

const ACTIVITY_LEVELS: Array<{
  value: number;
  label: string;
  desc: string;
}> = [
  { value: 1.2, label: 'Минимальная', desc: 'Сидячий образ жизни' },
  { value: 1.375, label: 'Низкая', desc: '1-2 тренировки/нед' },
  { value: 1.55, label: 'Средняя', desc: '3-4 тренировки/нед' },
  { value: 1.725, label: 'Высокая', desc: '5-6 тренировок/нед' },
  { value: 1.9, label: 'Очень высокая', desc: 'Ежедневные тренировки' },
];

const PHARMA_TYPES: Array<{
  value: Exclude<PharmaType, null>;
  label: string;
  desc: string;
  color: string;
}> = [
  {
    value: 'steroids',
    label: 'Анаболические стероиды',
    desc: 'Белок ×1.5, калории +10%',
    color: PHARMA_COLORS.steroids,
  },
  {
    value: 'gh',
    label: 'Гормон роста',
    desc: 'Жиры -20%',
    color: PHARMA_COLORS.gh,
  },
  {
    value: 'combo',
    label: 'Комбо (АС + ГР)',
    desc: 'Белок ×1.5, жиры -20%',
    color: PHARMA_COLORS.combo,
  },
];

function StepDots({
  step,
  activeColor,
  inactiveColor,
}: {
  step: number;
  activeColor: string;
  inactiveColor: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: SPACING.xl,
        gap: SPACING.sm,
      }}
    >
      {[1, 2, 3].map((s) => (
        <View
          key={s}
          style={{
            width: s === step ? 32 : 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: s === step ? activeColor : inactiveColor,
          }}
        />
      ))}
    </View>
  );
}

function CheckMark({
  backgroundColor,
  textColor,
}: {
  backgroundColor: string;
  textColor: string;
}) {
  return (
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={[typography.captionSmall, { color: textColor, fontWeight: '700' }]}>
        ✓
      </Text>
    </View>
  );
}

function GenderCard({
  selected,
  onPress,
  label,
  icon: Icon,
  colors,
}: {
  selected: boolean;
  onPress: () => void;
  label: string;
  icon: IconComponent;
  colors: ThemeColors;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        alignItems: 'center',
        paddingVertical: SPACING.lg,
        borderColor: selected ? colors.primary : colors.border,
        borderWidth: 2,
        backgroundColor: selected ? colors.primary + '15' : colors.surface,
        borderRadius: BORDER_RADIUS.lg,
      }}
    >
      <Icon size={32} color={selected ? colors.primary : colors.textSecondary} />
      <Text
        style={[
          typography.labelBold,
          {
            color: selected ? colors.primary : colors.textSecondary,
            marginTop: SPACING.sm,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SelectableRow({
  selected,
  onPress,
  icon: Icon,
  title,
  desc,
  accentColor,
  colors,
}: {
  selected: boolean;
  onPress: () => void;
  icon: IconComponent;
  title: string;
  desc: string;
  accentColor: string;
  colors: ThemeColors;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderColor: selected ? accentColor : colors.border,
        borderWidth: 2,
        backgroundColor: selected ? accentColor + '18' : colors.surface,
        marginBottom: SPACING.sm,
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
      }}
    >
      <Icon
        size={22}
        color={selected ? accentColor : colors.textSecondary}
        style={{ marginRight: SPACING.md }}
      />

      <View style={{ flex: 1 }}>
        <Text
          style={[
            typography.labelBold,
            { color: selected ? accentColor : colors.textPrimary },
          ]}
        >
          {title}
        </Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          {desc}
        </Text>
      </View>

      {selected && (
        <CheckMark backgroundColor={accentColor} textColor={colors.textInverse} />
      )}
    </TouchableOpacity>
  );
}

function MacroCard({
  icon: Icon,
  value,
  label,
  color,
  colors,
}: {
  icon: IconComponent;
  value: number;
  label: string;
  color: string;
  colors: ThemeColors;
}) {
  return (
    <AppCard
      variant="compact"
      style={{
        flex: 1,
        alignItems: 'center',
        borderColor: color,
        borderWidth: 2,
      }}
    >
      <Icon size={24} color={color} />
      <Text style={[typography.h3, { color, marginTop: SPACING.sm }]}>
        {value}г
      </Text>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>
        {label}
      </Text>
    </AppCard>
  );
}

export default function GoalsScreen() {
  const router = useRouter();
  const { userId } = useStore();
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);

  const [gender, setGender] = useState<GenderType | null>(null);
  const [birthDate, setBirthDate] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState<GoalType | null>(null);
  const [activityLevel, setActivityLevel] = useState<number | null>(null);

  const [usePharma, setUsePharma] = useState(false);
  const [pharmaType, setPharmaType] = useState<PharmaType>(null);

  const [calories, setCalories] = useState(0);
  const [proteins, setProteins] = useState(0);
  const [fats, setFats] = useState(0);
  const [carbs, setCarbs] = useState(0);

  const initializedRef = useRef(false);

  const { data: profile, isPending } = useQuery({
    queryKey: ['goalsProfile', userId],
    queryFn: () => getGoalsProfile(userId as string),
    enabled: !!userId,
  });

  const loading = !!userId && isPending;

  useEffect(() => {
    if (!profile || initializedRef.current) return;

    setGender(profile.gender);
    setBirthDate(profile.birthDate);
    setHeight(profile.height);
    setWeight(profile.weight);
    setGoal(profile.goal);
    setActivityLevel(profile.activityLevel);
    setUsePharma(profile.pharmacologyType !== null);
    setPharmaType(profile.pharmacologyType);
    setCalories(profile.calories);
    setProteins(profile.proteins);
    setFats(profile.fats);
    setCarbs(profile.carbs);

    initializedRef.current = true;
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: (payload: GoalsSavePayload) =>
      saveGoalsProfile(userId as string, payload),

    onSuccess: async (_data, variables) => {
      if (!userId) return;

      await queryClient.invalidateQueries({ queryKey: ['goalsProfile', userId] });
      await queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });

      try {
        if (variables.current_weight_kg) {
          const latestMetric = await metricsService.getLatestMetric(userId);

          if (!latestMetric || latestMetric.weight_kg !== variables.current_weight_kg) {
            await metricsService.createMetric(userId, {
              metric_date: new Date().toISOString().split('T')[0],
              weight_kg: variables.current_weight_kg,
            });
          }
        }
      } catch (metricError) {
        console.warn('Не удалось сохранить замер веса:', metricError);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert('Сохранено', 'Твои цели успешно обновлены!', [
        {
          text: 'Отлично',
          onPress: () => router.back(),
        },
      ]);
    },

    onError: (error: Error) => {
      Alert.alert('Ошибка', error.message || 'Не удалось сохранить цели');
    },
  });

  const saving = saveMutation.isPending;

  const calculateAge = (birthDateStr: string): number => {
    if (!birthDateStr) return 25;

    const birth = new Date(birthDateStr);
    const today = new Date();

    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  };

  const calculateMacros = () => {
    const age = calculateAge(birthDate);
    const h = parseFloat(height) || 175;
    const w = parseFloat(weight) || 70;
    const g = gender || 'male';
    const activity = activityLevel || 1.55;

    let bmr: number;

    if (g === 'male') {
      bmr = 10 * w + 6.25 * h - 5 * age + 5;
    } else {
      bmr = 10 * w + 6.25 * h - 5 * age - 161;
    }

    let targetCalories = bmr * activity;

    if (goal === 'lose') {
      targetCalories = targetCalories * 0.85;
    }

    if (goal === 'gain') {
      targetCalories = targetCalories * 1.15;
    }

    let targetProteins = Math.round(w * 2);
    let targetFats = Math.round(w * 1);

    if (usePharma && pharmaType) {
      if (pharmaType === 'steroids') {
        targetProteins = Math.min(Math.round(w * 3), 3 * w);
        targetCalories = targetCalories * 1.1;
      }

      if (pharmaType === 'gh') {
        targetFats = Math.round(targetFats * 0.8);
      }

      if (pharmaType === 'combo') {
        targetProteins = Math.min(Math.round(w * 3), 3 * w);
        targetFats = Math.round(targetFats * 0.8);
      }
    }

    const proteinCalories = targetProteins * 4;
    const fatCalories = targetFats * 9;
    const remainingCalories = Math.max(0, targetCalories - proteinCalories - fatCalories);
    const targetCarbs = Math.round(remainingCalories / 4);

    setCalories(Math.round(targetCalories));
    setProteins(targetProteins);
    setFats(targetFats);
    setCarbs(targetCarbs);
  };

  const handleCalculate = () => {
    if (!gender || !height || !weight || !goal || activityLevel === null) {
      Alert.alert('Заполни данные', 'Пожалуйста, заполни все поля');
      return;
    }

    if (usePharma && !pharmaType) {
      Alert.alert('Выбери тип', 'Укажи тип фармакологии или отключи переключатель');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    calculateMacros();
    setStep(3);
  };

  const handleSave = () => {
    if (!userId) return;

    if (!gender || !goal || activityLevel === null) {
      Alert.alert('Заполни данные', 'Укажи пол, цель и уровень активности');
      return;
    }

    const payload: GoalsSavePayload = {
      gender,
      birth_date: birthDate || null,
      height_cm: parseFloat(height) || null,
      current_weight_kg: parseFloat(weight) || null,
      goal,
      activity_level: activityLevel,
      pharmacology_type: usePharma ? pharmaType : null,
      target_calories: calories,
      target_proteins: proteins,
      target_fats: fats,
      target_carbs: carbs,
      updated_at: new Date().toISOString(),
    };

    saveMutation.mutate(payload);
  };

  const togglePharma = () => {
    const nextValue = !usePharma;

    setUsePharma(nextValue);

    if (!nextValue) {
      setPharmaType(null);
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const macroRatio = useMemo(() => {
    const total = proteins * 4 + fats * 9 + carbs * 4;

    if (!total) {
      return {
        proteins: 0,
        fats: 0,
        carbs: 0,
      };
    }

    return {
      proteins: Math.round((proteins * 4 / total) * 100),
      fats: Math.round((fats * 9 / total) * 100),
      carbs: Math.round((carbs * 4 / total) * 100),
    };
  }, [proteins, fats, carbs]);

  const pharmaLabel = PHARMA_TYPES.find((p) => p.value === pharmaType)?.label;

  if (!userId) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <View style={commonStyles.center}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Пользователь не авторизован
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <View style={commonStyles.center}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Загрузка...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          commonStyles.navHeader,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={commonStyles.backButton}>
          <ChevronLeft size={24} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>

        <Text style={[typography.h4, { color: colors.textPrimary }]}>Мои цели</Text>

        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}>
          <StepDots step={step} activeColor={colors.primary} inactiveColor={colors.border} />

          {step === 1 && (
            <>
              <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: SPACING.xs }]}>
                О тебе
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary, marginBottom: SPACING.xl }]}>
                Эти данные нужны для расчета нормы калорий
              </Text>

              <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.md }]}>
                Пол
              </Text>

              <View style={{ flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.xl }}>
                {GENDERS.map((g) => (
                  <GenderCard
                    key={g.value}
                    selected={gender === g.value}
                    onPress={() => {
                      setGender(g.value);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    label={g.label}
                    icon={g.icon}
                    colors={colors}
                  />
                ))}
              </View>

              <AppInput
                label="Дата рождения"
                placeholder="ГГГГ-ММ-ДД"
                value={birthDate}
                onChangeText={setBirthDate}
              />

              <AppInput
                label="Рост (см)"
                placeholder="175"
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
                icon={<Ruler size={20} color={colors.primary} />}
              />

              <AppInput
                label="Текущий вес (кг)"
                placeholder="70"
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                icon={<Weight size={20} color={colors.primary} />}
              />

              <AppButton
                title="Далее"
                variant="primary"
                size="large"
                onPress={() => {
                  if (!gender || !height || !weight) {
                    Alert.alert('Заполни данные', 'Укажи пол, рост и вес');
                    return;
                  }

                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setStep(2);
                }}
                style={{ marginTop: SPACING.md }}
              />
            </>
          )}

          {step === 2 && (
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
                      setGoal(g.value);
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
                      setActivityLevel(level.value);
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

              <AppCard variant="compact">
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
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
                    onPress={togglePharma}
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

              {usePharma && (
                <>
                  <Text
                    style={[
                      typography.h3,
                      {
                        color: colors.textPrimary,
                        marginBottom: SPACING.xs,
                        marginTop: SPACING.lg,
                      },
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
                          setPharmaType(p.value);
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
                        <Text
                          style={[
                            typography.caption,
                            { color: colors.textSecondary, lineHeight: 18 },
                          ]}
                        >
                          Использование фармакологических препаратов может нанести серьёзный вред здоровью.
                          Расчет КБЖУ с учетом фармакологии является приблизительным.
                          Настоятельно рекомендуем проконсультироваться с врачом перед началом курса.
                        </Text>
                      </View>
                    </View>
                  </AppCard>
                </>
              )}

              <View style={{ flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg }}>
                <AppButton
                  title="Назад"
                  variant="secondary"
                  size="large"
                  onPress={() => setStep(1)}
                  style={{ flex: 1 }}
                />

                <AppButton
                  title="Рассчитать"
                  variant="primary"
                  size="large"
                  icon={<Calculator size={20} color={colors.textInverse} />}
                  onPress={handleCalculate}
                  style={{ flex: 2 }}
                />
              </View>
            </>
          )}

          {step === 3 && (
            <>
              <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: SPACING.xs }]}>
                Твоя норма
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary, marginBottom: SPACING.xl }]}>
                Рекомендуемые значения на день
              </Text>

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

              <AppCard
                variant="highlighted"
                style={{
                  backgroundColor: colors.primary,
                  marginBottom: SPACING.lg,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm }}>
                  <Flame size={24} color={colors.textInverse} />
                  <Text
                    style={[
                      typography.h5,
                      { color: colors.textInverse, marginLeft: SPACING.sm },
                    ]}
                  >
                    Калории
                  </Text>
                </View>

                <Text style={[typography.h1, { color: colors.textInverse, marginBottom: SPACING.xs }]}>
                  {calories}
                </Text>
                <Text style={[typography.body, { color: colors.textInverse }]}>
                  ккал / день
                </Text>
              </AppCard>

              <View style={{ flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg }}>
                <MacroCard
                  icon={Beef}
                  value={proteins}
                  label="Белки"
                  color={MACRO_COLORS.proteins}
                  colors={colors}
                />
                <MacroCard
                  icon={Droplet}
                  value={fats}
                  label="Жиры"
                  color={MACRO_COLORS.fats}
                  colors={colors}
                />
                <MacroCard
                  icon={Wheat}
                  value={carbs}
                  label="Углеводы"
                  color={MACRO_COLORS.carbs}
                  colors={colors}
                />
              </View>

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
                  <View
                    style={{
                      width: `${macroRatio.proteins}%`,
                      backgroundColor: MACRO_COLORS.proteins,
                    }}
                  />
                  <View
                    style={{
                      width: `${macroRatio.fats}%`,
                      backgroundColor: MACRO_COLORS.fats,
                    }}
                  />
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: MACRO_COLORS.carbs,
                    }}
                  />
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

              <AppCard variant="compact" style={{ marginTop: SPACING.lg, marginBottom: SPACING.xl }}>
                <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
                  ℹ️ Как рассчитано
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 18 }]}>
                  Использована формула Миффлина-Сан Жеора с учетом твоего пола, возраста, роста, веса и уровня активности.
                  {goal === 'lose' && ' Для похудения создан дефицит 15%.'}
                  {goal === 'gain' && ' Для набора массы создан профицит 15%.'}
                  {' '}Соотношение макросов: белки 2г/кг, жиры 1г/кг, углеводы — остаток калорий.
                  {usePharma && pharmaType === 'steroids' && ' С учетом АС: белок увеличен до 3г/кг, калории +10%.'}
                  {usePharma && pharmaType === 'gh' && ' С учетом ГР: жиры снижены на 20%.'}
                  {usePharma && pharmaType === 'combo' && ' С учетом комбо: белок 3г/кг, жиры -20%.'}
                </Text>
              </AppCard>

              <View style={{ flexDirection: 'row', gap: SPACING.md }}>
                <AppButton
                  title="Изменить"
                  variant="secondary"
                  size="large"
                  onPress={() => setStep(2)}
                  style={{ flex: 1 }}
                />

                <AppButton
                  title={saving ? 'Сохранение...' : 'Сохранить цели'}
                  variant="primary"
                  size="large"
                  loading={saving}
                  disabled={saving}
                  icon={!saving ? <Save size={20} color={colors.textInverse} /> : undefined}
                  onPress={handleSave}
                  style={{ flex: 2 }}
                />
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}