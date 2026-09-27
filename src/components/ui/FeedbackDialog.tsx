// src/components/ui/FeedbackDialog.tsx
// WEB-1: хост диалогов `feedback` (src/lib/feedback.ts).
//
// Нативные платформы компонент не рендерит вообще: там `feedback.alert` делегирует
// в системный `Alert.alert`, и никакой React-Tree не участвует (PRODUCT.md §3.6:
// «Modal — только для критических решений», системный алерт для этого и нужен).
// На вебе `Alert` в react-native-web — заглушка, поэтому подтверждения и ошибки
// показываются этим диалогом: центральный карточный модаль поверх затемнения.
//
// Дизайн-соглашения:
// - только semantic tokens (`useTheme`), canonical `SPACING`/`BORDER_RADIUS`/`SHADOWS`;
// - действия — существующий `AppButton` (pressed-язык через `PressableScale` внутри);
// - деструктивное действие — вариант `danger`, отмена — `ghost` (PRODUCT.md §3.1:
//   destructive визуально отделено);
// - 44pt-таргеты обеспечиваются размером `AppButton` medium;
// - закрытие по затемнению и Escape — без колбэков (как cancelable iOS-алерт).
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { AppButton } from './AppButton';
import {
  buttonVariantFor,
  dismissFeedback,
  pressFeedback,
  subscribeFeedback,
  type FeedbackDialogRequest,
} from '../../lib/feedback';

const IS_WEB = Platform.OS === 'web';
const MAX_WIDTH = 420;

export function FeedbackDialog() {
  const { colors } = useTheme();
  const [queue, setQueue] = useState<FeedbackDialogRequest[]>([]);

  useEffect(() => {
    if (!IS_WEB) return undefined;
    return subscribeFeedback(setQueue);
  }, []);

  const dialog = queue[0];

  const close = useCallback(() => {
    if (dialog) dismissFeedback(dialog.id);
  }, [dialog]);

  // Escape = отмена (только веб; на нативных платформах компонент ничего не рендерит).
  useEffect(() => {
    if (!IS_WEB || !dialog) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissFeedback(dialog.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog]);

  if (!IS_WEB || !dialog) return null;

  const buttons = dialog.buttons?.length ? dialog.buttons : [{ text: 'ОК' }];

  return (
    <View style={styles.layer}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        onPress={close}
        accessibilityRole="button"
        accessibilityLabel="Закрыть"
      />
      <View
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        accessibilityViewIsModal
        accessibilityRole="alert"
      >
        <Text style={[typography.h5, { color: colors.textPrimary }]}>{dialog.title}</Text>
        {dialog.message ? (
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: SPACING.sm }]}>
            {dialog.message}
          </Text>
        ) : null}
        <View style={styles.actions}>
          {buttons.map((btn, i) => (
            <AppButton
              key={`${dialog.id}-${i}`}
              title={btn.text ?? 'ОК'}
              variant={buttonVariantFor(i, buttons.length, btn.style)}
              onPress={() => pressFeedback(dialog.id, i)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'box-none',
    zIndex: 10000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    marginHorizontal: SPACING.xl,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    ...SHADOWS.lg,
  },
  actions: {
    marginTop: SPACING.xl,
    gap: SPACING.sm,
  },
});
