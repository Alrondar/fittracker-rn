// src/lib/feedback.ts
// WEB-1: канонический слой пользовательской обратной связи (алерты/подтверждения).
//
// Зачем: в `react-native-web` экспорт `Alert` — заглушка (`static alert() {}`), то
// есть все вызовы `Alert.alert` на вебе исчезают молча: пользователь жмёт «Войти»
// с пустыми полями или «Удалить программу» и не получает ничего. Здесь сигнатура
// сохранена 1-в-1 с `Alert.alert`, поэтому миграция call-site'ов механическая, а
// поведение на нативных платформах не меняется: там остаётся делегат в Alert.
//
// Канон вызова:
//   feedback.alert('Заголовок', 'Сообщение');                        // нотис
//   feedback.alert('Удалить?', 'Действие необратимо', [               // подтверждение
//     { text: 'Отмена', style: 'cancel' },
//     { text: 'Удалить', style: 'destructive', onPress: () => … },
//   ]);
//
// Инварианты:
// - Native (`ios`/`android`) — ровно `Alert.alert(...)`, ничего не переопределяем.
// - Web — диалог рендерит `FeedbackDialog` (хост в app/_layout.tsx). Вызовы до
//   монтирования хоста лежат в очереди и показываются, как только хост появится
//   (`subscribeFeedback` отдаёт текущее состояние сразу).
// - Одновременно открыт один диалог, остальные ждут в FIFO-очереди — как системный
//   Alert, который не умеет показывать два сразу.
// - Тап по затемнению и Escape закрывают диалог БЕЗ колбэков (семантика iOS
//   cancelable-алерта); `onPress` кнопок вызывается только по нажатию кнопки.
import { Alert, Platform } from 'react-native';

export interface FeedbackButton {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<unknown>;
}

export interface FeedbackDialogRequest {
  id: number;
  title: string;
  message?: string;
  buttons?: FeedbackButton[];
}

type Listener = (queue: FeedbackDialogRequest[]) => void;

const queue: FeedbackDialogRequest[] = [];
const listeners = new Set<Listener>();
let seq = 0;

function emit(): void {
  const snapshot = queue.slice();
  listeners.forEach((l) => l(snapshot));
}

/** Внутренний API `FeedbackDialog`: подписка на очередь (текущий снимок — сразу). */
export function subscribeFeedback(listener: Listener): () => void {
  listeners.add(listener);
  listener(queue.slice());
  return () => {
    listeners.delete(listener);
  };
}

/** Внутренний API `FeedbackDialog`: закрыть диалог без вызова колбэков. */
export function dismissFeedback(id: number): void {
  const idx = queue.findIndex((d) => d.id === id);
  if (idx === -1) return;
  queue.splice(idx, 1);
  emit();
}

/** Внутренний API `FeedbackDialog`: invoke кнопки по индексу и закрыть диалог. */
export function pressFeedback(id: number, buttonIndex: number): void {
  const idx = queue.findIndex((d) => d.id === id);
  if (idx === -1) return;
  const [dialog] = queue.splice(idx, 1);
  emit();
  try {
    const res: unknown = dialog.buttons?.[buttonIndex]?.onPress?.();
    if (res && typeof (res as Promise<unknown>).catch === 'function') {
      (res as Promise<unknown>).catch((e) => console.warn('[feedback] async action failed:', e));
    }
  } catch (e) {
    console.warn('[feedback] action failed:', e);
  }
}

/**
 * Как кнопка алерта выглядит в диалоге (вызывается `FeedbackDialog`). Держится
 * рядом с моделью данных, а не в компоненте, чтобы маппинг был проверяем:
 * PRODUCT.md §3.1 — в одном блоке не более одного сильного акцента, destructive
 * визуально отделено.
 */
export function buttonVariantFor(
  index: number,
  total: number,
  style?: FeedbackButton['style']
): 'primary' | 'secondary' | 'danger' | 'ghost' {
  if (style === 'destructive') return 'danger';
  if (style === 'cancel') return 'ghost';
  if (total === 1) return 'primary';
  return index === total - 1 ? 'primary' : 'secondary';
}

export const feedback = {
  /** Drop-in замена `Alert.alert`: нативный делегат + веб-очередь диалогов. */
  alert(title: string, message?: string, buttons?: FeedbackButton[]): void {
    if (Platform.OS !== 'web') {
      Alert.alert(title, message, buttons);
      return;
    }
    queue.push({ id: ++seq, title, message, buttons });
    emit();
  },
};

// Деф-хендл: ручной smoke в браузере и будущий Playwright-смок должны уметь
// открыть диалог, не проходя весь экран. Только web + dev.
if (Platform.OS === 'web' && __DEV__) {
  (globalThis as Record<string, unknown>).__feedback = feedback;
}
