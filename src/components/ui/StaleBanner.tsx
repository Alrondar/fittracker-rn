// src/components/ui/StaleBanner.tsx
// EDGE-10 (аудит 06.10): неудачная фоновая перезагрузка при живом кэше — не повод
// выбрасывать рабочий экран в полноэкранный отказ. Данные остаются на месте,
// устаревание становится явным, а лечится одним тапом.
// Инлайн (в отличие от LoadingChip): занимает место в потоке экрана, тапаемый.
// CONN-1 (27.10): у плашки появился «вид» — один носитель на четыре разных
// сигнала (устаревание, нет сети, есть незаписанное, запись подтверждена).
// Отдельный компонент под это не заводился: геометрия, отступы и тап-зона те же,
// различаются только значок, акцент и наличие действия (PRODUCT.md §3.1).
import React from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { AlertTriangle, Check, CloudOff, RefreshCw, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS, withAlpha, fontScale } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { PressableScale } from './PressableScale';

export type StaleTone = 'stale' | 'offline' | 'unsaved' | 'saved';

/**
 * Подпись для вкладок, когда сети нет, а данные в кэше живые. Одна строка на
 * четыре экрана — владелец здесь, а не четыре копии в файлах экранов.
 */
export const OFFLINE_DATA_LABEL = 'Нет сети · показаны сохранённые данные';

interface ToneSpec {
  label: string;
  accent: 'warning' | 'success';
  Icon: LucideIcon;
  /** Можно ли вообще предложить действие: у «Записано» нажатия нет. */
  actionPossible: boolean;
}

const TONES: Record<StaleTone, ToneSpec> = {
  stale: {
    label: 'Не удалось обновить данные',
    accent: 'warning',
    Icon: AlertTriangle,
    actionPossible: true,
  },
  offline: { label: 'Нет сети', accent: 'warning', Icon: CloudOff, actionPossible: true },
  unsaved: { label: 'Не записано', accent: 'warning', Icon: AlertTriangle, actionPossible: true },
  saved: { label: 'Записано', accent: 'success', Icon: Check, actionPossible: false },
};

export function StaleBanner({
  tone = 'stale',
  label,
  actionLabel = 'Обновить',
  onRetry,
  actionable = true,
  style,
}: {
  tone?: StaleTone;
  /** Перебивает текст вида; по умолчанию — текст тона. */
  label?: string;
  actionLabel?: string;
  onRetry?: () => void;
  /** `false` — тот же блок без тапа и без кнопки: повтор заведомо не поможет. */
  actionable?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const spec = TONES[tone];
  const accent = spec.accent === 'success' ? colors.success : colors.warning;
  const text = label ?? spec.label;
  const showAction = actionable && spec.actionPossible && onRetry != null;
  const Icon = spec.Icon;

  const box = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: withAlpha(accent, 0.35),
    backgroundColor: withAlpha(accent, 0.08),
  };

  const content = (
    <>
      <Icon size={fontScale(18)} color={accent} strokeWidth={2} />
      <Text style={[typography.bodySmall, { flex: 1, color: colors.textPrimary }]}>{text}</Text>
      {showAction ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
          <RefreshCw size={fontScale(14)} color={colors.primary} strokeWidth={2.2} />
          <Text style={[typography.labelBold, { color: colors.primary }]}>{actionLabel}</Text>
        </View>
      ) : null}
    </>
  );

  if (!showAction) {
    // Тапать нечего: тот же блок, но без жеста и с ролью текста для диктора.
    return (
      <View style={[box, style]} accessibilityRole="text">
        {content}
      </View>
    );
  }

  return (
    <PressableScale
      onPress={onRetry}
      accessibilityRole="button"
      accessibilityLabel={`${text}. ${actionLabel}`}
      style={[box, style]}
    >
      {content}
    </PressableScale>
  );
}
