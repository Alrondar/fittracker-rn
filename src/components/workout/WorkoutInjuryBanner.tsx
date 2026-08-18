// src/components/workout/WorkoutInjuryBanner.tsx
// PR8: injury warnings для workout screen — compact chip + expanded banner.
// Инкапсулирует showBanner state (ранее showInjuryBanner в [id].tsx).
import React, { useState, memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ShieldAlert, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { BODY_PART_LABELS, INJURY_TYPE_LABELS } from '../../constants/injuries';
import { WorkoutTabKey } from './WorkoutTabs';

// Локальный тип, повторяющий структуру из useInjuryWarnings.
// severity — string, так как UserInjury из useInjuryWarnings использует string.
interface ActiveInjury {
  body_part: string;
  injury_type: string;
  severity: string;
}
interface WorkoutInjuryBannerProps {
  hasWarnings: boolean;
  avoidCount: number;
  cautionCount: number;
  activeInjuries: ActiveInjury[];
  activeTab: WorkoutTabKey;
  colors: any;
}

export const WorkoutInjuryBanner = memo(function WorkoutInjuryBanner({
  hasWarnings,
  avoidCount,
  cautionCount,
  activeInjuries,
  activeTab,
  colors,
}: WorkoutInjuryBannerProps) {
  const [showBanner, setShowBanner] = useState(false);

  if (!hasWarnings) return null;

  // Compact chip — только на workout tab, когда banner свёрнут
  if (!showBanner) {
    if (activeTab !== 'workout') return null;
    return (
      <TouchableOpacity
        onPress={() => {
          setShowBanner(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: avoidCount > 0 ? colors.error : colors.warning,
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.sm,
          borderRadius: 20,
          marginHorizontal: SPACING.md,
          marginTop: SPACING.sm,
          alignSelf: 'flex-end',
          elevation: 4,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
        }}
      >
        <ShieldAlert size={18} color={colors.textInverse} strokeWidth={2} />
        <Text
          style={{
            color: colors.textInverse,
            fontWeight: '700',
            marginLeft: SPACING.xs,
            fontSize: 13,
          }}
        >
          {avoidCount > 0 ? `${avoidCount}` : ''}
          {avoidCount > 0 && cautionCount > 0 ? ' ' : ''}
          {cautionCount > 0 ? `${cautionCount}⚠️` : ''}
        </Text>
      </TouchableOpacity>
    );
  }

  // Expanded banner
  return (
    <View
      style={{
        backgroundColor: avoidCount > 0 ? colors.error + '15' : colors.warning + '15',
        borderColor: avoidCount > 0 ? colors.error : colors.warning,
        borderWidth: 1,
        margin: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: SPACING.sm,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <ShieldAlert
            size={20}
            color={avoidCount > 0 ? colors.error : colors.warning}
            style={{ marginRight: SPACING.sm }}
          />
          <Text style={[typography.labelBold, { color: colors.textPrimary, flex: 1 }]}>
            Внимание: активные травмы
          </Text>
        </View>
        <TouchableOpacity onPress={() => setShowBanner(false)}>
          <X size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      {activeInjuries.map((injury, index) => {
        const bodyPartLabel = BODY_PART_LABELS[injury.body_part] || injury.body_part;
        const injuryTypeLabel = INJURY_TYPE_LABELS[injury.injury_type] || injury.injury_type;
        const severityLabel =
          injury.severity === 'high'
            ? 'высокая'
            : injury.severity === 'medium'
              ? 'средняя'
              : 'низкая';
        return (
          <Text
            key={index}
            style={[
              typography.caption,
              { color: colors.textSecondary, lineHeight: 18, marginBottom: SPACING.xs },
            ]}
          >
            • {bodyPartLabel} ({injuryTypeLabel}) — {severityLabel} тяжесть
          </Text>
        );
      })}
      {avoidCount > 0 && (
        <Text
          style={[
            typography.captionSmall,
            { color: colors.error, marginTop: SPACING.sm, fontWeight: '600' },
          ]}
        >
          🚫 {avoidCount} упражнений противопоказаны
        </Text>
      )}
      {cautionCount > 0 && (
        <Text
          style={[
            typography.captionSmall,
            { color: colors.warning, marginTop: SPACING.xs, fontWeight: '600' },
          ]}
        >
          ⚠️ {cautionCount} упражнений требуют осторожности
        </Text>
      )}
    </View>
  );
});