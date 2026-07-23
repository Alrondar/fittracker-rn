import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStore } from '../src/store/useStore';
import { ToastProvider } from '../src/components/ToastProvider';
import { ThemeProvider, useTheme } from '../src/hooks/useTheme';
import { getSession, onAuthStateChange } from '../src/services/authService';

// QueryClient ВНЕ компонента (правило CLAUDE.md)
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
});

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

function RootLayoutContent() {
  const { setAuth, isAuthenticated } = useStore(); // setUnauth в useStore НЕТ — не используем
  const router = useRouter();
  // ✅ FIX TS2493: useSegments() в root layout выводится как кортеж фикс. длины;
  // расширяем до string[], чтобы segments[1] не падал проверкой индекса кортежа.
  const segments = useSegments() as string[];
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getSession()
      .then((session) => { if (mounted) setAuth(session?.user?.id ?? null); })
      .catch((e) => { console.error('Session load error:', e); })
      .finally(() => { if (mounted) setIsLoading(false); });

    const unsub = onAuthStateChange((event, session) => {
      // ✅ recovery (клик по ссылке из письма): ведём на смену пароля.
      // setAuth здесь НЕ вызываем намеренно; даже если getSession выставит auth=true
      // по recovery-сессии — исключение в гейте ниже удержит экран update-password.
      if (event === 'PASSWORD_RECOVERY') {
        router.replace('/(auth)/update-password');
        return;
      }
      setAuth(session?.user?.id ?? null); // SIGNED_IN / SIGNED_OUT / прочие
    });

    return () => { mounted = false; unsub(); };
  }, [setAuth, router]);

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup && segments[1] !== 'update-password') {
      // ✅ авторизованный не видит auth-экраны, КРОМЕ смены пароля по recovery
      router.replace('/(tabs)');
    }
  }, [isLoading, isAuthenticated, segments, router]);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textPrimary, marginTop: 16 }}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="exercise/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="workout/[id]" />
        <Stack.Screen name="history/[id]" />
      </Stack>
      <ThemedStatusBar />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <RootLayoutContent />
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});