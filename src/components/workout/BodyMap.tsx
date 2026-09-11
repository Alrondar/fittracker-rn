/**
 * BodyMap — внутренний компонент для отображения анатомической карты мышц.
 * Заменяет внешнюю библиотеку react-native-body-highlighter.
 * Использует react-native-svg для рендеринга SVG-путей.
 */

import React, { memo } from 'react';
import Svg, { Path, G } from 'react-native-svg';
import {
  bodyFront,
  bodyBack,
  bodyFemaleFront,
  bodyFemaleBack,
} from '../../constants/muscleSvgPaths';
import {
  MALE_FRONT_OUTLINE,
  MALE_BACK_OUTLINE,
  FEMALE_FRONT_OUTLINE,
  FEMALE_BACK_OUTLINE,
} from '../../constants/muscleOutlines';
import type { BodyPart, ExtendedBodyPart } from '../../types/muscleMap';

export type BodyMapProps = {
  data: readonly ExtendedBodyPart[];
  side?: 'front' | 'back';
  gender?: 'male' | 'female';
  scale?: number;
  defaultFill?: string;
  border?: string | 'none';
  onBodyPartPress?: (part: ExtendedBodyPart, side?: 'left' | 'right') => void;
  colors?: readonly string[];
  /** Выделенная мышца (обводка поверх заливки). */
  selectedSlug?: string | null;
  /** Выделенные мышцы (массив, для подсветки зон). */
  selectedSlugs?: readonly string[];
  /** Цвет обводки выделенной мышцы. По умолчанию textPrimary из темы. */
  selectedStrokeColor?: string;
};

export const BodyMap = memo<BodyMapProps>(
  ({
    data,
    side = 'front',
    gender = 'male',
    scale = 1,
    defaultFill = '#3f3f3f',
    border = 'none',
    onBodyPartPress,
    colors = ['#0984e3', '#74b9ff'],
    selectedSlug,
    selectedSlugs,
    selectedStrokeColor = '#000000',
  }) => {
    const isMale = gender === 'male';
    const isFront = side === 'front';

    // Выбираем правильные пути мышц
    const basePaths = isMale
      ? isFront
        ? bodyFront
        : bodyBack
      : isFront
        ? bodyFemaleFront
        : bodyFemaleBack;

    // Выбираем правильный viewBox и контур
    // Расширяем viewBox на 10px с каждой стороны, чтобы обводка (stroke) выделенных мышц не обрезалась
    const viewBox = isMale
      ? isFront
        ? '-10 -10 744 1468'
        : '714 -10 744 1468'
      : isFront
        ? '-60 -50 754 1558'
        : '746 -10 794 1468';

    const outlinePath = isMale
      ? isFront
        ? MALE_FRONT_OUTLINE
        : MALE_BACK_OUTLINE
      : isFront
        ? FEMALE_FRONT_OUTLINE
        : FEMALE_BACK_OUTLINE;

    // Создаем lookup map для пользовательских данных
    const userDataMap = new Map<string, ExtendedBodyPart>();
    data.forEach((part) => {
      if (part.slug) {
        userDataMap.set(part.slug, part);
      }
    });

    const renderPaths = () => {
      return basePaths.map((assetPart: BodyPart) => {
        const userPart = userDataMap.get(assetPart.slug);

        // Определяем цвет заливки
        let fillColor = defaultFill;
        if (userPart) {
          // Приоритет: явный color > intensity-based color > default
          if (userPart.color) {
            fillColor = userPart.color;
          } else if (
            userPart.intensity &&
            userPart.intensity > 0 &&
            colors.length >= userPart.intensity
          ) {
            fillColor = colors[userPart.intensity - 1];
          }
        }

        const commonPaths = (assetPart.path?.common || []).map((d, i) => (
          <Path
            key={`${assetPart.slug}-common-${i}`}
            d={d}
            fill={fillColor}
            onPress={() => onBodyPartPress?.({ ...assetPart, ...userPart } as ExtendedBodyPart)}
            disabled={!onBodyPartPress}
          />
        ));

        const leftPaths = (assetPart.path?.left || []).map((d, i) => {
          const isOnlyRight = userPart?.side === 'right';
          const fill = isOnlyRight ? defaultFill : fillColor;
          return (
            <Path
              key={`${assetPart.slug}-left-${i}`}
              d={d}
              fill={fill}
              onPress={() =>
                onBodyPartPress?.({ ...assetPart, ...userPart } as ExtendedBodyPart, 'left')
              }
              disabled={!onBodyPartPress}
            />
          );
        });

        const rightPaths = (assetPart.path?.right || []).map((d, i) => {
          const isOnlyLeft = userPart?.side === 'left';
          const fill = isOnlyLeft ? defaultFill : fillColor;
          return (
            <Path
              key={`${assetPart.slug}-right-${i}`}
              d={d}
              fill={fill}
              onPress={() =>
                onBodyPartPress?.({ ...assetPart, ...userPart } as ExtendedBodyPart, 'right')
              }
              disabled={!onBodyPartPress}
            />
          );
        });

        return [...commonPaths, ...leftPaths, ...rightPaths];
      });
    };

    // Рендер обводки выделенных мышц поверх всех заливок
    const renderSelectedOutline = () => {
      const targets = selectedSlugs || (selectedSlug ? [selectedSlug] : []);
      if (targets.length === 0) return null;

      return basePaths
        .filter((p: BodyPart) => targets.includes(p.slug))
        .flatMap((selectedPart: BodyPart) => {
          const allPaths = [
            ...(selectedPart.path?.common || []),
            ...(selectedPart.path?.left || []),
            ...(selectedPart.path?.right || []),
          ];
          return allPaths.map((d, i) => (
            <Path
              key={`${selectedPart.slug}-selected-${i}`}
              d={d}
              fill="none"
              stroke={selectedStrokeColor}
              strokeWidth={2}
              pointerEvents="none"
            />
          ));
        });
    };

    return (
      <Svg
        viewBox={viewBox}
        width={200 * scale}
        height={400 * scale}
        accessible
        accessibilityLabel={`${gender}-body-${side}`}
      >
        {border !== 'none' && (
          <G strokeWidth={2} fill="none" strokeLinecap="butt">
            <Path stroke={border} vectorEffect="non-scaling-stroke" d={outlinePath} />
          </G>
        )}
        {renderPaths()}
        {renderSelectedOutline()}
      </Svg>
    );
  }
);

BodyMap.displayName = 'BodyMap';
