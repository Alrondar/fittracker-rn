// src/hooks/useOfflineSettings.ts
// Две настройки офлайна: качать ли программу самим и сколько места под кадры.
//
// Потолок относится только к хранилищу кадров (src/lib/mediaCache.ts): снимок
// справочника (~1,9 МБ) и снимки программ (~0,1–0,2 МБ на программу) живут вне него —
// их потеря стоила бы истории тренировок, а не картинки, и место они не отнимают.
//
// Значение применяется ДО первого подогрева кадров: при старте приложения читают
// `applyOfflineFrameCap()` (он же возвращает сохранённые настройки), а экран настроек
// работает через хук и перекладывает потолок сразу, как пользователь выбрал другой.
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_FRAME_CAP_MB,
  FRAME_CAP_OPTIONS_MB,
  setFrameCacheLimitBytes,
} from '../lib/mediaCache';

const STORAGE_KEY = '@fittracker_offline_settings';

export type OfflineSettings = {
  /** Вариант «Скачивать программу автоматически» (см. maybeAutoDownloadProgram). */
  autoDownload: boolean;
  /** Потолок хранилища кадров в МБ: 25 (по умолчанию), 50 или 100. */
  frameCapMb: number;
};

const DEFAULTS: OfflineSettings = {
  // По умолчанию включено: зал без сети — обычный сценарий, а молча не скачать
  // программу значит отдать первый же офлайн без дней. Отключается здесь же.
  autoDownload: true,
  frameCapMb: DEFAULT_FRAME_CAP_MB,
};

function normalize(stored: Record<string, unknown>): OfflineSettings {
  const cap = Number(stored.frameCapMb);
  // Сохранённое значение, которого нет в списке (ручная правка, более старая
  // сборка), не должно уводить хранилище в неожиданный потолок.
  const known = (FRAME_CAP_OPTIONS_MB as readonly number[]).includes(cap);
  return {
    autoDownload:
      typeof stored.autoDownload === 'boolean' ? stored.autoDownload : DEFAULTS.autoDownload,
    frameCapMb: known ? cap : DEFAULTS.frameCapMb,
  };
}

/** Чтение для не-React мест (старт приложения). Ошибку хранилища трактует как дефолт. */
export async function readOfflineSettings(): Promise<OfflineSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return normalize(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    return DEFAULTS;
  }
}

/** Применить сохранённый потолок к хранилищу кадров. Возвращает прочитанные настройки. */
export async function applyOfflineFrameCap(): Promise<OfflineSettings> {
  const settings = await readOfflineSettings();
  setFrameCacheLimitBytes(settings.frameCapMb * 1024 * 1024);
  return settings;
}

export function useOfflineSettings() {
  const [settings, setSettings] = useState<OfflineSettings>(DEFAULTS);

  useEffect(() => {
    readOfflineSettings().then(setSettings);
  }, []);

  const updateSettings = useCallback((patch: Partial<OfflineSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      if (patch.frameCapMb !== undefined) {
        setFrameCacheLimitBytes(next.frameCapMb * 1024 * 1024);
      }
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { settings, updateSettings };
}
