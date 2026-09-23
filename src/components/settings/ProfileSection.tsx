// src/components/settings/ProfileSection.tsx
// DA-P2-8: секция «Профиль» экрана настроек (вынесена из app/profile/settings.tsx).
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { User, Mail, Lock, Save } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../store/useStore';
import { SPACING } from '../../constants/theme';
import { commonStyles } from '../../styles/common';
import { createCardStyles } from '../../styles/components/card';
import { createButtonStyles } from '../../styles/components/button';
import { typography } from '../../styles/typography';
import { profileService } from '../../services/profileService';
import { sendPasswordReset } from '../../services/authService';
import { SectionHeader } from '../SectionHeader';
import { LinkRow } from './SettingsRows';

export function ProfileSection() {
  const { colors } = useTheme();
  const { userId } = useStore();
  const cardStyles = useMemo(() => createCardStyles(colors), [colors]);
  const buttonStyles = useMemo(() => createButtonStyles(colors), [colors]);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      try {
        // SEC-10: единый сервисный вызов вместо supabase.auth.getUser + supabase.from в UI.
        const data = await profileService.getProfileData(userId);
        setFullName(data.fullName || '');
        setEmail(data.email || '');
      } catch (e) {
        console.error('Ошибка загрузки данных:', e);
      }
    };
    load();
  }, [userId]);

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

  return (
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
          keyboardType="email-address"
          editable={false}
        />
      </View>

      <LinkRow icon={Lock} title="Сменить пароль" onPress={handleChangePassword} />

      <TouchableOpacity
        style={[buttonStyles.primary]}
        onPress={handleSaveProfile}
        disabled={saving}
        accessibilityRole="button"
      >
        {saving ? (
          <Text style={buttonStyles.textPrimary}>Сохранение...</Text>
        ) : (
          <>
            <Save size={20} color={colors.textInverse} style={{ marginRight: SPACING.sm }} />
            <Text style={buttonStyles.textPrimary}>Сохранить изменения</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}
