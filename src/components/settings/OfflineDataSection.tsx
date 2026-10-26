// src/components/settings/OfflineDataSection.tsx
// Две вещи, которые пользователь реально хочет контролировать: качать ли программу
// самим и сколько места под кадры. Скачивание и «очистить программу» живут на каждой
// карточке экрана «Программы» — лезть в настройки, чтобы скачать день заранее, долго.
//
// Потолок относится только к кадрам (src/lib/mediaCache.ts): снимок справочника и
// снимки программ вне лимита и не вытесняются — их потеря стоила бы истории
// тренировок, а не картинки.
//
// Кадры — только на телефоне: в браузере их хранит кэш браузера, а гарантию «без
// сети» там даёт перехватчик запросов, которого в сборке пока нет. Справочник и
// программа работают на обеих платформах (src/lib/localStore.ts).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { DownloadCloud, HardDrive, ImageOff } from 'lucide-react-native';
import { feedback } from '../../lib/feedback';
import { FRAME_CAP_OPTIONS_MB, clearMediaCache, mediaCacheStats } from '../../lib/mediaCache';
import { snapshotStats } from '../../lib/exerciseSnapshot';
import { downloadedProgramIds, programSnapshotInfo } from '../../lib/programSnapshot';
import { refreshProgramFrames } from '../../services/programSnapshotService';
import { useOfflineSettings } from '../../hooks/useOfflineSettings';
import { useMediaGender } from '../../hooks/useMediaGender';
import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../store/useStore';
import { SPACING } from '../../constants/theme';
import { commonStyles } from '../../styles/common';
import { createCardStyles } from '../../styles/components/card';
import { typography } from '../../styles/typography';
import { PillToggle } from '../ui/PillToggle';
import { LinkRow, SectionTitle, ToggleRow } from './SettingsRows';

const MB = 1024 * 1024;
const formatMb = (bytes: number) => `${(bytes / MB).toFixed(1)} МБ`;
const human = (bytes: number) =>
  bytes >= MB ? formatMb(bytes) : `${(bytes / 1024).toFixed(0)} КБ`;

export function OfflineDataSection() {
  const { colors } = useTheme();
  const userId = useStore((state) => state.userId);
  const gender = useMediaGender();
  const { settings, updateSettings } = useOfflineSettings();
  const cardStyles = useMemo(() => createCardStyles(colors), [colors]);

  const [frames, setFrames] = useState(() => mediaCacheStats());
  const [catalog, setCatalog] = useState(() => snapshotStats());
  const [program, setProgram] = useState(() => ({ count: 0, bytes: 0, days: 0 }));

  const refresh = useCallback(() => {
    setFrames(mediaCacheStats());
    setCatalog(snapshotStats());
    void (async () => {
      const ids = await downloadedProgramIds(userId);
      const info = await programSnapshotInfo(userId);
      setProgram({ count: ids.length, bytes: info.bytes, days: info.days });
    })();
  }, [userId]);

  useEffect(refresh, [refresh]);

  const capDescription =
    Platform.OS === 'web'
      ? 'В браузере кадры хранит его собственный кэш: переключатель влияет на телефон.'
      : frames.frames === 0
        ? 'Пока пусто. Справочник и данные программ считаются отдельно и в этот объём не входят.'
        : `Кадры техники: ${formatMb(frames.bytes)} из ${formatMb(frames.limit)} · ${frames.frames} шт. ` +
          'Справочник и данные программ — вне лимита.';

  const onUsagePress = () => {
    const summary =
      `Кадры: ${formatMb(frames.bytes)} из ${formatMb(frames.limit)} (${frames.frames} шт).\n` +
      `Справочник: ${catalog.rows} позиций, ${human(catalog.bytes)}.\n` +
      `Программы: ${program.count} шт, ${human(program.bytes)}${program.days ? `, ${program.days} дней` : ''}.\n\n` +
      `«Обновить кадры» докачает только те, которых нет на устройстве или у которых поднялась версия, — ` +
      `остальное перекачиваться не будет.`;
    feedback.alert('Что занимает место', summary, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Обновить кадры',
        onPress: () => {
          if (!userId) return;
          void refreshProgramFrames(userId, gender).then((result) => {
            refresh();
            feedback.alert(
              result ? 'Кадры обновлены' : 'Нечего обновлять',
              result
                ? `Докачали ${result.fetched} из ${result.planned} рамок (${human(result.bytes)}).`
                : 'Программа ещё не скачана — скачаешь её кнопкой на карточке программы.'
            );
          });
        },
      },
      {
        text: 'Очистить кадры',
        style: 'destructive',
        onPress: () => {
          void clearMediaCache().then(refresh);
        },
      },
    ]);
  };

  return (
    <View style={commonStyles.section}>
      <SectionTitle title="Офлайн на устройстве" />
      <ToggleRow
        icon={DownloadCloud}
        title="Скачивать программу автоматически"
        description="При входе в приложение и после завершённого дня. Данные — ~0,2 МБ, кадры программы и её замен — от 2 до 14 МБ. Без сети откроются дни, их подходы и статусы."
        value={settings.autoDownload}
        onToggle={(autoDownload) => updateSettings({ autoDownload })}
      />
      <View
        style={[
          cardStyles.compact,
          { borderColor: colors.border, borderWidth: 1, marginBottom: SPACING.sm },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
          <HardDrive size={20} color={colors.primary} style={{ marginRight: SPACING.sm }} />
          <View style={{ flex: 1 }}>
            <Text style={[typography.labelBold, { color: colors.textPrimary }]}>
              Место на устройстве
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {capDescription}
            </Text>
          </View>
        </View>
        <PillToggle
          options={FRAME_CAP_OPTIONS_MB.map((mb) => ({ key: String(mb), label: `${mb} МБ` }))}
          value={String(settings.frameCapMb)}
          onChange={(key) => {
            updateSettings({ frameCapMb: Number(key) });
            refresh();
          }}
        />
      </View>
      <LinkRow
        icon={ImageOff}
        title="Что занимает место"
        description="Кадры, справочник и скачанные программы: посмотреть, докачать новые кадры или очистить"
        onPress={onUsagePress}
      />
    </View>
  );
}
