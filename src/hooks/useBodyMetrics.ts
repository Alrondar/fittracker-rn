import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { metricsService } from '../services/metricsService';
import { BodyMetric, MetricFormData } from '../types/metrics';
import { Alert } from 'react-native';

export function useBodyMetrics(userId: string | null) {
  const queryClient = useQueryClient();

  // Загрузка всех замеров
  const {
    data: metrics = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['body_metrics', userId],
    queryFn: () => metricsService.getUserMetrics(userId!),
    enabled: !!userId,
  });

  // Последний замер (для КБЖУ и отображения)
  const latestMetric = metrics.length > 0 ? metrics[0] : null;
  const previousMetric = metrics.length > 1 ? metrics[1] : null;

  // Изменение веса
  const weightChange = metricsService.calculateChange(
    latestMetric?.weight_kg ?? null,
    previousMetric?.weight_kg ?? null
  );

  // Мутация: добавить замер
  const createMutation = useMutation({
    mutationFn: (data: MetricFormData) => {
      const metric: Partial<BodyMetric> = {
        metric_date: data.metric_date,
        weight_kg: data.weight_kg ? parseFloat(data.weight_kg) : null,
        waist_cm: data.waist_cm ? parseFloat(data.waist_cm) : null,
        chest_cm: data.chest_cm ? parseFloat(data.chest_cm) : null,
        hips_cm: data.hips_cm ? parseFloat(data.hips_cm) : null,
        arm_cm: data.arm_cm ? parseFloat(data.arm_cm) : null,
        thigh_cm: data.thigh_cm ? parseFloat(data.thigh_cm) : null,
        neck_cm: data.neck_cm ? parseFloat(data.neck_cm) : null,
        notes: data.notes || null,
      };
      return metricsService.createMetric(userId!, metric);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['body_metrics', userId] });
    },
    onError: (error: any) => {
      Alert.alert('Ошибка', error.message || 'Не удалось сохранить замер');
    },
  });

  // Мутация: удалить замер
  const deleteMutation = useMutation({
    mutationFn: (metricId: string) => metricsService.deleteMetric(metricId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['body_metrics', userId] });
    },
    onError: (error: any) => {
      Alert.alert('Ошибка', error.message || 'Не удалось удалить замер');
    },
  });

  return {
    metrics,
    latestMetric,
    previousMetric,
    weightChange,
    isLoading,
    refetch,
    createMetric: createMutation.mutate,
    deleteMetric: deleteMutation.mutate,
    isCreating: createMutation.isPending,
  };
}