import { View, Text, TouchableOpacity } from 'react-native';
import { Program } from '../servises/programsService';
import { Sprout, Dumbbell, Flame, Calendar, Edit2, ChevronRight } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../constants/theme';
import { typography } from '../styles/typography';
import { createCardStyles } from '../styles/components/card';
import { createBadgeStyles } from '../styles/components/badge';


type LevelFilter = 'beginner' | 'intermediate' | 'advanced';

const LEVEL_COLORS: Record<LevelFilter, string> = {
  beginner: '#4CAF50',
  intermediate: '#FF9800',
  advanced: '#F44336',
};

interface ProgramCardProps {
  item: Program;
  index: number;
  isMyProgram: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onEditPress: () => void;
  colors: any;
  cardStyles: ReturnType<typeof createCardStyles>;
  badgeStyles: ReturnType<typeof createBadgeStyles>;
}

function getLevelInfo(level: string, colors: any) {
  switch (level) {
    case 'beginner':
      return {
        label: 'Новичок',
        color: '#4CAF50',
        icon: <Sprout size={14} color="#4CAF50" strokeWidth={1.5} />,
      };
    case 'intermediate':
      return {
        label: 'Средний',
        color: '#FF9800',
        icon: <Dumbbell size={14} color="#FF9800" strokeWidth={1.5} />,
      };
    case 'advanced':
      return {
        label: 'Продвинутый',
        color: '#F44336',
        icon: <Flame size={14} color="#F44336" strokeWidth={1.5} />,
      };
    default:
      return {
        label: level,
        color: colors.textSecondary,
        icon: <Dumbbell size={14} color={colors.textSecondary} strokeWidth={1.5} />,
      };
  }
}

export function ProgramCard({
  item,
  index,
  isMyProgram,
  onPress,
  onLongPress,
  onEditPress,
  colors,
  cardStyles,
  badgeStyles,
}: ProgramCardProps) {
  const levelInfo = getLevelInfo(item.level, colors);
  const levelColor = LEVEL_COLORS[item.level as LevelFilter] || colors.primary;

  return (
<TouchableOpacity
  onPress={onPress}
  onLongPress={onLongPress}
  delayLongPress={500}
  activeOpacity={0.85}
  style={{
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  }}
>
  <View style={[cardStyles.programCard, { borderLeftWidth: 4, borderLeftColor: levelColor }]}>
        {/* Верхняя часть карточки */}
        <View style={{ padding: SPACING.lg, paddingBottom: SPACING.md }}>
          {/* Бейджи: Моя, Уровень, Длительность */}
          <View style={cardStyles.header}>
            {isMyProgram && (
              <View style={cardStyles.myProgramBadge}>
                <Text style={cardStyles.myProgramBadgeText}>Моя</Text>
              </View>
            )}
            <View style={[badgeStyles.programBadge, { backgroundColor: levelInfo.color + '15' }]}>
              {levelInfo.icon}
              <Text style={[badgeStyles.programBadgeText, { color: levelInfo.color }]}>
                {levelInfo.label}
              </Text>
            </View>
            <View style={[badgeStyles.programBadge, { backgroundColor: colors.primary + '15' }]}>
              <Calendar size={12} color={colors.primary} strokeWidth={2} />
              <Text style={[badgeStyles.programBadgeText, { color: colors.primary }]}>
                {item.duration} нед
              </Text>
            </View>
          </View>

          <Text style={cardStyles.title} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={cardStyles.description} numberOfLines={3}>
            {item.description}
          </Text>
        </View>

        {/* Расписание */}
        {item.schedule && item.schedule.length > 0 && (
          <View
            style={{
              paddingHorizontal: SPACING.lg,
              paddingVertical: SPACING.md,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <Text
              style={[
                typography.caption,
                { color: colors.textSecondary, marginBottom: SPACING.sm },
              ]}
            >
              Расписание:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
              {item.schedule.map((day, idx) => (
                <View
                  key={idx}
                  style={[badgeStyles.dayChip, { backgroundColor: colors.primary + '15' }]}
                >
                  <Text style={[badgeStyles.dayChipText, { color: colors.primary }]}>
                    {day}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ✅ Футер с pill-кнопкой "Подробнее" */}
<View style={cardStyles.programCardFooter}>
  {isMyProgram && (
    <TouchableOpacity
      onPress={(e) => {
        e.stopPropagation();
        onEditPress();
      }}
      style={cardStyles.programCardEditButton}
    >
      <Edit2 size={16} color={colors.primary} strokeWidth={2} />
    </TouchableOpacity>
  )}
  <View style={cardStyles.programCardFooterPill}>
    <Text style={cardStyles.programCardFooterPillText}>Подробнее</Text>
    <ChevronRight size={14} color={colors.primary} strokeWidth={2.5} />
  </View>
</View>
      </View>
    </TouchableOpacity>
  );
}