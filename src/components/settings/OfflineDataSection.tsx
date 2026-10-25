// src/components/settings/OfflineDataSection.tsx
// Что приложение держит локально: кадры техники (потолок 25 МБ), снимок справочника
// (~1,9 МБ) и скачанную активную программу. Без этих строк лимиты и возраст копий
// на устройстве непроверяемы, а «очистить» — единственный выход, когда место
// понадобилось.
//
// Кадры — только на телефоне: в браузере их хранит кэш браузера, а гарантию «без
// сети» там даёт перехватчик запросов, которого в сборке пока нет. Справочник и
// программа работают на обеих платформах (src/lib/localStore.ts).
import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { BookOpen, DownloadCloud, ImageOff } from 'lucide-react-native';
import { feedback } from '../../lib/feedback';
import { FRAME_CACHE_LIMIT_BYTES, clearMediaCache, mediaCacheStats } from '../../lib/mediaCache';
import { clearSnapshot, readSnapshotRows, snapshotStats } from '../../lib/exerciseSnapshot';
import { refreshExerciseSnapshot } from '../../services/exerciseSnapshotService';
import {
  clearProgramSnapshot,
  programSnapshotInfo,
  type ProgramSnapshotInfo,
} from '../../lib/programSnapshot';
import { downloadActiveProgram } from '../../services/programSnapshotService';
import { useStore } from '../../store/useStore';
import { useMediaGender } from '../../hooks/useMediaGender';
import { commonStyles } from '../../styles/common';
import { LinkRow, SectionTitle } from './SettingsRows';

const formatMb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
const human = (bytes: number) =>
  bytes >= 1024 * 1024 ? formatMb(bytes) : `${(bytes / 1024).toFixed(0)} КБ`;

const dayLabel = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : 'нет';

export function OfflineDataSection() {
  const userId = useStore((state) => state.userId);
  const gender = useMediaGender();
  const [frames, setFrames] = useState(() => mediaCacheStats());
  const [catalog, setCatalog] = useState(() => snapshotStats());
  const [program, setProgram] = useState<ProgramSnapshotInfo | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void readSnapshotRows().then(() => setCatalog(snapshotStats()));
  }, []);

  useEffect(() => {
    void programSnapshotInfo(userId).then(setProgram);
  }, [userId]);

  const framesDescription =
    frames.frames === 0
      ? `Пока пусто. Кадры дня качаются сами, потолок — ${formatMb(FRAME_CACHE_LIMIT_BYTES)}`
      : `Занято ${formatMb(frames.bytes)} из ${formatMb(FRAME_CACHE_LIMIT_BYTES)} · кадров: ${frames.frames}`;

  const catalogDescription =
    catalog.rows === 0
      ? 'Не загружен. Подтянется сам при первом соединении — 1,9 МБ на весь справочник'
      : `${catalog.rows} позиций · ${human(catalog.bytes)} · обновлён ${dayLabel(catalog.takenAt)}`;

  const programDescription =
    !program || !program.takenAt
      ? 'Не скачана. Данные ~0,2 МБ плюс кадры её упражнений и замен'
      : `${program.days} дней · ${program.workouts} тренировок · ${program.logs} подходов · ${human(program.bytes)} · обновлена ${dayLabel(program.takenAt)}`;

  const onFramesPress = () => {
    if (frames.frames === 0) {
      feedback.alert(
        'Кадры техники',
        'Пока ничего не скачано. Кадры дня появятся сами, когда ты откроешь тренировку.'
      );
      return;
    }
    feedback.alert(
      'Очистить кадры техники?',
      `Освободим ${formatMb(frames.bytes)}. Без сети картинка подтянётся при первом же просмотре и начнёт скачиваться заново.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Очистить',
          style: 'destructive',
          onPress: () => {
            void clearMediaCache().then(() => setFrames(mediaCacheStats()));
          },
        },
      ]
    );
  };

  const onCatalogPress = () => {
    feedback.alert(
      'Справочник упражнений',
      catalog.rows === 0
        ? 'Локальной копии справочника нет. Обновить сейчас — нужно соединение.'
        : `Занято ${human(catalog.bytes)}, обновлён ${dayLabel(catalog.takenAt)}. Без копии карточка упражнения, список и подбор замен офлайн не работают.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Очистить',
          style: 'destructive',
          onPress: () => {
            void clearSnapshot().then(() => setCatalog(snapshotStats()));
          },
        },
        {
          text: 'Обновить',
          onPress: () => {
            void refreshExerciseSnapshot(true).then((result) => {
              setCatalog(snapshotStats());
              if (!result) {
                feedback.alert(
                  'Не обновлено',
                  'Соединения нет или справочник сейчас недоступен. Старая копия осталась на месте.'
                );
              }
            });
          },
        },
      ]
    );
  };

  const finishDownload = (result: Awaited<ReturnType<typeof downloadActiveProgram>> | null) => {
    setBusy(false);
    void programSnapshotInfo(userId).then(setProgram);
    if (!result) {
      feedback.alert(
        'Не скачано',
        'Нет соединения, или активная программа не найдена. Старая копия осталась на месте.'
      );
      return;
    }
    feedback.alert(
      'Программа скачана',
      `Данных ${human(result.bytes)} (${result.days} дней, ${result.exercises} строк, ${result.logs} подходов). ` +
        `Кадры упражнений: ${result.framesOwn.planned} шт, скачано ${human(result.framesOwn.bytes)}. ` +
        `Кадры замен: ${result.framesAlternatives.planned} шт, скачано ${human(result.framesAlternatives.bytes)}.`
    );
  };

  const onProgramPress = () => {
    if (!userId) {
      feedback.alert('Программа', 'Сначала нужно войти в аккаунт.');
      return;
    }
    const has = Boolean(program?.takenAt);
    feedback.alert(
      'Активная программа',
      has
        ? 'Скачанные дни открываются без сети вместе с текстами упражнений, подходами и статусами. Замены и их кадры тоже лежат локально.'
        : 'Скачает программу целиком: дни, подходы, статусы, тексты упражнений и кадры — её и упражнений, которые могут их заменить. Обычно это ~0,2 МБ данных и 2–14 МБ кадров.',
      [
        { text: 'Отмена', style: 'cancel' },
        ...(has
          ? [
              {
                text: 'Очистить',
                style: 'destructive' as const,
                onPress: () => {
                  void clearProgramSnapshot(userId).then(() =>
                    setProgram({
                      takenAt: null,
                      bytes: 0,
                      days: 0,
                      workouts: 0,
                      exercises: 0,
                      logs: 0,
                    })
                  );
                },
              },
            ]
          : []),
        {
          text: has ? 'Обновить' : 'Скачать',
          onPress: () => {
            if (busy) return;
            setBusy(true);
            void downloadActiveProgram(userId, gender)
              .then(finishDownload)
              .catch(() => finishDownload(null));
          },
        },
      ]
    );
  };

  return (
    <View style={commonStyles.section}>
      <SectionTitle title="Офлайн на устройстве" />
      {Platform.OS !== 'web' ? (
        <LinkRow
          icon={ImageOff}
          title="Кадры техники"
          description={framesDescription}
          onPress={onFramesPress}
        />
      ) : null}
      <LinkRow
        icon={BookOpen}
        title="Справочник упражнений"
        description={catalogDescription}
        onPress={onCatalogPress}
      />
      <LinkRow
        icon={DownloadCloud}
        title="Активная программа"
        description={busy ? 'Скачиваю…' : programDescription}
        onPress={onProgramPress}
      />
    </View>
  );
}
