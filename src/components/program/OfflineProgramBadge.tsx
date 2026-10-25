// src/components/program/OfflineProgramBadge.tsx
// Плашка скачивания активной программы — в левом нижнем углу экрана «Программы»,
// зеркально кнопке создания (она справа: `cardStyles.fab`, bottom 24, right 16).
//
// Зачем она тут, а не в настройках: решение «скачать день заранее» принимается там же,
// где выбирается программа, и путь к нему — один тап вместо трёх (настройки → раздел →
// строка → шторка). Скачивание и очистка — здесь, объём и автоматическое скачивание —
// в настройках (src/components/settings/OfflineDataSection.tsx).
//
// Процент считается по кадрам, а не по байтам: данных в программе ~0,2 МБ, кадров
// 2–14 МБ, и именно докачка рамок — то, что пользователь видит глазами. Хост не
// отдаёт байтовый прогресс одного файла, поэтому счётчик — число готовых рамок из
// плана (src/lib/mediaCache.ts → stageFrames).
import React, { useState } from 'react';
import { Text } from 'react-native';
import { Check, DownloadCloud } from 'lucide-react-native';
import { PressableScale } from '../ui/PressableScale';
import { feedback } from '../../lib/feedback';
import { useMediaGender } from '../../hooks/useMediaGender';
import { useOfflineProgram } from '../../hooks/useOfflineProgram';
import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../store/useStore';
import { clearProgramSnapshot } from '../../lib/programSnapshot';
import { downloadActiveProgram, refreshProgramFrames } from '../../services/programSnapshotService';
import { BORDER_RADIUS, SPACING, withAlpha } from '../../constants/theme';
import { typography } from '../../styles/typography';

const MB = 1024 * 1024;
const human = (bytes: number) =>
  bytes >= MB ? `${(bytes / MB).toFixed(1)} МБ` : `${(bytes / 1024).toFixed(0)} КБ`;

/**
 * `programId` — активная программа экрана. Если её нет (пользователь ничего не
 * выбрал), плашка не показывается: предлагать скачивание нечего — это было бы
 * пустой кнопкой.
 */
export function OfflineProgramBadge({ programId }: { programId: string | null }) {
  const { colors } = useTheme();
  const userId = useStore((state) => state.userId);
  const gender = useMediaGender();
  const { info, downloaded, refresh } = useOfflineProgram(userId, programId);
  const [pct, setPct] = useState<number | null>(null);

  const download = () => {
    if (!userId || pct !== null) return;
    setPct(0);
    void downloadActiveProgram(userId, gender, (done, planned) =>
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
      'Программа на устройстве',
      `${info.days} дней · ${info.workouts} тренировок · ${human(info.bytes)} данных и её кадры. ` +
        'Дни открываются без сети вместе с подходами, статусами и текстами упражнений.\n\n' +
        '«Обновить» докачает только новые кадры и свежие версии тех, что пересняли; ничего уже скачанное перекачиваться не будет.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Очистить',
          style: 'destructive',
          onPress: () => {
            void clearProgramSnapshot(userId, programId ?? undefined).then(() => {
              refresh();
            });
          },
        },
        {
          text: 'Обновить',
          onPress: () => {
            if (!userId) return;
            void refreshProgramFrames(userId, gender).then((result) =>
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

  if (!programId || !userId) return null;

  const busy = pct !== null;
  const label = busy
    ? `Скачиваю ${pct}%`
    : downloaded
      ? `Офлайн · ${human(info.bytes)}`
      : 'Скачать офлайн';
  const Icon = busy || !downloaded ? DownloadCloud : Check;
  const tone = downloaded && !busy ? colors.success : colors.primary;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={
        busy
          ? 'Идёт скачивание программы'
          : downloaded
            ? 'Программа скачана'
            : 'Скачать программу офлайн'
      }
      onPress={busy ? undefined : downloaded ? openActions : download}
      style={{
        position: 'absolute',
        left: SPACING.lg,
        bottom: SPACING.xl,
        maxHeight: 44,
        minHeight: 44,
        maxWidth: 220,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        paddingHorizontal: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: withAlpha(tone, 0.35),
        backgroundColor: withAlpha(tone, 0.1),
      }}
    >
      <Icon size={16} color={tone} strokeWidth={2.2} />
      <Text numberOfLines={1} style={[typography.captionSmall, { color: tone, fontWeight: '700' }]}>
        {label}
      </Text>
      {downloaded && !busy ? (
        <Text style={[typography.captionSmall, { color: colors.textSecondary }]} numberOfLines={1}>
          {info.days} дн.
        </Text>
      ) : null}
    </PressableScale>
  );
}
