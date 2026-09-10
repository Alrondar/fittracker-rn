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
    const viewBox = isMale
      ? isFront
        ? '0 0 724 1448'
        : '724 0 724 1448'
      : isFront
        ? '-50 -40 734 1538'
        : '756 0 774 1448';

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
      </Svg>
    );
  }
);

BodyMap.displayName = 'BodyMap';
