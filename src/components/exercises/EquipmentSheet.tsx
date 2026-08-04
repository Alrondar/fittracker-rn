import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { Search, Check, X } from 'lucide-react-native';

import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { EquipmentIcon } from '../EquipmentIcon';
import { FilterOption } from '../../services/exercisesService';

interface EquipmentSheetProps {
  options: FilterOption[];
  selected: string[];
  onToggle: (equipment: string) => void;
  onReset: () => void;
  onClose: () => void;
}

export function EquipmentSheet({ options, selected, onToggle, onReset, onClose }: EquipmentSheetProps) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');

  const filteredOptions = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return options;
    return options.filter(o => o.value.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <>
{/* Подложка */}
<TouchableOpacity
  style={{
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.overlay,
  }}
  onPress={onClose}
  activeOpacity={1}
/>

      {/* Панель */}
      <View
        style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          backgroundColor: colors.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxHeight: '75%',
          paddingBottom: SPACING.lg,
        }}
      >
        {/* Ручка */}
        <View
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.border,
            alignSelf: 'center',
            marginTop: SPACING.sm,
            marginBottom: SPACING.md,
          }}
        />

        {/* Шапка */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: SPACING.lg,
            marginBottom: SPACING.md,
          }}
        >
          <Text style={[typography.h5, { color: colors.textPrimary }]}>Оборудование</Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <X size={20} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Поиск по оборудованию */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surfaceSecondary,
            borderRadius: BORDER_RADIUS.lg,
            paddingHorizontal: SPACING.md,
            marginHorizontal: SPACING.lg,
            marginBottom: SPACING.md,
          }}
        >
          <Search size={16} color={colors.textTertiary} strokeWidth={2} />
          <TextInput
            style={{ flex: 1, padding: SPACING.sm, fontSize: 15, color: colors.textPrimary }}
            placeholder="Найти оборудование"
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color={colors.textTertiary} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>

        {/* Список */}
        <FlatList
          data={filteredOptions}
          keyExtractor={(item) => item.value}
          renderItem={({ item: option }) => {
            const isSelected = selected.includes(option.value);
            return (
              <TouchableOpacity
                onPress={() => onToggle(option.value)}
                activeOpacity={0.6}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: SPACING.lg,
                  paddingVertical: SPACING.sm,
                  backgroundColor: isSelected ? colors.primary + '08' : 'transparent',
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: colors.surfaceSecondary,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: SPACING.md,
                  }}
                >
                  <EquipmentIcon name={option.value} size={24} scale={0.8} />
                </View>
                <Text
                  style={[typography.body, { color: colors.textPrimary, flex: 1 }]}
                  numberOfLines={1}
                >
                  {option.value}
                </Text>
                <Text style={[typography.captionSmall, { color: colors.textTertiary, marginRight: SPACING.md }]}>
                  {option.count}
                </Text>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 1.5,
                    borderColor: isSelected ? colors.primary : colors.border,
                    backgroundColor: isSelected ? colors.primary : 'transparent',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {isSelected && <Check size={13} color={colors.textInverse} strokeWidth={3} />}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text
              style={[
                typography.body,
                { color: colors.textTertiary, textAlign: 'center', paddingVertical: SPACING.xl },
              ]}
            >
              Ничего не найдено
            </Text>
          }
        />

        {/* Футер */}
        <View
          style={{
            flexDirection: 'row',
            gap: SPACING.md,
            paddingHorizontal: SPACING.lg,
            paddingTop: SPACING.md,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          {selected.length > 0 && (
            <TouchableOpacity
              onPress={onReset}
              style={{
                paddingVertical: SPACING.md,
                paddingHorizontal: SPACING.lg,
                borderRadius: BORDER_RADIUS.lg,
                borderWidth: 1,
                borderColor: colors.border,
                justifyContent: 'center',
              }}
            >
              <Text style={[typography.labelBold, { color: colors.textSecondary }]}>
                Сбросить ({selected.length})
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={onClose}
            style={{
              flex: 1,
              paddingVertical: SPACING.md,
              borderRadius: BORDER_RADIUS.lg,
              backgroundColor: colors.primary,
              alignItems: 'center',
            }}
          >
            <Text style={[typography.button, { color: colors.textInverse }]}>
              Готово{selected.length > 0 ? ` · ${selected.length}` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}