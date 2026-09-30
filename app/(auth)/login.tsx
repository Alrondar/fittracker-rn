import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { feedback } from '../../src/lib/feedback';
import { PressableScale } from '../../src/components/ui/PressableScale';
import { useRouter } from 'expo-router';
import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { SPACING } from '../../src/constants/theme';
import { typography } from '../../src/styles/typography';
import { AppButton } from '../../src/components/ui/AppButton';
import { AppInput } from '../../src/components/ui/AppInput';
import { AppCard } from '../../src/components/ui/AppCard';
import { signIn, signUp, mapAuthError } from '../../src/services/authService';
import { Mail, Lock, UserPlus, LogIn } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import BenchPressIcon from '../../src/assets/equipment-icons/bench-press.svg';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setAuth, setJustRegistered } = useStore();
  const { colors, gradients } = useTheme();

  const handleAuth = async () => {
    if (!email || !password) {
      feedback.alert('Ошибка', 'Заполните все поля');
      return;
    }
    if (password.length < 6) {
      feedback.alert('Ошибка', 'Пароль должен быть минимум 6 символов');
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        const user = await signIn(email, password);
        if (user) setAuth(user.id); // редирект в /(tabs) сделает корневой гейт по SIGNED_IN
      } else {
        // Онбординг: флаг ставится ДО setAuth — корневой гейт (app/_layout)
        // по нему поведёт не в /(tabs), а в анкету /onboarding.
        // Ставится и при needsEmailConfirmation: подтверждение почты часто
        // происходит в этой же сессии (вход с того же экрана).
        setJustRegistered(true);
        const { user, needsEmailConfirmation } = await signUp(email, password);
        if (needsEmailConfirmation) {
          setLoading(false); // сессии нет → гейт не вмешивается, остаёмся на login
          feedback.alert('Подтверждение', 'Проверьте почту для подтверждения аккаунта');
          return;
        }
        if (user) setAuth(user.id);
        // при автовходе алерт «Успех» НЕ показываем — гейт сразу уводит в /(tabs),
        // иначе модальный Alert заставит жать ОК перед уходом (лишний клик)
      }
      // router.replace НЕ вызываем — единственный редиректор после входа = корневой гейт
    } catch (error: any) {
      setLoading(false);
      feedback.alert('Ошибка', mapAuthError(error?.message));
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ flex: 1, justifyContent: 'center', padding: SPACING.xxl }}>
          {/* UX-5: бренд-бейдж = он же, что и иконка приложения (белый знак
              bench-press на градиентном круге темы), а не lucide Dumbbell. */}
          <View style={{ alignItems: 'center', marginBottom: SPACING.sm }}>
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 88,
                height: 88,
                borderRadius: 44,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BenchPressIcon
                width={52}
                height={52}
                fill="#ffffff"
                stroke="#ffffff"
                strokeWidth={0}
                viewBox="0 0 100 100"
              />
            </LinearGradient>
          </View>
          <Text
            style={[
              typography.h1,
              { textAlign: 'center', color: colors.primary, marginBottom: SPACING.sm },
            ]}
          >
            FitTracker
          </Text>
          <Text
            style={[
              typography.body,
              { textAlign: 'center', color: colors.textSecondary, marginBottom: SPACING.xl },
            ]}
          >
            {isLogin ? 'Войдите в свой аккаунт' : 'Создайте новый аккаунт'}
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
              editable={!loading}
            />
            <AppInput
              label="Пароль"
              placeholder="Минимум 6 символов"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              icon={<Lock size={20} color={colors.primary} />}
              editable={!loading}
            />

            {isLogin && (
              <PressableScale
                onPress={() => router.push('/(auth)/reset-password')}
                disabled={loading}
                style={{ alignItems: 'flex-end', marginTop: SPACING.xs }}
              >
                <Text style={[typography.label, { color: colors.primary }]}>Забыли пароль?</Text>
              </PressableScale>
            )}

            <AppButton
              title={isLogin ? 'Войти' : 'Зарегистрироваться'}
              variant="primary"
              size="large"
              loading={loading}
              disabled={loading}
              icon={
                isLogin ? (
                  <LogIn size={20} color={colors.textInverse} />
                ) : (
                  <UserPlus size={20} color={colors.textInverse} />
                )
              }
              onPress={handleAuth}
              style={{ marginTop: SPACING.md }}
            />

            <PressableScale
              onPress={() => setIsLogin(!isLogin)}
              disabled={loading}
              style={{ padding: SPACING.sm, alignItems: 'center', marginTop: SPACING.sm }}
            >
              <Text style={[typography.label, { color: colors.primary }]}>
                {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
              </Text>
            </PressableScale>
          </AppCard>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
