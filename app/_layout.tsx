import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../src/lib/supabase';
import { useStore } from '../src/store/useStore';
import { ToastProvider } from '../src/components/ToastProvider';

export default function RootLayout() {
  const { setAuth, isAuthenticated } = useStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔵 Проверка сессии при старте:', session ? 'ЕСТЬ' : 'НЕТ');
      setAuth(session?.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔵 Событие авторизации:', event, session ? 'ЕСТЬ сессия' : 'НЕТ сессии');
        setAuth(session?.user?.id ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (segments[0] === undefined) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      console.log('➡️ Редирект на /login');
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      console.log('➡️ Редирект на /(tabs)');
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments]);

  return (
    <ToastProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="exercise/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="workout/create" options={{ presentation: 'modal' }} />
        <Stack.Screen name="workout/[id]" />
      </Stack>
      <StatusBar style="auto" />
    </ToastProvider>
  );
}