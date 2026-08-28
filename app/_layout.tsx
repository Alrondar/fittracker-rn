import 'react-native-gesture-handler';

import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, Platform, LogBox } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useStore } from '../src/store/useStore';
import { ThemeProvider, useTheme } from '../src/hooks/useTheme';
import { getSession, onAuthStateChange } from '../src/services/authService';
import { SPACING } from '../src/constants/theme';

if (Platform.OS !== 'web' && __DEV__) {
  // Заглушаем ошибку keep-awake в dev-режиме
  const originalError = console.error;
  console.error = (...args) => {
    if (args[0]?.includes?.('Unable to activate keep awake')) return;
    originalError.apply(console, args);
  };

  // Игнорируем ложные предупреждения от сторонних библиотек
  LogBox.ignoreLogs([
    'SafeAreaView has been deprecated', // Проект уже использует react-native-safe-area-context
    'JWT issued at future', // Server-side clock skew в Supabase (PGRST303), не влияет на функциональность
  ]);
}

// QueryClient создаётся ВНЕ компонента (правило CLAUDE.md)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function ThemedStatusBar() {
  const { isDark } = useTheme();

  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

function RootLayoutContent() {
  const { setAuth, isAuthenticated } = useStore();
  const router = useRouter();
  const segments = useSegments() as string[];
  const { colors } = useTheme();

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    getSession()
      .then((session) => {
        if (mounted) {
          setAuth(session?.user?.id ?? null);
        }
      })
      .catch((error) => {
        console.error('Session load error:', error);
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    const unsubscribe = onAuthStateChange((event, session) => {
      // Recovery-сценарий: пользователь пришёл по ссылке из письма.
      // setAuth здесь не вызываем намеренно, чтобы гейт не увёл его с update-password.
      if (event === 'PASSWORD_RECOVERY') {
        router.replace('/(auth)/update-password');
        return;
      }

      // При выходе чистим серверный кэш React Query.
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
      }

      setAuth(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [setAuth, router]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isUpdatePassword = segments[1] === 'update-password';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup && !isUpdatePassword) {
      router.replace('/(tabs)');
    }
  }, [isLoading, isAuthenticated, segments, router]);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textPrimary }]}>
          Загрузка...
        </Text>
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
        <Stack.Screen name="progress/[id]" />
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
          <RootLayoutContent />
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
  },
});