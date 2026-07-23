import { useState } from 'react';
import { View, Text, Alert, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { SPACING } from '../../src/constants/theme';
import { typography } from '../../src/styles/typography';
import { AppButton } from '../../src/components/ui/AppButton';
import { AppInput } from '../../src/components/ui/AppInput';
import { AppCard } from '../../src/components/ui/AppCard';
import { signIn, signUp, mapAuthError } from '../../src/services/authService';
import { Mail, Lock, UserPlus, LogIn, Dumbbell } from 'lucide-react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setAuth } = useStore();
  const { colors } = useTheme();

  const handleAuth = async () => {
    if (!email || !password) { Alert.alert('Ошибка', 'Заполните все поля'); return; }
    if (password.length < 6) { Alert.alert('Ошибка', 'Пароль должен быть минимум 6 символов'); return; }
    setLoading(true);
    try {
      if (isLogin) {
        const user = await signIn(email, password);
        if (user) setAuth(user.id); // редирект в /(tabs) сделает корневой гейт по SIGNED_IN
      } else {
        const { user, needsEmailConfirmation } = await signUp(email, password);
        if (needsEmailConfirmation) {
          setLoading(false); // сессии нет → гейт не вмешивается, остаёмся на login
          Alert.alert('Подтверждение', 'Проверьте почту для подтверждения аккаунта');
          return;
        }
        if (user) setAuth(user.id);
        // при автовходе алерт «Успех» НЕ показываем — гейт сразу уводит в /(tabs),
        // иначе модальный Alert заставит жать ОК перед уходом (лишний клик)
      }
      // router.replace НЕ вызываем — единственный редиректор после входа = корневой гейт
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Ошибка', mapAuthError(error?.message));
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ flex: 1, justifyContent: 'center', padding: SPACING.xxl }}>
          <View style={{ alignItems: 'center', marginBottom: SPACING.sm }}>
            <Dumbbell size={72} color={colors.primary} strokeWidth={1.5} />
          </View>
          <Text style={[typography.h1, { textAlign: 'center', color: colors.primary, marginBottom: SPACING.sm }]}>
            FitTracker
          </Text>
          <Text style={[typography.body, { textAlign: 'center', color: colors.textSecondary, marginBottom: SPACING.xl }]}>
            {isLogin ? 'Войдите в свой аккаунт' : 'Создайте новый аккаунт'}
          </Text>

          <AppCard variant="highlighted">
            <AppInput label="Email" placeholder="your@email.com" value={email} onChangeText={setEmail}
              autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
              icon={<Mail size={20} color={colors.primary} />} editable={!loading} />
            <AppInput label="Пароль" placeholder="Минимум 6 символов" value={password} onChangeText={setPassword}
              secureTextEntry icon={<Lock size={20} color={colors.primary} />} editable={!loading} />

            {isLogin && (
              <TouchableOpacity onPress={() => router.push('/(auth)/reset-password')} disabled={loading}
                style={{ alignItems: 'flex-end', marginTop: SPACING.xs }}>
                <Text style={[typography.label, { color: colors.primary }]}>Забыли пароль?</Text>
              </TouchableOpacity>
            )}

            <AppButton title={isLogin ? 'Войти' : 'Зарегистрироваться'} variant="primary" size="large"
              loading={loading} disabled={loading}
              icon={isLogin
                ? <LogIn size={20} color={colors.textInverse} />
                : <UserPlus size={20} color={colors.textInverse} />}
              onPress={handleAuth} style={{ marginTop: SPACING.md }} />

            <TouchableOpacity onPress={() => setIsLogin(!isLogin)} disabled={loading}
              style={{ padding: SPACING.sm, alignItems: 'center', marginTop: SPACING.sm }}>
              <Text style={[typography.label, { color: colors.primary }]}>
                {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
              </Text>
            </TouchableOpacity>
          </AppCard>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}