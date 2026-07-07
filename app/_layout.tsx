import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../src/lib/supabase';
import { useStore } from '../src/store/useStore';
import { ToastProvider } from '../src/components/ToastProvider';
import { ThemeProvider, useTheme } from '../src/hooks/useTheme';
import { SafeAreaView } from 'react-native-safe-area-context';

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

function RootLayoutContent() {
  const { setAuth, isAuthenticated } = useStore();
  const router = useRouter();
  const segments = useSegments();
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log('🎨 [RENDER] isLoading:', isLoading, 'isAuthenticated:', isAuthenticated, 'segments:', segments);

  useEffect(() => {
    console.log('🔐 [USEEFFECT 1] Запуск загрузки сессии...');
    
    const loadSession = async () => {
      try {
        console.log(' [LOAD] Вызываем getSession...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.log('🔐 [LOAD] Ошибка getSession:', error.message);
          setError(error.message);
        } else {
          console.log('🔐 [LOAD] Сессия:', session ? `User ID: ${session.user.id}` : 'null');
          setAuth(session?.user?.id ?? null);
        }
      } catch (e: any) {
        console.log(' [LOAD] Исключение:', e.message);
        setError(e.message);
      } finally {
        console.log('🔐 [LOAD] Устанавливаем isLoading = false');
        setIsLoading(false);
      }
    };

    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 [AUTH CHANGE] event:', event, 'session:', session ? `User ID: ${session.user.id}` : 'null');
        setAuth(session?.user?.id ?? null);
      }
    );

    return () => {
      console.log('🔐 [CLEANUP] Отписка от подписки');
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    console.log('🔀 [USEEFFECT 2] isLoading:', isLoading, 'isAuthenticated:', isAuthenticated, 'segments:', segments);
    
    if (isLoading) {
      console.log('🔀 [REDIRECT] Пропуск - ещё загружается');
      return;
    }
    if (!segments) {
      console.log('🔀 [REDIRECT] Пропуск - segments null');
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    console.log('🔀 [REDIRECT] inAuthGroup:', inAuthGroup, 'currentPath:', segments.join('/'));

    if (!isAuthenticated && !inAuthGroup) {
      console.log('🔀 [REDIRECT] ➡️ Редирект на логин');
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      console.log('🔀 [REDIRECT] ➡️ Редирект на вкладки');
      router.replace('/(tabs)');
    } else {
      console.log('🔀 [REDIRECT] ⏸️ Редирект не нужен');
    }
  }, [isLoading, isAuthenticated, segments, router]);

  if (isLoading) {
    console.log('📱 [UI] Показываем loader');
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textPrimary, marginTop: 16 }}>Загрузка...</Text>
      </View>
    );
  }

  if (error) {
    console.log(' [UI] Показываем ошибку:', error);
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.error, fontSize: 16 }}>Ошибка: {error}</Text>
      </View>
    );
  }

  console.log('📱 [UI] Рендерим основной экран');
  return (
    // 👇 ИСПРАВЛЕНИЕ: styles.container БЕЗ alignItems: 'center'
  <View style={[styles.container, { backgroundColor: colors.background }]}>
    <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="exercise/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="workout/create" options={{ presentation: 'modal' }} />
        <Stack.Screen name="workout/[id]" />
        <Stack.Screen name="history/[id]" />
      </Stack>
      <ThemedStatusBar />
    </View>
  );
}

export default function RootLayout() {
  console.log('🎯 [ROOT] Рендер RootLayout');
  return (
    <ThemeProvider>
      <ToastProvider>
        <RootLayoutContent />
      </ToastProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  // 👇 Основной контейнер — только flex: 1, БЕЗ центрирования!
  container: {
    flex: 1,
  },
  // 👇 Для loader и error — центрируем
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});