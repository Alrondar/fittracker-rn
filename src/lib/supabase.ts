
import { createClient } from '@supabase/supabase-js';

// Замени на свои ключи из Flutter проекта!
const supabaseUrl = 'https://trgiihqqcovidwcqwdkl.supabase.co';
const supabaseAnonKey = 'sb_publishable_urA0lde-UzaEHI6Et5wB2w_k5L308CK';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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