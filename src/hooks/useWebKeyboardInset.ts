// src/hooks/useWebKeyboardInset.ts
// WEB-BUG-5 (остаток, 01.10): высота клавиатуры мобильного браузера для
// полноэкранных обёрток (login, goals, onboarding, self-made sheets).
//
// RNW `KeyboardAvoidingView` — заглушка: `Keyboard` не отдаёт событий
// (`isVisible()→false`, `addListener→{remove: noop}`), проверено в
// react-native-web/dist/exports/KeyboardAvoidingView. Единственный источник —
// `visualViewport`: при появлении клавиатуры она сжимается, а layout-viewport —
// нет (iOS Safari). Возвращаем inset в px; на нативе — всегда 0 (нулевой diff).
//
// Применение: paddingBottom у contentContainerStyle скролла (поле под
// клавиатурой становится достижимо скроллом) либо подъём панели, как в
// SheetShell (у него своя веб-ветка исторически — не дублируем до WEB-CTR-9).
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export function useWebKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const vv = window.visualViewport;
    if (!vv) return undefined;
    const onChange = () => {
      const next = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      // Порог 8px — против дребезга при схлопывании адрес-бара (паттерн SheetShell).
      setInset((prev) => (Math.abs(prev - next) < 8 ? prev : next));
    };
    vv.addEventListener('resize', onChange);
    return () => vv.removeEventListener('resize', onChange);
  }, []);
  return inset;
}
