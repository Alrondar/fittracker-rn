import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase, getList, getString } from '../../src/lib/supabase';
import { useTheme } from '../../src/hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { commonStyles } from '../../src/styles/common';
import { typography } from '../../src/styles/typography';
import { AppCard } from '../../src/components/ui/AppCard';
import { AppBadge } from '../../src/components/ui/AppBadge';
import { AppButton } from '../../src/components/ui/AppButton';
import {
  ChevronLeft,
  Dumbbell,
  Target,
  Shield,
  AlertTriangle,
  CheckCircle,
  Zap,
  Info,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface ExerciseDetail {
  id: string;
  name: string;
  description: string;
  technique: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment: string[];
  benefits: string;
  risks: string;
  injuries: string[];
  alternatives: string[];
}

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  const [exercise, setExercise] = useState<ExerciseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [alternatives, setAlternatives] = useState<any[]>([]);

  useEffect(() => {
    loadExercise();
  }, [id]);

  const loadExercise = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setExercise({
        id: data.id,
        name: data.name,
        description: getString(data, 'description'),
        technique: getString(data, 'technique'),
        primary_muscles: getList(data, 'primary_muscles'),
        secondary_muscles: getList(data, 'secondary_muscles'),
        equipment: getList(data, 'equipment'),
        benefits: getString(data, 'benefits'),
        risks: getString(data, 'risks'),
        injuries: getList(data, 'injuries'),
        alternatives: getList(data, 'alternatives'),
      });

      // Загрузка альтернативных упражнений
      if (data.alternatives && data.alternatives.length > 0) {
        const { data: altData } = await supabase
          .from('exercises')
          .select('id, name, primary_muscles')
          .in('id', data.alternatives);
        setAlternatives(altData || []);
      }
    } catch (e) {
      console.error('Ошибка загрузки упражнения:', e);
    } finally {
      setLoading(false);
    }
  };

  const getMuscleColor = (muscle: string) => {
    const colors: Record<string, string> = {
      'грудь': '#F44336',
      'спина': '#2196F3',
      'ноги': '#4CAF50',
      'плечи': '#FF9800',
      'руки': '#9C27B0',
      'пресс': '#FFC107',
    };
    return colors[muscle.toLowerCase()] || colors.primary;
  };

  if (loading) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <View style={commonStyles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: SPACING.md }]}>
            Загрузка...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!exercise) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <View style={commonStyles.center}>
          <Dumbbell size={64} color={colors.textTertiary} strokeWidth={1.5} />
          <Text style={[typography.h4, { color: colors.textPrimary, marginTop: SPACING.md }]}>
            Упражнение не найдено
          </Text>
          <AppButton
            title="Назад"
            variant="secondary"
            size="medium"
            onPress={() => router.back()}
            style={{ marginTop: SPACING.lg }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      {/* Шапка */}
      <View style={[commonStyles.navHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={commonStyles.backButton}>
          <ChevronLeft size={24} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[typography.h4, { color: colors.textPrimary, flex: 1, textAlign: 'center' }]}>
          Упражнение
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}>
        {/* Название */}
        <Text style={[typography.h2, { color: colors.textPrimary, marginBottom: SPACING.md }]}>
          {exercise.name}
        </Text>

        {/* Целевые мышцы */}
        {exercise.primary_muscles.length > 0 && (
          <AppCard variant="compact">
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm }}>
              <Target size={20} color={colors.primary} />
              <Text style={[typography.labelBold, { color: colors.textPrimary, marginLeft: SPACING.sm }]}>
                Целевые мышцы
              </Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
              {exercise.primary_muscles.map((muscle, idx) => (
                <AppBadge
                  key={idx}
                  variant="primary"
                  size="medium"
                  style={{ backgroundColor: getMuscleColor(muscle) + '20' }}
                  textStyle={{ color: getMuscleColor(muscle) }}
                >
                  {muscle}
                </AppBadge>
              ))}
            </View>
          </AppCard>
        )}

        {/* Вспомогательные мышцы */}
        {exercise.secondary_muscles.length > 0 && (
          <AppCard variant="compact">
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm }}>
              <Zap size={20} color={colors.warning} />
              <Text style={[typography.labelBold, { color: colors.textPrimary, marginLeft: SPACING.sm }]}>
                Вспомогательные мышцы
              </Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
              {exercise.secondary_muscles.map((muscle, idx) => (
                <AppBadge
                  key={idx}
                  variant="default"
                  size="medium"
                >
                  {muscle}
                </AppBadge>
              ))}
            </View>
          </AppCard>
        )}

        {/* Оборудование */}
        {exercise.equipment.length > 0 && (
          <AppCard variant="compact">
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm }}>
              <Dumbbell size={20} color={colors.success} />
              <Text style={[typography.labelBold, { color: colors.textPrimary, marginLeft: SPACING.sm }]}>
                Оборудование
              </Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
              {exercise.equipment.map((eq, idx) => (
                <AppBadge
                  key={idx}
                  variant="default"
                  size="medium"
                >
                  {eq}
                </AppBadge>
              ))}
            </View>
          </AppCard>
        )}

        {/* Описание */}
        {exercise.description && (
          <AppCard variant="compact">
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm }}>
              <Info size={20} color={colors.primary} />
              <Text style={[typography.labelBold, { color: colors.textPrimary, marginLeft: SPACING.sm }]}>
                Описание
              </Text>
            </View>
            <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]}>
              {exercise.description}
            </Text>
          </AppCard>
        )}

        {/* Техника выполнения */}
        {exercise.technique && (
          <AppCard variant="compact">
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm }}>
              <CheckCircle size={20} color={colors.success} />
              <Text style={[typography.labelBold, { color: colors.textPrimary, marginLeft: SPACING.sm }]}>
                Техника выполнения
              </Text>
            </View>
            <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]}>
              {exercise.technique}
            </Text>
          </AppCard>
        )}

        {/* Польза */}
        {exercise.benefits && (
          <AppCard variant="compact" style={{ borderColor: colors.success, borderWidth: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm }}>
              <CheckCircle size={20} color={colors.success} />
              <Text style={[typography.labelBold, { color: colors.success, marginLeft: SPACING.sm }]}>
                Польза
              </Text>
            </View>
            <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]}>
              {exercise.benefits}
            </Text>
          </AppCard>
        )}

        {/* Риски */}
        {exercise.risks && (
          <AppCard variant="compact" style={{ borderColor: colors.warning, borderWidth: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm }}>
              <AlertTriangle size={20} color={colors.warning} />
              <Text style={[typography.labelBold, { color: colors.warning, marginLeft: SPACING.sm }]}>
                Риски и противопоказания
              </Text>
            </View>
            <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]}>
              {exercise.risks}
            </Text>
          </AppCard>
        )}

        {/* Противопоказания при травмах */}
        {exercise.injuries.length > 0 && (
          <AppCard variant="compact" style={{ borderColor: colors.error, borderWidth: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm }}>
              <Shield size={20} color={colors.error} />
              <Text style={[typography.labelBold, { color: colors.error, marginLeft: SPACING.sm }]}>
                Противопоказано при травмах
              </Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
              {exercise.injuries.map((injury, idx) => (
                <AppBadge
                  key={idx}
                  variant="error"
                  size="medium"
                >
                  {injury}
                </AppBadge>
              ))}
            </View>
          </AppCard>
        )}

        {/* Альтернативные упражнения */}
        {alternatives.length > 0 && (
          <View style={{ marginTop: SPACING.lg }}>
            <Text style={[typography.h4, { color: colors.textPrimary, marginBottom: SPACING.md }]}>
              Альтернативные упражнения
            </Text>
            <FlatList
              data={alternatives}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push(`/exercise/${item.id}`);
                  }}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: BORDER_RADIUS.md,
                    padding: SPACING.md,
                    marginBottom: SPACING.sm,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={[typography.labelBold, { color: colors.textPrimary }]}>
                    {item.name}
                  </Text>
                  {item.primary_muscles && item.primary_muscles.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                      {item.primary_muscles.slice(0, 2).map((muscle: string, idx: number) => (
                        <AppBadge
                          key={idx}
                          variant="default"
                          size="small"
                          style={{ backgroundColor: getMuscleColor(muscle) + '15' }}
                          textStyle={{ color: getMuscleColor(muscle) }}
                        >
                          {muscle}
                        </AppBadge>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              )}
              scrollEnabled={false}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}