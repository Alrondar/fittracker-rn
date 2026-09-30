// app/onboarding/index.tsx
// Онбординг-анкета после регистрации (NEOB-1).
// Шаги 1–3 переиспользуют компоненты `src/components/goals/*` и тот же
// calculateMacros, что и «Профиль → Мои цели» — анкеты не расходятся.
// Анкета НЕОБЯЗАТЕЛЬНАЯ: «Пропустить» доступна с любого шага, после пропуска
// пользователь получает подсказку, где заполнить данные позже
// (Профиль → «Мои цели» и «Замеры тела»).
// Маршрут: корневой гейт (app/_layout.tsx) ведёт сюда по флагу justRegistered;
// экран снимает флаг на «сохранил»/«пропустил» и уходит в /(tabs).
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Activity, ChevronLeft, Flame, Target } from 'lucide-react-native';
import { feedback } from '../../src/lib/feedback';
import { PressableScale } from '../../src/components/ui/PressableScale';
import { AppButton } from '../../src/components/ui/AppButton';
import { AppCard } from '../../src/components/ui/AppCard';
import { SPACING } from '../../src/constants/theme';
import { commonStyles } from '../../src/styles/common';
import { typography } from '../../src/styles/typography';
import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { metricsService } from '../../src/services/metricsService';
import { todayKey } from '../../src/utils/dateKey';
import { mapError } from '../../src/utils/errorMapper';
import { calculateMacros } from '../../src/utils/macroCalculator';
import {
  saveGoalsProfile,
  markOnboardingDone,
  type GoalsSavePayload,
  type GoalType,
  type GenderType,
  type PharmaType,
} from '../../src/services/goalsService';
import { StepDots } from '../../src/components/goals/GoalsComponents';
import { GoalsStep1 } from '../../src/components/goals/GoalsStep1';
import { GoalsStep2 } from '../../src/components/goals/GoalsStep2';
import { GoalsStep3 } from '../../src/components/goals/GoalsStep3';
import BenchPressIcon from '../../src/assets/equipment-icons/bench-press.svg';

// Где анкета живёт после пропуска — один источник строки (welcome + диалог скипа).
const LATER_HINT =
  'Заполнить позже можно в Профиле: «Мои цели» — расчёт КБЖУ, «Замеры тела» — вес и обхваты.';

