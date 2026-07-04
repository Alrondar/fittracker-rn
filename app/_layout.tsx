import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../src/lib/supabase';
import { useStore } from '../src/store/useStore';

export default function RootLayout() {
  const { setAuth, isAuthenticated } = useStore();
  const router = useRouter();
  const segments = useSegments();

  // Проверяем сессию при старте
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔵 Проверка сессии при старте:', session ? 'ЕСТЬ' : 'НЕТ');
      setAuth(session?.user?.id ?? null);
    });

    // Слушаем изменения авторизации
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔵 Событие авторизации:', event, session ? 'ЕСТЬ сессия' : 'НЕТ сессии');
        setAuth(session?.user?.id ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Редиректы на основе авторизации
  useEffect(() => {
    // Ждём, пока навигация смонтируется
    if (!segments || segments.length < 1) return;

    const inAuthGroup = segments[0] === '(auth)';

    console.log('🔵 Редирект:', { isAuthenticated, inAuthGroup, segments });

    if (!isAuthenticated && !inAuthGroup) {
      // Не авторизован, но не на странице логина → на логин
      console.log('➡️ Редирект на /(auth)/login');
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Авторизован, но на странице логина → на главную
      console.log('➡️ Редирект на /(tabs)');
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="exercise/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="workout/create" options={{ presentation: 'modal' }} />
        <Stack.Screen name="workout/[id]" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}