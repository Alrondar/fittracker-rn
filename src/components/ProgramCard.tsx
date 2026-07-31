import { memo, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Program } from '../services/programsService';
import {
  Sprout,
  Dumbbell,
  Flame,
  Calendar,
  Edit2,
  ChevronRight,
  CheckCircle2,
  Zap,
} from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../constants/theme';
import { typography } from '../styles/typography';
import { createCardStyles } from '../styles/components/card';
import { createBadgeStyles } from '../styles/components/badge';
import { LEVEL_COLORS, LevelKey } from '../constants/semanticColors';

interface ProgramCardProps {
  item: Program;
  index: number;
  isMyProgram: boolean;
  isActive: boolean; // ✅ НОВОЕ: является ли программа текущей активной
  onPress: () => void;
  onLongPress: () => void;
  onEditPress: () => void;
  onActivatePress: () => void; // ✅ НОВОЕ: колбэк активации (диалог — на стороне экрана)
  colors: any;
  cardStyles: ReturnType<typeof createCardStyles>;
  badgeStyles: ReturnType<typeof createBadgeStyles>;
}

// ✅ ARCH-3/ARCH-5: цвета уровней — только из единого источника LEVEL_COLORS,
//    никакого хардкода #4CAF50/#FF9800/#F44336.
function getLevelInfo(level: string, colors: any) {
  const color = LEVEL_COLORS[level as LevelKey] ?? colors.textSecondary;
  switch (level) {
    case 'beginner':
      return { label: 'Новичок', color, icon: <Sprout size={14} color={color} strokeWidth={1.5} /> };
    case 'intermediate':
      return { label: 'Средний', color, icon: <Dumbbell size={14} color={color} strokeWidth={1.5} /> };
    case 'advanced':
      return { label: 'Продвинутый', color, icon: <Flame size={14} color={color} strokeWidth={1.5} /> };
    default:
      return {
        label: level,
        color: colors.textSecondary,
        icon: <Dumbbell size={14} color={colors.textSecondary} strokeWidth={1.5} />,
      };
  }
}

export const ProgramCard = memo(function ProgramCard({
  item,
  index,
  isMyProgram,
  isActive,
  onPress,
  onLongPress,
  onEditPress,
  onActivatePress,
  colors,
  cardStyles,
  badgeStyles,
}: ProgramCardProps) {
  const levelInfo = getLevelInfo(item.level, colors);
  const levelColor = LEVEL_COLORS[item.level as LevelKey] ?? colors.primary;

  // ✅ Стабильный колбэк активации: гасим всплытие, чтобы не сработал onPress карточки.
  const handleActivate = useCallback(
    (e: any) => {
      e?.stopPropagation?.();
      onActivatePress();
    },
    [onActivatePress],
  );

  const handleEdit = useCallback(
    (e: any) => {
      e?.stopPropagation?.();
      onEditPress();
    },
    [onEditPress],
  );

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
      <View
        style={[
          cardStyles.programCard,
          {
            // Цветная полоса уровня — всегда слева
            borderLeftWidth: 4,
            borderLeftColor: levelColor,
            // ✅ Активная программа: акцентная рамка + усиленное свечение;
            //    остальные — нейтральная рамка, чтобы активная сразу читалась.
            borderColor: isActive ? colors.primary : colors.border,
            borderWidth: isActive ? 2 : 1.5,
            ...(isActive
              ? { elevation: 6, shadowOpacity: 0.3, shadowRadius: 8 }
              : { elevation: 2, shadowOpacity: 0.06, shadowRadius: 3 }),
          },
        ]}
      >
        {/* Верхняя часть карточки */}
        <View style={{ padding: SPACING.lg, paddingBottom: SPACING.md }}>
          {/* Бейджи: Моя, Уровень, Длительность, Текущая */}
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

            {/* ✅ Бейдж «Текущая» — последний в ряду, прижат вправо (space-between) */}
            {isActive && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: SPACING.sm,
                  paddingVertical: 3,
                  borderRadius: BORDER_RADIUS.full,
                  backgroundColor: colors.success,
                }}
              >
                <CheckCircle2 size={12} color={colors.textInverse} strokeWidth={2.5} />
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '700',
                    color: colors.textInverse,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Текущая
                </Text>
              </View>
            )}
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
              style={[typography.caption, { color: colors.textSecondary, marginBottom: SPACING.sm }]}
            >
              Расписание:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
              {item.schedule.map((day, idx) => (
                <View key={idx} style={[badgeStyles.dayChip, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[badgeStyles.dayChipText, { color: colors.primary }]}>{day}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Футер: редактирование + активация + «Подробнее» */}
        <View style={cardStyles.programCardFooter}>
          {isMyProgram && (
            <TouchableOpacity onPress={handleEdit} style={cardStyles.programCardEditButton}>
              <Edit2 size={16} color={colors.primary} strokeWidth={2} />
            </TouchableOpacity>
          )}

          {/* ✅ Кнопка «Активировать» — только для своих и только если не активна.
                 У активной вместо неё — бейдж «Текущая» (защита от случайного клика). */}
          {isMyProgram && !isActive && (
            <TouchableOpacity
              onPress={handleActivate}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: SPACING.md,
                paddingVertical: SPACING.sm,
                borderRadius: BORDER_RADIUS.full,
                backgroundColor: colors.primary + '15',
                borderWidth: 1,
                borderColor: colors.primary + '40',
                marginRight: SPACING.sm,
              }}
            >
              <Zap size={12} color={colors.primary} strokeWidth={2.5} />
              <Text style={[typography.buttonTiny, { color: colors.primary, fontWeight: '700' }]}>
                Активировать
              </Text>
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
});