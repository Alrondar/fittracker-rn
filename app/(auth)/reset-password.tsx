import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { feedback } from '../../src/lib/feedback';
import { PressableScale } from '../../src/components/ui/PressableScale';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { SPACING } from '../../src/constants/theme';
import { typography } from '../../src/styles/typography';
import { AppCard } from '../../src/components/ui/AppCard';
import { AppInput } from '../../src/components/ui/AppInput';
import { AppButton } from '../../src/components/ui/AppButton';
import {
  sendPasswordReset,
  mapAuthError,
  passwordResetRedirect,
} from '../../src/services/authService';
import { Mail, ArrowLeft } from 'lucide-react-native';

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();
  const { colors } = useTheme();

  const handleSend = async () => {
    if (!email.trim()) {
      feedback.alert('Ошибка', 'Введите email');
      return;
    }
    setLoading(true);
    try {
      // WEB-BUG-1/2: redirectTo — единый канон из authService (веб ведёт на
      // /update-password с разбором recovery-токена из URL, натив — прежний
      // deep-link). Раньше здесь жила локальная веб-ветка, а в Настройках —
      // захардкоженный fittracker://, и значения разъехались.
      await sendPasswordReset(email, passwordResetRedirect());
      setSent(true);
    } catch (e: any) {
      feedback.alert('Ошибка', mapAuthError(e?.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        padding: SPACING.xxl,
        backgroundColor: colors.background,
      }}
    >
      <PressableScale
        onPress={() => router.back()}
        disabled={loading}
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg }}
      >
        <ArrowLeft size={22} color={colors.primary} />
        <Text style={[typography.label, { color: colors.primary, marginLeft: SPACING.xs }]}>
          Назад
        </Text>
      </PressableScale>
      <Text style={[typography.h1, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
        Восстановление
      </Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginBottom: SPACING.xl }]}>
        {sent
          ? 'Если аккаунт с таким email существует, мы отправили ссылку для смены пароля. Проверьте почту.'
          : 'Введите email аккаунта — пришлём ссылку для сброса пароля.'}
      </Text>
      <AppCard variant="highlighted">
        <AppInput
          label="Email"
          placeholder="your@email.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          icon={<Mail size={20} color={colors.primary} />}
          editable={!loading && !sent}
        />
        <AppButton
          title={sent ? 'Отправить ещё раз' : 'Отправить ссылку'}
          variant="primary"
          size="large"
          loading={loading}
          disabled={loading}
          onPress={handleSend}
          style={{ marginTop: SPACING.md }}
        />
      </AppCard>
    </ScrollView>
  );
}
