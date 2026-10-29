// Позиция 8: постановка локального напоминания. Правило живёт в
// src/utils/reminders.ts (офлайн-проверка scripts/check-reminders.ts), здесь
// только права, канал Android и один отложенный сигнал.
// Веб-порт уведомлений не получает: там другой механизм (браузерный API плюс
// сервис-воркер, которого в веб-версии нет), поэтому все функции на веб-платформе
// ничего не делают (WEB-CTR-9: общий файл правится один раз с проверкой платформы).
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { toDateKey } from '../utils/dateKey';
import {
  nextFireDate,
  planReminder,
  REMINDER_DEFAULTS,
  type ReminderContext,
  type ReminderSettings,
} from '../utils/reminders';
import type { ReminderSourceData } from '../services/reminderService';

const STORAGE_KEY = '@fittracker_reminder_settings';
const CHANNEL_ID = 'reminders';
const MARKER = 'fittracker-reminder';

let channelReady = false;

export async function readReminderSettings(): Promise<ReminderSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return REMINDER_DEFAULTS;
    return { ...REMINDER_DEFAULTS, ...(JSON.parse(raw) as Partial<ReminderSettings>) };
  } catch {
    return REMINDER_DEFAULTS;
  }
}

/**
 * Право на уведомления запрашивается только когда человек сам включил
 * напоминания; «уже спросили и отказали» больше не повторяем.
 */
export async function requestReminderPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch (error) {
    console.warn('[reminders] не удалось запросить право:', error);
    return false;
  }
}

async function clearScheduledReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const mine = scheduled.filter(
    (request) => (request.content.data as { marker?: string } | undefined)?.marker === MARKER
  );
  await Promise.all(
    mine.map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier))
  );
}

function contextForDate(date: Date, source: ReminderSourceData): ReminderContext {
  return {
    dateKey: toDateKey(date),
    weekday: date.getDay(),
    schedule: source.schedule,
    workoutDue: source.workoutDue,
    programName: source.programName,
    lastFinishedKey: source.lastFinishedKey,
  };
}

/**
 * Пересставляет единственный сигнал: снимает предыдущий и ставит новый на
 * ближайшее срабатывание. Вызывается при открытии приложения, при возврате с
 * другого экрана и сразу после изменения настройки — поэтому текст не устаревает
 * дольше, чем до следующего запуска.
 */
export async function rescheduleReminder(
  settings: ReminderSettings,
  source: ReminderSourceData | null
): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    if (!channelReady && Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Напоминания о тренировках',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
      channelReady = true;
    }

    await clearScheduledReminders();
    if (!settings.enabled || !source) return;

    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return;

    const now = new Date();
    const fireDate = nextFireDate(settings, now);
    const plan = planReminder(settings, contextForDate(fireDate, source));
    if (!plan) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: plan.title,
        body: plan.body,
        data: { marker: MARKER, kind: plan.kind },
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireDate,
      },
    });
  } catch (error) {
    // Отказ в праве, недоступный планировщик на эмуляторе — тишина: приложение
    // не должно падать из-за напоминания.
    console.warn('[reminders] сигнал не поставлен:', error);
  }
}

/** Точка входа для корня приложения: читает настройку и, если она включена,
 *  берёт данные из базы. Выключено — ни одного запроса к серверу. */
export async function rescheduleRemindersFromStorage(
  loadSource: () => Promise<ReminderSourceData>
): Promise<void> {
  if (Platform.OS === 'web') return;
  const settings = await readReminderSettings();
  if (!settings.enabled) {
    await rescheduleReminder(settings, null);
    return;
  }
  try {
    await rescheduleReminder(settings, await loadSource());
  } catch (error) {
    console.warn('[reminders] данные для напоминания не пришли:', error);
  }
}

export async function clearReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await clearScheduledReminders();
  } catch (error) {
    console.warn('[reminders] сигналы не сняты:', error);
  }
}
