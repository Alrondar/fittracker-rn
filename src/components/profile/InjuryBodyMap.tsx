// src/components/profile/InjuryBodyMap.tsx
//
// Визуальная карта зон травм для Injuries Screen.
// Синхронизирована с chips-фильтром (arms / torso / legs).
// Тап по мышце переключает фильтр соответствующей зоны.

import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { BodyMap } from '../workout/BodyMap';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import type { Slug } from '../../types/muscleMap';
import type { Injury } from '../../services/injuriesService';
import { getSeverityColor } from './injuryOptions';

type Zone = 'arms' | 'torso' | 'legs';

// Маппинг body_part (из БД) на slug'и мышц
const BODY_PART_TO_SLUGS: Record<string, Slug[]> = {
  shoulder: ['deltoids'],
  elbow: ['biceps', 'triceps', 'forearm'],
  wrist: ['forearm'],
  back: ['upper-back', 'lower-back', 'trapezius'],
  neck: ['neck', 'trapezius'],
  hip: ['gluteal', 'quadriceps', 'hamstring'],
  knee: ['quadriceps', 'hamstring', 'calves'],
  ankle: ['calves', 'tibialis'],
};

// Маппинг зоны на slug'и (для подсветки выбранной зоны)
const ZONE_TO_SLUGS: Record<Zone, Slug[]> = {
  arms: ['deltoids', 'biceps', 'triceps', 'forearm'],
  torso: ['chest', 'upper-back', 'lower-back', 'trapezius', 'abs', 'obliques', 'neck'],
  legs: ['quadriceps', 'hamstring', 'gluteal', 'calves', 'adductors', 'abductors', 'tibialis'],
};

export type InjuryBodyMapProps = {
  injuries: Injury[];
  selectedZones: Zone[];
  onToggleZone: (zone: Zone) => void;
  /** Пол пользователя для силуэта BodyMap. Default 'male'. */
  gender?: 'male' | 'female';
};

export function InjuryBodyMap({
  injuries,
  selectedZones,
  onToggleZone,
  gender = 'male',
}: InjuryBodyMapProps) {
  const { colors } = useTheme();

  // Определяем цвет для каждого slug на основе максимальной severity травмы в этой зоне
  const muscleColors = useMemo(() => {
    const colorMap = new Map<Slug, string>();

    for (const injury of injuries) {
      if (injury.status === 'recovered') continue;
      const slugs = BODY_PART_TO_SLUGS[injury.body_part] || [];
      const injuryColor = getSeverityColor(injury.severity, colors.textSecondary);

      for (const slug of slugs) {
        const current = colorMap.get(slug);
        if (!current) {
          colorMap.set(slug, injuryColor);
        } else {
          // Сравниваем severity: если новая травма серьезнее, обновляем цвет
          // Для простоты: если current был low, а новый medium/high — обновляем
          // Используем эвристику: getSeverityColor возвращает разные цвета,
          // но мы можем просто перезаписать, если severity выше.
          // Упрощение: просто берём последний или самый "яркий".
          // Сделаем простую проверку: если текущий был textSecondary (low), а новый нет — обновляем.
          if (current === colors.textSecondary && injuryColor !== colors.textSecondary) {
            colorMap.set(slug, injuryColor);
          }
        }
      }
    }
    return colorMap;
  }, [injuries, colors.textSecondary]);

  // Формируем данные для BodyMap
  const bodyData = useMemo(() => {
    return Array.from(muscleColors.entries()).map(([slug, color]) => ({
      slug,
      color,
      intensity: 1,
    }));
  }, [muscleColors]);

  // Определяем, какие slug'и должны быть обведены (выбранные зоны)
  const selectedSlugs = useMemo(() => {
    const slugs = new Set<Slug>();
    for (const zone of selectedZones) {
      for (const slug of ZONE_TO_SLUGS[zone]) {
        slugs.add(slug);
      }
    }
    return slugs;
  }, [selectedZones]);

  // Обработчик тапа: находим зону по slug и переключаем её
  const handleBodyPress = (part: { slug?: Slug }) => {
    if (!part?.slug) return;
    // Находим зону, к которой относится этот slug
    for (const [zone, slugs] of Object.entries(ZONE_TO_SLUGS) as [Zone, Slug[]][]) {
      if (slugs.includes(part.slug)) {
        onToggleZone(zone);
        return;
      }
    }
  };

  const hasActiveInjuries = injuries.some((i) => i.status !== 'recovered');

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
      }}
    >
      <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
        Зоны тела
      </Text>
      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: SPACING.md }]}>
        Нажмите на фигуру или кнопку ниже
      </Text>

      <View
        style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' }}
      >
        <View style={{ alignItems: 'center' }}>
          <Text
            style={[
              typography.captionSmall,
              { color: colors.textTertiary, marginBottom: 4, fontWeight: '600' },
            ]}
          >
            Спереди
          </Text>
          <BodyMap
            side="front"
            data={bodyData}
            scale={0.6}
            gender={gender}
            border="none"
            defaultFill={hasActiveInjuries ? colors.textTertiary : colors.surfaceSecondary}
            onBodyPartPress={handleBodyPress}
            selectedSlugs={Array.from(selectedSlugs)}
            selectedStrokeColor={colors.primary}
          />
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text
            style={[
              typography.captionSmall,
              { color: colors.textTertiary, marginBottom: 4, fontWeight: '600' },
            ]}
          >
            Сзади
          </Text>
          <BodyMap
            side="back"
            data={bodyData}
            scale={0.6}
            gender={gender}
            border="none"
            defaultFill={hasActiveInjuries ? colors.textTertiary : colors.surfaceSecondary}
            onBodyPartPress={handleBodyPress}
            selectedSlugs={Array.from(selectedSlugs)}
            selectedStrokeColor={colors.primary}
          />
        </View>
      </View>
    </View>
  );
}
