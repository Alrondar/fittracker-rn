// src/components/ui/AnimatedNumber.tsx
// UX-3 (I-1): «движущиеся числа» — число догоняет значение ease-out кривой.
// Число, которое дорастает, считывается как живые данные, а не строка из JSON.
//
// Реализация — rAF-хук, а не Reanimated: обновлять нужно React-состояние
// (текст не переживается worklet'ом), лист — маленький, 60fps-перерисовка
// одного <Text> дешевле отладочной сложности. Первый показ: 0 → value.
// Каждое следующее изменение (refetch, смена периода) — с текущего отображённого.
import { useEffect, useRef, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function useCountUp(target: number, durationMs = 650): number {
  const [display, setDisplay] = useState(0);
  const mountedRef = useRef(false);
  // Текущее отображённое значение для «откуда стартовать» без ре-рендера.
  const displayRef = useRef(0);

  useEffect(() => {
    const from = mountedRef.current ? displayRef.current : 0;
    mountedRef.current = true;
    if (from === target) {
      return undefined;
    }
    const start = Date.now();
    let raf: number;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const t = Math.min(1, (Date.now() - start) / durationMs);
      const value = from + (target - from) * easeOutCubic(t);
      displayRef.current = value;
      setDisplay(value);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        displayRef.current = target;
        setDisplay(target);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [target, durationMs]);

  return display;
}

interface AnimatedNumberProps {
  value: number;
  style?: StyleProp<TextStyle>;
  /** Форматтер итоговой строки (round/тысячи/единицы). */
  format?: (n: number) => string;
  durationMs?: number;
}

export function AnimatedNumber({
  value,
  style,
  format = (n) => String(Math.round(n)),
  durationMs,
}: AnimatedNumberProps) {
  const display = useCountUp(value, durationMs);
  return <Text style={style}>{format(display)}</Text>;
}
