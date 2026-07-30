import { supabase } from '../lib/supabase';
import {
  UserInjury,
  matchesContraindication,
  targetsInjuredMuscle,
  BODY_PART_LABELS,
} from '../constants/injuries';

export interface WarmupExercise {
  id: string;
  name: string;
  technique: string;
  benefits: string;
  risks: string;
  injuries: string[];
  equipment: string[];
  media_url: string | null;
  primary_muscles: string[];
  secondary_muscles: string[];
  duration_seconds: number;
  relevance_score: number;
  category: string | null;
  can_be_activation: boolean;
}

/** Сводка исключённых из-за травм упражнений (для чипа в WarmupBlock) */
export interface InjuryExclusion {
  bodyPart: string;
  bodyPartLabel: string;
  count: number;
}

export interface WarmupGenerationResult {
  exercises: WarmupExercise[];
  excludedByInjury: InjuryExclusion[];
}

// ===== Константы подбора =====
const WARMUP_TOTAL = 7;    // всего упражнений в разминке
const MAX_ACTIVATION = 3;  // не более активаций (остальное — растяжка)

// Тренажёрное оборудование (приоритет в силовые дни)
const MACHINE_KEYWORDS = ['тренаж', 'кроссовер', 'блок', 'pec deck', 'рукоят', 'смит', 'манжет'];
// Оборудование силовой тренировки
const STRENGTH_EQUIPMENT_KEYWORDS = ['штанг', 'гантел', 'тренаж', 'кроссовер', 'блок', 'смит', 'гриф', 'гиря'];
// Штраф за нагрузку на травмированную зону (high → полное исключение)
const SEVERITY_PENALTY: Record<string, number> = { medium: 5, low: 2 };

const isMachineEquipment = (equipment: string[]): boolean =>
  equipment.some(eq => {
    const lower = eq.toLowerCase();
    return MACHINE_KEYWORDS.some(kw => lower.includes(kw));
  });

/** Силовая ли тренировка (по оборудованию основных упражнений) */
const isStrengthFocused = (mainExercises: Array<{ equipment?: string[] }>): boolean =>
  mainExercises.some(ex =>
    (ex.equipment || []).some(eq => {
      const lower = eq.toLowerCase();
      return STRENGTH_EQUIPMENT_KEYWORDS.some(kw => lower.includes(kw));
    }),
  );

