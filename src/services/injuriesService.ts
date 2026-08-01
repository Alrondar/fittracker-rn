import { supabase } from '../lib/supabase';

export interface Injury {
  id: string;
  body_part: string;
  injury_type: string;
  severity: 'low' | 'medium' | 'high';
  status: 'active' | 'recovering' | 'recovered';
  description: string | null;
  created_at: string;
  recovered_at: string | null;
  notes: string | null;
}

export interface InjuryInput {
  body_part: string;
  injury_type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  notes: string;
}

export async function getInjuries(userId: string): Promise<Injury[]> {
  const { data, error } = await supabase
    .from('user_injuries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Injury[];
}

export async function createInjury(userId: string, input: InjuryInput): Promise<void> {
  const { error } = await supabase.from('user_injuries').insert({
    user_id: userId,
    body_part: input.body_part,
    injury_type: input.injury_type,
    severity: input.severity,
    description: input.description,
    notes: input.notes,
    status: 'active',
  });

  if (error) throw error;
}

export async function updateInjury(id: string, input: InjuryInput): Promise<void> {
  const { error } = await supabase
    .from('user_injuries')
    .update({
      body_part: input.body_part,
      injury_type: input.injury_type,
      severity: input.severity,
      description: input.description,
      notes: input.notes,
    })
    .eq('id', id);

  if (error) throw error;
}

export async function markInjuryRecovered(id: string): Promise<void> {
  const { error } = await supabase
    .from('user_injuries')
    .update({ status: 'recovered', recovered_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteInjury(id: string): Promise<void> {
  const { error } = await supabase.from('user_injuries').delete().eq('id', id);
  if (error) throw error;
}