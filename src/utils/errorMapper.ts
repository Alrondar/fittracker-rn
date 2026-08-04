/**
 * Единый маппер ошибок для user-facing сообщений (SEC-9).
 * Правило: в Alert/Toast пользователю показываем ТОЛЬКО результат mapError/mapAuthError.
 * Сырой текст уходит в console.error на стороне вызывающего, а не в UI.
 *
 * Не зависит от supabase-типов (структурная типизация), чтобы не тащить耦合.
 */

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

/** Достаёт человекочитаемое сообщение из любого вида ошибки. */
export function extractMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (isRecord(error)) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return '';
}

/**
 * Превращает техническую ошибку в дружелюбное сообщение.
 * Известные паттерны → конкретный текст; прочие технические → общий текст;
 * уже-дружелюбные сообщения (валидации и т.п.) проходят без изменений.
 */
export function mapError(error: unknown): string {
  const raw = extractMessage(error);
  if (!raw) return 'Произошла неизвестная ошибка. Попробуй ещё раз.';
  const m = raw.toLowerCase();

  // Сеть / недоступность
  if (/fetch failed|network|enotfound|econnrefused|econnreset|timeout|offline|failed to fetch/.test(m)) {
    return 'Нет связи с сервером. Проверь интернет и попробуй ещё раз.';
  }
  // Доступ / RLS
  if (/row-level security|permission denied|unauthorized|not authorized|403|rls/.test(m)) {
    return 'Недостаточно прав для этого действия. Войди заново.';
  }
  // Уникальность
  if (/23505|duplicate key|unique constraint|unique violation/.test(m)) {
    return 'Такая запись уже существует.';
  }
  // Внешний ключ
  if (/23503|foreign key/.test(m)) {
    return 'Не удалось сохранить: связанные данные не найдены.';
  }
  // Схема / колонки (ошибки разработчика — не светим сырьё)
  if (/42703|42883|column .* does not exist|undefined function|syntax error/.test(m)) {
    return 'Сервис временно недоступен. Попробуй позже.';
  }
  // Не найдено
  if (/not found|no rows|404|pgrst116/.test(m)) {
    return 'Данные не найдены. Возможно, они были удалены.';
  }
  // Rate limit
  if (/rate limit|too many requests|429/.test(m)) {
    return 'Слишком много запросов. Подожди немного и попробуй ещё раз.';
  }

  // Прочее техническое (postgres/sql/коды) → общий текст, сырьё не показываем
  if (/postgres|sql|pgrst|jwt|payload|relation |relation\"|23\d{3}|42\d{3}|57\d{3}/.test(m)) {
    return 'Не удалось выполнить действие. Попробуй ещё раз.';
  }

  // Уже дружелюбное сообщение — пропускаем как есть
  return raw;
}