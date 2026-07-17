import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ExerciseData } from '../types/workout';
import { BODY_PART_RU, INJURY_TYPE_RU, BODY_PART_LABELS, INJURY_TYPE_LABELS } from '../constants/injuries';

interface InjuryWarning {
  level: 'avoid' | 'caution';
  message: string;
}

export function useInjuryWarnings(userId: string | null, exercises: ExerciseData[]) {
  const [activeInjuries, setActiveInjuries] = useState<any[]>([]);
  const [exerciseWarnings, setExerciseWarnings] = useState<Record<string, InjuryWarning>>({});
  const [warningsRules, setWarningsRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Загрузка травм и правил предупреждений
  useEffect(() => {
    loadInjuriesAndWarnings();
  }, [userId]);

  const loadInjuriesAndWarnings = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data: injuries, error: injError } = await supabase
        .from('user_injuries')
        .select('body_part, injury_type, severity')
        .eq('user_id', userId)
        .neq('status', 'recovered');

      if (injError) throw injError;
      setActiveInjuries(injuries || []);

      const { data: warnings, error: warnError } = await supabase
        .from('injury_exercise_warnings')
        .select('*');

      if (warnError) {
        console.warn('Таблица injury_exercise_warnings не найдена');
        setWarningsRules([]);
      } else {
        setWarningsRules(warnings || []);
      }
    } catch (e) {
      console.error('Ошибка загрузки травм:', e);
    } finally {
      setLoading(false);
    }
  };

  // Проверка предупреждений при изменении данных
  useEffect(() => {
    if (exercises.length > 0 && activeInjuries.length > 0 && warningsRules.length > 0) {
      checkExerciseWarnings();
    } else {
      setExerciseWarnings({});
    }
  }, [exercises, activeInjuries, warningsRules]);

  const checkExerciseWarnings = () => {
    const newWarnings: Record<string, InjuryWarning> = {};

    exercises.forEach(ex => {
      const exInjuries = ex.injuries || [];

      activeInjuries.forEach(injury => {
        const bodyPartLabel = BODY_PART_LABELS[injury.body_part] || injury.body_part;
        const injuryTypeLabel = INJURY_TYPE_LABELS[injury.injury_type] || injury.injury_type;
        const bodyPartKeywords = BODY_PART_RU[injury.body_part] || [];
        const injuryTypeKeywords = INJURY_TYPE_RU[injury.injury_type] || [];

        // УРОВЕНЬ 1: Прямое совпадение с противопоказаниями (КРАСНЫЙ)
        const directMatch = exInjuries.some((contraindication: string) => {
          const lower = contraindication.toLowerCase();
          return bodyPartKeywords.some(kw => lower.includes(kw)) ||
                 injuryTypeKeywords.some(kw => lower.includes(kw));
        });

        if (directMatch) {
          const severityPrefix = injury.severity === 'high' ? '⛔' : '🚫';
          newWarnings[ex.id] = {
            level: 'avoid',
            message: `${severityPrefix} Противопоказано при травме: ${bodyPartLabel} (${injuryTypeLabel})`,
          };
          return;
        }

        // УРОВЕНЬ 2: Косвенное совпадение через маппинг мышц (ЖЁЛТЫЙ)
        const relatedWarnings = warningsRules.filter(w => w.body_part === injury.body_part);
        relatedWarnings.forEach(w => {
          const targetsMuscle =
            ex.primary_muscles.includes(w.muscle_group) ||
            (ex.secondary_muscles && ex.secondary_muscles.includes(w.muscle_group));

          if (targetsMuscle && !newWarnings[ex.id]) {
            newWarnings[ex.id] = {
              level: 'caution',
              message: `⚠️ Осторожно: ${w.recommendation}`,
            };
          }
        });
      });
    });

    setExerciseWarnings(newWarnings);
  };

  return {
    activeInjuries,
    exerciseWarnings,
    warningsRules,
    loading,
    loadInjuriesAndWarnings,
  };
}