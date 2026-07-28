import { memo, useCallback, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  Circle,
  Edit3,
  Plus,
  Trash2,
} from 'lucide-react-native';

import { useTheme } from '../../src/hooks/useTheme';
import { useStore } from '../../src/store/useStore';
import { useInjuries } from '../../src/hooks/useInjuries';
import { SPACING } from '../../src/constants/theme';
import { BODY_ZONE_COLORS } from '../../src/constants/semanticColors';
import { commonStyles } from '../../src/styles/common';
import { typography } from '../../src/styles/typography';
import { AppCard } from '../../src/components/ui/AppCard';
import { AppBadge } from '../../src/components/ui/AppBadge';
import { SectionHeader } from '../../src/components/SectionHeader';
import { ListSkeleton } from '../../src/components/Skeleton';
import { InjuryFormSheet } from '../../src/components/profile/InjuryFormSheet';
import {
  getBodyPartColor,
  getBodyPartLabel,
  getInjuryTypeLabel,
  getSeverityColor,
  getSeverityLabel,
} from '../../src/components/profile/injuryOptions';
import type { Injury, InjuryInput } from '../../src/services/injuriesService';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

const InjuryCard = memo(function InjuryCard({
  injury,
  colors,
  onEdit,
  onRecover,
  onDelete,
}: {
  injury: Injury;
  colors: ThemeColors;
  onEdit: () => void;
  onRecover: () => void;
  onDelete: () => void;
}) {
  const bodyPartColor = getBodyPartColor(injury.body_part, colors.primary);
  const severityColor = getSeverityColor(injury.severity, colors.textSecondary);

  return (
    <AppCard variant="compact" style={{ borderColor: severityColor, borderWidth: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: SPACING.sm,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Circle
            size={20}
            color={bodyPartColor}
            fill={bodyPartColor + '20'}
            strokeWidth={2}
            style={{ marginRight: SPACING.sm }}
          />
          <View style={{ flex: 1 }}>
            <Text style={[typography.labelBold, { color: colors.textPrimary }]}>
              {getBodyPartLabel(injury.body_part)}
            </Text>
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              {getInjuryTypeLabel(injury.injury_type)}
            </Text>
          </View>
        </View>
        <AppBadge
          variant="default"
          size="small"
          style={{ backgroundColor: severityColor + '20' }}
          textStyle={{ color: severityColor }}
        >
          {getSeverityLabel(injury.severity)}
        </AppBadge>
      </View>

      {!!injury.description && (
        <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: SPACING.sm }]}>
          {injury.description}
        </Text>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>
          С {new Date(injury.created_at).toLocaleDateString('ru-RU')}
        </Text>
        <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
          <TouchableOpacity
            onPress={onEdit}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: colors.surfaceSecondary,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Edit3 size={16} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onRecover}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: colors.success + '20',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <CheckCircle size={16} color={colors.success} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDelete}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: colors.error + '20',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Trash2 size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </AppCard>
  );
});

