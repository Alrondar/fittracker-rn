import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { AppCard } from '../ui/AppCard';
import type { IconComponent } from '../../constants/goals';
import type { ThemeColors } from '../../constants/theme';

// ===== Индикатор шагов =====
export function StepDots({
  step,
  activeColor,
  inactiveColor,
}: {
  step: number;
  activeColor: string;
  inactiveColor: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: SPACING.xl,
        gap: SPACING.sm,
      }}
    >
      {[1, 2, 3].map((s) => (
        <View
          key={s}
          style={{
            width: s === step ? 32 : 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: s === step ? activeColor : inactiveColor,
          }}
        />
      ))}
    </View>
  );
}

// ===== Галочка выбора =====
export function CheckMark({
  backgroundColor,
  textColor,
}: {
  backgroundColor: string;
  textColor: string;
}) {
  return (
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={[typography.captionSmall, { color: textColor, fontWeight: '700' }]}>✓</Text>
    </View>
  );
}

// ===== Карточка выбора пола =====
export function GenderCard({
  selected,
  onPress,
  label,
  icon: Icon,
  colors,
}: {
  selected: boolean;
  onPress: () => void;
  label: string;
  icon: IconComponent;
  colors: ThemeColors;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        alignItems: 'center',
        paddingVertical: SPACING.lg,
        borderColor: selected ? colors.primary : colors.border,
        borderWidth: 2,
        backgroundColor: selected ? colors.primary + '15' : colors.surface,
        borderRadius: BORDER_RADIUS.lg,
      }}
    >
      <Icon size={32} color={selected ? colors.primary : colors.textSecondary} />
      <Text
        style={[
          typography.labelBold,
          { color: selected ? colors.primary : colors.textSecondary, marginTop: SPACING.sm },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ===== Строка-вариант выбора (цель / активность / фарма) =====
export function SelectableRow({
  selected,
  onPress,
  icon: Icon,
  title,
  desc,
  accentColor,
  colors,
}: {
  selected: boolean;
  onPress: () => void;
  icon: IconComponent;
  title: string;
  desc: string;
  accentColor: string;
  colors: ThemeColors;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderColor: selected ? accentColor : colors.border,
        borderWidth: 2,
        backgroundColor: selected ? accentColor + '18' : colors.surface,
        marginBottom: SPACING.sm,
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
      }}
    >
      <Icon
        size={22}
        color={selected ? accentColor : colors.textSecondary}
        style={{ marginRight: SPACING.md }}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={[
            typography.labelBold,
            { color: selected ? accentColor : colors.textPrimary },
          ]}
        >
          {title}
        </Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{desc}</Text>
      </View>
      {selected && <CheckMark backgroundColor={accentColor} textColor={colors.textInverse} />}
    </TouchableOpacity>
  );
}

// ===== Карточка макроса =====
export function MacroCard({
  icon: Icon,
  value,
  label,
  color,
  colors,
}: {
  icon: IconComponent;
  value: number;
  label: string;
  color: string;
  colors: ThemeColors;
}) {
  return (
    <AppCard
      variant="compact"
      style={{ flex: 1, alignItems: 'center', borderColor: color, borderWidth: 2 }}
    >
      <Icon size={24} color={color} />
      <Text style={[typography.h3, { color, marginTop: SPACING.sm }]}>{value}г</Text>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
    </AppCard>
  );
}