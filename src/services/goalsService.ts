import { supabase } from '../lib/supabase';

export type GoalType = 'lose' | 'maintain' | 'gain';
export type GenderType = 'male' | 'female';
export type PharmaType = 'steroids' | 'gh' | 'combo' | null;

export interface GoalsProfileForm {
  gender: GenderType | null;
  birthDate: string;
  height: string;
  weight: string;
  goal: GoalType | null;
  activityLevel: number | null;
  pharmacologyType: PharmaType;
  /** P1.1: Процент жира (опционально, для формулы Кэтча-МакАрдла). */
  bodyFatPercentage: number | null;
  calories: number;
  proteins: number;
  fats: number;
  carbs: number;
}

export interface GoalsSavePayload {
  gender: GenderType | null;
  birth_date: string | null;
  height_cm: number | null;
  current_weight_kg: number | null;
  goal: GoalType | null;
  activity_level: number | null;
  pharmacology_type: PharmaType;
  /** P1.1: Процент жира (опционально). */
  body_fat_percentage: number | null;
  target_calories: number;
  target_proteins: number;
  target_fats: number;
  target_carbs: number;
  updated_at: string;
}

export async function getGoalsProfile(userId: string): Promise<GoalsProfileForm | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const gender: GenderType | null =
    data.gender === 'male' || data.gender === 'female'
      ? data.gender
      : null;

  const goal: GoalType | null =
    data.goal === 'lose' || data.goal === 'maintain' || data.goal === 'gain'
      ? data.goal
      : null;

  const pharmacologyType: PharmaType =
    data.pharmacology_type === 'steroids' ||
    data.pharmacology_type === 'gh' ||
    data.pharmacology_type === 'combo'
      ? data.pharmacology_type
      : null;

  return {
    gender,
    birthDate: data.birth_date || '',
    height: data.height_cm?.toString() || '',
    weight: data.current_weight_kg?.toString() || '',
    goal,
    activityLevel: typeof data.activity_level === 'number' ? data.activity_level : null,
    pharmacologyType,
    bodyFatPercentage:
      typeof data.body_fat_percentage === 'number' ? data.body_fat_percentage : null,
    calories: data.target_calories || 0,
    proteins: data.target_proteins || 0,
    fats: data.target_fats || 0,
    carbs: data.target_carbs || 0,
  };
}

export async function saveGoalsProfile(userId: string, payload: GoalsSavePayload): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        ...payload,
      },
      {
        onConflict: 'id',
      }
    );

  if (error) throw error;
}