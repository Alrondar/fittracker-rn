// src/components/workout/RestDial.tsx
// MORF-REST v2 (26.09, редизайн по фидбеку пользователя): тап по «Таймер»
// заменяет ВСЮ карточку упражнения круговой крутилкой отдыха.
//   setup    — круг с пустым центром; оборот = 60с (6°/с), перетаскивание
//              пальцем по кругу, шаг 5с, лимит 10 мин; после отпускания
//              пальца в центре появляется круглая кнопка «Начать».
//   running  — вокруг крутилки дуга 300° (шкала-гейдж с разрывом снизу),
//              убывающая вместе со временем; в центре — остаток.
//   finished — дуга полная, success-цвет, центр — «Продолжить».
// Слева от круга — колонка −15/−30/−45/−60, справа — +15/+30/+45/+60
// (в setup меняют выставленное время, в running/finished — корректируют
// идущий таймер через adjustRestTimer). ✕ слева сверху: setup — закрыть,
// running/finished — остановить отдых.
import React, { useRef, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, PanResponder, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Play } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SPACING, BORDER_RADIUS, withAlpha } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { FONT_FAMILIES } from '../../constants/fonts';
import { useTheme } from '../../hooks/useTheme';
import type { createCardStyles } from '../../styles/components/card';
import { formatRestTime } from './RestTimerContext';

const SIZE = 230; // сторона квадрата SVG
const R = 96; // радиус кольца
const STROKE = 10;
const C = 2 * Math.PI * R;
const GAUGE = 300 / 360; // дуга таймера — 300°, разрыв снизу
const DEG_PER_SEC = 6; // один оборот = 60 с
const MIN_S = 5;
const MAX_S = 600;
const SNAP = 5;

const clamp = (v: number) => Math.min(MAX_S, Math.max(MIN_S, v));
const snap = (v: number) => Math.round(v / SNAP) * SNAP;

interface RestDialProps {
  mode: 'setup' | 'running' | 'finished';
  /** Пресет отдыха упражнения — стартовое значение в setup. */
  initialSeconds: number;
  /** Идущий таймер: total/timeLeft (setup — не использует). */
  total: number;
  timeLeft: number;
  exerciseName: string;
  /** Заголовок — тот же стиль, что у основной карточки (прыжка высоты нет). */
  cardStyles: ReturnType<typeof createCardStyles>;
  /** Высота карточки до открытия дила — minHeight контейнера (anti-jump). */
  minHeight?: number;
  onStart: (seconds: number) => void;
  onAdjust: (delta: number) => void;
  /** setup — закрыть без запуска; running/finished — остановить. */
  onCancel: () => void;
  colors: any;
}

