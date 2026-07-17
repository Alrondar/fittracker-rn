import { useState } from 'react';
import {
  View,
  Text,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { typography } from '../../src/styles/typography';
import { AppButton } from '../../src/components/ui/AppButton';
import { AppInput } from '../../src/components/ui/AppInput';
import { AppCard } from '../../src/components/ui/AppCard';
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
    if (!email || !password) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Ошибка', 'Пароль должен быть минимум 6 символов');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        if (data.user) setAuth(data.user.id);
        router.replace('/(tabs)');
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        if (data.user && !data.session) {
          Alert.alert('Подтверждение', 'Проверьте почту для подтверждения аккаунта');
        } else if (data.user) {
          setAuth(data.user.id);
          Alert.alert('Успех', 'Регистрация успешна!');
          router.replace('/(tabs)');
        }
      }
    } catch (error: any) {
      let message = error.message || 'Произошла ошибка';
      if (message.includes('Invalid login credentials')) {
        message = 'Неверный email или пароль';
      } else if (message.includes('Email not confirmed')) {
        message = 'Подтвердите email перед входом';
      } else if (message.includes('User already registered')) {
        message = 'Пользователь с таким email уже существует';
      }
      Alert.alert('Ошибка', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
       <View style={{ flex: 1, justifyContent: 'center', padding: SPACING.xxl }}>
  {/* Логотип */}
  <View style={{ alignItems: 'center', marginBottom: SPACING.sm }}>
    <Dumbbell size={72} color={colors.primary} strokeWidth={1.5} />
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
              { textAlign: 'center', color: colors.textSecondary, marginBottom: SPACING.xxl },
            ]}
          >
            {isLogin ? 'Войдите в свой аккаунт' : 'Создайте новый аккаунт'}
          </Text>

          {/* Форма */}
              <AppCard variant="highlighted">            <AppInput
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

            <AppButton
              title={isLogin ? 'Войти' : 'Зарегистрироваться'}
              variant="primary"
              size="large"
              loading={loading}
              disabled={loading}
              icon={
                isLogin ? (
                  <LogIn size={20} color="#fff" />
                ) : (
                  <UserPlus size={20} color="#fff" />
                )
              }
              onPress={handleAuth}
              style={{ marginTop: SPACING.md }}
            />

            <TouchableOpacity
              onPress={() => setIsLogin(!isLogin)}
              disabled={loading}
              style={{ padding: SPACING.sm, alignItems: 'center', marginTop: SPACING.sm }}
            >
              <Text style={[typography.label, { color: colors.primary }]}>
                {isLogin
                  ? 'Нет аккаунта? Зарегистрироваться'
                  : 'Уже есть аккаунт? Войти'}
              </Text>
            </TouchableOpacity>
          </AppCard>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}