import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { Dumbbell, ChevronDown } from 'lucide-react-native';

import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { EXERCISE_CATEGORIES } from '../../constants/exerciseCategories';

interface CategoryStripProps {
  selectedCategories: string[];
  categoryCounts: Record<string, number>;
  onToggleCategory: (value: string) => void;
  equipmentSelectedCount: number;
  onOpenEquipmentSheet: () => void;
}

export function CategoryStrip({
  selectedCategories,
  categoryCounts,
  onToggleCategory,
  equipmentSelectedCount,
  onOpenEquipmentSheet,
}: CategoryStripProps) {
  const { colors } = useTheme();

  // Триггер оборудования — первый элемент ленты
  const equipmentTrigger = (
    <TouchableOpacity
      onPress={onOpenEquipmentSheet}
      activeOpacity={0.6}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: equipmentSelectedCount > 0 ? colors.primary + '15' : colors.surface,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: equipmentSelectedCount > 0 ? colors.primary : colors.border,
      }}
    >
      <Dumbbell
        size={14}
        color={equipmentSelectedCount > 0 ? colors.primary : colors.textSecondary}
        strokeWidth={2}
      />
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: equipmentSelectedCount > 0 ? colors.primary : colors.textPrimary,
        }}
      >
        Оборудование
      </Text>
      {equipmentSelectedCount > 0 && (
        <View
          style={{
            backgroundColor: colors.primary,
            borderRadius: 10,
            paddingHorizontal: 6,
            paddingVertical: 1,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textInverse }}>
            {equipmentSelectedCount}
          </Text>
        </View>
      )}
      <ChevronDown size={13} color={colors.textTertiary} strokeWidth={2} />
    </TouchableOpacity>
  );

  return (
    <FlatList
      horizontal
      data={EXERCISE_CATEGORIES}
      keyExtractor={(item) => item.value}
      ListHeaderComponent={equipmentTrigger}
      renderItem={({ item: category }) => {
        const isActive = selectedCategories.includes(category.value);
        const count = categoryCounts[category.value];
        const Icon = category.icon;
        return (
          <TouchableOpacity
            onPress={() => onToggleCategory(category.value)}
            activeOpacity={0.6}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: SPACING.md,
              paddingVertical: SPACING.sm,
              borderRadius: BORDER_RADIUS.full,
              backgroundColor: isActive ? colors.primary + '15' : colors.surface,
              borderWidth: 1,
              borderColor: isActive ? colors.primary : colors.border,
            }}
          >
            <Icon
              size={14}
              color={isActive ? colors.primary : colors.textSecondary}
              strokeWidth={2}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: isActive ? colors.primary : colors.textPrimary,
              }}
            >
              {category.label}
            </Text>
            {count !== undefined && (
              <Text style={{ fontSize: 11, color: colors.textTertiary, fontWeight: '500' }}>
                {count}
              </Text>
            )}
          </TouchableOpacity>
        );
      }}
      contentContainerStyle={{
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        gap: SPACING.sm,
      }}
      showsHorizontalScrollIndicator={false}
    />
  );
}