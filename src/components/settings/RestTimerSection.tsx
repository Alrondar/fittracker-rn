// src/components/settings/RestTimerSection.tsx
// DA-P2-8: секция «Таймер отдыха».
import React from 'react';
import { View } from 'react-native';
import { Volume2, BellRing, Clock, Vibrate, ArrowUpDown } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useTimerSettings } from '../../hooks/useTimerSettings';
import { commonStyles } from '../../styles/common';
import { ToggleRow, SectionTitle } from './SettingsRows';

export function RestTimerSection() {
  const { colors } = useTheme();
  const { settings, updateSettings } = useTimerSettings();

  return (
    <View style={commonStyles.section}>
      <SectionTitle title="Таймер отдыха" />
      <ToggleRow
        icon={Volume2}
        title="Звук по окончании"
        description="Звуковой сигнал, когда отдых завершён"
        value={settings.sound}
        onToggle={(value) => updateSettings({ sound: value })}
      />
      <ToggleRow
        icon={BellRing}
        iconColor={colors.warning}
        title="Отсчёт 3-2-1"
        description="Короткие сигналы за 3 секунды до конца"
        value={settings.preBeep}
        onToggle={(value) => updateSettings({ preBeep: value })}
      />
      <ToggleRow
        icon={Clock}
        title="Автостарт отдыха"
        description="Запускать таймер после последнего подхода автоматически"
        value={settings.autoStartRest}
        onToggle={(value) => updateSettings({ autoStartRest: value })}
      />
      <ToggleRow
        icon={Vibrate}
        iconColor={colors.success}
        title="Вибрация"
        description="Вибросигнал по окончании отдыха"
        value={settings.vibration}
        onToggle={(value) => updateSettings({ vibration: value })}
      />
      <ToggleRow
        icon={ArrowUpDown}
        iconColor={colors.warning}
        title="Активация перед растяжкой"
        description={
          settings.activationFirst
            ? 'Сначала активация, затем растяжка'
            : 'Сначала растяжка, затем активация'
        }
        value={settings.activationFirst}
        onToggle={(value) => updateSettings({ activationFirst: value })}
      />
    </View>
  );
}
