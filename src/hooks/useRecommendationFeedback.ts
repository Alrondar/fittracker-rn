// src/hooks/useRecommendationFeedback.ts
// COACH-3: fire-and-forget запись решений по рекомендациям.
// Ошибки глотаются тихо (без toast) — фидбэк никогда не блокирует тренировку.
import { useMutation } from '@tanstack/react-query';
import {
  recommendationFeedbackService,
  RecommendationFeedbackInput,
} from '../services/recommendationFeedbackService';
import { useStore } from '../store/useStore';

/**
 * COACH-3: хук для записи acceptance/rejection feedback.
 * Возвращает submitFeedback — fire-and-forget мутацию.
 * Ошибки логируются в console, но не показываются пользователю.
 * userId автоматически берётся из глобального store (авторизованный пользователь).
 */
export function useRecommendationFeedback() {
  const { userId } = useStore();

  const { mutate } = useMutation({
    mutationFn: (input: Omit<RecommendationFeedbackInput, 'userId'>) => {
      if (!userId) {
        throw new Error('User not authenticated');
      }
      return recommendationFeedbackService.submitFeedback({ ...input, userId });
    },
    onError: (error) => {
      // Тихий лог — фидбэк не критичен для workout flow
      if (__DEV__) {
        console.warn('[useRecommendationFeedback] submit failed:', error);
      }
    },
  });

  return { submitFeedback: mutate };
}
