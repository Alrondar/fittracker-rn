import React from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';

interface SheetShellProps {
  /** Заголовок. Если не передан — шапка с крестиком не рисуется. */
  title?: string;
  /** Закрытие по тапу на затемнение и по крестику. */
  onClose: () => void;
  /** Доп. отступ сверху панели (например, под кастомный контент вместо title). */
  keyboardVerticalOffset?: number;
  children: React.ReactNode;
}

/**
 * Единая оболочка для всех bottom-sheet модалок.
 *
 * Внутри НЕ должно быть «голых» текстовых строк — всё в <Text>.
 * Затемнение, tap-to-close, панель, заголовок, ScrollView, клавиатура —
 * всё здесь; формы компонентов (PhaseSettings/DaySettings/ExerciseSettings/...)
 * кладут только поля ввода и кнопки.
 */
export function SheetShell({
  title,
  onClose,
  keyboardVerticalOffset = 0,
  children,
}: SheetShellProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
      style={{ flex: 1 }}
    >
      {/* Затемнение на весь экран (colors.overlay — без хардкода rgba). */}
      <View style={{ flex: 1, backgroundColor: colors.overlay }}>
        {/* Тап по затемнению закрывает; прозрачный, занимает всё место над панелью. */}
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: BORDER_RADIUS.xl,
            borderTopRightRadius: BORDER_RADIUS.xl,
            // Не вылезать за верх на низких экранах / landscape клавиатуры.
            maxHeight: '92%',
          }}
        >
          {/* Фиксированная шапка: заголовок + крестик. Рисуем только если передан title.
              ВАЖНО: весь видимый текст — внутри <Text>. */}
          {title ? (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: SPACING.lg,
                paddingTop: SPACING.lg,
                paddingBottom: SPACING.md,
              }}
            >
              <Text
                style={[typography.h5, { color: colors.textPrimary, flex: 1 }]}
                numberOfLines={1}
              >
                {title}
              </Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Скроллируемая форма: прокрутка + авто-прокрутка к полю над клавиатурой.
              keyboardShouldPersistTaps="handled" — кнопка «Сохранить» срабатывает
              прямо с открытой клавиатурой, без её закрытия. */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: SPACING.lg,
              paddingBottom: Math.max(SPACING.lg, insets.bottom + SPACING.md),
            }}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}