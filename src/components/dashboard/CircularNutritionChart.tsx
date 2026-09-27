// src/components/dashboard/CircularNutritionChart.tsx
// AUDIT-1: концентрические кольца: макросы (внешнее, сегментированное пропорционально целям),
// калории (среднее, целое), вода (внутреннее, целое, скрыто при 0).
// Центр: съедено ккал + осталось + 🔥 сожжено (L1).
import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Flame } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { typography } from '../../styles/typography';
import { SPACING, BORDER_RADIUS, withAlpha } from '../../constants/theme';
import { MACRO_COLORS } from '../../constants/semanticColors';

interface CircularNutritionChartProps {
  daily: { calories: number; proteins: number; fats: number; carbs: number; water_ml: number };
  targets: { calories: number; proteins: number; fats: number; carbs: number };
  /** Сожжено ккал за сегодня; null — вес не задан в профиле, бейдж скрыт. */
  burnedCalories: number | null;
}

const SIZE = 240;
const CENTER = SIZE / 2;
const R_MACROS = 100; // внешнее — макросы (сегменты)
const R_CALORIES = 78; // среднее — калории
const R_WATER = 56; // внутреннее — вода
const STROKE_WIDTH = 12;
const WATER_TARGET_ML = 2000;

export function CircularNutritionChart({
  daily,
  targets,
  burnedCalories,
}: CircularNutritionChartProps) {
  const { colors } = useTheme();

  const calPercent = useMemo(() => {
    if (!targets.calories) return 0;
    return Math.min(100, Math.round((daily.calories / targets.calories) * 100));
  }, [daily.calories, targets.calories]);

  const waterPercent = useMemo(
    () => Math.min(100, Math.round((daily.water_ml / WATER_TARGET_ML) * 100)),
    [daily.water_ml]
  );

  const macrosSum = targets.proteins + targets.fats + targets.carbs;
  const circumference = 2 * Math.PI * R_MACROS;
  const proteinLen = macrosSum > 0 ? circumference * (targets.proteins / macrosSum) : 0;
  const fatLen = macrosSum > 0 ? circumference * (targets.fats / macrosSum) : 0;
  const carbLen = macrosSum > 0 ? circumference * (targets.carbs / macrosSum) : 0;
  // UX-5 (фикс регрессии): прогресс = ДЛИНА дуги, а не dashoffset. Старая схема
  // (dasharray [L, C-L] + offset L*(1-prog)) при prog=0 сдвигала цветной сегмент
  // в конец окружности — на нулевом дне кольца «исчезали» и рисовались внахлёст.
  const macroFrac = (cur: number, target: number) => (target > 0 ? Math.min(1, cur / target) : 0);
  const proteinProg = macroFrac(daily.proteins, targets.proteins);
  const fatProg = macroFrac(daily.fats, targets.fats);
  const carbProg = macroFrac(daily.carbs, targets.carbs);

  const remainingCalories = Math.max(0, targets.calories - daily.calories);

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: SIZE }}>
      <Svg width={SIZE} height={SIZE}>
        <G rotation="-90" origin={`${CENTER}, ${CENTER}`}>
          {/* Макросы — внешнее сегментированное: приглушённый цветной трек
              (сегменты видны всегда, в т.ч. на нулевом дне) + яркая дуга прогресса. */}
          {macrosSum > 0 && (
            <>
              <MacroSegment
                len={proteinLen}
                progress={proteinProg}
                color={MACRO_COLORS.proteins}
                startDeg={0}
                circumference={circumference}
              />
              <MacroSegment
                len={fatLen}
                progress={fatProg}
                color={MACRO_COLORS.fats}
                startDeg={(proteinLen / circumference) * 360}
                circumference={circumference}
              />
              <MacroSegment
                len={carbLen}
                progress={carbProg}
                color={MACRO_COLORS.carbs}
                startDeg={((proteinLen + fatLen) / circumference) * 360}
                circumference={circumference}
              />
            </>
          )}
          {/* Калории — среднее целое */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={R_CALORIES}
            stroke={colors.border}
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={R_CALORIES}
            stroke={calPercent >= 100 ? colors.success : MACRO_COLORS.calories}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeDasharray={`${2 * Math.PI * R_CALORIES}`}
            strokeDashoffset={`${2 * Math.PI * R_CALORIES * (1 - calPercent / 100)}`}
            strokeLinecap="round"
          />
          {/* Вода — внутреннее целое, только при > 0 */}
          {daily.water_ml > 0 && (
            <>
              <Circle
                cx={CENTER}
                cy={CENTER}
                r={R_WATER}
                stroke={colors.border}
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />
              <Circle
                cx={CENTER}
                cy={CENTER}
                r={R_WATER}
                stroke={MACRO_COLORS.water}
                strokeWidth={STROKE_WIDTH}
                fill="none"
                strokeDasharray={`${2 * Math.PI * R_WATER}`}
                strokeDashoffset={`${2 * Math.PI * R_WATER * (1 - waterPercent / 100)}`}
                strokeLinecap="round"
              />
            </>
          )}
        </G>
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }} pointerEvents="none">
        <Text style={[typography.h4, { color: colors.textPrimary, fontWeight: '700' }]}>
          {daily.calories}{' '}
          <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '400' }]}>
            ккал
          </Text>
        </Text>
        <Text style={[typography.captionSmall, { color: colors.textSecondary, marginTop: 2 }]}>
          осталось {remainingCalories}
        </Text>
        {burnedCalories != null && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              marginTop: SPACING.xs,
              paddingHorizontal: SPACING.sm,
              paddingVertical: 2,
              borderRadius: BORDER_RADIUS.full,
              backgroundColor: withAlpha(MACRO_COLORS.burned, 0.102),
            }}
          >
            <Flame size={12} color={MACRO_COLORS.burned} strokeWidth={2} />
            <Text
              style={[typography.captionSmall, { color: MACRO_COLORS.burned, fontWeight: '700' }]}
            >
              {burnedCalories} ккал
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// UX-5: один сегмент внешнего кольца = приглушённый трек всей длины + дуга
// прогресса (длина = len*progress, offset 0). При progress=0 дуга не рендерится
// (round-cap на нулевой длине рисует точку).
function MacroSegment({
  len,
  progress,
  color,
  startDeg,
  circumference,
}: {
  len: number;
  progress: number;
  color: string;
  startDeg: number;
  circumference: number;
}) {
  if (len <= 0) return null;
  const dash = `${len} ${circumference - len}`;
  const progLen = len * progress;
  return (
    <>
      <Circle
        cx={CENTER}
        cy={CENTER}
        r={R_MACROS}
        stroke={withAlpha(color, 0.28)}
        strokeWidth={STROKE_WIDTH}
        fill="none"
        strokeDasharray={dash}
        rotation={startDeg}
        origin={`${CENTER}, ${CENTER}`}
      />
      {progress > 0 && (
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={R_MACROS}
          stroke={color}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeDasharray={`${progLen} ${circumference - progLen}`}
          rotation={startDeg}
          origin={`${CENTER}, ${CENTER}`}
          strokeLinecap="round"
        />
      )}
    </>
  );
}
