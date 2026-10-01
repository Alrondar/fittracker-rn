import React, { useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { feedback } from '../../lib/feedback';
import { PressableScale } from '../ui/PressableScale';
import * as Haptics from 'expo-haptics';
import { Percent, Ruler, Weight } from 'lucide-react-native';
import { SPACING } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { AppButton } from '../ui/AppButton';
import { AppInput } from '../ui/AppInput';
import { AppCard } from '../ui/AppCard';
import { GENDERS } from '../../constants/goals';
import { GenderCard } from './GoalsComponents';
import {
  useUnitPreferences,
  weightToDisplay,
  weightFromDisplay,
  heightToDisplay,
  heightFromDisplay,
} from '../../hooks/useUnitPreferences';
import type { GenderType } from '../../services/goalsService';
import type { ThemeColors } from '../../constants/theme';

/**
 * FD12-7: контролируемое поле ввода с конвертированной единицей.
 * `canonical` — значение в канонических см/кг (стейт родителя/БД); локальный
 * `text` — то, что видит пользователь в своей единице. Вверх пушится канон.
 * Синхронизация из канона — только при внешней правке (праффил) или смене
 * единицы, чтобы округление не мешало набору.
 */
function useUnitField(
  canonical: string,
  unit: 'kg' | 'lb',
  toDisplay: (v: string, unit: 'kg' | 'lb') => string,
  fromDisplay: (v: string, unit: 'kg' | 'lb') => string,
  onCanonicalChange: (v: string) => void
) {
  const [text, setText] = useState(() => toDisplay(canonical, unit));
  const lastPushed = useRef<string | null>(null);
  const prevUnit = useRef(unit);

  useEffect(() => {
    const unitChanged = prevUnit.current !== unit;
    prevUnit.current = unit;
    const echo = canonical === lastPushed.current;
    // Внешняя правка канона (праффил) или смена единицы — пересчитать показ.
    if (!echo || unitChanged) {
      setText(toDisplay(canonical, unit));
    }
  }, [canonical, unit]); // eslint-disable-line react-hooks/exhaustive-deps

  const onChangeText = (next: string) => {
    setText(next);
    const canonicalNext = fromDisplay(next, unit);
    lastPushed.current = canonicalNext;
    onCanonicalChange(canonicalNext);
  };

  return { text, onChangeText };
}

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
    useBodyFat && (bodyFatPercentage == null || bodyFatPercentage < 1 || bodyFatPercentage > 60);

  // FD12-7: рост/вес вводятся в выбранных пользователем единицах, но в родительский
  // стейт (и дальше в БД) уходят канонические см/кг. Отображаемый текст живёт локально,
  // чтобы округление при конвертации не «прыгало» на каждый введённый символ;
  // пересинхронизация — только при внешней правке канона (праффил) или смене единицы.
  const { unit } = useUnitPreferences();
  const heightText = useUnitField(height, unit, heightToDisplay, heightFromDisplay, onHeightChange);
  const weightText = useUnitField(weight, unit, weightToDisplay, weightFromDisplay, onWeightChange);

  const handleNext = () => {
    if (!gender || !height || !weight) {
      feedback.alert('Заполни данные', 'Укажи пол, рост и вес');
      return;
    }
    if (bodyFatInvalid) {
      feedback.alert(
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
    onBodyFatPercentageChange(parsed == null || Number.isNaN(parsed) ? null : parsed);
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
        label={unit === 'kg' ? 'Рост (см)' : 'Рост (дюймы)'}
        placeholder={unit === 'kg' ? '175' : '69'}
        value={heightText.text}
        onChangeText={heightText.onChangeText}
        keyboardType="numeric"
        icon={<Ruler size={20} color={colors.primary} />}
      />
      <AppInput
        label={unit === 'kg' ? 'Текущий вес (кг)' : 'Текущий вес (lb)'}
        placeholder={unit === 'kg' ? '70' : '155'}
        value={weightText.text}
        onChangeText={weightText.onChangeText}
        keyboardType="numeric"
        icon={<Weight size={20} color={colors.primary} />}
      />

      {/* P1.1: Toggle процента жира — по умолчанию скрыт, раскрывается по тапу */}
      <AppCard variant="compact" style={{ marginTop: SPACING.md }}>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
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
          <PressableScale
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
          </PressableScale>
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
