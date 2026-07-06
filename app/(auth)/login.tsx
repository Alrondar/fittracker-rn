import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { createInputStyles } from '../../src/styles/components/input';
import { createButtonStyles } from '../../src/styles/components/button';
import { typography } from '../../src/styles/typography';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setAuth } = useStore();
  const { colors } = useTheme();

  const inputStyles = createInputStyles(colors);
  const buttonStyles = createButtonStyles(colors);

  const handleAuth = async () => {
    console.log('🔵 Попытка:', { email, isLogin });
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
          password 
        });
        if (error) throw error;
        console.log('✅ Успешный вход! User ID:', data.user?.id);
        if (data.user) setAuth(data.user.id);
        router.replace('/(tabs)');
      } else {
        const { data, error } = await supabase.auth.signUp({ 
          email: email.trim(), 
          password 
        });
        if (error) throw error;
        console.log('🟡 Результат регистрации:', { hasUser: !!data.user, hasSession: !!data.session });
        if (data.user && !data.session) {
          Alert.alert('Подтверждение', 'Проверьте почту для подтверждения аккаунта');
        } else if (data.user) {
          setAuth(data.user.id);
          Alert.alert('Успех', 'Регистрация успешна!');
          router.replace('/(tabs)');
        }
      }
    } catch (error: any) {
      console.log('🔴 Ошибка:', error);
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
          <Text style={{ fontSize: 72, textAlign: 'center', marginBottom: SPACING.sm }}>🏋️</Text>
          <Text style={[typography.h1, { textAlign: 'center', color: colors.primaryDark, marginBottom: SPACING.sm }]}>
            FitTracker
          </Text>
          <Text style={[typography.body, { textAlign: 'center', color: colors.textSecondary, marginBottom: SPACING.xxl }]}>
            {isLogin ? 'Войдите в свой аккаунт' : 'Создайте новый аккаунт'}
          </Text>

          <View style={{
            backgroundColor: colors.surface,
            padding: SPACING.xxl,
            borderRadius: BORDER_RADIUS.xl,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          }}>
            <View style={{ marginBottom: SPACING.lg }}>
              <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
                Email
              </Text>
              <TextInput
                style={inputStyles.input}
                placeholder="your@email.com"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!loading}
              />
            </View>

            <View style={{ marginBottom: SPACING.lg }}>
              <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
                Пароль
              </Text>
              <TextInput
                style={inputStyles.input}
                placeholder="Минимум 6 символов"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[buttonStyles.primary, buttonStyles.large, loading && buttonStyles.disabled]}
              onPress={handleAuth}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={buttonStyles.textPrimary}>
                  {isLogin ? 'Войти' : 'Зарегистрироваться'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsLogin(!isLogin)}
              disabled={loading}
              style={{ padding: SPACING.sm, alignItems: 'center' }}
            >
              <Text style={[typography.label, { color: colors.primary }]}>
                {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}