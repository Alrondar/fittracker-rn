import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Calendar, Pencil } from 'lucide-react-native';
import { SPACING, GRADIENTS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { FadeIn } from '../FadeIn';
import { createCardStyles } from '../../styles/components/card';
import { createBadgeStyles } from '../../styles/components/badge';

// Светлый цвет поверх НЕтемизируемых цветных фонов: статичный hero-градиент
// (GRADIENTS.hero) одинаков в обеих темах, поэтому текст/иконки на нём
// фиксированно светлые. colors.textInverse сюда НЕ подходит — это токен
// для текста на surface. Прецедент в проекте: TechniqueMediaSlider рисует
// лейбл на тёмном скриме тем же '#FFFFFF'.
const ON_COLOR = '#FFFFFF';

interface ProgramHeroProps {
  programName: string;
  programDescription: string;
  duration: number;
  schedule: string[];
  levelInfo?: {
    label: string;
    color: string;
    icon: React.ReactNode;
  };
  editMode: boolean;
  onOpenScheduleEditor: () => void;
  colors: any;
  cardStyles: ReturnType<typeof createCardStyles>;
  badgeStyles: ReturnType<typeof createBadgeStyles>;
}

export function ProgramHero({
  programName,
  programDescription,
  duration,
  schedule,
  levelInfo,
  editMode,
  onOpenScheduleEditor,
  colors,
  cardStyles,
  badgeStyles,
}: ProgramHeroProps) {
  return (
    <LinearGradient
      colors={GRADIENTS.hero}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        paddingTop: SPACING.xl + 10,
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.xl,
      }}
    >
      <FadeIn>
        <Text style={[typography.h3, { color: ON_COLOR, marginBottom: SPACING.sm }]}>
          {programName}
        </Text>
        <Text
          style={[
            typography.body,
            { color: ON_COLOR, marginBottom: SPACING.lg, opacity: 0.9 },
          ]}
        >
          {programDescription}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: SPACING.sm,
            marginBottom: SPACING.lg,
          }}
        >
          {levelInfo && (
            <View style={badgeStyles.metaBadge}>
              {levelInfo.icon}
              <Text style={badgeStyles.metaBadgeText}>{levelInfo.label}</Text>
            </View>
          )}
          <View style={badgeStyles.metaBadge}>
            <Clock size={14} color={ON_COLOR} strokeWidth={1.5} />
            <Text style={badgeStyles.metaBadgeText}>{duration} недель</Text>
          </View>
          <View style={badgeStyles.metaBadge}>
            <Calendar size={14} color={ON_COLOR} strokeWidth={1.5} />
            <Text style={badgeStyles.metaBadgeText}>{schedule.length} дн/нед</Text>
          </View>
        </View>
        <View style={cardStyles.scheduleBlock}>
          <View style={cardStyles.scheduleHeader}>
            <Text
              style={[
                typography.caption,
                { color: ON_COLOR, fontWeight: '600', opacity: 0.9 },
              ]}
            >
              Расписание:
            </Text>
            {editMode && (
              <TouchableOpacity
                onPress={onOpenScheduleEditor}
                style={cardStyles.scheduleEditButton}
                activeOpacity={0.7}
              >
                <Pencil size={16} color={ON_COLOR} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
            {schedule.map((day, idx) => (
              <View key={idx} style={badgeStyles.dayChip}>
                <Text style={badgeStyles.dayChipText}>{day}</Text>
              </View>
            ))}
          </View>
        </View>
      </FadeIn>
    </LinearGradient>
  );
}