export default function InjuriesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { userId } = useStore();

  const {
    injuries,
    loading,
    refetch,
    createInjury,
    updateInjury,
    markRecovered,
    deleteInjury,
    saving,
  } = useInjuries(userId);

  const [showForm, setShowForm] = useState(false);
  const [editingInjury, setEditingInjury] = useState<Injury | null>(null);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const activeInjuries = injuries.filter((i) => i.status !== 'recovered');
  const recoveredInjuries = injuries.filter((i) => i.status === 'recovered');

  const openCreate = () => {
    setEditingInjury(null);
    setShowForm(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const openEdit = (injury: Injury) => {
    setEditingInjury(injury);
    setShowForm(true);
  };

  const handleSave = async (input: InjuryInput, editingId: string | null) => {
    if (!userId) return;
    try {
      if (editingId) {
        await updateInjury({ id: editingId, input });
      } else {
        await createInjury(input);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowForm(false);
      setEditingInjury(null);
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    }
  };

  const handleRecover = (id: string) => {
    Alert.alert('Отметить как восстановленную?', 'Травма будет перемещена в архив', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Восстановлена',
        onPress: async () => {
          try {
            await markRecovered(id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e: any) {
            Alert.alert('Ошибка', e.message);
          }
        },
      },
    ]);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Удалить травму?', 'Это действие нельзя отменить', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteInjury(id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e: any) {
            Alert.alert('Ошибка', e.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <View style={commonStyles.center}>
          <ListSkeleton count={3} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <View
        style={[commonStyles.navHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={commonStyles.backButton}>
          <ChevronLeft size={24} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[typography.h4, { color: colors.textPrimary }]}>Травмы и ограничения</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}>
        <View style={{ flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg }}>
          <AppCard variant="compact" style={{ flex: 1, alignItems: 'center' }}>
            <AlertCircle size={24} color={colors.error} />
            <Text style={[typography.h3, { color: colors.textPrimary, marginTop: SPACING.xs }]}>
              {activeInjuries.length}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Активных</Text>
          </AppCard>
          <AppCard variant="compact" style={{ flex: 1, alignItems: 'center' }}>
            <CheckCircle size={24} color={colors.success} />
            <Text style={[typography.h3, { color: colors.textPrimary, marginTop: SPACING.xs }]}>
              {recoveredInjuries.length}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Восстановлено</Text>
          </AppCard>
        </View>

        <AppCard variant="compact">
          <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.md }]}>
            Зоны тела
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}>
              <Circle size={16} color={BODY_ZONE_COLORS.arms} fill={BODY_ZONE_COLORS.arms + '20'} strokeWidth={2} />
              <Text style={[typography.captionSmall, { color: colors.textSecondary, marginTop: SPACING.xs }]}>
                Руки
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Circle size={16} color={BODY_ZONE_COLORS.torso} fill={BODY_ZONE_COLORS.torso + '20'} strokeWidth={2} />
              <Text style={[typography.captionSmall, { color: colors.textSecondary, marginTop: SPACING.xs }]}>
                Корпус
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Circle size={16} color={BODY_ZONE_COLORS.legs} fill={BODY_ZONE_COLORS.legs + '20'} strokeWidth={2} />
              <Text style={[typography.captionSmall, { color: colors.textSecondary, marginTop: SPACING.xs }]}>
                Ноги
              </Text>
            </View>
          </View>
        </AppCard>

        <SectionHeader
          title="Активные травмы"
          style={{ paddingHorizontal: 0, paddingTop: 0, marginTop: SPACING.lg }}
        />
        {activeInjuries.length === 0 ? (
          <AppCard variant="compact" style={{ alignItems: 'center', paddingVertical: SPACING.xl }}>
            <Activity size={48} color={colors.textTertiary} />
            <Text
              style={[typography.body, { color: colors.textSecondary, marginTop: SPACING.md, textAlign: 'center' }]}
            >
              У вас нет активных травм
            </Text>
          </AppCard>
        ) : (
          activeInjuries.map((injury) => (
            <InjuryCard
              key={injury.id}
              injury={injury}
              colors={colors}
              onEdit={() => openEdit(injury)}
              onRecover={() => handleRecover(injury.id)}
              onDelete={() => handleDelete(injury.id)}
            />
          ))
        )}

        {recoveredInjuries.length > 0 && (
          <>
            <SectionHeader
              title="Восстановленные"
              style={{ paddingHorizontal: 0, paddingTop: 0, marginTop: SPACING.lg }}
            />
            {recoveredInjuries.map((injury) => (
              <InjuryCard
                key={injury.id}
                injury={injury}
                colors={colors}
                onEdit={() => openEdit(injury)}
                onRecover={() => handleRecover(injury.id)}
                onDelete={() => handleDelete(injury.id)}
              />
            ))}
          </>
        )}
      </ScrollView>

      <TouchableOpacity
        onPress={openCreate}
        style={{
          position: 'absolute',
          bottom: SPACING.xl,
          right: SPACING.lg,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
          elevation: 4,
          shadowColor: colors.textPrimary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
        }}
      >
        <Plus size={28} color={colors.textInverse} strokeWidth={2.5} />
      </TouchableOpacity>

      <InjuryFormSheet
        visible={showForm}
        editingInjury={editingInjury}
        saving={saving}
        onClose={() => {
          setShowForm(false);
          setEditingInjury(null);
        }}
        onSave={handleSave}
      />
    </SafeAreaView>
  );
}