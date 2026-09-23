// app/profile/metrics.tsx
// Замеры тела: текущий вес + изменение, тренд веса (FEAT-2.2), графики замеров
// с чипами-тумблерами, восстановление, история, sheet добавления.
// DA-P2-8: split — секции вынесены в src/components/profile/metrics/.
// FEAT-2.3: бедро — левое/правое, как остальные конечности.
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/hooks/useTheme';
import { useStore } from '../../src/store/useStore';
import { useBodyMetrics } from '../../src/hooks/useBodyMetrics';
import { SPACING } from '../../src/constants/theme';
import { commonStyles } from '../../src/styles/common';
import { typography } from '../../src/styles/typography';
import { AppButton } from '../../src/components/ui/AppButton';
import { AppCard } from '../../src/components/ui/AppCard';
import { WeightTrendChart } from '../../src/components/profile/WeightTrendChart';
import { CurrentWeightCard } from '../../src/components/profile/metrics/CurrentWeightCard';
import { MetricChartsSection } from '../../src/components/profile/metrics/MetricChartsSection';
import { RecoverySection } from '../../src/components/profile/metrics/RecoverySection';
import { MetricsHistorySection } from '../../src/components/profile/metrics/MetricsHistorySection';
import { MetricAddSheet } from '../../src/components/profile/metrics/MetricAddSheet';

export default function MetricsScreen() {
  const router = useRouter();
  const { userId } = useStore();
  const { colors } = useTheme();
  const { metrics, latestMetric, weightChange, isLoading, createMetric, deleteMetric, isCreating } =
    useBodyMetrics(userId);

  const [showAddModal, setShowAddModal] = useState(false);

  // FEAT-2.2: точки для графика тренда (только непустой вес)
  const weightPoints = useMemo(
    () =>
      metrics
        .filter((m) => m.weight_kg != null)
        .map((m) => ({ date: m.metric_date, weightKg: m.weight_kg as number })),
    [metrics]
  );

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
    <>
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
        {/* Шапка с кнопкой назад */}
        <View
          style={[
            commonStyles.navHeader,
            { backgroundColor: colors.surface, borderBottomColor: colors.border },
          ]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Назад"
            style={commonStyles.backButton}
          >
            <ChevronLeft size={24} color={colors.primary} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={[typography.h4, { color: colors.textPrimary }]}>Замеры тела</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}>
          <CurrentWeightCard latestMetric={latestMetric} weightChange={weightChange} />

          {/* FEAT-2.2: тренд веса (лёгкий SVG, без chart-библиотек) */}
          {weightPoints.length > 0 && (
            <AppCard variant="compact" style={{ marginBottom: SPACING.lg }}>
              <WeightTrendChart points={weightPoints} />
            </AppCard>
          )}

          <MetricChartsSection metrics={metrics} />

          <RecoverySection />

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

          <MetricsHistorySection metrics={metrics} onDelete={deleteMetric} />
        </ScrollView>
      </SafeAreaView>

      {/* Sheet добавления замера (INVENTORY §6: SheetShell паттерн).
          Рендер вне SafeAreaView, в конце экрана — как модалки Dashboard (грабля AUDIT-1). */}
      <MetricAddSheet
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreate={createMetric}
        isCreating={isCreating}
      />
    </>
  );
}
