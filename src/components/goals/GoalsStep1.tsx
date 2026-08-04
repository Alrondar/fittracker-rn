import React from 'react';
import { View, Text, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ruler, Weight } from 'lucide-react-native';
import { SPACING } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { AppButton } from '../ui/AppButton';
import { AppInput } from '../ui/AppInput';
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
  onNext,
  colors,
}: GoalsStep1Props) {
  const handleNext = () => {
    if (!gender || !height || !weight) {
      Alert.alert('Заполни данные', 'Укажи пол, рост и вес');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNext();
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