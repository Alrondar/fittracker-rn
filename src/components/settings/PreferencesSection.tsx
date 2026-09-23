// src/components/settings/PreferencesSection.tsx
// DA-P2-8: секция «Предпочтения» (единицы, гриф, режим карточки, RPE, напоминания, таймер).
import React, { useState, useMemo } from 'react';
import { View, Text, TextInput } from 'react-native';
import { Clock, LayoutGrid, Bell, Ruler, Vibrate } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useTimerSettings } from '../../hooks/useTimerSettings';
import { useRpeSettings, RPE_PROMPT_DESCRIPTIONS } from '../../hooks/useRpeSettings';
import { useBarbellSettings } from '../../hooks/useBarbellSettings';
import { BARBELL_EQUIPMENT_NAMES } from '../../constants/barbellDefaults';
import { SPACING } from '../../constants/theme';
import { commonStyles } from '../../styles/common';
import { createCardStyles } from '../../styles/components/card';
import { typography } from '../../styles/typography';
import { PillToggle } from '../ui/PillToggle';
import { WorkoutDisplayModePicker } from '../workout/WorkoutDisplayModePicker';
import { ToggleRow, SectionTitle } from './SettingsRows';

export function PreferencesSection() {
  const { colors } = useTheme();
  const cardStyles = useMemo(() => createCardStyles(colors), [colors]);
  const { settings: timerSettings, updateSettings: updateTimerSettings } = useTimerSettings();
  const { settings: rpeSettings, updateSettings: updateRpeSettings } = useRpeSettings();
  const { settings: barbellSettings, updateSetting: updateBarbellSetting } = useBarbellSettings();

  // ⚠️ Как и до split: локальный state без персистентности (не изменять в рамках DA-P2-8)
  const [useImperial, setUseImperial] = useState(false);
  const [workoutReminders, setWorkoutReminders] = useState(true);

  return (
    <View style={commonStyles.section}>
      <SectionTitle title="Предпочтения" />
      <ToggleRow
        icon={Ruler}
        title="Единицы измерения"
        description={useImperial ? 'Фунты, дюймы' : 'Килограммы, сантиметры'}
        value={useImperial}
        onToggle={setUseImperial}
      />

      {/* FEAT-1.5: Настройка веса грифа */}
      <View
        style={[
          cardStyles.compact,
          { borderColor: colors.border, borderWidth: 1, marginBottom: SPACING.sm },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
          <Ruler size={20} color={colors.primary} style={{ marginRight: SPACING.sm }} />
          <View style={{ flex: 1 }}>
            <Text style={[typography.labelBold, { color: colors.textPrimary }]}>
              Вес грифа по умолчанию
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Настройте под ваш зал (кг)
            </Text>
          </View>
        </View>
        {BARBELL_EQUIPMENT_NAMES.filter((eq) => !eq.includes(' ')).map((equip) => (
          <View
            key={equip}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: SPACING.sm,
              paddingBottom: SPACING.sm,
              borderBottomWidth: 1,
              borderBottomColor: colors.borderLight,
            }}
          >
            <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>
              {equip}
            </Text>
            <TextInput
              style={[
                cardStyles.sheetInput,
                { width: 80, textAlign: 'right', paddingVertical: 4, paddingHorizontal: 8 },
              ]}
              placeholder="20"
              placeholderTextColor={colors.textTertiary}
              value={String(barbellSettings.kg[equip] || 20)}
              keyboardType="decimal-pad"
              onChangeText={(text) => {
                const val = parseFloat(text);
                if (!isNaN(val) && val > 0) {
                  updateBarbellSetting(equip, 'kg', val);
                }
              }}
            />
          </View>
        ))}
      </View>

      {/* Режим карточки упражнения (UX-2) */}
      <View
        style={[
          cardStyles.compact,
          { borderColor: colors.border, borderWidth: 1, marginBottom: SPACING.sm },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
          <LayoutGrid size={20} color={colors.primary} style={{ marginRight: SPACING.sm }} />
          <View style={{ flex: 1 }}>
            <Text style={[typography.label, { color: colors.textPrimary }]}>
              Режим карточки упражнения
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Сколько информации показывать на тренировке
            </Text>
          </View>
        </View>
        <WorkoutDisplayModePicker />
      </View>

      {/* UX-7: частота запроса RPE */}
      <View
        style={[
          cardStyles.compact,
          { borderColor: colors.border, borderWidth: 1, marginBottom: SPACING.sm },
        ]}
      >
        <View style={{ marginBottom: SPACING.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm }}>
            <LayoutGrid size={20} color={colors.primary} style={{ marginRight: SPACING.sm }} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.labelBold, { color: colors.textPrimary }]}>
                Частота запроса RPE
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {RPE_PROMPT_DESCRIPTIONS[rpeSettings.prompt]}
              </Text>
            </View>
          </View>
        </View>
        <PillToggle
          options={[
            { key: 'always', label: 'Всегда' },
            { key: 'last-set', label: 'Посл. сет' },
            { key: 'off', label: 'Выкл' },
          ]}
          value={rpeSettings.prompt}
          onChange={(prompt) => updateRpeSettings({ prompt })}
        />
      </View>

      <ToggleRow
        icon={Bell}
        title="Напоминания о тренировках"
        description="Уведомления о запланированных тренировках"
        value={workoutReminders}
        onToggle={setWorkoutReminders}
      />

      <ToggleRow
        icon={Clock}
        title="Автостарт после каждого подхода"
        description="Запускать таймер после каждого завершённого подхода"
        value={timerSettings.autoStartAfterEverySet}
        onToggle={(value) => updateTimerSettings({ autoStartAfterEverySet: value })}
      />

      <ToggleRow
        icon={Vibrate}
        iconColor={colors.warning}
        title="Вибрация до сброса"
        description="Вибрировать каждые 3 сек, пока не сбросишь таймер"
        value={timerSettings.vibrateUntilDismissed}
        onToggle={(value) => updateTimerSettings({ vibrateUntilDismissed: value })}
      />

      <ToggleRow
        icon={Vibrate}
        iconColor={colors.success}
        title="Вибрация"
        description="Вибросигнал по окончании отдыха"
        value={timerSettings.vibration}
        onToggle={(value) => updateTimerSettings({ vibration: value })}
      />
    </View>
  );
}
