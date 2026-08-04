import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from './config';

// ✅ SCALE-4: ключи читаются из единого источника (config.ts → app.json → extra)
// При смене ключа править ТОЛЬКО app.json — все сервисы подхватят автоматически.
const supabaseUrl = config.supabaseUrl;
const supabaseAnonKey = config.supabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,           // ← Сохраняет сессию локально
    autoRefreshToken: true,          // ← Автоматически обновляет токен
    persistSession: true,            // ← Включает сохранение сессии
    detectSessionInUrl: false,       // ← Не нужно для мобильного приложения
  },
});

// Вспомогательные функции
export function getList(data: any, key: string): string[] {
  const value = data?.[key];
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    return value.includes(',') ? value.split(',').map(s => s.trim()) : [value];
  }
  return [];
}

export function getString(data: any, key: string, defaultValue = ''): string {
  const value = data?.[key];
  return value ? String(value) : defaultValue;
}