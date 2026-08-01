import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Pressable, View, Text, TouchableOpacity, Alert } from 'react-native';
import { X, Minus, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { createCardStyles } from '../../styles/components/card';
import { SetData } from '../../types/workout';

/**
 * Мишень модалки: какую карточку упражнения редактируем + снапшот её текущих
 * подходов. Снапшот нужен, чтобы при уменьшении числа подходов честно проверить,
 * не удаляются ли заполненные (weight/reps) — и спросить подтверждение.
 * Снапшот снимается в момент открытия (ref-зеркалом в [id].tsx), поэтому модалка
 * самодостаточна и не дёргает данные экрана во время работы.
 */
export interface ExerciseSettingsTarget {
  exerciseIndex: number;
  setsCount: number;
  restSeconds: number;
  currentSets: SetData[];
}

interface ExerciseSettingsModalProps {
  target: ExerciseSettingsTarget | null;
  onClose: () => void;
  onSave: (exerciseIndex: number, setsCount: number, restSeconds: number) => void;
  colors: any;
  cardStyles: ReturnType<typeof createCardStyles>;
}

/**
 * ✅ ВОЛНА 3: одна модалка настроек на весь экран вместо N невидимых нативных
 *    <Modal> внутри каждой основной ExerciseCard. Раньше при 5 видимых карточках
 *    в дереве висело 5 невидимых модалок, и каждый рендер списка их обходил.
 *    Теперь карточка только сигнализирует onOpenSettings(...) — а тяжёлый узел
 *    модалки существует в единственном экземпляре здесь.
 */
export function ExerciseSettingsModal({
  target,
  onClose,
  onSave,
  colors,
  cardStyles,
}: ExerciseSettingsModalProps) {
  const [localSets, setLocalSets] = useState(0);
  const [localRest, setLocalRest] = useState(0);

  // Синхронизация счётчиков с мишенью при открытии / смене карточки.
  useEffect(() => {
    if (target) {
      setLocalSets(target.setsCount);
      setLocalRest(target.restSeconds);
    }
  }, [target]);

  const changeSets = useCallback((d: number) => {
    setLocalSets((prev) => {
      const v = Math.max(1, Math.min(10, prev + d));
      if (v !== prev) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return v;
    });
  }, []);

  const changeRest = useCallback((d: number) => {
    setLocalRest((prev) => {
      const v = Math.max(30, Math.min(300, prev + d));
      if (v !== prev) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return v;
    });
  }, []);

  const commit = useCallback(() => {
    if (!target) return;
    onSave(target.exerciseIndex, localSets, localRest);
  }, [target, localSets, localRest, onSave]);

  const handleSave = useCallback(() => {
    if (!target) return;
    // Уменьшаем подходы — проверяем, не пропадут ли заполненные данные.
    if (localSets < target.currentSets.length) {
      const removed = target.currentSets.slice(localSets);
      if (removed.some((s) => s.weight !== '' || s.reps !== '')) {
        Alert.alert(
          'Удалить подходы?',
          `Будут удалены подходы ${localSets + 1}-${target.currentSets.length} с данными.`,
          [
            { text: 'Отмена', style: 'cancel' },
            {
              text: 'Удалить',
              onPress: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                commit();
              },
            },
          ],
        );
        return;
      }
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    commit();
  }, [target, localSets, commit]);

  const visible = target !== null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable
          style={[cardStyles.settingsSheetContainer, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={cardStyles.settingsSheetHeader}>
            <Text style={[cardStyles.settingsSheetTitle, { color: colors.textPrimary }]}>
              Настройки упражнения
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <View style={cardStyles.settingsSheetField}>
            <Text style={[cardStyles.settingsSheetLabel, { color: colors.textSecondary }]}>
              Количество подходов
            </Text>
            <View style={cardStyles.settingsSheetCounter}>
              <TouchableOpacity
                onPress={() => changeSets(-1)}
                disabled={localSets <= 1}
                style={[
                  cardStyles.settingsSheetCounterButton,
                  {
                    backgroundColor:
                      localSets <= 1 ? colors.surfaceSecondary : colors.primaryLight,
                    opacity: localSets <= 1 ? 0.5 : 1,
                  },
                ]}
              >
                <Minus
                  size={20}
                  color={localSets <= 1 ? colors.textTertiary : colors.primary}
                  strokeWidth={2}
                />
              </TouchableOpacity>
              <Text style={[cardStyles.settingsSheetCounterText, { color: colors.textPrimary }]}>
                {localSets}
              </Text>
              <TouchableOpacity
                onPress={() => changeSets(1)}
                disabled={localSets >= 10}
                style={[
                  cardStyles.settingsSheetCounterButton,
                  {
                    backgroundColor:
                      localSets >= 10 ? colors.surfaceSecondary : colors.primaryLight,
                    opacity: localSets >= 10 ? 0.5 : 1,
                  },
                ]}
              >
                <Plus
                  size={20}
                  color={localSets >= 10 ? colors.textTertiary : colors.primary}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={cardStyles.settingsSheetField}>
            <Text style={[cardStyles.settingsSheetLabel, { color: colors.textSecondary }]}>
              Отдых между подходами
            </Text>
            <View style={cardStyles.settingsSheetCounter}>
              <TouchableOpacity
                onPress={() => changeRest(-15)}
                disabled={localRest <= 30}
                style={[
                  cardStyles.settingsSheetCounterButton,
                  {
                    backgroundColor:
                      localRest <= 30 ? colors.surfaceSecondary : colors.primaryLight,
                    opacity: localRest <= 30 ? 0.5 : 1,
                  },
                ]}
              >
                <Minus
                  size={20}
                  color={localRest <= 30 ? colors.textTertiary : colors.primary}
                  strokeWidth={2}
                />
              </TouchableOpacity>
              <Text
                style={[
                  cardStyles.settingsSheetCounterText,
                  { color: colors.textPrimary, minWidth: 80 },
                ]}
              >
                {localRest}с
              </Text>
              <TouchableOpacity
                onPress={() => changeRest(15)}
                disabled={localRest >= 300}
                style={[
                  cardStyles.settingsSheetCounterButton,
                  {
                    backgroundColor:
                      localRest >= 300 ? colors.surfaceSecondary : colors.primaryLight,
                    opacity: localRest >= 300 ? 0.5 : 1,
                  },
                ]}
              >
                <Plus
                  size={20}
                  color={localRest >= 300 ? colors.textTertiary : colors.primary}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSave}
            style={[cardStyles.settingsSheetSaveButton, { backgroundColor: colors.primary }]}
          >
            <Text style={cardStyles.settingsSheetSaveButtonText}>Сохранить</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}