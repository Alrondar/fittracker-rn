// app/(tabs)/exercises.tsx split (DA-P2-8): фильтр по группам мышц —
// горизонтальная лента групп + раскрытые чипы мышц активной группы.
import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS, withAlpha } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { MUSCLE_GROUPS } from '../../constants/muscleGroups';
import { getMuscleColor, MUSCLE_COLORS } from '../../constants/muscleColors';

// Цвет группы мышц — из единых констант (fallback — semantic token)
const getGroupColor = (groupName: string, colors: { textSecondary: string }): string =>
  MUSCLE_COLORS[groupName.toLowerCase()] || colors.textSecondary;

interface Props {
  selectedMuscles: string[];
  onToggleMuscle: (muscle: string) => void;
}

export function MuscleGroupFilters({ selectedMuscles, onToggleMuscle }: Props) {
  const { colors } = useTheme();
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const toggleGroup = (groupName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveGroup((prev) => (prev === groupName ? null : groupName));
  };

  const groupNames = Object.keys(MUSCLE_GROUPS);

  return (
    <View style={{ backgroundColor: colors.background }}>
      <FlatList
        horizontal
        data={groupNames}
        keyExtractor={(item) => item}
        renderItem={({ item: groupName }) => {
          const muscles = MUSCLE_GROUPS[groupName];
          const isActive = activeGroup === groupName;
          const selectedInGroup = muscles.filter((m) => selectedMuscles.includes(m)).length;
          const groupColor = getGroupColor(groupName, colors);
          return (
            <TouchableOpacity
              key={groupName}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: SPACING.md,
                paddingVertical: SPACING.sm,
                borderRadius: BORDER_RADIUS.full,
                backgroundColor: isActive ? withAlpha(groupColor, 0.13) : colors.surface,
                borderWidth: 1,
                borderColor: isActive ? groupColor : colors.border,
              }}
              onPress={() => toggleGroup(groupName)}
              activeOpacity={0.6}
              accessibilityRole="button"
              accessibilityLabel={`Группа мышц: ${groupName}`}
              accessibilityState={{ selected: isActive }}
            >
              <Text
                style={[
                  typography.label,
                  { fontWeight: '600', color: isActive ? groupColor : colors.textPrimary },
                ]}
              >
                {groupName}
              </Text>
              {selectedInGroup > 0 && (
                <View
                  style={{
                    marginLeft: SPACING.xs,
                    backgroundColor: groupColor,
                    borderRadius: 10,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                  }}
                >
                  <Text
                    style={[
                      typography.captionSmall,
                      { fontWeight: '600', color: colors.textInverse },
                    ]}
                  >
                    {selectedInGroup}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={{
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md,
          gap: SPACING.sm,
        }}
        showsHorizontalScrollIndicator={false}
      />
      {activeGroup && (
        <View style={{ paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
            {MUSCLE_GROUPS[activeGroup].map((muscle) => {
              const isSelected = selectedMuscles.includes(muscle);
              const muscleColor = getMuscleColor(muscle);
              return (
                <TouchableOpacity
                  key={muscle}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: SPACING.md,
                    paddingVertical: SPACING.sm,
                    borderRadius: BORDER_RADIUS.md,
                    backgroundColor: isSelected ? withAlpha(muscleColor, 0.13) : colors.surface,
                    borderWidth: 1,
                    borderColor: isSelected ? muscleColor : colors.border,
                  }}
                  onPress={() => onToggleMuscle(muscle)}
                  activeOpacity={0.6}
                  accessibilityRole="button"
                  accessibilityLabel={`Мышца: ${muscle}`}
                  accessibilityState={{ selected: isSelected }}
                >
                  {isSelected && (
                    <Check
                      size={12}
                      color={muscleColor}
                      strokeWidth={2.5}
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: isSelected ? muscleColor : colors.textSecondary,
                        fontWeight: '500',
                      },
                    ]}
                  >
                    {muscle}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}
