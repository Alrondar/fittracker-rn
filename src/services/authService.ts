import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

/**
 * Единый слой аутентификации.
 * UI-экраны НЕ вызывают supabase.auth.* напрямую — только этот сервис.
 * Редиректы по состоянию сессии делает НЕ сервис, а корневой _layout
 * через onAuthStateChange (единственный источник истины по переходам).
 */

/** Страховочное создание профиля (баг 1). Идемпотентно: on conflict do nothing.
 *  Имя таблицы/колонок сверьте с database.types.ts (предположительно `profiles`). */
async function ensureProfile(userId: string, email?: string): Promise<void> {
  if (!userId) return;
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, ...(email ? { email } : {}) }, { onConflict: 'id' });
    if (error && !String(error.code).includes('23505')) {
      console.warn('[authService] ensureProfile:', error.message);
    }
  } catch (e) {
    console.warn('[authService] ensureProfile threw:', e); // вход НЕ блокируем
  }
}

export async function signIn(email: string, password: string): Promise<User | null> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  return data.user;
}

export async function signUp(email: string, password: string): Promise<{
  user: User | null;
  needsEmailConfirmation: boolean;
}> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  // профиль создаём сразу (триггер на БД + страховка), не ждём подтверждения
  if (data.user) await ensureProfile(data.user.id, email.trim());
  return { user: data.user, needsEmailConfirmation: !data.session };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error; // SIGNED_OUT поймает _layout и редиректнет в auth
}

/** Запрос письма сброса пароля. redirectTo — deep link в приложение
 *  (схема из app.json, напр. fittracker://reset-password). Сверьте со своим scheme. */
export async function sendPasswordReset(email: string, redirectTo?: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    ...(redirectTo ? { redirectTo } : {}),
  });
  if (error) throw error;
}

/** Смена пароля по активной recovery-сессии (экран update-password). */
export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error; // после успеха придёт USER_UPDATED / SIGNED_IN → гейт редиректнет
}

/** Стартовая сессия (для splash-гейта в _layout). */
export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Подписка на изменения сессии — ядро переходов. Используется ТОЛЬКО в _layout. */
export function onAuthStateChange(
  cb: (event: string, session: Session | null) => void,
): () => void {
  const { data } = supabase.auth.onAuthStateChange((event, session) => cb(event, session));
  return () => data.subscription.unsubscribe();
}

/** Человекочитаемый маппинг ошибок (единый для всех auth-экранов). */
export function mapAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Неверный email или пароль';
  if (message.includes('Email not confirmed')) return 'Подтвердите email перед входом';
  if (message.includes('User already registered')) return 'Пользователь с таким email уже существует';
  if (message.includes('rate limit') || message.includes('over rate')) return 'Слишком много попыток, подождите';
  return message || 'Произошла ошибка';
}