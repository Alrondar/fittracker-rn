import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
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
import { METRIC_FIELDS, MetricFormData } from '../../src/types/metrics';
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

  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<MetricFormData>({
    metric_date: new Date().toISOString().split('T')[0],
    weight_kg: '',
    waist_cm: '',
    chest_cm: '',
    hips_cm: '',
    arm_cm: '',
    thigh_cm: '',
    neck_cm: '',
    notes: '',
  });

  const handleSave = () => {
    if (!formData.weight_kg) {
      Alert.alert('Ошибка', 'Вес является обязательным полем');
      return;
    }
    createMetric(formData, {
      onSuccess: () => {
        setShowAddModal(false);
        setFormData({
          metric_date: new Date().toISOString().split('T')[0],
          weight_kg: '',
          waist_cm: '',
          chest_cm: '',
          hips_cm: '',
          arm_cm: '',
          thigh_cm: '',
          neck_cm: '',
          notes: '',
        });
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
      {/* Шапка */}
      <View style={[commonStyles.navHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={commonStyles.backButton}>
          <ChevronLeft size={24} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[typography.h4, { color: colors.textPrimary, flex: 1, textAlign: 'center' }]}>
          Замеры тела
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}>
        {/* Текущий вес и изменение */}
        <AppCard variant="highlighted" style={{ marginBottom: SPACING.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: SPACING.xs }]}>Текущий вес</Text>
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
        <Text style={[typography.h4, { color: colors.textPrimary, marginBottom: SPACING.md }]}>
          История
        </Text>

        {metrics.length === 0 ? (
          <AppCard variant="compact" style={{ alignItems: 'center', paddingVertical: SPACING.xl }}>
            <Weight size={48} color={colors.textTertiary} />
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: SPACING.md, textAlign: 'center' }]}>
              Пока нет записей о замерах. Добавьте первый замер, чтобы отслеживать прогресс!
            </Text>
          </AppCard>
        ) : (
          <FlatList
            data={metrics}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <AppCard variant="compact" style={{ marginBottom: SPACING.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Calendar size={18} color={colors.primary} style={{ marginRight: SPACING.sm }} />
                    <Text style={[typography.labelBold, { color: colors.textPrimary }]}>
                      {new Date(item.metric_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
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
                      <View key={field.key} style={{ backgroundColor: colors.surfaceSecondary, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.sm }}>
                        <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
                          {field.label}: <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '600' }]}>{value} {field.unit}</Text>
                        </Text>
                      </View>
                    );
                  })}
                </View>
                {item.notes && (
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: SPACING.sm, fontStyle: 'italic' }]}>
                    📝 {item.notes}
                  </Text>
                )}
              </AppCard>
            )}
          />
        )}
      </ScrollView>

      {/* Модалка добавления замера */}
      <Modal visible={showAddModal} animationType="slide" transparent={true} onRequestClose={() => setShowAddModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.xl, borderBottomWidth: 1, borderBottomColor: colors.border }}>
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
              
              {METRIC_FIELDS.map((field) => (
                <AppInput
                  key={field.key}
                  label={`${field.label} (${field.unit})`}
                  placeholder="0"
                  value={formData[field.key as keyof MetricFormData] as string}
                  onChangeText={(text) => setFormData({ ...formData, [field.key]: text })}
                  keyboardType="decimal-pad"
                />
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
      </Modal>
    </SafeAreaView>
  );
}