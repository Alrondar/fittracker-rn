import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from './config';

// ✅ SCALE-4: ключи читаются из единого источника (config.ts → app.json → extra)
// При смене ключа править ТОЛЬКО app.json — все сервисы подхватят автоматически.
const supabaseUrl = config.supabaseUrl;
const supabaseAnonKey = config.supabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage, // ← Сохраняет сессию локально
    autoRefreshToken: true, // ← Автоматически обновляет токен
    persistSession: true, // ← Включает сохранение сессии
    detectSessionInUrl: false, // ← Не нужно для мобильного приложения
  },
});

// Вспомогательные функции
export function getList(data: any, key: string): string[] {
  const value = data?.[key];
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    return value.includes(',') ? value.split(',').map((s) => s.trim()) : [value];
  }
  return [];
}

/**
 * FD-6 / SCALE: PostgREST по умолчанию отдаёт не более 1000 строк за запрос
 * (db.max_row_count). Для агрегаций «по всей истории» это тихая потеря данных.
 *
 * fetchAllPages обходит пагинацию `.range()` и собирает ВСЕ страницы.
 * buildRange(from, to) обязан каждый раз возвращать НОВЫЙ builder, оканчивающийся
 * `.range(from, to)`, И иметь детерминированный порядок (например `.order('id')`) —
 * иначе PostgREST может вернуть дубликаты/пропуски между страницами.
 * Останавливается на первой короткой (< pageSize) странице.
 */
export const PAGING_PAGE_SIZE = 1000;

export async function fetchAllPages<T>(
  buildRange: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>,
  pageSize: number = PAGING_PAGE_SIZE
): Promise<{ data: T[]; error: unknown }> {
  const all: T[] = [];
  let from = 0;
  for (;;) {
    const to = from + pageSize - 1;
    const { data, error } = await buildRange(from, to);
    if (error) return { data: all, error };
    const page = (data as T[] | null) ?? [];
    all.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }
  return { data: all, error: null };
}
export function getString(data: any, key: string, defaultValue = ''): string {
  const value = data?.[key];
  return value ? String(value) : defaultValue;
}
