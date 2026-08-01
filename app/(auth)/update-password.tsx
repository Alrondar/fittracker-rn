import { useState } from 'react';
import { ScrollView, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { SPACING } from '../../src/constants/theme';
import { typography } from '../../src/styles/typography';
import { AppCard } from '../../src/components/ui/AppCard';
import { AppInput } from '../../src/components/ui/AppInput';
import { AppButton } from '../../src/components/ui/AppButton';
import { updatePassword, mapAuthError } from '../../src/services/authService';
import { Lock } from 'lucide-react-native';

export default function UpdatePasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { colors } = useTheme();

  const handleSave = async () => {
    if (password.length < 6) { Alert.alert('Ошибка', 'Минимум 6 символов'); return; }
    if (password !== confirm) { Alert.alert('Ошибка', 'Пароли не совпадают'); return; }
    setLoading(true);
    try {
      await updatePassword(password);
      Alert.alert('Готово', 'Пароль обновлён');
      router.replace('/(tabs)'); // ← ОБЯЗАТЕЛЬНО: гейт исключает этот маршрут, сам не уведёт
    } catch (e: any) {
      Alert.alert('Ошибка', mapAuthError(e?.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: SPACING.xxl, backgroundColor: colors.background }}>
      <Text style={[typography.h1, { color: colors.textPrimary, marginBottom: SPACING.sm, textAlign: 'center' }]}>Новый пароль</Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginBottom: SPACING.xl, textAlign: 'center' }]}>
        Придумайте новый пароль для входа
      </Text>
      <AppCard variant="highlighted">
        <AppInput label="Новый пароль" placeholder="Минимум 6 символов" value={password}
          onChangeText={setPassword} secureTextEntry icon={<Lock size={20} color={colors.primary} />} editable={!loading} />
        <AppInput label="Повторите пароль" placeholder="Ещё раз" value={confirm}
          onChangeText={setConfirm} secureTextEntry icon={<Lock size={20} color={colors.primary} />} editable={!loading} />
        <AppButton title="Сохранить пароль" variant="primary" size="large"
          loading={loading} disabled={loading} onPress={handleSave} style={{ marginTop: SPACING.md }} />
      </AppCard>
    </ScrollView>
  );
}