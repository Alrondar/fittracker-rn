import { supabase } from '../lib/supabase';

/** Нормализация ввода: верхний регистр, только A-Z0-9 (убираем дефисы/пробелы). */
export const normalizeShareCode = (raw: string): string =>
  raw.toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Форматирование для отображения: дефис после префикса (FIT-XXXXXX). */
export const formatShareCode = (raw: string): string =>
  raw && raw.length > 3 ? `${raw.slice(0, 3)}-${raw.slice(3)}` : raw || '';

/** Создать код для СВОЕЙ программы (RPC проверяет владельца). */
export async function generateShareCode(programId: string): Promise<string> {
  const { data, error } = await supabase.rpc('generate_share_code', {
    p_program_id: programId,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/**
 * Импорт программы по коду: найти по share_code (чтение открыто всем)
 * → скопировать себе через существующий copy_program_for_user.
 * Возвращает ID новой (скопированной) программы.
 */
export async function importProgramByCode(code: string, userId: string): Promise<string> {
  const norm = normalizeShareCode(code);
  if (norm.length < 4) throw new Error('Введите корректный код');

  // 1. Поиск программы по коду
  const { data, error } = await supabase
    .from('programs')
    .select('id, name')
    .eq('share_code', norm)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Программа по этому коду не найдена');

  // 2. Копирование себе (RPC SECURITY DEFINER, ставит created_by = userId)
  const { data: copyData, error: copyError } = await supabase.rpc(
    'copy_program_for_user',
    { p_program_id: data.id, p_user_id: userId }
  );
  if (copyError) throw new Error(copyError.message);

  // Парсинг ID (копирует логику useProgramEditor.copyProgramToUser)
  const newId = Array.isArray(copyData)
    ? (copyData[0]?.id || copyData[0])
    : (copyData?.id || copyData);
  if (!newId) throw new Error('Не удалось импортировать программу');
  return typeof newId === 'string' ? newId : newId.id;
}