// src/hooks/useOfflineProgram.ts
// Состояние скачанной программы для интерфейса и молчаливое автоскачивание.
//
// Разделены намеренно: состояние читает локальное хранилище (файл на телефоне,
// IndexedDB в браузере) и его обновляет плашка на экране «Программы»; автоскачивание
// — фоновый процесс, который не имеет права показывать ошибки посреди тренировки
// (настройка «Скачивать программу автоматически», вариант б из спеки 25.10: при входе
// и после завершённого дня).
import { useCallback, useEffect, useRef, useState } from 'react';
import { programSnapshotInfo, type ProgramSnapshotInfo } from '../lib/programSnapshot';
import { maybeAutoDownloadProgram } from '../services/programSnapshotService';
import { readOfflineSettings } from './useOfflineSettings';
import type { MediaGender } from '../utils/mediaScheme';

const EMPTY: ProgramSnapshotInfo = {
  takenAt: null,
  bytes: 0,
  days: 0,
  workouts: 0,
  exercises: 0,
  logs: 0,
};

/**
 * Скачана ли ИМЕННО эта программа (не «что-нибудь скачано»). Переключение
 * программы на другую обязано показывать «офлайн выключен», а не чужой галочкой:
 * решение владельца 25.10.
 *
 * `watch` — сигнал перечитать хранилище: автоскачивание происходит без участия
 * пользователя, и галочка обязана появиться сама, а не после следующего захода.
 */
export function useOfflineProgram(
  userId: string | null,
  programId: string | null | undefined,
  watch?: unknown
) {
  const [info, setInfo] = useState<ProgramSnapshotInfo>(EMPTY);

  const refresh = useCallback(() => {
    if (!userId || !programId) {
      setInfo(EMPTY);
      return;
    }
    void programSnapshotInfo(userId, programId).then(setInfo);
  }, [userId, programId]);

  useEffect(refresh, [refresh, watch]);

  return { info, downloaded: Boolean(info.takenAt), refresh };
}

/**
 * Автоскачивание: один заход на пару «программа + состояние списка». `wake` — число
 * завершённых тренировок: после финиша дня список меняется, и это единственный
 * честный сигнал «пора подогреть запас на следующий день». Без wake экран
 * возвращался бы с тренировки и ничего не докачивал, потому что сам остаётся
 * смонтированным.
 */
export function useAutoProgramDownload(
  userId: string | null,
  programId: string | null | undefined,
  gender: MediaGender,
  wake?: number
) {
  const started = useRef<Set<string>>(new Set());
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!userId || !programId) return;
    const key = `${programId}|${wake ?? 0}`;
    if (started.current.has(key)) return;
    started.current.add(key);
    let cancelled = false;
    setPending(true);
    void (async () => {
      const { autoDownload } = await readOfflineSettings();
      if (!autoDownload) {
        if (!cancelled) setPending(false);
        return;
      }
      await maybeAutoDownloadProgram(userId, gender);
      if (!cancelled) setPending(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, programId, gender, wake]);

  return pending;
}
