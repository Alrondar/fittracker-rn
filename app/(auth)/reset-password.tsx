import { useState } from 'react';
import { ScrollView, Text, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { SPACING } from '../../src/constants/theme';
import { typography } from '../../src/styles/typography';
import { AppCard } from '../../src/components/ui/AppCard';
import { AppInput } from '../../src/components/ui/AppInput';
import { AppButton } from '../../src/components/ui/AppButton';
import { sendPasswordReset, mapAuthError } from '../../src/services/authService';
import { Mail, ArrowLeft } from 'lucide-react-native';

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();
  const { colors } = useTheme();

  const handleSend = async () => {
    if (!email.trim()) { Alert.alert('Ошибка', 'Введите email'); return; }
    setLoading(true);
    try {
      await sendPasswordReset(email, 'fittracker://reset-password');
      setSent(true);
    } catch (e: any) {
      Alert.alert('Ошибка', mapAuthError(e?.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: SPACING.xxl, backgroundColor: colors.background }}>
      <TouchableOpacity onPress={() => router.back()} disabled={loading}
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg }}>
        <ArrowLeft size={22} color={colors.primary} />
        <Text style={[typography.label, { color: colors.primary, marginLeft: SPACING.xs }]}>Назад</Text>
      </TouchableOpacity>
      <Text style={[typography.h1, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>Восстановление</Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginBottom: SPACING.xl }]}>
        {sent
          ? 'Если аккаунт с таким email существует, мы отправили ссылку для смены пароля. Проверьте почту.'
          : 'Введите email аккаунта — пришлём ссылку для сброса пароля.'}
      </Text>
      <AppCard variant="highlighted">
        <AppInput label="Email" placeholder="your@email.com" value={email} onChangeText={setEmail}
          autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
          icon={<Mail size={20} color={colors.primary} />} editable={!loading && !sent} />
        <AppButton title={sent ? 'Отправить ещё раз' : 'Отправить ссылку'} variant="primary" size="large"
          loading={loading} disabled={loading} onPress={handleSend} style={{ marginTop: SPACING.md }} />
      </AppCard>
    </ScrollView>
  );
}