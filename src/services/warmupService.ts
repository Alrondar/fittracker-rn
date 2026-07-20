import { supabase } from '../lib/supabase';

export interface WarmupExercise {
  id: string;
  name: string;
  technique: string;
  benefits: string;
  risks: string;
  injuries: string[];          // ✅ НОВОЕ: противопоказания из БД
  equipment: string[];
  media_url: string | null; 
  primary_muscles: string[];
  secondary_muscles: string[];
  duration_seconds: number;
  relevance_score: number;
}

export const warmupService = {
  /**
   * Генерация разминки ТОЛЬКО для целевых мышц тренировки
   */
  async generateWarmup(mainExercises: Array<{
    id: string;
    primary_muscles: string[];
    secondary_muscles: string[];
  }>): Promise<WarmupExercise[]> {
    try {
      // 1. Собираем целевые мышцы с приоритетами
      const muscleScores: Record<string, number> = {};
      
      mainExercises.forEach(ex => {
        ex.primary_muscles?.forEach(m => {
          const key = m.toLowerCase();
          muscleScores[key] = (muscleScores[key] || 0) + 2; // primary = +2
        });
        ex.secondary_muscles?.forEach(m => {
          const key = m.toLowerCase();
          muscleScores[key] = (muscleScores[key] || 0) + 1; // secondary = +1
        });
      });

      const targetMuscles = Object.keys(muscleScores);
      if (targetMuscles.length === 0) return [];

      // 2. Ищем stretching-упражнения с совпадением мышц
      const { data: stretchingExercises, error } = await supabase
        .from('exercises')
        .select('id, name, technique, benefits, risks, injuries, equipment, media_url, primary_muscles, secondary_muscles, settings, category')
        .eq('category', 'stretching')
        .limit(50);

      if (error || !stretchingExercises) return [];

      // 3. Ранжируем по релевантности
      const scored = stretchingExercises.map(ex => {
        const exMuscles = [
          ...(ex.primary_muscles || []),
          ...(ex.secondary_muscles || []),
        ].map(m => m.toLowerCase());

        const score = exMuscles.reduce((sum, m) => sum + (muscleScores[m] || 0), 0);
        
        // Парсим длительность из settings или дефолт 30 сек
        let duration = 30;
        if (ex.settings) {
          const match = ex.settings.match(/(\d+)\s*(сек|с|seconds|s)/i);
          if (match) duration = parseInt(match[1]);
        }

        return {
          id: ex.id,
          name: ex.name,
          technique: ex.technique || '',
          benefits: ex.benefits || '',
          risks: ex.risks || '',
            injuries: ex.injuries || [], 
          equipment: ex.equipment || [],
          media_url: ex.media_url || null,
          primary_muscles: ex.primary_muscles || [],
          secondary_muscles: ex.secondary_muscles || [],
          duration_seconds: duration,
          relevance_score: score,
        };
      });

      // 4. Фильтруем (score > 0) и сортируем по релевантности
      const relevant = scored
        .filter(ex => ex.relevance_score > 0)
        .sort((a, b) => b.relevance_score - a.relevance_score);

      // 5. Выбираем топ-7
      return relevant.slice(0, 7);
    } catch (e) {
      console.error('Ошибка генерации разминки:', e);
      return [];
    }
  },
};