import React, { useState, useEffect } from 'react';
import { View, Text, Alert, Modal } from 'react-native'; // <-- ДОБАВЛЕНО Modal
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../hooks/useTheme';
import { typography } from '../../styles/typography';
import { SPACING, scale } from '../../constants/theme';
import { AppButton } from '../ui/AppButton';
import { AppInput } from '../ui/AppInput';
import { SheetShell } from '../ui/SheetShell';
import { profileService } from '../../services/profileService';
import { useStore } from '../../store/useStore';

const MEAL_TYPES = [
  { label: 'Завтрак', value: 'breakfast' },
  { label: 'Обед', value: 'lunch' },
  { label: 'Ужин', value: 'dinner' },
  { label: 'Снек', value: 'snack' },
];

interface NutritionAddModalProps {
  visible: boolean;
  onClose: () => void;
}

export function NutritionAddModal({ visible, onClose }: NutritionAddModalProps) {
  useEffect(() => {
    console.log('🔥 NutritionAddModal render, visible:', visible);
  }, [visible]);

  const { colors } = useTheme();
  const { userId } = useStore();
  const queryClient = useQueryClient();

  const [mealType, setMealType] = useState('breakfast');
  const [calories, setCalories] = useState('');
  const [proteins, setProteins] = useState('');
  const [fats, setFats] = useState('');
  const [carbs, setCarbs] = useState('');
  const [water, setWater] = useState('');

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('No userId');
      await profileService.saveNutritionLog(userId, {
        calories: parseFloat(calories) || 0,
        proteins: parseFloat(proteins) || 0,
        fats: parseFloat(fats) || 0,
        carbs: parseFloat(carbs) || 0,
        water_ml: parseFloat(water) || 0,
        meal_type: mealType,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dailyNutrition', userId] });
      setCalories('');
      setProteins('');
      setFats('');
      setCarbs('');
      setWater('');
      setMealType('breakfast');
      onClose();
    },
    onError: (error: Error) => {
      Alert.alert('Ошибка', error.message || 'Не удалось сохранить');
    },
  });

  const handleSave = () => {
    if (!calories && !proteins && !fats && !carbs && !water) {
      Alert.alert('Введите данные', 'Заполните хотя бы одно поле');
      return;
    }
    saveMutation.mutate();
  };

  return (
    // <-- ДОБАВЛЕНА ОБЁРТКА MODAL, КАК В ReadinessSheet И DaySummaryCard
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SheetShell title="Добавить приём пищи" onClose={onClose}>
        <View style={{ padding: SPACING.lg, gap: SPACING.md }}>
          <View style={{ flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.md }}>
            {MEAL_TYPES.map((type) => (
              <AppButton
                key={type.value}
                title={type.label}
                variant={mealType === type.value ? 'primary' : 'secondary'}
                onPress={() => setMealType(type.value)}
                style={{ flex: 1, paddingVertical: SPACING.sm }}
              />
            ))}
          </View>

          <AppInput
            label="Калории (ккал)"
            value={calories}
            onChangeText={setCalories}
            keyboardType="numeric"
            placeholder="0"
          />
          <View style={{ flexDirection: 'row', gap: SPACING.md }}>
            <AppInput
              label="Белки (г)"
              value={proteins}
              onChangeText={setProteins}
              keyboardType="numeric"
              placeholder="0"
              style={{ flex: 1 }}
            />
            <AppInput
              label="Жиры (г)"
              value={fats}
              onChangeText={setFats}
              keyboardType="numeric"
              placeholder="0"
              style={{ flex: 1 }}
            />
            <AppInput
              label="Углеводы (г)"
              value={carbs}
              onChangeText={setCarbs}
              keyboardType="numeric"
              placeholder="0"
              style={{ flex: 1 }}
            />
          </View>
          <AppInput
            label="Вода (мл)"
            value={water}
            onChangeText={setWater}
            keyboardType="numeric"
            placeholder="0"
          />

          <AppButton
            title="Сохранить"
            variant="primary"
            onPress={handleSave}
            loading={saveMutation.isPending}
            style={{ marginTop: SPACING.lg }}
          />
        </View>
      </SheetShell>
    </Modal>
  );
}