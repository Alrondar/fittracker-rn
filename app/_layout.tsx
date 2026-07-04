import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../src/lib/supabase';
import { useStore } from '../src/store/useStore';

export default function RootLayout() {
  const { setAuth } = useStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuth(session?.user?.id ?? null);
      if (!session && segments[0] !== '(auth)') {
        router.replace('/(auth)/login');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setAuth(session?.user?.id ?? null);
        if (!session && segments[0] !== '(auth)') {
          router.replace('/(auth)/login');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [segments]);

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