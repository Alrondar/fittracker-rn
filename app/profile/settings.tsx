import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { ThemeAccent, ThemeKey, themes } from '../../src/constants/theme';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { commonStyles } from '../../src/styles/common';
import { createCardStyles } from '../../src/styles/components/card';
import { createButtonStyles } from '../../src/styles/components/button';
import { typography } from '../../src/styles/typography';
import { profileService } from '../../src/services/profileService';
import { sendPasswordReset } from '../../src/services/authService';
import { useStore } from '../../src/store/useStore';
import { useTimerSettings } from '../../src/hooks/useTimerSettings';
import { SectionHeader } from '../../src/components/SectionHeader';
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
  X,
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

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [useImperial, setUseImperial] = useState(false);
  const [workoutReminders, setWorkoutReminders] = useState(true);
  const [nutritionReminders, setNutritionReminders] = useState(true);

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
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: currentTheme.colors.primary }} />
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: currentTheme.colors.success }} />
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: currentTheme.colors.warning }} />
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
            <Text style={[typography.label, { color: colors.textPrimary, flex: 1 }]}>Сменить пароль</Text>
            <ChevronRight size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={[buttonStyles.primary]} onPress={handleSaveProfile} disabled={saving}>
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
          <Text style={[commonStyles.sectionTitle, { color: colors.textPrimary, marginBottom: SPACING.md }]}>
            Внешний вид
          </Text>
          <View
            style={[
              cardStyles.compact,
              { borderColor: colors.border, borderWidth: 1, marginBottom: SPACING.md },
            ]}
          >
            <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.md }]}>
              Тема оформления
            </Text>
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: colors.surfaceSecondary,
                borderRadius: BORDER_RADIUS.md,
                padding: 4,
              }}
            >
              {(['light', 'dark', 'system'] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    {
                      flex: 1,
                      paddingVertical: SPACING.md,
                      borderRadius: BORDER_RADIUS.sm,
                      alignItems: 'center',
                      backgroundColor: themeMode === mode ? colors.primary : 'transparent',
                    },
                  ]}
                  onPress={() => {
                    setThemeMode(mode);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  {mode === 'light' && (
                    <Sun size={18} color={themeMode === mode ? colors.textInverse : colors.textSecondary} />
                  )}
                  {mode === 'dark' && (
                    <Moon size={18} color={themeMode === mode ? colors.textInverse : colors.textSecondary} />
                  )}
                  {mode === 'system' && (
                    <Monitor size={18} color={themeMode === mode ? colors.textInverse : colors.textSecondary} />
                  )}
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: themeMode === mode ? colors.textInverse : colors.textSecondary,
                        fontWeight: themeMode === mode ? '600' : '400',
                        marginTop: SPACING.xs,
                      },
                    ]}
                  >
                    {mode === 'light' ? 'Светлая' : mode === 'dark' ? 'Тёмная' : 'Авто'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
                <Text style={[typography.labelBold, { color: colors.textPrimary }]}>Цветовая схема</Text>
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
          <Text style={[commonStyles.sectionTitle, { color: colors.textPrimary, marginBottom: SPACING.md }]}>
            Предпочтения
          </Text>
          <View
            style={[
              cardStyles.compact,
              { borderColor: colors.border, borderWidth: 1, marginBottom: SPACING.sm },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Ruler size={20} color={colors.primary} style={{ marginRight: SPACING.sm }} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.label, { color: colors.textPrimary }]}>Единицы измерения</Text>
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

          <View
            style={[
              cardStyles.compact,
              { borderColor: colors.border, borderWidth: 1, marginBottom: SPACING.sm },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Bell size={20} color={colors.primary} style={{ marginRight: SPACING.sm }} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.label, { color: colors.textPrimary }]}>Напоминания о тренировках</Text>
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

          <View style={[cardStyles.compact, { borderColor: colors.border, borderWidth: 1 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Bell size={20} color={colors.success} style={{ marginRight: SPACING.sm }} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.label, { color: colors.textPrimary }]}>Напоминания о питании</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    Напоминания записывать приёмы пищи
                  </Text>
                </View>
              </View>
              <Switch
                value={nutritionReminders}
                onValueChange={(value) => {
                  setNutritionReminders(value);
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
          <Text style={[commonStyles.sectionTitle, { color: colors.textPrimary, marginBottom: SPACING.md }]}>
            Таймер отдыха
          </Text>
          <View
            style={[
              cardStyles.compact,
              { borderColor: colors.border, borderWidth: 1, marginBottom: SPACING.sm },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Volume2 size={20} color={colors.primary} style={{ marginRight: SPACING.sm }} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.label, { color: colors.textPrimary }]}>Звук по окончании</Text>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <BellRing size={20} color={colors.warning} style={{ marginRight: SPACING.sm }} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.label, { color: colors.textPrimary }]}>Отсчёт 3-2-1</Text>
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

          <View style={[cardStyles.compact, { borderColor: colors.border, borderWidth: 1 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <ArrowUpDown size={20} color={colors.warning} style={{ marginRight: SPACING.sm }} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.label, { color: colors.textPrimary }]}>Активация перед растяжкой</Text>
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
          <Text style={[commonStyles.sectionTitle, { color: colors.textPrimary, marginBottom: SPACING.md }]}>
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
            onPress={() => Alert.alert('О приложении', 'FitTracker v1.0.0\nСоздано с ❤️ для спортсменов')}
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
              <Text style={[typography.label, { color: colors.textPrimary }]}>Помощь и поддержка</Text>
            </View>
            <ChevronRight size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Модальное окно выбора цветовой схемы */}
      <Modal
        visible={showThemeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowThemeModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: '80%',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: SPACING.xl,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={[typography.h3, { color: colors.textPrimary }]}>Выберите цветовую схему</Text>
              <TouchableOpacity onPress={() => setShowThemeModal(false)}>
                <Text style={[typography.buttonSmall, { color: colors.primary }]}>Закрыть</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={availableAccents}
              renderItem={renderThemeOption}
              keyExtractor={(item) => item.key}
              contentContainerStyle={{ padding: SPACING.lg }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}