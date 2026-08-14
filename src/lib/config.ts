import Constants from 'expo-constants';

/**
 * Единый источник истины для конфигов приложения (SCALE-4).
 * Читает значения из app.json → extra через expo-constants.
 * 
 * При смене ключа править ТОЛЬКО app.json — все сервисы подхватят автоматически.
 */

interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  sentryDsn?: string; // SCALE-2: добавим при подключении Sentry
  easProjectId?: string;
  eas?: {
    projectId?: string;
  };
}

const extra = Constants.expoConfig?.extra as Partial<AppConfig> | undefined;

if (!extra?.supabaseUrl || !extra?.supabaseAnonKey) {
  // Критическая ошибка: приложение не сможет работать без Supabase
  console.error(
    '[config] Отсутствуют обязательные конфиги в app.json → extra: supabaseUrl, supabaseAnonKey',
  );
}

export const config: AppConfig = {
  supabaseUrl: extra?.supabaseUrl || '',
  supabaseAnonKey: extra?.supabaseAnonKey || '',
  sentryDsn: extra?.sentryDsn,
  easProjectId: extra?.eas?.projectId,
};