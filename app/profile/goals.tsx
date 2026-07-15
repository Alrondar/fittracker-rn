import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../src/lib/supabase';
import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { commonStyles } from '../../src/styles/common';
import { createCardStyles } from '../../src/styles/components/card';
import { createButtonStyles } from '../../src/styles/components/button';
import { typography } from '../../src/styles/typography';
import {
  ChevronLeft,
  User,
  Ruler,
  Weight,
  Target,
  Activity,
  Flame,
  Beef,
  Droplet,
  Wheat,
  Save,
  Calculator,
  Pill,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

type GoalType = 'lose' | 'maintain' | 'gain';
type GenderType = 'male' | 'female';
type ActivityLevel = 1.2 | 1.375 | 1.55 | 1.725 | 1.9;
type PharmaType = 'steroids' | 'gh' | 'combo' | null;

const GOALS = [
  { 
    value: 'lose' as GoalType, 
    label: 'Похудение', 
    icon: TrendingDown,
    desc: 'Дефицит калорий' 
  },
  { 
    value: 'maintain' as GoalType, 
    label: 'Поддержание', 
    icon: Minus,
    desc: 'Баланс калорий' 
  },
  { 
    value: 'gain' as GoalType, 
    label: 'Набор массы', 
    icon: TrendingUp,
    desc: 'Профицит калорий' 
  },
];

const ACTIVITY_LEVELS = [
  { value: 1.2, label: 'Минимальная', desc: 'Сидячий образ жизни' },
  { value: 1.375, label: 'Низкая', desc: '1-2 тренировки/нед' },
  { value: 1.55, label: 'Средняя', desc: '3-4 тренировки/нед' },
  { value: 1.725, label: 'Высокая', desc: '5-6 тренировок/нед' },
  { value: 1.9, label: 'Очень высокая', desc: 'Ежедневные тренировки' },
];

const PHARMA_TYPES = [
  {
    value: 'steroids' as PharmaType,
    label: 'Анаболические стероиды',
    desc: 'Белок ×1.5, калории +10%',
    color: '#EF4444',
  },
  {
    value: 'gh' as PharmaType,
    label: 'Гормон роста',
    desc: 'Жиры -20%',
    color: '#3B82F6',
  },
  {
    value: 'combo' as PharmaType,
    label: 'Комбо (АС + ГР)',
    desc: 'Белок ×1.5, жиры -20%',
    color: '#8B5CF6',
  },
];

export default function GoalsScreen() {
  const router = useRouter();
  const { userId } = useStore();
  const { colors } = useTheme();
  const cardStyles = createCardStyles(colors);
  const buttonStyles = createButtonStyles(colors);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Данные профиля
  const [gender, setGender] = useState<GenderType | null>(null);
  const [birthDate, setBirthDate] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState<GoalType | null>(null);
  const [activityLevel, setActivityLevel] = useState<number | null>(null);

  // Фармакология
  const [usePharma, setUsePharma] = useState(false);
  const [pharmaType, setPharmaType] = useState<PharmaType>(null);

  // Рассчитанные КБЖУ
  const [calories, setCalories] = useState(0);
  const [proteins, setProteins] = useState(0);
  const [fats, setFats] = useState(0);
  const [carbs, setCarbs] = useState(0);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (data) {
        setGender(data.gender);
        setBirthDate(data.birth_date || '');
        setHeight(data.height_cm?.toString() || '');
        setWeight(data.current_weight_kg?.toString() || '');
        setGoal(data.goal);
        setActivityLevel(data.activity_level);
        setCalories(data.target_calories || 0);
        setProteins(data.target_proteins || 0);
        setFats(data.target_fats || 0);
        setCarbs(data.target_carbs || 0);
      }
    } catch (e) {
      console.error('Ошибка загрузки профиля:', e);
    } finally {
      setLoading(false);
    }
  };

  // Расчет возраста
  const calculateAge = (birthDateStr: string): number => {
    if (!birthDateStr) return 25;
    const birth = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  // Формула Миффлина-Сан Жеора с учетом фармакологии
  const calculateMacros = () => {
    const age = calculateAge(birthDate);
    const h = parseFloat(height) || 175;
    const w = parseFloat(weight) || 70;
    const g = gender || 'male';
    const activity = activityLevel || 1.55;

    // BMR (базовый метаболизм)
    let bmr: number;
    if (g === 'male') {
      bmr = 10 * w + 6.25 * h - 5 * age + 5;
    } else {
      bmr = 10 * w + 6.25 * h - 5 * age - 161;
    }

    // TDEE (суточная норма с учетом активности)
    let tdee = bmr * activity;

    // Корректировка по цели
    let targetCalories = tdee;
    if (goal === 'lose') targetCalories = tdee * 0.85; // -15%
    if (goal === 'gain') targetCalories = tdee * 1.15; // +15%

    // Расчет макросов (стандартное соотношение)
    let targetProteins = Math.round(w * 2);
    let targetFats = Math.round(w * 1);

    // === КОРРЕКТИРОВКА ПО ФАРМАКОЛОГИИ ===
    if (usePharma && pharmaType) {
      if (pharmaType === 'steroids') {
        // АС: белок ×1.5 (до 3г/кг), калории +10%
        targetProteins = Math.min(Math.round(w * 3), 3 * w);
        targetCalories = targetCalories * 1.10;
      } else if (pharmaType === 'gh') {
        // ГР: жиры -20%
        targetFats = Math.round(targetFats * 0.8);
      } else if (pharmaType === 'combo') {
        // Комбо: белок ×1.5, жиры -20%
        targetProteins = Math.min(Math.round(w * 3), 3 * w);
        targetFats = Math.round(targetFats * 0.8);
      }
    }

    const proteinCalories = targetProteins * 4;
    const fatCalories = targetFats * 9;
    const carbCalories = targetCalories - proteinCalories - fatCalories;
    const targetCarbs = Math.round(carbCalories / 4);

    setCalories(Math.round(targetCalories));
    setProteins(targetProteins);
    setFats(targetFats);
    setCarbs(targetCarbs);
  };

  const handleCalculate = () => {
    if (!gender || !height || !weight || !goal || !activityLevel) {
      Alert.alert('Заполни данные', 'Пожалуйста, заполни все поля');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    calculateMacros();
    setStep(3);
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          gender,
          birth_date: birthDate || null,
          height_cm: parseFloat(height) || null,
          current_weight_kg: parseFloat(weight) || null,
          goal,
          activity_level: activityLevel,
          target_calories: calories,
          target_proteins: proteins,
          target_fats: fats,
          target_carbs: carbs,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Сохранено', 'Твои цели успешно обновлены!', [
        { text: 'Отлично', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    } finally {
      setSaving(false);
    }
  };

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
      {/* Шапка */}
      <View style={[commonStyles.navHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
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
          {/* Индикатор шагов */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: SPACING.xl, gap: SPACING.sm }}>
            {[1, 2, 3].map((s) => (
              <View
                key={s}
                style={{
                  width: s === step ? 32 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: s === step ? colors.primary : colors.border,
                }}
              />
            ))}
          </View>

          {/* ШАГ 1: Антропометрия */}
          {step === 1 && (
            <>
              <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: SPACING.xs }]}>
                О тебе
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary, marginBottom: SPACING.xl }]}>
                Эти данные нужны для расчета нормы калорий
              </Text>

              {/* Пол */}
              <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.md }]}>
                Пол
              </Text>
              <View style={{ flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.xl }}>
                {(['male', 'female'] as GenderType[]).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      cardStyles.compact,
                      {
                        flex: 1,
                        alignItems: 'center',
                        paddingVertical: SPACING.lg,
                        borderColor: gender === g ? colors.primary : colors.border,
                        borderWidth: 2,
                        backgroundColor: gender === g ? colors.primaryLight : colors.surface,
                      },
                    ]}
                    onPress={() => {
                      setGender(g);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <User size={32} color={gender === g ? colors.primary : colors.textSecondary} />
                    <Text style={[typography.labelBold, { color: gender === g ? colors.primary : colors.textSecondary, marginTop: SPACING.sm }]}>
                      {g === 'male' ? 'Мужской' : 'Женский'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Дата рождения */}
              <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.md }]}>
                Дата рождения
              </Text>
              <View style={[cardStyles.compact, { borderColor: colors.border, borderWidth: 1, marginBottom: SPACING.xl }]}>
                <TextInput
                  style={[typography.body, { color: colors.textPrimary, padding: 0 }]}
                  placeholder="ГГГГ-ММ-ДД"
                  placeholderTextColor={colors.textTertiary}
                  value={birthDate}
                  onChangeText={setBirthDate}
                  keyboardType="default"
                />
              </View>

              {/* Рост */}
              <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.md }]}>
                Рост (см)
              </Text>
              <View style={[cardStyles.compact, { borderColor: colors.border, borderWidth: 1, marginBottom: SPACING.xl, flexDirection: 'row', alignItems: 'center' }]}>
                <Ruler size={20} color={colors.primary} style={{ marginRight: SPACING.sm }} />
                <TextInput
                  style={[typography.body, { color: colors.textPrimary, padding: 0, flex: 1 }]}
                  placeholder="175"
                  placeholderTextColor={colors.textTertiary}
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="numeric"
                />
              </View>

              {/* Вес */}
              <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.md }]}>
                Текущий вес (кг)
              </Text>
              <View style={[cardStyles.compact, { borderColor: colors.border, borderWidth: 1, marginBottom: SPACING.xl, flexDirection: 'row', alignItems: 'center' }]}>
                <Weight size={20} color={colors.primary} style={{ marginRight: SPACING.sm }} />
                <TextInput
                  style={[typography.body, { color: colors.textPrimary, padding: 0, flex: 1 }]}
                  placeholder="70"
                  placeholderTextColor={colors.textTertiary}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                />
              </View>

              <TouchableOpacity
                style={[buttonStyles.primary, { marginTop: SPACING.md }]}
                onPress={() => {
                  if (!gender || !height || !weight) {
                    Alert.alert('Заполни данные', 'Укажи пол, рост и вес');
                    return;
                  }
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setStep(2);
                }}
              >
                <Text style={buttonStyles.textPrimary}>Далее</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ШАГ 2: Цель и активность */}
          {step === 2 && (
            <>
              <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: SPACING.xs }]}>
                Твоя цель
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary, marginBottom: SPACING.xl }]}>
                Выбери, чего хочешь достичь
              </Text>

              {/* Выбор цели */}
              <View style={{ marginBottom: SPACING.xl }}>
                {GOALS.map((g) => {
                  const Icon = g.icon;
                  return (
                    <TouchableOpacity
                      key={g.value}
                      style={[
                        cardStyles.compact,
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          borderColor: goal === g.value ? colors.primary : colors.border,
                          borderWidth: 2,
                          backgroundColor: goal === g.value ? colors.primaryLight : colors.surface,
                          marginBottom: SPACING.sm,
                        },
                      ]}
                      onPress={() => {
                        setGoal(g.value);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Icon size={24} color={goal === g.value ? colors.primary : colors.textSecondary} style={{ marginRight: SPACING.md }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[typography.labelBold, { color: goal === g.value ? colors.primary : colors.textPrimary }]}>
                          {g.label}
                        </Text>
                        <Text style={[typography.caption, { color: colors.textSecondary }]}>
                          {g.desc}
                        </Text>
                      </View>
                      {goal === g.value && (
                        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: SPACING.xs }]}>
                Уровень активности
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary, marginBottom: SPACING.xl }]}>
                Сколько тренировок в неделю?
              </Text>

              {/* Уровень активности */}
              <View style={{ marginBottom: SPACING.xl }}>
                {ACTIVITY_LEVELS.map((level) => (
                  <TouchableOpacity
                    key={level.value}
                    style={[
                      cardStyles.compact,
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderColor: activityLevel === level.value ? colors.primary : colors.border,
                        borderWidth: 2,
                        backgroundColor: activityLevel === level.value ? colors.primaryLight : colors.surface,
                        marginBottom: SPACING.sm,
                      },
                    ]}
                    onPress={() => {
                      setActivityLevel(level.value);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Activity size={20} color={activityLevel === level.value ? colors.primary : colors.textSecondary} style={{ marginRight: SPACING.md }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.labelBold, { color: activityLevel === level.value ? colors.primary : colors.textPrimary }]}>
                        {level.label}
                      </Text>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>
                        {level.desc}
                      </Text>
                    </View>
                    {activityLevel === level.value && (
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Переключатель фармакологии */}
              <View style={[cardStyles.compact, { borderColor: colors.border, borderWidth: 1, marginBottom: SPACING.xl }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Pill size={20} color={usePharma ? colors.primary : colors.textSecondary} style={{ marginRight: SPACING.sm }} />
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
                    style={{
                      width: 50,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: usePharma ? colors.primary : colors.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onPress={() => {
                      setUsePharma(!usePharma);
                      if (!usePharma) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      } else {
                        setPharmaType(null);
                      }
                    }}
                  >
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: '#fff',
                        transform: [{ translateX: usePharma ? 12 : -12 }],
                      }}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Блок фармакологии (показывается только если usePharma = true) */}
              {usePharma && (
                <>
                  <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: SPACING.xs }]}>
                    Тип фармакологии
                  </Text>
                  <Text style={[typography.body, { color: colors.textSecondary, marginBottom: SPACING.xl }]}>
                    Выбери, что используешь
                  </Text>

                  {/* Выбор типа фармакологии */}
                  <View style={{ marginBottom: SPACING.xl }}>
                    {PHARMA_TYPES.map((p) => (
                      <TouchableOpacity
                        key={p.value}
                        style={[
                          cardStyles.compact,
                          {
                            flexDirection: 'row',
                            alignItems: 'center',
                            borderColor: pharmaType === p.value ? p.color : colors.border,
                            borderWidth: 2,
                            backgroundColor: pharmaType === p.value ? p.color + '20' : colors.surface,
                            marginBottom: SPACING.sm,
                          },
                        ]}
                        onPress={() => {
                          setPharmaType(p.value);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[typography.labelBold, { color: pharmaType === p.value ? p.color : colors.textPrimary }]}>
                            {p.label}
                          </Text>
                          <Text style={[typography.caption, { color: colors.textSecondary }]}>
                            {p.desc}
                          </Text>
                        </View>
                        {pharmaType === p.value && (
                          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: p.color, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Дисклеймер */}
                  <View style={[cardStyles.compact, { borderColor: colors.warning, borderWidth: 1, backgroundColor: colors.warning + '10', marginBottom: SPACING.xl }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <AlertTriangle size={20} color={colors.warning} style={{ marginRight: SPACING.sm, marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.xs }]}>
                          Важное предупреждение
                        </Text>
                        <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 18 }]}>
                          Использование фармакологических препаратов может нанести серьёзный вред здоровью. 
                          Расчет КБЖУ с учетом фармакологии является приблизительным. 
                          Настоятельно рекомендуем проконсультироваться с врачом перед началом курса.
                        </Text>
                      </View>
                    </View>
                  </View>
                </>
              )}

              {/* Кнопки навигации - ВСЕГДА внизу шага 2 */}
              <View style={{ flexDirection: 'row', gap: SPACING.md }}>
                <TouchableOpacity
                  style={[buttonStyles.secondary, { flex: 1 }]}
                  onPress={() => setStep(1)}
                >
                  <Text style={buttonStyles.textSecondary}>Назад</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[buttonStyles.primary, { flex: 2 }]}
                  onPress={() => {
                    if (usePharma && !pharmaType) {
                      Alert.alert('Выбери тип', 'Укажи тип фармакологии или отключи переключатель');
                      return;
                    }
                    handleCalculate();
                  }}
                >
                  <Calculator size={20} color="#fff" style={{ marginRight: SPACING.sm }} />
                  <Text style={buttonStyles.textPrimary}>Рассчитать</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ШАГ 3: Результаты КБЖУ */}
          {step === 3 && (
            <>
              <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: SPACING.xs }]}>
                Твоя норма
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary, marginBottom: SPACING.xl }]}>
                Рекомендуемые значения на день
              </Text>

              {/* Индикатор фармакологии */}
              {usePharma && pharmaType && (
                <View style={[cardStyles.compact, { borderColor: colors.warning, borderWidth: 1, backgroundColor: colors.warning + '10', marginBottom: SPACING.lg }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Pill size={16} color={colors.warning} style={{ marginRight: SPACING.sm }} />
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      Расчет с учетом фармакологии: {PHARMA_TYPES.find(p => p.value === pharmaType)?.label}
                    </Text>
                  </View>
                </View>
              )}

              {/* Калории */}
              <View style={[cardStyles.large, { backgroundColor: colors.primary, marginBottom: SPACING.lg }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm }}>
                  <Flame size={24} color="#fff" />
                  <Text style={[typography.h5, { color: 'rgba(255,255,255,0.9)', marginLeft: SPACING.sm }]}>
                    Калории
                  </Text>
                </View>
                <Text style={[typography.h1, { color: '#fff', marginBottom: SPACING.xs }]}>
                  {calories}
                </Text>
                <Text style={[typography.body, { color: 'rgba(255,255,255,0.8)' }]}>
                  ккал / день
                </Text>
              </View>

              {/* Макросы */}
              <View style={{ flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg }}>
                {/* Белки */}
                <View style={[cardStyles.compact, { flex: 1, alignItems: 'center', borderColor: '#F44336', borderWidth: 2 }]}>
                  <Beef size={24} color="#F44336" />
                  <Text style={[typography.h3, { color: '#F44336', marginTop: SPACING.sm }]}>
                    {proteins}г
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    Белки
                  </Text>
                </View>
                {/* Жиры */}
                <View style={[cardStyles.compact, { flex: 1, alignItems: 'center', borderColor: '#FFC107', borderWidth: 2 }]}>
                  <Droplet size={24} color="#FFC107" />
                  <Text style={[typography.h3, { color: '#FFC107', marginTop: SPACING.sm }]}>
                    {fats}г
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    Жиры
                  </Text>
                </View>
                {/* Углеводы */}
                <View style={[cardStyles.compact, { flex: 1, alignItems: 'center', borderColor: '#4CAF50', borderWidth: 2 }]}>
                  <Wheat size={24} color="#4CAF50" />
                  <Text style={[typography.h3, { color: '#4CAF50', marginTop: SPACING.sm }]}>
                    {carbs}г
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    Углеводы
                  </Text>
                </View>
              </View>

              {/* Процентное соотношение */}
              <View style={[cardStyles.compact, { borderColor: colors.border, borderWidth: 1, marginBottom: SPACING.lg }]}>
                <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.md }]}>
                  Соотношение макросов
                </Text>
                <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: SPACING.sm }}>
                  <View style={{ width: `${(proteins * 4 / calories) * 100}%`, backgroundColor: '#F44336' }} />
                  <View style={{ width: `${(fats * 9 / calories) * 100}%`, backgroundColor: '#FFC107' }} />
                  <View style={{ flex: 1, backgroundColor: '#4CAF50' }} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[typography.caption, { color: '#F44336' }]}>
                    Б: {Math.round((proteins * 4 / calories) * 100)}%
                  </Text>
                  <Text style={[typography.caption, { color: '#FFC107' }]}>
                    Ж: {Math.round((fats * 9 / calories) * 100)}%
                  </Text>
                  <Text style={[typography.caption, { color: '#4CAF50' }]}>
                    У: {Math.round((carbs * 4 / calories) * 100)}%
                  </Text>
                </View>
              </View>

              {/* Формула */}
              <View style={[cardStyles.compact, { borderColor: colors.border, borderWidth: 1, marginBottom: SPACING.xl }]}>
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
              </View>

              <View style={{ flexDirection: 'row', gap: SPACING.md }}>
                <TouchableOpacity
                  style={[buttonStyles.secondary, { flex: 1 }]}
                  onPress={() => setStep(2)}
                >
                  <Text style={buttonStyles.textSecondary}>Изменить</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[buttonStyles.primary, { flex: 2 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Save size={20} color="#fff" style={{ marginRight: SPACING.sm }} />
                  <Text style={buttonStyles.textPrimary}>
                    {saving ? 'Сохранение...' : 'Сохранить цели'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}