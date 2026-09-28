import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

/**
 * Единый слой аутентификации.
 * UI-экраны НЕ вызывают supabase.auth.* напрямую — только этот сервис.
 * Редиректы по состоянию сессии делает НЕ сервис, а корневой _layout
 * через onAuthStateChange (единственный источник истины по переходам).
 */

/**
 * WEB-BUG-2 / WEB-CTR-1: единый владелец `redirectTo` для писем сброса пароля.
 * Раньше значение дублировался в двух местах и разъехалось (`reset-password.tsx`
 * починен под веб, `ProfileSection.tsx` остался с `fittracker://`).
 *
 * - Web: абсолютный URL сайта на экран СМЕНЫ пароля (`/update-password`). Supabase
 *   дописывает к нему `#access_token=…&type=recovery`, а supabase-js с
 *   `detectSessionInUrl` разбирает его при загрузке → в `_layout` приходит
 *   `PASSWORD_RECOVERY` и уводит на этот же экран. Бывший `fittracker://` в
 *   браузере не открывал ничего.
 * - Native: прежний deep-link, поведение не меняется.
 *
 * Требует, чтобы в Supabase dashboard → Authentication → URL Configuration в
 * Redirect URLs лежал `https://fittracker-fseahe5gh7o.qoder.website/**`
 * (ручной шаг владельца, см. STATUS WEB-INFRA-1).
 */
export function passwordResetRedirect(): string {
  if (Platform.OS === 'web') {
    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : // SSR/статический рендер единого чанка origin недоступен — берём публичный URL.
          'https://fittracker-fseahe5gh7o.qoder.website';
    return `${origin}/update-password`;
  }
  return 'fittracker://reset-password';
}

/**
 * Страховочное создание профиля. Идемпотентно: on conflict do nothing.
 * ⚠️ В `profiles` НЕТ колонки `email` (сверено с database.types.ts и схемой БД).
 *    Писать email сюда нельзя — это роняет upsert ошибкой 42703.
 *    Email пользователя всегда берётся из auth.users (supabase.auth.getUser()).
 */
async function ensureProfile(userId: string): Promise<void> {
  if (!userId) return;

  try {
    const { error } = await supabase.from('profiles').upsert({ id: userId }, { onConflict: 'id' });

    // 23505 = unique violation (профиль уже есть) — не ошибка
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

  // Чинит старые аккаунты, у которых профиль мог не создаться
  if (data.user) {
    await ensureProfile(data.user.id);
  }

  return data.user;
}

export async function signUp(
  email: string,
  password: string
): Promise<{
  user: User | null;
  needsEmailConfirmation: boolean;
}> {
  // WEB-BUG-1 (та же причина): письмо подтверждения email ведёт на Site URL
  // Supabase, а не в приложение. На вебе возвращаем пользователя на origin —
  // supabase-js с detectSessionInUrl разберёт `?confirmation_token=…` и сам
  // подтвердит email. На нативных платформах options не передаём (поведение
  // прежнее: письмо подтверждает на хосте Supabase, затем вход в приложении).
  const webOptions =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? { options: { emailRedirectTo: window.location.origin } }
      : {};

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    ...webOptions,
  });

  if (error) throw error;

  // Если сессия есть — email confirmation выключен или уже подтверждён,
  // создаём профиль сразу (страховка поверх триггера БД).
  // Если сессии нет — профиль создаст триггер on_auth_user_created.
  if (data.user && data.session) {
    await ensureProfile(data.user.id);
  }

  return {
    user: data.user,
    needsEmailConfirmation: !data.session,
  };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error; // SIGNED_OUT поймает _layout и редиректнет в auth
}

/** Запрос письма сброса пароля. redirectTo — deep link (fittracker://reset-password). */
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
  cb: (event: string, session: Session | null) => void
): () => void {
  const { data } = supabase.auth.onAuthStateChange((event, session) => cb(event, session));
  return () => data.subscription.unsubscribe();
}

/** Человекочитаемый маппинг ошибок (единый для всех auth-экранов). */
export function mapAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Неверный email или пароль';
  if (message.includes('Email not confirmed')) return 'Подтвердите email перед входом';
  if (message.includes('User already registered'))
    return 'Пользователь с таким email уже существует';
  if (message.includes('rate limit') || message.includes('over rate'))
    return 'Слишком много попыток, подождите';
  return message || 'Произошла ошибка';
}
