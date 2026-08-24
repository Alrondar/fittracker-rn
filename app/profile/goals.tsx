import React, { useEffect, useRef, useState } from 'react';
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
import { ChevronLeft } from 'lucide-react-native';
import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { commonStyles } from '../../src/styles/common';
import { typography } from '../../src/styles/typography';
import { SPACING } from '../../src/constants/theme';
import { metricsService } from '../../src/services/metricsService';
import {
  getGoalsProfile,
  saveGoalsProfile,
  type GoalsSavePayload,
  type GoalType,
  type GenderType,
  type PharmaType,
} from '../../src/services/goalsService';
import { mapError } from '../../src/utils/errorMapper';
import { calculateMacros } from '../../src/utils/macroCalculator';
import { StepDots } from '../../src/components/goals/GoalsComponents';
import { GoalsStep1 } from '../../src/components/goals/GoalsStep1';
import { GoalsStep2 } from '../../src/components/goals/GoalsStep2';
import { GoalsStep3 } from '../../src/components/goals/GoalsStep3';

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
  const [useBodyFat, setUseBodyFat] = useState(false);
  const [bodyFatPercentage, setBodyFatPercentage] = useState<number | null>(null);
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
    setUseBodyFat(profile.bodyFatPercentage != null && profile.bodyFatPercentage > 0);
    setBodyFatPercentage(profile.bodyFatPercentage);
    setCalories(profile.calories);
    setProteins(profile.proteins);
    setFats(profile.fats);
    setCarbs(profile.carbs);
    initializedRef.current = true;
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: (payload: GoalsSavePayload) => saveGoalsProfile(userId as string, payload),
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
        { text: 'Отлично', onPress: () => router.back() },
      ]);
    },
    onError: (error: Error) => {
      console.error('[goals] save:', error);
      Alert.alert('Ошибка', mapError(error));
    },
  });
  const saving = saveMutation.isPending;

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
    if (!nextValue) {
      setPharmaType(null);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const toggleBodyFat = () => {
    const nextValue = !useBodyFat;
    setUseBodyFat(nextValue);
    if (!nextValue) {
      setBodyFatPercentage(null);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

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
          <Text style={[typography.body, { color: colors.textSecondary }]}>Загрузка...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          commonStyles.navHeader,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
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