export const warmupService = {
  /**
   * Генерация разминки для целевых мышц тренировки.
   * Источники: stretching + активация (can_be_activation).
   * Баланс: не более MAX_ACTIVATION активаций, остальное — растяжка.
   * Порядок: настраиваемый (activationFirst) — растяжка→активация или наоборот.
   * Противопоказанные при травмах исключаются; тренажёры в приоритете в силовые дни.
   */
  async generateWarmup(
    mainExercises: Array<{
      id: string;
      primary_muscles: string[];
      secondary_muscles: string[];
      equipment?: string[];
    }>,
    activeInjuries: UserInjury[] = [],
    activationFirst: boolean = false,
  ): Promise<WarmupGenerationResult> {
    try {
      // 1. Целевые мышцы с приоритетами
      const muscleScores: Record<string, number> = {};
      mainExercises.forEach(ex => {
        ex.primary_muscles?.forEach(m => {
          const key = m.toLowerCase();
          muscleScores[key] = (muscleScores[key] || 0) + 2;
        });
        ex.secondary_muscles?.forEach(m => {
          const key = m.toLowerCase();
          muscleScores[key] = (muscleScores[key] || 0) + 1;
        });
      });
      if (Object.keys(muscleScores).length === 0) {
        return { exercises: [], excludedByInjury: [] };
      }

      const strengthFocused = isStrengthFocused(mainExercises);

      // 2. Кандидаты: растяжка + вся активация
      const { data: candidates, error } = await supabase
        .from('exercises')
        .select('id, name, technique, benefits, risks, injuries, equipment, media_url, primary_muscles, secondary_muscles, settings, category, can_be_activation')
        .or('category.eq.stretching,can_be_activation.is.true')
        .limit(80);
      if (error || !candidates) return { exercises: [], excludedByInjury: [] };

      // 3. Ранжирование + фильтрация по травмам
      const exclusionCounts: Record<string, number> = {};
      const scored: WarmupExercise[] = [];

      for (const ex of candidates) {
        const exMuscles = [
          ...(ex.primary_muscles || []),
          ...(ex.secondary_muscles || []),
        ].map(m => m.toLowerCase());
        let score = exMuscles.reduce((sum, m) => sum + (muscleScores[m] || 0), 0);
        if (score <= 0) continue;

        // Бонус за активацию (зависит от типа оборудования)
        if (ex.can_be_activation) {
          if (isMachineEquipment(ex.equipment || [])) {
            if (strengthFocused) score += 3; // тренажёры — приоритет в силовые дни
          } else {
            score += 2; // резинки / собственный вес — всегда уместны
          }
        }

        // Фильтрация по травмам
        let excluded = false;
        let penalty = 0;
        for (const injury of activeInjuries) {
          // Уровень 1: прямое противопоказание → исключаем
          if (matchesContraindication(ex.injuries || [], injury.body_part, injury.injury_type)) {
            excluded = true;
            exclusionCounts[injury.body_part] = (exclusionCounts[injury.body_part] || 0) + 1;
            break;
          }
          // Уровень 2: нагрузка на травмированную зону
          if (targetsInjuredMuscle(ex.primary_muscles || [], ex.secondary_muscles || [], injury.body_part)) {
            if (injury.severity === 'high') {
              excluded = true;
              exclusionCounts[injury.body_part] = (exclusionCounts[injury.body_part] || 0) + 1;
              break;
            }
            penalty += SEVERITY_PENALTY[injury.severity] ?? SEVERITY_PENALTY.low;
          }
        }
        if (excluded) continue;
        score -= penalty;

        // Длительность из settings или дефолт 30 сек
        let duration = 30;
        if (ex.settings) {
          const match = ex.settings.match(/(\d+)\s*(сек|с|seconds|s)/i);
          if (match) duration = parseInt(match[1]);
        }

        scored.push({
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
          category: ex.category ?? null,
          can_be_activation: ex.can_be_activation ?? false,
        });
      }

      // 4. Сбалансированный отбор: не более MAX_ACTIVATION активаций
      const byScore = (a: WarmupExercise, b: WarmupExercise) => b.relevance_score - a.relevance_score;
      const activationPool = scored.filter(ex => ex.can_be_activation).sort(byScore);
      const stretchingPool = scored.filter(ex => !ex.can_be_activation).sort(byScore);

      const activationSelected = activationPool.slice(0, MAX_ACTIVATION);
      const stretchingSelected = stretchingPool.slice(0, WARMUP_TOTAL - activationSelected.length);

      let selected = [...stretchingSelected, ...activationSelected];

      // Если растяжки не хватило — добираем лучшей активацией сверх лимита
      if (selected.length < WARMUP_TOTAL) {
        const usedIds = new Set(selected.map(e => e.id));
        const remaining = scored.filter(e => !usedIds.has(e.id)).sort(byScore);
        selected = selected.concat(remaining.slice(0, WARMUP_TOTAL - selected.length));
      }

      // 5. Итоговый порядок: настраиваемый (растяжка→активация ИЛИ активация→растяжка)
      const exercises = selected
        .sort((a, b) => {
          const aAct = a.can_be_activation ? 1 : 0;
          const bAct = b.can_be_activation ? 1 : 0;
          if (aAct !== bAct) {
            // activationFirst: активация (1) раньше; иначе растяжка (0) раньше
            return activationFirst ? bAct - aAct : aAct - bAct;
          }
          return b.relevance_score - a.relevance_score; // внутри группы — по счёту
        })
        .slice(0, WARMUP_TOTAL);

      const excludedByInjury: InjuryExclusion[] = Object.entries(exclusionCounts)
        .map(([bodyPart, count]) => ({
          bodyPart,
          bodyPartLabel: BODY_PART_LABELS[bodyPart] || bodyPart,
          count,
        }))
        .sort((a, b) => b.count - a.count);

      return { exercises, excludedByInjury };
    } catch (e) {
      console.error('Ошибка генерации разминки:', e);
      return { exercises: [], excludedByInjury: [] };
    }
  },
 /**
   * Альтернативы для упражнения РАЗМИНКИ: только stretching / активация,
   * пересекающиеся по целевым мышцам. Не тянет силовые упражнения в замены.
   * Возвращает объекты в той же форме WarmupExercise (с duration_seconds),
   * чтобы карточка разминки рендерила замену без адаптеров.
   */
  async getWarmupAlternatives(
    exerciseId: string,
    primaryMuscles: string[],
  ): Promise<WarmupExercise[]> {
    try {
      let query = supabase
        .from('exercises')
        .select(
          'id, name, technique, benefits, risks, injuries, equipment, media_url, primary_muscles, secondary_muscles, settings, category, can_be_activation',
        )
        .neq('id', exerciseId)
        .or('category.eq.stretching,can_be_activation.is.true')
        .limit(20);

      if (primaryMuscles.length > 0) {
        query = query.overlaps('primary_muscles', primaryMuscles);
      }

      const { data, error } = await query;
      if (error || !data) return [];

      return data.map((ex: any) => {
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
          relevance_score: 0,
          category: ex.category ?? null,
          can_be_activation: ex.can_be_activation ?? false,
        } as WarmupExercise;
      });
    } catch (e) {
      console.error('Ошибка загрузки альтернатив разминки:', e);
      return [];
    }
  },
};