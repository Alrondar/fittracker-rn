// app/(tabs)/exercises.tsx split (DA-P2-8): строка поиска — живой спиннер,
// подсветка рамки при коротком запросе, подсказка.
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Search, X } from 'lucide-react-native';
import type { RefObject } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';

interface Props {
  inputRef: RefObject<TextInput | null>;
  value: string;
  onChangeText: (text: string) => void;
  isSearching: boolean;
  tooShort: boolean;
}

export function ExerciseSearchBar({ inputRef, value, onChangeText, isSearching, tooShort }: Props) {
  const { colors } = useTheme();

  return (
    <View style={{ marginTop: SPACING.md }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: BORDER_RADIUS.lg,
          paddingHorizontal: SPACING.md,
          borderWidth: 1,
          borderColor: tooShort ? colors.warning : colors.border,
        }}
      >
        {isSearching ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Search size={18} color={colors.textTertiary} strokeWidth={2} />
        )}
        <TextInput
          ref={inputRef}
          style={{ flex: 1, padding: SPACING.md, fontSize: 16, color: colors.textPrimary }}
          placeholder="Поиск упражнения"
          placeholderTextColor={colors.textTertiary}
          value={value}
          onChangeText={onChangeText}
          returnKeyType="search"
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={() => onChangeText('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Очистить поиск"
          >
            <X size={18} color={colors.textTertiary} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>
      {tooShort && (
        <Text
          style={[
            typography.captionSmall,
            { color: colors.warning, marginTop: SPACING.xs, paddingHorizontal: SPACING.xs },
          ]}
        >
          Введите минимум 2 символа
        </Text>
      )}
    </View>
  );
}
