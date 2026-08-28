// src/services/cycleService.ts
// Supabase boundary для работы с циклом
import { supabase } from '../lib/supabase';
import type { CycleEvent, CycleSettings, CycleEventType } from '../types/cycle';

export const cycleService = {
  /** Получить все события цикла пользователя */
  async getCycleEvents(userId: string): Promise<CycleEvent[]> {
    const { data, error } = await supabase
      .from('cycle_events')
      .select('*')
      .eq('user_id', userId)
      .order('event_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  /** Получить настройки цикла пользователя */
  async getCycleSettings(userId: string): Promise<CycleSettings> {
    const { data, error } = await supabase
      .from('cycle_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) throw error;
    return data || { user_id: userId, luteal_length_days: 14 };
  },

  /** Добавить или обновить событие цикла */
  async upsertCycleEvent(
    userId: string,
    eventType: CycleEventType,
    eventDate: string
  ): Promise<CycleEvent> {
    const { data, error } = await supabase
      .from('cycle_events')
      .upsert(
        {
          user_id: userId,
          event_type: eventType,
          event_date: eventDate,
        },
        {
          onConflict: 'user_id,event_type,event_date',
        }
      )
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /** Удалить событие цикла */
  async deleteCycleEvent(eventId: string): Promise<void> {
    const { error } = await supabase
      .from('cycle_events')
      .delete()
      .eq('id', eventId);
    
    if (error) throw error;
  },

  /** Обновить настройки цикла */
  async updateCycleSettings(
    userId: string,
    lutealLengthDays: number
  ): Promise<CycleSettings> {
    const { data, error } = await supabase
      .from('cycle_settings')
      .upsert(
        {
          user_id: userId,
          luteal_length_days: lutealLengthDays,
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
};