// src/components/ui/StateBlock.tsx
// UX-2 (audit-4): единый канон экранного empty/error-состояния — иконка-якорь
// в тонированном круге (тот же паттерн, что «Нет активной программы» на Dashboard),
// заголовок, описание, CTA. Тексты ошибок отвечают на «что случилось» И «что делать»
// (Nielsen error-recovery). Голые «текст + кнопка» на экранах быть не должны.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, scale, withAlpha } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { AppButton } from './AppButton';
import { FadeIn } from '../FadeIn';

export interface StateBlockProps {
  /** Компонент-иконка lucide. */
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** 'error' — предупреждающая иконка/акцент; 'empty' — нейтральная. */
  tone?: 'error' | 'empty';
}

export function StateBlock({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  tone = 'empty',
}: StateBlockProps) {
  const { colors } = useTheme();
  const Icon = icon ?? (tone === 'error' ? AlertTriangle : undefined);
  const iconColor = tone === 'error' ? colors.warning : colors.primary;

  return (
    <FadeIn style={styles.wrap}>
      {Icon ? (
        <View style={[styles.iconCircle, { backgroundColor: withAlpha(iconColor, 0.08) }]}>
          <Icon size={scale(26)} color={iconColor} strokeWidth={1.8} />
        </View>
      ) : null}

      <Text style={[typography.h5, styles.title, { color: colors.textPrimary }]}>{title}</Text>

      {description ? (
        <Text style={[typography.body, styles.desc, { color: colors.textSecondary }]}>
          {description}
        </Text>
      ) : null}

      {actionLabel && onAction ? (
        <AppButton title={actionLabel} variant="primary" onPress={onAction} />
      ) : null}
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
  },
  iconCircle: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  desc: {
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
});
