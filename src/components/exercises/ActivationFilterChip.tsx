// app/(tabs)/exercises.tsx split (DA-P2-8): чип-фильтр «Только активация».
import { View, Text, TouchableOpacity } from 'react-native';
import { Zap } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS, withAlpha } from '../../constants/theme';
import { typography } from '../../styles/typography';

interface Props {
  active: boolean;
  onToggle: () => void;
}

export function ActivationFilterChip({ active, onToggle }: Props) {
  const { colors } = useTheme();

  return (
    <View style={{ paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm }}>
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Фильтр: только активационные упражнения"
        accessibilityState={{ selected: active }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: 6,
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.sm,
          borderRadius: BORDER_RADIUS.full,
          backgroundColor: active ? withAlpha(colors.warning, 0.13) : colors.surface,
          borderWidth: 1,
          borderColor: active ? colors.warning : colors.border,
        }}
      >
        <Zap size={14} color={active ? colors.warning : colors.textSecondary} strokeWidth={2} />
        <Text
          style={[
            typography.caption,
            {
              color: active ? colors.warning : colors.textSecondary,
              fontWeight: active ? '700' : '500',
            },
          ]}
        >
          Только активация
        </Text>
      </TouchableOpacity>
    </View>
  );
}
