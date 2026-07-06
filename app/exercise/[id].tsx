import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
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

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);

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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backText, { color: colors.primary }]}>← Назад</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Загрузка...</Text>
        </View>
      </View>
    );
  }

  if (!exercise) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backText, { color: colors.primary }]}>← Назад</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: colors.error }]}>Упражнение не найдено</Text>
        </View>
      </View>
    );
  }

  const primaryMuscles = getList(exercise, 'primary_muscles');
  const secondaryMuscles = getList(exercise, 'secondary_muscles');
  const injuries = getList(exercise, 'injuries');
  const equipment = getList(exercise, 'equipment');

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Назад</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.content, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
          <Dumbbell size={48} color={colors.primary} strokeWidth={1.5} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{exercise.name}</Text>

        {primaryMuscles.length > 0 && (
          <View style={styles.muscleSection}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Основные мышцы</Text>
            <View style={styles.tags}>
              {primaryMuscles.map((muscle, idx) => (
                <View key={idx} style={[styles.tag, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.tagText, { color: colors.primary }]}>{muscle}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {secondaryMuscles.length > 0 && (
          <View style={styles.muscleSection}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Дополнительные мышцы</Text>
            <View style={styles.tags}>
              {secondaryMuscles.map((muscle, idx) => (
                <View key={idx} style={[styles.tag, { backgroundColor: colors.surfaceSecondary }]}>
                  <Text style={[styles.tagText, { color: colors.textSecondary }]}>{muscle}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {exercise.technique ? (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Settings size={20} color={colors.primary} strokeWidth={1.5} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Техника выполнения</Text>
          </View>
          <Text style={[styles.text, { color: colors.textPrimary }]}>{exercise.technique}</Text>
        </View>
      ) : null}

      {exercise.benefits ? (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <CheckCircle size={20} color="#4CAF50" strokeWidth={1.5} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Польза</Text>
          </View>
          <Text style={[styles.text, { color: colors.textPrimary }]}>{exercise.benefits}</Text>
        </View>
      ) : null}

      {exercise.risks ? (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <AlertTriangle size={20} color="#FF9800" strokeWidth={1.5} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Риски</Text>
          </View>
          <Text style={[styles.text, { color: colors.textPrimary }]}>{exercise.risks}</Text>
        </View>
      ) : null}

      {injuries.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <AlertCircle size={20} color="#F44336" strokeWidth={1.5} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Противопоказания</Text>
          </View>
          {injuries.map((injury, idx) => (
            <Text key={idx} style={[styles.listItem, { color: colors.textPrimary }]}>• {injury}</Text>
          ))}
        </View>
      )}

      {equipment.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Wrench size={20} color={colors.primary} strokeWidth={1.5} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Оборудование</Text>
          </View>
          <Text style={[styles.text, { color: colors.textPrimary }]}>{equipment.join(', ')}</Text>
        </View>
      )}

      {exercise.settings ? (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Settings size={20} color={colors.primary} strokeWidth={1.5} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Настройка</Text>
          </View>
          <Text style={[styles.text, { color: colors.textPrimary }]}>{exercise.settings}</Text>
        </View>
      ) : null}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  loadingText: { fontSize: 16 },
  errorText: { fontSize: 16 },
  header: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: SPACING.sm,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: SPACING.xl,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  muscleSection: { marginBottom: SPACING.lg },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  tag: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  tagText: { fontSize: 14, fontWeight: '500' },
  section: {
    padding: SPACING.xl,
    marginTop: SPACING.md,
    marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  text: { fontSize: 15, lineHeight: 22 },
  listItem: { fontSize: 15, marginBottom: SPACING.sm, lineHeight: 22 },
});