export function RestDial({
  mode,
  initialSeconds,
  total,
  timeLeft,
  exerciseName,
  cardStyles,
  minHeight = 0,
  onStart,
  onAdjust,
  onCancel,
  colors,
}: RestDialProps) {
  const [seconds, setSeconds] = useState(() => clamp(snap(initialSeconds || 60)));
  const [armed, setArmed] = useState(true); // пресет уже выставлен — «Начать» видна
  const [dragging, setDragging] = useState(false);
  const geo = useRef({ cx: SIZE / 2, cy: SIZE / 2 });
  const drag = useRef({ lastAngle: 0, baseDeg: 0 });

  const setup = mode === 'setup';
  // Градиент активной темы — тот же, что у кольца RestTimer (I-3) и pill'ов.
  const { gradients } = useTheme();
  const grad = gradients.primary;

  // Зона жеста — только кольцо (60…140 от центра): центр занят кнопкой,
  // серёдина и углы не должны отъедать тапы у «Начать»/шага.
  const inRingBand = (x: number, y: number) => {
    const d = Math.hypot(x - geo.current.cx, y - geo.current.cy);
    return d > 60 && d < 140;
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (e) =>
          setup && inRingBand(e.nativeEvent.locationX, e.nativeEvent.locationY),
        onMoveShouldSetPanResponder: (e) =>
          setup && inRingBand(e.nativeEvent.locationX, e.nativeEvent.locationY),
        onPanResponderGrant: (e) => {
          if (!setup) return;
          const { locationX, locationY } = e.nativeEvent;
          const a = Math.atan2(locationY - geo.current.cy, locationX - geo.current.cx);
          drag.current.lastAngle = a;
          drag.current.baseDeg = seconds * DEG_PER_SEC;
          setDragging(true);
          setArmed(false);
        },
        onPanResponderMove: (e) => {
          if (!setup) return;
          const { locationX, locationY } = e.nativeEvent;
          const dx = locationX - geo.current.cx;
          const dy = locationY - geo.current.cy;
          const a = Math.atan2(dy, dx);
          let delta = a - drag.current.lastAngle;
          if (delta > Math.PI) delta -= 2 * Math.PI;
          if (delta < -Math.PI) delta += 2 * Math.PI;
          drag.current.lastAngle = a;
          drag.current.baseDeg += (delta * 180) / Math.PI;
          setSeconds(clamp(snap(drag.current.baseDeg / DEG_PER_SEC)));
        },
        onPanResponderRelease: () => {
          if (!setup) return;
          setDragging(false);
          setArmed(true); // палец оторван — в центре появляется «Начать»
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
        onPanResponderTerminationRequest: () => false,
      }),
    // seconds читается в grant через замыкание — пересоздаём при смене,
    // пока drag не активен; во время drag seconds не нужен.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setup, seconds]
  );

  const knobAngle = ((seconds * DEG_PER_SEC) % 360) - 90; // 0с = верх
  const knob = {
    x: SIZE / 2 + R * Math.cos((knobAngle * Math.PI) / 180),
    y: SIZE / 2 + R * Math.sin((knobAngle * Math.PI) / 180),
  };

  const progress = setup
    ? (seconds % 60) / 60
    : total > 0
      ? Math.max(0, Math.min(1, timeLeft / total))
      : 0;
  const arcLen = setup ? C * progress : C * GAUGE * progress;
  const running = mode === 'running';
  const finished = mode === 'finished';
  const timeColor = finished
    ? colors.success
    : running && timeLeft <= 10
      ? colors.error
      : running && timeLeft <= 30
        ? colors.warning
        : colors.textPrimary;

  // idx 0 (верх) — самый спокойный, 3 (низ) — самый насыщенный: колонка
  // шагов читается как шкала интенсивности градиента активной темы.
  const stepBtn = (label: string, delta: number, idx: number) => {
    const a = 0.1 + idx * 0.07;
    const strong = idx >= 2;
    return (
      <TouchableOpacity
        key={label}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (setup) setSeconds((s) => clamp(snap(s + delta)));
          else onAdjust(delta);
        }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${label} секунд`}
        style={{
          minWidth: 48,
          borderRadius: BORDER_RADIUS.full,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: withAlpha(colors.primary, 0.25),
        }}
      >
        <LinearGradient
          colors={[withAlpha(grad[0], a), withAlpha(grad[1], a + 0.08)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingVertical: 9, paddingHorizontal: SPACING.sm, alignItems: 'center' }}
        >
          <Text
            style={[
              typography.captionSmall,
              { color: strong ? colors.textInverse : colors.primary, fontWeight: '700' },
            ]}
          >
            {label}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    // Заголовок — строго вверху (как в карточке), крутилка центрируется в
    // остатке высоты minHeight (бывшая высота карточки) — без прыжка.
    <View
      style={{
        paddingVertical: SPACING.md,
        ...(minHeight > 0 ? { minHeight } : undefined),
      }}
    >
      {/* Шапка дила — как у основной карточки: то же имя тем же стилем, ✕
          справа на месте шестерёнки (карточка не «прыгает» при морфе). */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: SPACING.xs,
          marginBottom: SPACING.sm,
        }}
      >
        <Text
          style={[cardStyles.workoutExerciseName, { color: colors.textPrimary, flex: 1 }]}
          numberOfLines={2}
        >
          {exerciseName}
        </Text>
        <TouchableOpacity
          onPress={onCancel}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={setup ? 'Отменить таймер' : 'Остановить отдых'}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            width: 32,
            height: 32,
            borderRadius: BORDER_RADIUS.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceSecondary,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <X size={16} color={colors.textSecondary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Крутилка + колонки шагов — по центру оставшейся высоты */}
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ gap: 6 }}>
            {[-15, -30, -45, -60].map((d, i) => stepBtn(`${d}`, d, i))}
          </View>

          {/* device-фикс (скрин 26.09): Svg 230 + центр 120 во flex-колонке
            давали 350 > 230 — контент центрился с отрицательным offset и
            круг залезал в шапку, а «Начать» — в подсказку. Центр — absolute
            оверлей, в flow только SVG. */}
          <View
            style={{ width: SIZE, height: SIZE }}
            onLayout={(e) => {
              geo.current = {
                cx: e.nativeEvent.layout.width / 2,
                cy: e.nativeEvent.layout.height / 2,
              };
            }}
            {...(setup ? responder.panHandlers : {})}
          >
            <Svg width={SIZE} height={SIZE} pointerEvents="none">
              {/* градиент дуги — активная тема (как кольцо прежнего RestTimer) */}
              <Defs>
                <SvgLinearGradient id="dialArcGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={grad[0]} />
                  <Stop offset="1" stopColor={grad[1]} />
                </SvgLinearGradient>
              </Defs>
              {/* трек */}
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                stroke={colors.surfaceSecondary}
                strokeWidth={STROKE}
                fill="none"
              />
              {/* дуга: setup — заполнение от верха (оборот=60с); running/finished
                — гейдж 300° с разрывом снизу, убывает со временем */}
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                stroke={finished ? colors.success : 'url(#dialArcGrad)'}
                strokeWidth={STROKE}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${C} ${C}`}
                strokeDashoffset={C - arcLen}
                rotation={setup ? -90 : 120}
                origin={`${SIZE / 2}, ${SIZE / 2}`}
              />
              {setup && (
                <Circle
                  cx={knob.x}
                  cy={knob.y}
                  r={9}
                  fill="url(#dialArcGrad)"
                  stroke={colors.surface}
                  strokeWidth={3}
                />
              )}
            </Svg>

            {/* центр: пустой, кроме armed-кнопки «Начать» / времени / «Продолжить» */}
            <View
              style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}
              pointerEvents="box-none"
            >
              {setup ? (
                armed ? (
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      onStart(seconds);
                    }}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={`Начать отдых ${seconds} секунд`}
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: 60,
                      overflow: 'hidden',
                      ...({
                        shadowColor: colors.primary,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 6,
                      } as object),
                    }}
                  >
                    <LinearGradient
                      colors={grad}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Play
                        size={22}
                        color={colors.textInverse}
                        fill={colors.textInverse}
                        strokeWidth={2.4}
                        style={{ marginBottom: 2 }}
                      />
                      <Text
                        style={[
                          typography.captionSmall,
                          { color: colors.textInverse, fontWeight: '700' },
                        ]}
                      >
                        Начать
                      </Text>
                      <Text
                        style={[
                          typography.captionSmall,
                          {
                            color: withAlpha(colors.textInverse, 0.8),
                            fontVariant: ['tabular-nums'],
                          },
                        ]}
                      >
                        {formatRestTime(seconds)}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <Text
                    style={{
                      fontFamily: FONT_FAMILIES.displayBold,
                      fontSize: 44,
                      color: colors.textPrimary,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {formatRestTime(seconds)}
                  </Text>
                )
              ) : finished ? (
                <TouchableOpacity
                  onPress={onCancel}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Продолжить тренировку"
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.success,
                  }}
                >
                  <Text
                    style={[
                      typography.labelBold,
                      { color: colors.textInverse, textAlign: 'center' },
                    ]}
                  >
                    Продолжить
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Text
                    style={{
                      fontFamily: FONT_FAMILIES.displayBold,
                      fontSize: 44,
                      color: timeColor,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {formatRestTime(timeLeft)}
                  </Text>
                  <TouchableOpacity
                    onPress={onCancel}
                    accessibilityRole="button"
                    accessibilityLabel="Пропустить остаток отдыха"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>
                      пропустить
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          <View style={{ gap: 6 }}>{[15, 30, 45, 60].map((d, i) => stepBtn(`+${d}`, d, i))}</View>
        </View>
      </View>

      {/* подсказка жеста */}
      {setup && !dragging && (
        <Text
          style={[
            typography.captionSmall,
            { color: colors.textTertiary, textAlign: 'center', marginTop: SPACING.sm },
          ]}
        >
          вращайте по кругу — один оборот 60с · шаг 5с
        </Text>
      )}
    </View>
  );
}
