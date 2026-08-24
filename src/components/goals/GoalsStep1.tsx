import React from 'react';
import { View, Text, Alert, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Percent, Ruler, Weight } from 'lucide-react-native';
import { SPACING } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { AppButton } from '../ui/AppButton';
import { AppInput } from '../ui/AppInput';
import { AppCard } from '../ui/AppCard';
import { GENDERS } from '../../constants/goals';
import { GenderCard } from './GoalsComponents';
import type { GenderType } from '../../services/goalsService';
import type { ThemeColors } from '../../constants/theme';

interface GoalsStep1Props {
  gender: GenderType | null;
  onGenderChange: (g: GenderType) => void;
  birthDate: string;
  onBirthDateChange: (v: string) => void;
  height: string;
  onHeightChange: (v: string) => void;
  weight: string;
  onWeightChange: (v: string) => void;
  /** P1.1: Toggle для использования процента жира. */
  useBodyFat: boolean;
  bodyFatPercentage: number | null;
  onToggleBodyFat: () => void;
  onBodyFatPercentageChange: (v: number | null) => void;
  onNext: () => void;
  colors: ThemeColors;
}

export function GoalsStep1({
  gender,
  onGenderChange,
  birthDate,
  onBirthDateChange,
  height,
  onHeightChange,
  weight,
  onWeightChange,
  useBodyFat,
  bodyFatPercentage,
  onToggleBodyFat,
  onBodyFatPercentageChange,
  onNext,
  colors,
}: GoalsStep1Props) {
  const bodyFatValue = bodyFatPercentage != null ? String(bodyFatPercentage) : '';
  const bodyFatInvalid =
    useBodyFat &&
    (bodyFatPercentage == null || bodyFatPercentage < 1 || bodyFatPercentage > 60);

  const handleNext = () => {
    if (!gender || !height || !weight) {
      Alert.alert('Заполни данные', 'Укажи пол, рост и вес');
      return;
    }
    if (bodyFatInvalid) {
      Alert.alert(
        'Некорректный процент жира',
        'Введи значение от 1 до 60 или выключи переключатель'
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNext();
  };

  const handleBodyFatTextChange = (text: string) => {
    const cleaned = text.replace(',', '.').replace(/[^0-9.]/g, '');
    const parsed = cleaned === '' ? null : parseFloat(cleaned);
    onBodyFatPercentageChange(
      parsed == null || Number.isNaN(parsed) ? null : parsed
    );
  };

  return (
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
              onGenderChange(g.value);
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
        onChangeText={onBirthDateChange}
      />
      <AppInput
        label="Рост (см)"
        placeholder="175"
        value={height}
        onChangeText={onHeightChange}
        keyboardType="numeric"
        icon={<Ruler size={20} color={colors.primary} />}
      />
      <AppInput
        label="Текущий вес (кг)"
        placeholder="70"
        value={weight}
        onChangeText={onWeightChange}
        keyboardType="numeric"
        icon={<Weight size={20} color={colors.primary} />}
      />

      {/* P1.1: Toggle процента жира — по умолчанию скрыт, раскрывается по тапу */}
      <AppCard variant="compact" style={{ marginTop: SPACING.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Percent
              size={20}
              color={useBodyFat ? colors.primary : colors.textSecondary}
              style={{ marginRight: SPACING.sm }}
            />
            <View style={{ flex: 1 }}>
              <Text style={[typography.labelBold, { color: colors.textPrimary }]}>
                Знаю свой % жира
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Точнее рассчитает КБЖУ (формула Кэтча-МакАрдла)
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onToggleBodyFat}
            style={{
              width: 50,
              height: 28,
              borderRadius: 14,
              backgroundColor: useBodyFat ? colors.primary : colors.border,
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
                transform: [{ translateX: useBodyFat ? 12 : -12 }],
              }}
            />
          </TouchableOpacity>
        </View>
      </AppCard>

      {useBodyFat && (
        <>
          <AppInput
            label="Процент жира (%)"
            placeholder="15"
            value={bodyFatValue}
            onChangeText={handleBodyFatTextChange}
            keyboardType="decimal-pad"
            icon={<Percent size={20} color={colors.primary} />}
            error={bodyFatInvalid ? 'Допустимо от 1 до 60' : undefined}
          />
          <Text
            style={[
              typography.caption,
              { color: colors.textTertiary, marginTop: -SPACING.sm, marginBottom: SPACING.md },
            ]}
          >
            Например, после замера калипером или биоимпедансом
          </Text>
        </>
      )}

      <AppButton
        title="Далее"
        variant="primary"
        size="large"
        onPress={handleNext}
        style={{ marginTop: SPACING.md }}
      />
    </>
  );
}