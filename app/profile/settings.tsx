import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { ThemeAccent, ThemeKey, themes } from '../../src/constants/theme';
import { SPACING } from '../../src/constants/theme';
import { commonStyles } from '../../src/styles/common';
import { createCardStyles } from '../../src/styles/components/card';
import { createButtonStyles } from '../../src/styles/components/button';
import { typography } from '../../src/styles/typography';
import { profileService } from '../../src/services/profileService';
import { Clock } from 'lucide-react-native';
import { LayoutGrid } from 'lucide-react-native';
import { sendPasswordReset } from '../../src/services/authService';
import { useStore } from '../../src/store/useStore';
import { useTimerSettings } from '../../src/hooks/useTimerSettings';
import { useRpeSettings, RPE_PROMPT_DESCRIPTIONS } from '../../src/hooks/useRpeSettings';
import { useBarbellSettings } from '../../src/hooks/useBarbellSettings';
import { BARBELL_EQUIPMENT_NAMES } from '../../src/constants/barbellDefaults';
import { SectionHeader } from '../../src/components/SectionHeader';
import { SheetShell } from '../../src/components/ui/SheetShell';
import { PillToggle } from '../../src/components/ui/PillToggle';
import { WorkoutDisplayModePicker } from '../../src/components/workout/WorkoutDisplayModePicker';
import {
  ChevronLeft,
  User,
  Mail,
  Lock,
  Palette,
  Moon,
  Sun,
  Monitor,
  ChevronRight,
  Save,
  Bell,
  Ruler,
  Info,
  HelpCircle,
  ArrowUpDown,
  Volume2,
  BellRing,
  Vibrate,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, themeMode, themeAccent, setThemeMode, setThemeAccent, availableAccents } =
    useTheme();
  const { userId } = useStore();
  const { settings: timerSettings, updateSettings: updateTimerSettings } = useTimerSettings();
  const { settings: rpeSettings, updateSettings: updateRpeSettings } = useRpeSettings();
  const { settings: barbellSettings, updateSetting: updateBarbellSetting } = useBarbellSettings();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [useImperial, setUseImperial] = useState(false);
  const [workoutReminders, setWorkoutReminders] = useState(true);

  // ✅ Фабрики стилей — через useMemo (правило CLAUDE.md)
  const cardStyles = useMemo(() => createCardStyles(colors), [colors]);
  const buttonStyles = useMemo(() => createButtonStyles(colors), [colors]);

  useEffect(() => {
    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadUserData = async () => {
    if (!userId) return;
    try {
      // SEC-10: единый сервисный вызов вместо supabase.auth.getUser + supabase.from в UI.
      // getProfileData внутри делает getUser() + profiles.maybeSingle() → email + fullName.
      const data = await profileService.getProfileData(userId);
      setFullName(data.fullName || '');
      setEmail(data.email || '');
    } catch (e) {
      console.error('Ошибка загрузки данных:', e);
    }
  };

  const handleSaveProfile = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await profileService.updateFullName(userId, fullName);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Успех', 'Данные сохранены');
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = () => {
    Alert.alert('Смена пароля', 'Для смены пароля вам будет отправлено письмо на почту', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Отправить',
        onPress: async () => {
          try {
            // SEC-5: через authService + redirectTo, чтобы письмо вело обратно в
            // приложение (PASSWORD_RECOVERY → update-password), а не на Supabase URL.
            await sendPasswordReset(email, 'fittracker://reset-password');
            Alert.alert('Успех', 'Письмо для смены пароля отправлено');
          } catch (e: any) {
            Alert.alert('Ошибка', e.message);
          }
        },
      },
    ]);
  };

  const renderThemeOption = ({
    item,
  }: {
    item: { key: ThemeAccent; label: string; keys: ThemeKey[] };
  }) => {
    const isSelected = themeAccent === item.key;
    const currentTheme = themes[item.keys[0]];
    return (
      <TouchableOpacity
        style={[
          cardStyles.container,
          {
            borderColor: isSelected ? colors.primary : colors.border,
            borderWidth: 2,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: SPACING.sm,
          },
        ]}
        onPress={() => {
          setThemeAccent(item.key);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: currentTheme.colors.primary,
              }}
            />
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: currentTheme.colors.success,
              }}
            />
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: currentTheme.colors.warning,
              }}
            />
          </View>
          <Text style={[typography.h5, { color: colors.textPrimary }]}>{item.label}</Text>
        </View>
        {isSelected && (
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* ✅ #ffffff → colors.textInverse */}
            <Text style={{ color: colors.textInverse, fontSize: 14, fontWeight: 'bold' }}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      {/* Шапка */}
      <View
        style={[
          commonStyles.navHeader,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={commonStyles.backButton}>
          <ChevronLeft size={24} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[typography.h4, { color: colors.textPrimary }]}>Настройки</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}>
        {/* Профиль */}
        <View style={commonStyles.section}>
          <SectionHeader title="Профиль" style={{ paddingHorizontal: 0, paddingTop: 0 }} />
          <View
            style={[
              cardStyles.compact,
              { borderColor: colors.border, borderWidth: 1, marginBottom: SPACING.md },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
              <User size={20} color={colors.primary} style={{ marginRight: SPACING.sm }} />
              <Text style={[typography.label, { color: colors.textPrimary }]}>Имя и фамилия</Text>
            </View>
            <TextInput
              style={[cardStyles.sheetInput, { color: colors.textPrimary }]}
              placeholder="Введите имя и фамилию"
              placeholderTextColor={colors.textTertiary}
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          <View
            style={[
              cardStyles.compact,
              { borderColor: colors.border, borderWidth: 1, marginBottom: SPACING.md },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
              <Mail size={20} color={colors.primary} style={{ marginRight: SPACING.sm }} />
              <Text style={[typography.label, { color: colors.textPrimary }]}>Email</Text>
            </View>
            <TextInput
              style={[cardStyles.sheetInput, { color: colors.textPrimary }]}
              placeholder="email@example.com"
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              editable={false}
            />
          </View>

          <TouchableOpacity
            style={[
              cardStyles.compact,
              {
                flexDirection: 'row',
                alignItems: 'center',
                borderColor: colors.border,
                borderWidth: 1,
                marginBottom: SPACING.md,
              },
            ]}
            onPress={handleChangePassword}
          >
            <Lock size={20} color={colors.primary} style={{ marginRight: SPACING.sm }} />
            <Text style={[typography.label, { color: colors.textPrimary, flex: 1 }]}>
              Сменить пароль
            </Text>
            <ChevronRight size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[buttonStyles.primary]}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving ? (
              <Text style={buttonStyles.textPrimary}>Сохранение...</Text>
            ) : (
              <>
                {/* ✅ #fff → colors.textInverse */}
                <Save size={20} color={colors.textInverse} style={{ marginRight: SPACING.sm }} />
                <Text style={buttonStyles.textPrimary}>Сохранить изменения</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Внешний вид */}
        <View style={commonStyles.section}>
          <Text
            style={[
              commonStyles.sectionTitle,
              { color: colors.textPrimary, marginBottom: SPACING.md },
            ]}
          >
            Внешний вид
          </Text>
          <View
            style={[
              cardStyles.compact,
              { borderColor: colors.border, borderWidth: 1, marginBottom: SPACING.md },
            ]}
          >
            <Text
              style={[
                typography.labelBold,
                { color: colors.textPrimary, marginBottom: SPACING.md },
              ]}
            >
              Тема оформления
            </Text>
            <PillToggle
              options={[
                { key: 'light', label: 'Светлая', icon: Sun },
                { key: 'dark', label: 'Тёмная', icon: Moon },
                { key: 'system', label: 'Авто', icon: Monitor },
              ]}
              value={themeMode}
              onChange={setThemeMode}
            />
          </View>

          <TouchableOpacity
            style={[
              cardStyles.compact,
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderColor: colors.border,
                borderWidth: 1,
              },
            ]}
            onPress={() => setShowThemeModal(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Palette size={20} color={colors.primary} style={{ marginRight: SPACING.sm }} />
              <View>
                <Text style={[typography.labelBold, { color: colors.textPrimary }]}>
                  Цветовая схема
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {availableAccents.find((a) => a.key === themeAccent)?.label || 'Синяя'}
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Предпочтения */}
        <View style={commonStyles.section}>
          <Text
            style={[
              commonStyles.sectionTitle,
              { color: colors.textPrimary, marginBottom: SPACING.md },
            ]}
          >
            Предпочтения
          </Text>
          <View
            style={[
              cardStyles.compact,
              { borderColor: colors.border, borderWidth: 1, marginBottom: SPACING.sm },
            ]}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Ruler size={20} color={colors.primary} style={{ marginRight: SPACING.sm }} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.label, { color: colors.textPrimary }]}>
                    Единицы измерения
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {useImperial ? 'Фунты, дюймы' : 'Килограммы, сантиметры'}
                  </Text>
                </View>
              </View>
              <Switch
                value={useImperial}
                onValueChange={(value) => {
                  setUseImperial(value);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.textInverse}
              />
            </View>
          </View>

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
              <View
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm }}
              >
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

          <View
            style={[
              cardStyles.compact,
              { borderColor: colors.border, borderWidth: 1, marginBottom: SPACING.sm },
            ]}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Bell size={20} color={colors.primary} style={{ marginRight: SPACING.sm }} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.label, { color: colors.textPrimary }]}>
                    Напоминания о тренировках
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    Уведомления о запланированных тренировках
                  </Text>
                </View>
              </View>
              <Switch
                value={workoutReminders}
                onValueChange={(value) => {
                  setWorkoutReminders(value);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.textInverse}
              />
            </View>
          </View>

          <View
            style={[
              cardStyles.compact,
              { borderColor: colors.border, borderWidth: 1, marginTop: SPACING.sm },
            ]}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Clock size={20} color={colors.primary} style={{ marginRight: SPACING.sm }} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.label, { color: colors.textPrimary }]}>
                    Автостарт после каждого подхода
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    Запускать таймер после каждого завершённого подхода
                  </Text>
                </View>
              </View>
              <Switch
                value={timerSettings.autoStartAfterEverySet}
                onValueChange={(value) => {
                  updateTimerSettings({ autoStartAfterEverySet: value });
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.textInverse}
              />
            </View>
          </View>

          <View
            style={[
              cardStyles.compact,
              { borderColor: colors.border, borderWidth: 1, marginTop: SPACING.sm },
            ]}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Vibrate size={20} color={colors.warning} style={{ marginRight: SPACING.sm }} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.label, { color: colors.textPrimary }]}>
                    Вибрация до сброса
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    Вибрировать каждые 3 сек, пока не сбросишь таймер
                  </Text>
                </View>
              </View>
              <Switch
                value={timerSettings.vibrateUntilDismissed}
                onValueChange={(value) => {
                  updateTimerSettings({ vibrateUntilDismissed: value });
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.textInverse}
              />
            </View>
          </View>

          <View style={[cardStyles.compact, { borderColor: colors.border, borderWidth: 1 }]}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Vibrate size={20} color={colors.success} style={{ marginRight: SPACING.sm }} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.label, { color: colors.textPrimary }]}>Вибрация</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    Вибросигнал по окончании отдыха
                  </Text>
                </View>
              </View>
              <Switch
                value={timerSettings.vibration}
                onValueChange={(value) => {
                  updateTimerSettings({ vibration: value });
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.textInverse}
              />
            </View>
          </View>
        </View>

        {/* Таймер отдыха */}
        <View style={commonStyles.section}>
          <Text
            style={[
              commonStyles.sectionTitle,
              { color: colors.textPrimary, marginBottom: SPACING.md },
            ]}
          >
            Таймер отдыха
          </Text>
          <View
            style={[
              cardStyles.compact,
              { borderColor: colors.border, borderWidth: 1, marginBottom: SPACING.sm },
            ]}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Volume2 size={20} color={colors.primary} style={{ marginRight: SPACING.sm }} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.label, { color: colors.textPrimary }]}>
                    Звук по окончании
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    Звуковой сигнал, когда отдых завершён
                  </Text>
                </View>
              </View>
              <Switch
                value={timerSettings.sound}
                onValueChange={(value) => {
                  updateTimerSettings({ sound: value });
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.textInverse}
              />
            </View>
          </View>

          <View
            style={[
              cardStyles.compact,
              { borderColor: colors.border, borderWidth: 1, marginBottom: SPACING.sm },
            ]}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <BellRing size={20} color={colors.warning} style={{ marginRight: SPACING.sm }} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.label, { color: colors.textPrimary }]}>
                    Отсчёт 3-2-1
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    Короткие сигналы за 3 секунды до конца
                  </Text>
                </View>
              </View>
              <Switch
                value={timerSettings.preBeep}
                onValueChange={(value) => {
                  updateTimerSettings({ preBeep: value });
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.textInverse}
              />
            </View>
          </View>

          <View
            style={[
              cardStyles.compact,
              { borderColor: colors.border, borderWidth: 1, marginTop: SPACING.sm },
            ]}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Clock size={20} color={colors.primary} style={{ marginRight: SPACING.sm }} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.label, { color: colors.textPrimary }]}>
                    Автостарт отдыха
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    Запускать таймер после последнего подхода автоматически
                  </Text>
                </View>
              </View>
              <Switch
                value={timerSettings.autoStartRest}
                onValueChange={(value) => {
                  updateTimerSettings({ autoStartRest: value });
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.textInverse}
              />
            </View>
          </View>

          <View style={[cardStyles.compact, { borderColor: colors.border, borderWidth: 1 }]}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Vibrate size={20} color={colors.success} style={{ marginRight: SPACING.sm }} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.label, { color: colors.textPrimary }]}>Вибрация</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    Вибросигнал по окончании отдыха
                  </Text>
                </View>
              </View>
              <Switch
                value={timerSettings.vibration}
                onValueChange={(value) => {
                  updateTimerSettings({ vibration: value });
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.textInverse}
              />
            </View>
          </View>

          <View
            style={[
              cardStyles.compact,
              { borderColor: colors.border, borderWidth: 1, marginTop: SPACING.sm },
            ]}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <ArrowUpDown size={20} color={colors.warning} style={{ marginRight: SPACING.sm }} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.label, { color: colors.textPrimary }]}>
                    Активация перед растяжкой
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {timerSettings.activationFirst
                      ? 'Сначала активация, затем растяжка'
                      : 'Сначала растяжка, затем активация'}
                  </Text>
                </View>
              </View>
              <Switch
                value={timerSettings.activationFirst}
                onValueChange={(value) => {
                  updateTimerSettings({ activationFirst: value });
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.textInverse}
              />
            </View>
          </View>
        </View>

        {/* О приложении */}
        <View style={commonStyles.section}>
          <Text
            style={[
              commonStyles.sectionTitle,
              { color: colors.textPrimary, marginBottom: SPACING.md },
            ]}
          >
            О приложении
          </Text>
          <TouchableOpacity
            style={[
              cardStyles.compact,
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderColor: colors.border,
                borderWidth: 1,
                marginBottom: SPACING.sm,
              },
            ]}
            onPress={() =>
              Alert.alert('О приложении', 'FitTracker v1.0.0\nСоздано с ❤️ для спортсменов')
            }
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Info size={20} color={colors.primary} style={{ marginRight: SPACING.sm }} />
              <Text style={[typography.label, { color: colors.textPrimary }]}>О приложении</Text>
            </View>
            <ChevronRight size={20} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              cardStyles.compact,
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderColor: colors.border,
                borderWidth: 1,
              },
            ]}
            onPress={() => Alert.alert('Помощь', 'Свяжитесь с нами: support@fittracker.app')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <HelpCircle size={20} color={colors.primary} style={{ marginRight: SPACING.sm }} />
              <Text style={[typography.label, { color: colors.textPrimary }]}>
                Помощь и поддержка
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Sheet выбора цветовой схемы (INVENTORY §6: SheetShell паттерн) */}
      <SheetShell
        visible={showThemeModal}
        title="Выберите цветовую схему"
        onClose={() => setShowThemeModal(false)}
      >
        <FlatList
          data={availableAccents}
          renderItem={renderThemeOption}
          keyExtractor={(item) => item.key}
          scrollEnabled={false}
        />
      </SheetShell>
    </SafeAreaView>
  );
}
