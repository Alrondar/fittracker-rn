import { useEffect } from 'react';
import { AppState } from 'react-native';
import { getReminderSourceData } from '../services/reminderService';
import { rescheduleRemindersFromStorage } from '../lib/reminderScheduler';

/**
 * Переставка по идентификатору пользователя: тот же путь, что у слушателя
 * переднего плана, но вызывается точечно — когда день закрыли, не выходя из
 * приложения. Иначе единственный поставленный сигнал доживает до утра с
 * текстом «Тренировка сегодня» о уже закрытом дне.
 */
export async function rescheduleRemindersForUser(userId: string): Promise<void> {
  await rescheduleRemindersFromStorage(() => getReminderSourceData(userId));
}

/**
 * Позиция 8: пересчёт напоминания при открытии приложения и при каждом возврате
 * на передний план. Локальные сигналы умеет ставить только само приложение,
 * поэтому единственный способ не показать устаревший текст — переставить его,
 * когда приложение снова активно.
 */
export function useReminderScheduler(userId: string | null): void {
  useEffect(() => {
    if (!userId) return;

    const run = () => {
      void rescheduleRemindersForUser(userId);
    };

    run();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });

    return () => subscription.remove();
  }, [userId]);
}
