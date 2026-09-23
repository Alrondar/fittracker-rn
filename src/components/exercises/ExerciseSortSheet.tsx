// app/(tabs)/exercises.tsx split (DA-P2-8): лист сортировки (SheetShell).
import { View, Text, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { SheetShell } from '../ui/SheetShell';
import type { ExerciseSortBy } from '../../services/exercisesService';

const SORT_OPTIONS: { key: ExerciseSortBy; label: string }[] = [
  { key: 'name-asc', label: 'По названию (А-Я)' },
  { key: 'name-desc', label: 'По названию (Я-А)' },
  { key: 'popularity', label: 'По популярности' },
];

interface Props {
  visible: boolean;
  sortBy: ExerciseSortBy;
  onSelect: (key: ExerciseSortBy) => void;
  onClose: () => void;
}

export function ExerciseSortSheet({ visible, sortBy, onSelect, onClose }: Props) {
  const { colors } = useTheme();

  return (
    <SheetShell visible={visible} title="Сортировка" onClose={onClose}>
      <View>
        {SORT_OPTIONS.map((option, idx, arr) => (
          <TouchableOpacity
            key={option.key}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: SPACING.md,
              borderBottomWidth: idx < arr.length - 1 ? 1 : 0,
              borderBottomColor: colors.border,
            }}
            onPress={() => {
              onSelect(option.key);
              onClose();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Сортировка: ${option.label}`}
            accessibilityState={{ selected: sortBy === option.key }}
          >
            <Text
              style={[
                typography.body,
                {
                  color: sortBy === option.key ? colors.primary : colors.textPrimary,
                  fontWeight: sortBy === option.key ? '600' : '400',
                },
              ]}
            >
              {option.label}
            </Text>
            {sortBy === option.key && <Check size={20} color={colors.primary} strokeWidth={2} />}
          </TouchableOpacity>
        ))}
      </View>
    </SheetShell>
  );
}
