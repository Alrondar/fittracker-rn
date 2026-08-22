// src/components/dashboard/NutritionLogListModal.tsx
// NUTRI-2: L2-модалка списка записей питания за день.

import React from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Trash2 } from 'lucide-react-native';

import { useTheme } from '../../hooks/useTheme';
import {
  BORDER_RADIUS,
  SPACING,
} from '../../constants/theme';
import { typography } from '../../styles/typography';
import { SheetShell } from '../ui/SheetShell';
import { useNutritionLogs } from '../../hooks/useNutritionLogs';
import { useStore } from '../../store/useStore';
import { NutritionLog } from '../../services/profileService';

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Снек',
};

interface NutritionLogListModalProps {
  visible: boolean;
  onClose: () => void;
  onEdit: (log: NutritionLog) => void;
}

export function NutritionLogListModal({
  visible,
  onClose,
  onEdit,
}: NutritionLogListModalProps) {
  const { colors } = useTheme();
  const { userId } = useStore();

  const {
    logs,
    isLoading,
    delete: deleteLog,
    isDeleting,
  } = useNutritionLogs(userId);

  const handleDelete = (
    log: NutritionLog,
  ) => {
    Alert.alert(
      'Удалить запись?',
      `${
        MEAL_LABELS[log.meal_type] ||
        log.meal_type
      }: ${log.calories} ккал`,
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            void deleteLog(log.id);
          },
        },
      ],
    );
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SheetShell
        title="Записи за сегодня"
        onClose={onClose}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View
              style={{
                padding: SPACING.xl,
                alignItems: 'center',
              }}
            >
              <Text
                style={[
                  typography.body,
                  {
                    color:
                      colors.textSecondary,
                  },
                ]}
              >
                Загрузка...
              </Text>
            </View>
          ) : logs.length === 0 ? (
            <View
              style={{
                padding: SPACING.xl,
                alignItems: 'center',
              }}
            >
              <Text
                style={[
                  typography.body,
                  {
                    color:
                      colors.textSecondary,
                    textAlign: 'center',
                  },
                ]}
              >
                Нет записей за сегодня
              </Text>
            </View>
          ) : (
            <View
              style={{
                gap: SPACING.sm,
              }}
            >
              {logs.map((log) => (
                <TouchableOpacity
                  key={log.id}
                  onPress={() =>
                    onEdit(log)
                  }
                  activeOpacity={0.7}
                  style={{
                    backgroundColor:
                      colors.surfaceSecondary,
                    borderRadius:
                      BORDER_RADIUS.md,
                    padding: SPACING.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: SPACING.md,
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Text
                      style={[
                        typography.labelBold,
                        {
                          color:
                            colors.textPrimary,
                        },
                      ]}
                    >
                      {MEAL_LABELS[
                        log.meal_type
                      ] ||
                        log.meal_type}
                    </Text>

                    <Text
                      style={[
                        typography.body,
                        {
                          color:
                            colors.primary,
                          marginTop: 2,
                        },
                      ]}
                    >
                      {log.calories} ккал
                    </Text>

                    <Text
                      style={[
                        typography.captionSmall,
                        {
                          color:
                            colors.textSecondary,
                          marginTop: 4,
                        },
                      ]}
                    >
                      Б: {log.proteins}г · Ж:{' '}
                      {log.fats}г · У:{' '}
                      {log.carbs}г
                      {log.water_ml > 0 &&
                        ` · 💧 ${log.water_ml}мл`}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() =>
                      handleDelete(log)
                    }
                    disabled={isDeleting}
                    accessibilityRole="button"
                    accessibilityLabel="Удалить запись"
                    hitSlop={{
                      top: 8,
                      bottom: 8,
                      left: 8,
                      right: 8,
                    }}
                    style={{
                      padding: SPACING.sm,
                    }}
                  >
                    <Trash2
                      size={18}
                      color={colors.error}
                      strokeWidth={2}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </SheetShell>
    </Modal>
  );
}