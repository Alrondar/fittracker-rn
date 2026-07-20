import { supabase } from '../lib/supabase';

export interface WarmupExercise {
  id: string;
  name: string;
  primary_muscles: string[];
  duration_seconds: number;
  is_universal?: boolean;
}

export const warmupService = {
  /**
   * Автогенерация разминки на основе основных упражнений дня
   */
  async generateWarmup(mainExerciseIds: string[]): Promise<WarmupExercise[]> {
    try {
      // 1. Получаем основные мышцы из упражнений дня
      const { data: mainExercises, error } = await supabase
        .from('exercises')
        .select('primary_muscles, secondary_muscles')
        .in('id', mainExerciseIds);

      if (error || !mainExercises) return this.getUniversalWarmup();

      // 2. Собираем все целевые мышцы
      const targetMuscles = new Set<string>();
      mainExercises.forEach(ex => {
        ex.primary_muscles?.forEach((m: string) => targetMuscles.add(m.toLowerCase()));
        ex.secondary_muscles?.forEach((m: string) => targetMuscles.add(m.toLowerCase()));
      });

      // 3. Ищем упражнения для разминки (категория stretching)
      const { data: stretchingExercises } = await supabase
        .from('exercises')
        .select('id, name, primary_muscles, secondary_muscles')
        .eq('category', 'stretching')
        .limit(30);

      if (!stretchingExercises || stretchingExercises.length === 0) {
        return this.getUniversalWarmup();
      }

      // 4. Фильтруем по совпадению мышц
      const matched = stretchingExercises.filter(ex => {
        const exMuscles = [
          ...(ex.primary_muscles || []),
          ...(ex.secondary_muscles || []),
        ].map(m => m.toLowerCase());
        return exMuscles.some(m => targetMuscles.has(m));
      });

      // 5. Выбираем 4-5 специфических упражнений
      const specific = matched.slice(0, 5).map(ex => ({
        id: ex.id,
        name: ex.name,
        primary_muscles: ex.primary_muscles || [],
        duration_seconds: 45,
        is_universal: false,
      }));

      // 6. Добавляем универсальные суставные упражнения (всегда в начале)
      const universal = this.getUniversalWarmup();

      return [...universal, ...specific];
    } catch (e) {
      console.error('Ошибка генерации разминки:', e);
      return this.getUniversalWarmup();
    }
  },

  /**
   * Универсальная разминка (суставная гимнастика)
   */
  getUniversalWarmup(): WarmupExercise[] {
    return [
      {
        id: 'universal-1',
        name: 'Круговые движения руками',
        primary_muscles: ['плечи'],
        duration_seconds: 30,
        is_universal: true,
      },
      {
        id: 'universal-2',
        name: 'Круговые движения тазом',
        primary_muscles: ['кор'],
        duration_seconds: 30,
        is_universal: true,
      },
      {
        id: 'universal-3',
        name: 'Круговые движения коленями',
        primary_muscles: ['ноги'],
        duration_seconds: 30,
        is_universal: true,
      },
      {
        id: 'universal-4',
        name: 'Круговые движения голеностопом',
        primary_muscles: ['ноги'],
        duration_seconds: 30,
        is_universal: true,
      },
    ];
  },
};