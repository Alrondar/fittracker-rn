import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../src/hooks/useTheme';
import { useStore } from '../../src/store/useStore';
import { startProgramWorkout, repeatWorkout } from '../../src/services/workoutService';
import { commonStyles } from '../../src/styles/common';
import { typography } from '../../src/styles/typography';
import { SPACING } from '../../src/constants/theme';
import { AppButton } from '../../src/components/ui/AppButton';

export default function CreateWorkoutScreen() {
  const params = useLocalSearchParams<{
    programId?: string;
    repeatId?: string;
  }>();

  const router = useRouter();
  const { userId } = useStore();
  const { colors } = useTheme();

  const [creating, setCreating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!userId) {
        setError('Пользователь не авторизован');
        setCreating(false);
        return;
      }

      try {
        let workoutId: string | null = null;

        if (params.repeatId) {
          workoutId = await repeatWorkout(userId, String(params.repeatId));
        } else if (params.programId) {
          workoutId = await startProgramWorkout(userId, String(params.programId));
        } else {
          setError('Не указан параметр тренировки');
        }

        if (!cancelled && workoutId) {
          router.replace(`/workout/${workoutId}`);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Не удалось создать тренировку');
        }
      } finally {
        if (!cancelled) {
          setCreating(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [userId, params.programId, params.repeatId, router]);

  if (creating) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <View style={commonStyles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: SPACING.md }]}>
            Создаём тренировку...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <View style={commonStyles.center}>
        <Text style={[typography.h4, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
          Не удалось создать тренировку
        </Text>

        <Text
          style={[
            typography.body,
            {
              color: colors.textSecondary,
              textAlign: 'center',
              marginBottom: SPACING.xl,
            },
          ]}
        >
          {error || 'Попробуй ещё раз'}
        </Text>

        <AppButton
          title="Назад"
          variant="secondary"
          onPress={() => router.back()}
          style={{ marginBottom: SPACING.sm, width: '100%' }}
        />

        <AppButton
          title="К программам"
          variant="primary"
          onPress={() => router.replace('/(tabs)/programs')}
          style={{ width: '100%' }}
        />
      </View>
    </SafeAreaView>
  );
}