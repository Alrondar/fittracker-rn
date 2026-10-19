// Пульсирующая точка фазы таймера (живёт в пилюле и панели).
import React, { useEffect, memo } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { type TimerPhase } from './timerContext';

export const PulseDot = memo(function PulseDot({
  phase,
  color,
}: {
  phase: TimerPhase;
  color: string;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (phase === 'running') {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.45, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.45, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      scale.value = withTiming(1, { duration: 200 });
      opacity.value = withTiming(1, { duration: 200 });
    }
  }, [phase, scale, opacity]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }, dotStyle]}
    />
  );
});

// ===== ЕДИНАЯ КНОПКА СЕССИИ (бывш. пилюля) =====

/**
 * UX-T3 (26.09, выбор пользователя — вариант C): вместо пары «пилюля-таймер +
 * отдельная кнопка «Завершить»» — ОДИН контролл в правом слоте шапки, который
 * морфит состояние:
 *   idle    — «▶ Начать» (зелёная), тап стартует сессию;
 *   running — «⏹ 42:13» (красная): иконка стопа = тап открывает confirm-лист
 *             (защита от случайного финиша — как раньше), долгий тап — панель;
 *   paused  — «▶ 42:13» (янтарная), тап возобновляет таймер;
 *   saving  — disabled-спиннер «Сохранение...».
 * Время видно ПОСТОЯННО (уточнение пользователя 26.09: «часы хочу видеть
 * всегда»): running/paused показывают счётчик в кнопке вместо текстовой
 * метки; смысл действия передаёт иконка (⏹/▶), a11y-метка и confirm-лист.
 * Инвариант: в шапке тренировки ровно один action-контролл сессии — слот
 * никогда не «разрастается» второй кнопкой.
 */
