// app/(tabs)/profile/metrics.tsx
// Замеры тела: текущий вес + изменение, тренд веса (FEAT-2.2), графики замеров
// с чипами-тумблерами (выбор в AsyncStorage), история, форма по группам
// (Тело / Руки / Ноги).
import React, { useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { commonStyles } from '../../src/styles/common';
import { typography } from '../../src/styles/typography';
import { useStore } from '../../src/store/useStore';
import { useBodyMetrics } from '../../src/hooks/useBodyMetrics';
import { AppButton } from '../../src/components/ui/AppButton';
import { AppCard } from '../../src/components/ui/AppCard';
import { AppInput } from '../../src/components/ui/AppInput';
import { SectionHeader } from '../../src/components/SectionHeader';
import {
  METRIC_FIELDS,
  METRIC_GROUPS,
  MetricFormData,
  MetricGroup,
  MetricKey,
} from '../../src/types/metrics';
import { MetricSparkline } from '../../src/components/profile/MetricSparkline';
import { TrendPoint } from '../../src/utils/trend';
import { WeightTrendChart } from '../../src/components/profile/WeightTrendChart';
import {
  ChevronLeft,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Weight,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function MetricsScreen() {
  const router = useRouter();
  const { userId } = useStore();
  const { colors } = useTheme();
  const {
    metrics,
    latestMetric,
    weightChange,
    isLoading,
    createMetric,
    deleteMetric,
    isCreating,
  } = useBodyMetrics(userId);

  // FEAT-2.2: точки для графика тренда (только непустой вес)
  const weightPoints = useMemo(
    () =>
      metrics
        .filter((m) => m.weight_kg != null)
        .map((m) => ({ date: m.metric_date, weightKg: m.weight_kg as number })),
    [metrics],
  );

  // FEAT-2.2: выбор графиков замеров хранится в AsyncStorage
  const CHARTS_KEY = 'metrics_charts_selected_v1';
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>([]);
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CHARTS_KEY)
      .then((raw) => {
        if (raw) {
          try {
            setSelectedMetrics(JSON.parse(raw) as MetricKey[]);
          } catch {
            setSelectedMetrics(['waist_cm']);
          }
        } else {
          setSelectedMetrics(['waist_cm']);
        }
      })
      .finally(() => setChartsReady(true));
  }, []);

  const toggleMetric = (key: MetricKey) => {
    setSelectedMetrics((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      AsyncStorage.setItem(CHARTS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const sparkFields = METRIC_FIELDS.filter((f) => f.key !== 'weight_kg');
  const pointsFor = (key: MetricKey): TrendPoint[] =>
    metrics
      .filter((m) => m[key] != null)
      .map((m) => ({ date: m.metric_date, value: m[key] as number }));

  const CHART_COLORS = [colors.primary, colors.success, colors.warning, colors.error];

  const [showAddModal, setShowAddModal] = useState(false);
  const emptyForm = (): MetricFormData => ({
    metric_date: new Date().toISOString().split('T')[0],
    weight_kg: '',
    shoulder_cm: '',
    chest_cm: '',
    waist_cm: '',
    abdomen_cm: '',
    hips_cm: '',
    neck_cm: '',
    biceps_left_cm: '',
    biceps_right_cm: '',
    forearm_left_cm: '',
    forearm_right_cm: '',
    thigh_cm: '',
    calf_left_cm: '',
    calf_right_cm: '',
    arm_cm: '',
    notes: '',
  });
  const [formData, setFormData] = useState<MetricFormData>(emptyForm);

  const handleSave = () => {
    if (!formData.weight_kg) {
      Alert.alert('Ошибка', 'Вес является обязательным полем');
      return;
    }
    createMetric(formData, {
      onSuccess: () => {
        setShowAddModal(false);
        setFormData(emptyForm());
      },
    });
  };

  const handleDelete = (id: string) => {
    Alert.alert('Удалить замер?', 'Это действие нельзя отменить', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => deleteMetric(id),
      },
    ]);
  };

  const renderChangeIcon = () => {
    if (!weightChange) return <Minus size={20} color={colors.textSecondary} />;
    if (weightChange.value > 0) return <TrendingUp size={20} color={colors.error} />;
    if (weightChange.value < 0) return <TrendingDown size={20} color={colors.success} />;
    return <Minus size={20} color={colors.textSecondary} />;
  };

  const renderChangeText = () => {
    if (!weightChange) return 'Нет данных';
    const sign = weightChange.value > 0 ? '+' : '';
    return `${sign}${weightChange.value.toFixed(1)} кг (${sign}${weightChange.percent.toFixed(1)}%)`;
  };

  const renderChangeColor = () => {
    if (!weightChange) return colors.textSecondary;
    if (weightChange.value > 0) return colors.error;
    if (weightChange.value < 0) return colors.success;
    return colors.textSecondary;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <View style={commonStyles.center}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>Загрузка...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      {/* ✅ Шапка с кнопкой назад */}
      <View
        style={[
          commonStyles.navHeader,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={commonStyles.backButton}>
          <ChevronLeft size={24} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[typography.h4, { color: colors.textPrimary }]}>Замеры тела</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}>
        {/* Текущий вес и изменение */}
        <AppCard
          variant="highlighted"
          style={{
            marginBottom: SPACING.lg,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <View>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: SPACING.xs }]}>
              Текущий вес
            </Text>
            <Text style={[typography.h1, { color: colors.textPrimary }]}>
              {latestMetric?.weight_kg ? `${latestMetric.weight_kg} кг` : '--'}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xs }}>
              {renderChangeIcon()}
              <Text style={[typography.labelBold, { color: renderChangeColor(), marginLeft: SPACING.xs }]}>
                {renderChangeText()}
              </Text>
            </View>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              с прошлого замера
            </Text>
          </View>
        </AppCard>

        {/* FEAT-2.2: тренд веса (лёгкий SVG, без chart-библиотек) */}
        {weightPoints.length > 0 && (
          <AppCard variant="compact" style={{ marginBottom: SPACING.lg }}>
            <WeightTrendChart points={weightPoints} />
          </AppCard>
        )}

        {/* FEAT-2.2: графики замеров с чипами-тумблерами */}
        <View style={{ marginBottom: SPACING.xl }}>
          <SectionHeader title="Графики замеров" style={{ paddingHorizontal: 0, paddingTop: 0 }} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.md }}>
            {sparkFields.map((f) => {
              const active = selectedMetrics.includes(f.key);
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => toggleMetric(f.key)}
                  style={{
                    paddingHorizontal: SPACING.md,
                    paddingVertical: SPACING.xs,
                    borderRadius: BORDER_RADIUS.full,
                    borderWidth: 1,
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primary + '20' : colors.surfaceSecondary,
                  }}
                >
                  <Text
                    style={[
                      typography.captionSmall,
                      { color: active ? colors.primary : colors.textSecondary, fontWeight: '600' },
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {chartsReady &&
            selectedMetrics.map((key, i) => {
              const field = sparkFields.find((f) => f.key === key);
              if (!field) return null;
              const pts = pointsFor(key);
              if (pts.length === 0) return null;
              return (
                <MetricSparkline
                  key={key}
                  label={field.label}
                  unit={field.unit}
                  color={CHART_COLORS[i % CHART_COLORS.length]}
                  points={pts}
                />
              );
            })}
        </View>

        {/* Кнопка добавления */}
        <AppButton
          title="Добавить новый замер"
          variant="primary"
          size="large"
          icon={<Plus size={20} color={colors.textInverse} />}
          onPress={() => {
            setShowAddModal(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
          style={{ marginBottom: SPACING.xl }}
        />

        {/* История замеров */}
        <SectionHeader title="История" style={{ paddingHorizontal: 0, paddingTop: 0 }} />
        {metrics.length === 0 ? (
          <AppCard variant="compact" style={{ alignItems: 'center', paddingVertical: SPACING.xl }}>
            <Weight size={48} color={colors.textTertiary} />
            <Text
              style={[
                typography.body,
                { color: colors.textSecondary, marginTop: SPACING.md, textAlign: 'center' },
              ]}
            >
              Пока нет записей о замерах. Добавьте первый замер, чтобы отслеживать прогресс!
            </Text>
          </AppCard>
        ) : (
          // ✅ map вместо FlatList: список короткий, скроллится внешний ScrollView —
          //    вложенный VirtualizedList запрещён правилами и здесь не нужен.
          metrics.map((item) => (
            <AppCard key={item.id} variant="compact" style={{ marginBottom: SPACING.sm }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: SPACING.md,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Calendar size={18} color={colors.primary} style={{ marginRight: SPACING.sm }} />
                  <Text style={[typography.labelBold, { color: colors.textPrimary }]}>
                    {new Date(item.metric_date).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ padding: 4 }}>
                  <Trash2 size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
                {METRIC_FIELDS.map((field) => {
                  const value = item[field.key as keyof typeof item];
                  if (!value) return null;
                  return (
                    <View
                      key={field.key}
                      style={{
                        backgroundColor: colors.surfaceSecondary,
                        paddingHorizontal: SPACING.md,
                        paddingVertical: SPACING.xs,
                        borderRadius: BORDER_RADIUS.sm,
                      }}
                    >
                      <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
                        {field.label}:{' '}
                        <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '600' }]}>
                          {value} {field.unit}
                        </Text>
                      </Text>
                    </View>
                  );
                })}
              </View>
              {item.notes && (
                <Text
                  style={[
                    typography.caption,
                    { color: colors.textSecondary, marginTop: SPACING.sm, fontStyle: 'italic' },
                  ]}
                >
                  📝 {item.notes}
                </Text>
              )}
            </AppCard>
          ))
        )}
      </ScrollView>

      {/* Модалка добавления замера — обёрнута в KeyboardAvoidingView,
          чтобы поля не уезжали под клавиатуру на iOS */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
            <View
              style={{
                backgroundColor: colors.background,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                maxHeight: '85%',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: SPACING.xl,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <Text style={[typography.h3, { color: colors.textPrimary }]}>Новый замер</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <X size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
                <AppInput
                  label="Дата"
                  value={formData.metric_date}
                  onChangeText={(text) => setFormData({ ...formData, metric_date: text })}
                />
                {/* FEAT-2.2: поля по группам (Тело / Руки / Ноги) */}
                {(Object.keys(METRIC_GROUPS) as MetricGroup[]).map((group) => (
                  <View key={group}>
                    <Text
                      style={[
                        typography.labelBold,
                        { color: colors.textSecondary, marginTop: SPACING.md, marginBottom: SPACING.xs },
                      ]}
                    >
                      {METRIC_GROUPS[group]}
                    </Text>
                    {METRIC_FIELDS.filter((f) => f.group === group).map((field) => (
                      <AppInput
                        key={field.key}
                        label={`${field.label} (${field.unit})`}
                        placeholder="0"
                        value={formData[field.key]}
                        onChangeText={(text) => setFormData({ ...formData, [field.key]: text })}
                        keyboardType="decimal-pad"
                      />
                    ))}
                  </View>
                ))}
                <AppInput
                  label="Заметки"
                  placeholder="Самочувствие, условия замера..."
                  value={formData.notes}
                  onChangeText={(text) => setFormData({ ...formData, notes: text })}
                  multiline
                  style={{ minHeight: 80, textAlignVertical: 'top' }}
                />
                <AppButton
                  title={isCreating ? 'Сохранение...' : 'Сохранить замер'}
                  variant="primary"
                  size="large"
                  loading={isCreating}
                  disabled={isCreating}
                  onPress={handleSave}
                  style={{ marginTop: SPACING.md }}
                />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}