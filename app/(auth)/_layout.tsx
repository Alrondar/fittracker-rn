import { Stack } from 'expo-router';

/**
 * Layout ГРУППЫ авторизации. НЕ корневой layout!
 * Здесь НЕ должно быть: queryClient, провайдеров (Theme/Toast/Query/Gesture),
 * Stack со всеми маршрутами, auth-гейта, onAuthStateChange, setUnauth.
 * Всё это живёт в app/_layout.tsx. Здесь только отключаем нативные заголовки
 * у login / reset-password / update-password.
 */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}