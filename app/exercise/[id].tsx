import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase, getList, getString } from '../../src/lib/supabase';
import { Exercise } from '../../src/types';
import { useTheme } from '../../src/hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import * as Haptics from 'expo-haptics';
import { Dumbbell, CheckCircle, AlertTriangle, AlertCircle, Wrench, Settings } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { commonStyles } from '../../src/styles/common';
import { createCardStyles } from '../../src/styles/components/card';
import { createBadgeStyles } from '../../src/styles/components/badge';
import { typography } from '../../src/styles/typography';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);

  const cardStyles = createCardStyles(colors);
  const badgeStyles = createBadgeStyles(colors);

  useEffect(() => {
    loadExercise();
  }, [id]);

  const loadExercise = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select()
        .eq('id', id)
        .single();

      if (error) throw error;
      setExercise(data);
    } catch (error: any) {
      Alert.alert('Ошибка', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <View style={[commonStyles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={commonStyles.backButton}>
            <Text style={[commonStyles.backText, { color: colors.primary }]}>← Назад</Text>
          </TouchableOpacity>
        </View>
        <View style={commonStyles.center}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>Загрузка...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!exercise) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <View style={[commonStyles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={commonStyles.backButton}>
            <Text style={[commonStyles.backText, { color: colors.primary }]}>← Назад</Text>
          </TouchableOpacity>
        </View>
        <View style={commonStyles.center}>
          <Text style={[typography.body, { color: colors.error }]}>Упражнение не найдено</Text>
        </View>
      </SafeAreaView>
    );
  }

  const primaryMuscles = getList(exercise, 'primary_muscles');
  const secondaryMuscles = getList(exercise, 'secondary_muscles');
  const injuries = getList(exercise, 'injuries');
  const equipment = getList(exercise, 'equipment');

  return (
    <ScrollView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <View style={[commonStyles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={commonStyles.backButton}>
          <Text style={[commonStyles.backText, { color: colors.primary }]}>← Назад</Text>
        </TouchableOpacity>
      </View>

      <View style={[cardStyles.container, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
        <View style={[{
          width: 96,
          height: 96,
          borderRadius: 48,
          justifyContent: 'center',
          alignItems: 'center',
          alignSelf: 'center',
          marginBottom: SPACING.lg,
          backgroundColor: colors.primaryLight,
        }]}>
          <Dumbbell size={48} color={colors.primary} strokeWidth={1.5} />
        </View>

        <Text style={[typography.h3, { color: colors.textPrimary, textAlign: 'center', marginBottom: SPACING.xl }]}>
          {exercise.name}
        </Text>

        {primaryMuscles.length > 0 && (
          <View style={{ marginBottom: SPACING.lg }}>
            <Text style={[typography.h5, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
              Основные мышцы
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
              {primaryMuscles.map((muscle, idx) => (
                <View key={idx} style={[badgeStyles.container, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[badgeStyles.text, { color: colors.primary }]}>{muscle}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {secondaryMuscles.length > 0 && (
          <View style={{ marginBottom: SPACING.lg }}>
            <Text style={[typography.h5, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
              Дополнительные мышцы
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
              {secondaryMuscles.map((muscle, idx) => (
                <View key={idx} style={[badgeStyles.container, { backgroundColor: colors.surfaceSecondary }]}>
                  <Text style={[badgeStyles.text, { color: colors.textSecondary }]}>{muscle}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {exercise.technique ? (
        <View style={[cardStyles.container, { marginHorizontal: SPACING.lg }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm }}>
            <Settings size={20} color={colors.primary} strokeWidth={1.5} />
            <Text style={[typography.h5, { color: colors.textPrimary }]}>Техника выполнения</Text>
          </View>
          <Text style={[typography.body, { color: colors.textPrimary, lineHeight: 22 }]}>
            {exercise.technique}
          </Text>
        </View>
      ) : null}

      {exercise.benefits ? (
        <View style={[cardStyles.container, { marginHorizontal: SPACING.lg }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm }}>
            <CheckCircle size={20} color="#4CAF50" strokeWidth={1.5} />
            <Text style={[typography.h5, { color: colors.textPrimary }]}>Польза</Text>
          </View>
          <Text style={[typography.body, { color: colors.textPrimary, lineHeight: 22 }]}>
            {exercise.benefits}
          </Text>
        </View>
      ) : null}

      {exercise.risks ? (
        <View style={[cardStyles.container, { marginHorizontal: SPACING.lg }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm }}>
            <AlertTriangle size={20} color="#FF9800" strokeWidth={1.5} />
            <Text style={[typography.h5, { color: colors.textPrimary }]}>Риски</Text>
          </View>
          <Text style={[typography.body, { color: colors.textPrimary, lineHeight: 22 }]}>
            {exercise.risks}
          </Text>
        </View>
      ) : null}

      {injuries.length > 0 && (
        <View style={[cardStyles.container, { marginHorizontal: SPACING.lg }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm }}>
            <AlertCircle size={20} color="#F44336" strokeWidth={1.5} />
            <Text style={[typography.h5, { color: colors.textPrimary }]}>Противопоказания</Text>
          </View>
          {injuries.map((injury, idx) => (
            <Text key={idx} style={[typography.body, { color: colors.textPrimary, marginBottom: SPACING.sm, lineHeight: 22 }]}>
              • {injury}
            </Text>
          ))}
        </View>
      )}

      {equipment.length > 0 && (
        <View style={[cardStyles.container, { marginHorizontal: SPACING.lg }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm }}>
            <Wrench size={20} color={colors.primary} strokeWidth={1.5} />
            <Text style={[typography.h5, { color: colors.textPrimary }]}>Оборудование</Text>
          </View>
          <Text style={[typography.body, { color: colors.textPrimary, lineHeight: 22 }]}>
            {equipment.join(', ')}
          </Text>
        </View>
      )}

      {exercise.settings ? (
        <View style={[cardStyles.container, { marginHorizontal: SPACING.lg }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm }}>
            <Settings size={20} color={colors.primary} strokeWidth={1.5} />
            <Text style={[typography.h5, { color: colors.textPrimary }]}>Настройка</Text>
          </View>
          <Text style={[typography.body, { color: colors.textPrimary, lineHeight: 22 }]}>
            {exercise.settings}
          </Text>
        </View>
      ) : null}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}