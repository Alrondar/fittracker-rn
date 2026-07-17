import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '../src/lib/supabase';
import { useStore } from '../src/store/useStore';
import { ToastProvider } from '../src/components/ToastProvider';
import { ThemeProvider, useTheme } from '../src/hooks/useTheme';

// QueryClient создаётся ВНЕ компонента
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
  const segments = useSegments();
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setAuth(session?.user?.id ?? null);
      } catch (e) {
        console.error('Session load error:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setAuth(session?.user?.id ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isLoading || !segments) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
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