export default function OnboardingSurveyScreen() {
  const router = useRouter();
  const { userId, setJustRegistered } = useStore();
  const { colors, gradients } = useTheme();
  const queryClient = useQueryClient();

  // 0 — welcome, 1–3 — те же шаги, что в «Мои цели»
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState<GenderType | null>(null);
  const [birthDate, setBirthDate] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState<GoalType | null>(null);
  const [activityLevel, setActivityLevel] = useState<number | null>(null);
  const [usePharma, setUsePharma] = useState(false);
  const [pharmaType, setPharmaType] = useState<PharmaType>(null);
  const [useBodyFat, setUseBodyFat] = useState(false);
  const [bodyFatPercentage, setBodyFatPercentage] = useState<number | null>(null);
  const [calories, setCalories] = useState(0);
  const [proteins, setProteins] = useState(0);
  const [fats, setFats] = useState(0);
  const [carbs, setCarbs] = useState(0);

  /** Выход из анкеты: снимает флаг гейта и уводит в табы. */
  const finish = () => {
    setJustRegistered(false);
    router.replace('/(tabs)');
  };

  /** Итог анкеты пишется best-effort: ошибка записи не удерживает пользователя. */
  const markAndFinish = (status: 'completed' | 'skipped') => {
    if (userId) {
      markOnboardingDone(userId, status).catch((e) => console.warn('[onboarding] mark failed:', e));
    }
    finish();
  };

  const handleSkip = () => {
    if (step === 0) {
      markAndFinish('skipped');
      return;
    }
    // Требование NEOB-1: при пропуске явно говорим, где данные заполняются позже.
    feedback.alert('Пропустить анкету?', LATER_HINT, [
      { text: 'Вернуться', style: 'cancel' },
      { text: 'Пропустить', onPress: () => markAndFinish('skipped') },
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: GoalsSavePayload) => {
      if (!userId) throw new Error('no user');
      await saveGoalsProfile(userId, payload);
      // Первый замер веса — как при сохранении в «Мои цели» (goals.tsx):
      // трекер веса на Главной/графиках стартует сразу после анкеты.
      if (payload.current_weight_kg) {
        const latest = await metricsService.getLatestMetric(userId);
        if (!latest || latest.weight_kg !== payload.current_weight_kg) {
          await metricsService.createMetric(userId, {
            metric_date: todayKey(),
            weight_kg: payload.current_weight_kg,
          });
        }
      }
    },
    onSuccess: async () => {
      if (userId) {
        await queryClient.invalidateQueries({ queryKey: ['goalsProfile', userId] });
        await queryClient.invalidateQueries({ queryKey: ['profile', userId] });
        await queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
        await queryClient.invalidateQueries({ queryKey: ['body_metrics', userId] });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      markAndFinish('completed');
    },
    onError: (error: Error) => {
      console.error('[onboarding] save:', error);
      feedback.alert('Ошибка', mapError(error));
    },
  });
  const saving = saveMutation.isPending;

  const handleCalculate = () => {
    if (!gender || !height || !weight || !goal || activityLevel === null) {
      feedback.alert('Заполни данные', 'Пожалуйста, заполни все поля');
      return;
    }
    if (usePharma && !pharmaType) {
      feedback.alert('Выбери тип', 'Укажи тип фармакологии или отключи переключатель');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = calculateMacros({
      birthDate,
      height,
      weight,
      gender,
      activityLevel,
      goal,
      usePharma,
      pharmaType,
      bodyFatPercentage: useBodyFat ? bodyFatPercentage : null,
    });
    setCalories(result.calories);
    setProteins(result.proteins);
    setFats(result.fats);
    setCarbs(result.carbs);
    setStep(3);
  };

  const handleSave = () => {
    if (!userId) return;
    if (!gender || !goal || activityLevel === null) {
      feedback.alert('Заполни данные', 'Укажи пол, цель и уровень активности');
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
      body_fat_percentage: useBodyFat ? bodyFatPercentage : null,
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
    if (!nextValue) setPharmaType(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const toggleBodyFat = () => {
    const nextValue = !useBodyFat;
    setUseBodyFat(nextValue);
    if (!nextValue) setBodyFatPercentage(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const canGoBack = step > 0;

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          commonStyles.navHeader,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        {canGoBack ? (
          <PressableScale onPress={() => setStep(step - 1)} style={commonStyles.backButton}>
            <ChevronLeft size={24} color={colors.primary} strokeWidth={2} />
          </PressableScale>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <Text style={[typography.h4, { color: colors.textPrimary }]}>Анкета</Text>
        <PressableScale
          onPress={handleSkip}
          accessibilityRole="button"
          accessibilityLabel="Пропустить анкету"
          style={{ paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs }}
        >
          <Text style={[typography.label, { color: colors.textSecondary }]}>Пропустить</Text>
        </PressableScale>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}>
          {step === 0 && (
            <View>
              <View
                style={{ alignItems: 'center', marginTop: SPACING.xl, marginBottom: SPACING.sm }}
              >
                <LinearGradient
                  colors={gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <BenchPressIcon
                    width={44}
                    height={44}
                    fill="#ffffff"
                    stroke="#ffffff"
                    strokeWidth={0}
                    viewBox="0 0 100 100"
                  />
                </LinearGradient>
              </View>
              <Text
                style={[
                  typography.h2,
                  { color: colors.textPrimary, textAlign: 'center', marginBottom: SPACING.xs },
                ]}
              >
                Настроим FitTracker под тебя
              </Text>
              <Text
                style={[
                  typography.body,
                  { color: colors.textSecondary, textAlign: 'center', marginBottom: SPACING.xl },
                ]}
              >
                3 коротких шага — меньше минуты
              </Text>

              <AppCard variant="highlighted" style={{ marginBottom: SPACING.lg }}>
                {[
                  {
                    icon: Flame,
                    title: 'Норма калорий и БЖУ',
                    desc: 'Расчёт по весу, росту, возрасту и цели',
                  },
                  {
                    icon: Target,
                    title: 'Твоя цель',
                    desc: 'Похуждение, поддержка или набор — влияет на рекомендации',
                  },
                  {
                    icon: Activity,
                    title: 'Старт трекинга',
                    desc: 'Вес попадёт в «Замеры тела» и на график сразу',
                  },
                ].map((row) => (
                  <View
                    key={row.title}
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}
                  >
                    <row.icon
                      size={22}
                      color={colors.primary}
                      style={{ marginRight: SPACING.md }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.labelBold, { color: colors.textPrimary }]}>
                        {row.title}
                      </Text>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>
                        {row.desc}
                      </Text>
                    </View>
                  </View>
                ))}
              </AppCard>

              <Text
                style={[
                  typography.caption,
                  { color: colors.textTertiary, marginBottom: SPACING.lg },
                ]}
              >
                Анкета необязательна — можно пропустить (кнопка справа сверху). {LATER_HINT}
              </Text>

              <AppButton
                title="Начать анкету"
                variant="primary"
                size="large"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setStep(1);
                }}
              />
              <PressableScale
                onPress={handleSkip}
                style={{ padding: SPACING.sm, alignItems: 'center' }}
              >
                <Text style={[typography.label, { color: colors.textSecondary }]}>
                  Пропустить сейчас
                </Text>
              </PressableScale>
            </View>
          )}

          {step > 0 && (
            <StepDots step={step} activeColor={colors.primary} inactiveColor={colors.border} />
          )}

          {step === 1 && (
            <GoalsStep1
              gender={gender}
              onGenderChange={setGender}
              birthDate={birthDate}
              onBirthDateChange={setBirthDate}
              height={height}
              onHeightChange={setHeight}
              weight={weight}
              onWeightChange={setWeight}
              useBodyFat={useBodyFat}
              bodyFatPercentage={bodyFatPercentage}
              onToggleBodyFat={toggleBodyFat}
              onBodyFatPercentageChange={setBodyFatPercentage}
              onNext={() => setStep(2)}
              colors={colors}
            />
          )}

          {step === 2 && (
            <GoalsStep2
              goal={goal}
              onGoalChange={setGoal}
              activityLevel={activityLevel}
              onActivityLevelChange={setActivityLevel}
              usePharma={usePharma}
              pharmaType={pharmaType}
              onTogglePharma={togglePharma}
              onPharmaTypeChange={setPharmaType}
              onBack={() => setStep(1)}
              onCalculate={handleCalculate}
              colors={colors}
            />
          )}

          {step === 3 && (
            <GoalsStep3
              calories={calories}
              proteins={proteins}
              fats={fats}
              carbs={carbs}
              usePharma={usePharma}
              pharmaType={pharmaType}
              bodyFatPercentage={useBodyFat ? bodyFatPercentage : null}
              goal={goal}
              saving={saving}
              onBack={() => setStep(2)}
              onSave={handleSave}
              colors={colors}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
