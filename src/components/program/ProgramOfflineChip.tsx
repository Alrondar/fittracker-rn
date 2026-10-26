// src/components/program/ProgramOfflineChip.tsx
// Кнопка скачивания СВОЕЙ программы — в футере каждой карточки экрана «Программы».
//
// Почему на карточке, а не одна общая плашка: скачивать заранее хотят разное —
// активную программу, программу на завтра, готовую из каталога, которую присматривают.
// Одна плашка в углу умела говорить только про активную, и решение «скачать»
// принималось не там, где лежит сама программа.
//
// Процент считается по кадрам, а не по байтам: данных в программе ~0,2 МБ, кадров
// 2–14 МБ, и именно докачка рамок — то, что пользователь видит глазами. Хост не
// отдаёт байтовый прогресс одного файла, поэтому счётчик — число готовых рамок из
// плана (src/lib/mediaCache.ts → stageFrames).
import React, { useState } from 'react';
import { GestureResponderEvent, Text } from 'react-native';
import { Check, DownloadCloud } from 'lucide-react-native';
import { PressableScale } from '../ui/PressableScale';
import { feedback } from '../../lib/feedback';
import { useMediaGender } from '../../hooks/useMediaGender';
import { useOfflineProgram } from '../../hooks/useOfflineProgram';
import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../store/useStore';
import { clearProgramSnapshot } from '../../lib/programSnapshot';
import { downloadProgram, refreshProgramFrames } from '../../services/programSnapshotService';
import { BORDER_RADIUS, SPACING, withAlpha } from '../../constants/theme';
import { typography } from '../../styles/typography';

const MB = 1024 * 1024;
const human = (bytes: number) =>
  bytes >= MB ? `${(bytes / MB).toFixed(1)} МБ` : `${(bytes / 1024).toFixed(0)} КБ`;

/**
 * `programId` — программа этой карточки (не активная и не указатель снимка): состояние
 * «скачана ли» читается по ней же, и чужая галочка тут появиться не может.
 */
export function ProgramOfflineChip({
  programId,
  programName,
}: {
  programId: string;
  programName: string;
}) {
  const { colors } = useTheme();
  const userId = useStore((state) => state.userId);
  const gender = useMediaGender();
  const { info, downloaded, refresh } = useOfflineProgram(userId, programId);
  const [pct, setPct] = useState<number | null>(null);

  const download = () => {
    if (!userId || pct !== null) return;
    setPct(0);
    void downloadProgram(userId, programId, gender, (done, planned) =>
      setPct(planned > 0 ? Math.min(99, Math.round((done / planned) * 100)) : 0)
    )
      .then(() => {
        setPct(null);
        refresh();
      })
      .catch(() => {
        setPct(null);
        feedback.alert(
          'Не скачано',
          'Нет соединения, или программа не найдена. То, что уже лежало на устройстве, осталось на месте.'
        );
      });
  };

  const openActions = () => {
    feedback.alert(
      `«${programName}» на устройстве`,
      `${info.days} дней · ${info.workouts} тренировок · ${human(info.bytes)} данных и её кадры. ` +
        'Дни открываются без сети вместе с подходами, статусами и текстами упражнений.\n\n' +
        '«Обновить» докачает только новые кадры и свежие версии тех, что пересняли; ничего уже скачанное перекачиваться не будет.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Очистить',
          style: 'destructive',
          onPress: () => {
            void clearProgramSnapshot(userId, programId).then(() => {
              refresh();
            });
          },
        },
        {
          text: 'Обновить',
          onPress: () => {
            if (!userId) return;
            void refreshProgramFrames(userId, gender, programId).then((result) =>
              feedback.alert(
                result ? 'Кадры обновлены' : 'Нечего обновлять',
                result
                  ? `Докачали ${result.fetched} из ${result.planned} рамок (${human(result.bytes)}).`
                  : 'Эта программа ещё не скачана.'
              )
            );
          },
        },
      ]
    );
  };

  // Тап по кнопке не должен открывать карточку: так же, как «Активировать» рядом.
  const press = (action: () => void) => (event: GestureResponderEvent) => {
    event?.stopPropagation?.();
    action();
  };

  if (!userId) return null;

  const busy = pct !== null;
  const label = busy ? `${pct}%` : downloaded ? 'Офлайн' : 'Скачать';
  const Icon = busy || !downloaded ? DownloadCloud : Check;
  const tone = downloaded && !busy ? colors.success : colors.primary;

  return (
    <PressableScale
      onPress={press(busy ? () => undefined : downloaded ? openActions : download)}
      accessibilityRole="button"
      accessibilityLabel={
        busy
          ? `Идёт скачивание программы ${programName}`
          : downloaded
            ? `Программа ${programName} скачана`
            : `Скачать программу ${programName} офлайн`
      }
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      style={{
        // Крайний слева в футере: свободное место справа занято «Активировать» и
        // «Подробнее», а две кнопки в одном ряду не должны толкаться.
        marginRight: 'auto',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.full,
        borderWidth: 1,
        borderColor: withAlpha(tone, 0.251),
        backgroundColor: withAlpha(tone, 0.082),
      }}
    >
      <Icon size={12} color={tone} strokeWidth={2.5} />
      <Text numberOfLines={1} style={[typography.buttonTiny, { color: tone, fontWeight: '700' }]}>
        {label}
      </Text>
    </PressableScale>
  );
}
