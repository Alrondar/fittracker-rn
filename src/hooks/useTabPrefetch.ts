// src/hooks/useTabPrefetch.ts
// PERF-11 (28.09): prefetch данных соседних табов после оседания первого.
// Первый заход в таб перестаёт быть «skeleton + сеть»: запрос уже в кэше
// React Query, экран получает cache hit и монтирует контент сразу.
//
// Инвариант: queryKey здесь обязан совпадать с начальным состоянием экрана-
// потребителя (указаны в комментариях). При рассинхоне prefetch молча
// превращается в wasted-запрос — сверять при изменении дефолтов фильтров.
// Профиль не пре-фетчится: useProfile вне React Query (кандидат PERF-10).
import { useEffect } from 'react';
import { InteractionManager } from 'react-native';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { getWorkoutsData } from '../services/workoutsService';
import { getHistory } from '../services/historyService';
import { getProgressData } from '../services/progressService';
import { getMuscleStats } from '../services/muscleStatsService';
import { getMyPrograms, type Program } from '../services/programsService';
import { Q } from '../lib/queryPolicy';
import {
  getExercises,
  getFilterOptions,
  type ExerciseListItem,
} from '../services/exercisesService';

// Стаггер групп: не выстраивать 6 запросов в один кадр после дашборда.
const GROUPS: { delay: number; run: (qc: QueryClient, userId: string) => void }[] = [
  {
    // Тренировки + история (общие для «Прогресса»).
    delay: 600,
    run: (qc, userId) => {
      void qc.prefetchQuery({
        queryKey: ['workouts', userId],
        queryFn: () => getWorkoutsData(userId),
      }); // useWorkouts.ts:8
      void qc.prefetchQuery({ queryKey: ['history', userId], queryFn: () => getHistory(userId) }); // useHistory.ts:6
    },
  },
  {
    // Прогресс hub.
    delay: 1600,
    run: (qc, userId) => {
      void qc.prefetchQuery({
        queryKey: ['progress', userId],
        queryFn: () => getProgressData(userId),
        ...Q.SLOW,
      }); // useProgress.ts:8
      void qc.prefetchQuery({
        queryKey: ['muscleStats', userId],
        queryFn: () => getMuscleStats(userId),
        ...Q.SLOW,
      }); // useMuscleStats.ts:25
    },
  },
  {
    // Программы: вкладка «Мои» с дефолтными фильтрами (usePrograms.ts:105 —
    // activeTab 'my', selectedLevels [], search '', sortBy 'date').
    delay: 2600,
    run: (qc, userId) => {
      void qc.prefetchInfiniteQuery({
        queryKey: ['programs', 'my', userId, [], '', 'date'],
        queryFn: ({ pageParam }) =>
          getMyPrograms(userId, {
            sortBy: 'date',
            limit: 10,
            offset: ((pageParam as number) - 1) * 10,
          }),
        initialPageParam: 1,
        getNextPageParam: (lastPage: Program[], allPages: Program[][]) =>
          lastPage.length < 10 ? undefined : allPages.length + 1,
        ...Q.FAST,
      });
    },
  },
  {
    // Справочник: первая страница без фильтров (useExercises.ts:81 —
    // muscles [] / categories [] / equipment [] / activationOnly false /
    // search '' / sortBy 'name-asc') + словари фильтров.
    delay: 3600,
    run: (qc) => {
      void qc.prefetchQuery({
        queryKey: ['exerciseFilterOptions'],
        queryFn: getFilterOptions,
        ...Q.STATIC,
      });
      void qc.prefetchInfiniteQuery({
        queryKey: ['exercises', [], [], [], false, '', 'name-asc'],
        queryFn: ({ pageParam }) =>
          getExercises({ sortBy: 'name-asc', limit: 40, offset: pageParam as number }),
        initialPageParam: 0,
        getNextPageParam: (lastPage: ExerciseListItem[], allPages: ExerciseListItem[][]) =>
          lastPage.length < 40 ? undefined : allPages.length * 40,
        ...Q.SLOW,
      });
    },
  },
];

export function useTabPrefetch(userId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return undefined;

    const timers: ReturnType<typeof setTimeout>[] = [];
    // Стартуем после анимаций холодного старта — на сетку дашборда не накладываемся.
    const task = InteractionManager.runAfterInteractions(() => {
      for (const group of GROUPS) {
        timers.push(setTimeout(() => group.run(queryClient, userId), group.delay));
      }
    });

    return () => {
      task.cancel();
      timers.forEach(clearTimeout);
    };
  }, [userId, queryClient]);
}
