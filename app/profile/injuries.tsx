import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { commonStyles } from '../../src/styles/common';
import { createCardStyles } from '../../src/styles/components/card';
import { createButtonStyles } from '../../src/styles/components/button';
import { typography } from '../../src/styles/typography';
import { supabase } from '../../src/lib/supabase';
import { useStore } from '../../src/store/useStore';
import {
  ChevronLeft,
  Plus,
  Edit3,
  CheckCircle,
  AlertCircle,
  X,
  Save,
  Trash2,
  Activity,
  Circle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface Injury {
  id: string;
  body_part: string;
  injury_type: string;
  severity: 'low' | 'medium' | 'high';
  status: 'active' | 'recovering' | 'recovered';
  description: string;
  created_at: string;
  recovered_at: string | null;
  notes: string;
}

// Единый стиль иконок с цветовой кодировкой по зонам тела
const BODY_PARTS = [
  { value: 'shoulder', label: 'Плечо', color: '#2196F3' },
  { value: 'elbow', label: 'Локоть', color: '#2196F3' },
  { value: 'wrist', label: 'Запястье', color: '#2196F3' },
  { value: 'back', label: 'Спина', color: '#9C27B0' },
  { value: 'neck', label: 'Шея', color: '#9C27B0' },
  { value: 'hip', label: 'Бедро', color: '#4CAF50' },
  { value: 'knee', label: 'Колено', color: '#4CAF50' },
  { value: 'ankle', label: 'Голеностоп', color: '#4CAF50' },
];

const INJURY_TYPES = [
  { value: 'strain', label: 'Растяжение' },
  { value: 'sprain', label: 'Вывих' },
  { value: 'pain', label: 'Боль' },
  { value: 'inflammation', label: 'Воспаление' },
  { value: 'fracture', label: 'Перелом' },
  { value: 'other', label: 'Другое' },
];

export default function InjuriesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { userId } = useStore();
  
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInjury, setEditingInjury] = useState<Injury | null>(null);
  
  const [bodyPart, setBodyPart] = useState('');
  const [injuryType, setInjuryType] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  
  const cardStyles = createCardStyles(colors);
  const buttonStyles = createButtonStyles(colors);

  useEffect(() => {
    loadInjuries();
  }, [userId]);

  const loadInjuries = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('user_injuries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInjuries(data || []);
    } catch (e) {
      console.error('Ошибка загрузки травм:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInjury = async () => {
    if (!userId || !bodyPart || !injuryType) {
      Alert.alert('Ошибка', 'Заполните обязательные поля');
      return;
    }

    try {
      const injuryData = {
        user_id: userId,
        body_part: bodyPart,
        injury_type: injuryType,
        severity,
        description,
        notes,
        status: 'active' as const,
      };

      if (editingInjury) {
        const { error } = await supabase
          .from('user_injuries')
          .update(injuryData)
          .eq('id', editingInjury.id);
        
        if (error) throw error;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const { error } = await supabase
          .from('user_injuries')
          .insert(injuryData);
        
        if (error) throw error;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setShowAddModal(false);
      resetForm();
      loadInjuries();
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    }
  };

  const handleMarkAsRecovered = async (injuryId: string) => {
    Alert.alert(
      'Отметить как восстановленную?',
      'Травма будет перемещена в архив',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Восстановлена',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('user_injuries')
                .update({
                  status: 'recovered',
                  recovered_at: new Date().toISOString(),
                })
                .eq('id', injuryId);

              if (error) throw error;
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              loadInjuries();
            } catch (e: any) {
              Alert.alert('Ошибка', e.message);
            }
          },
        },
      ]
    );
  };

  const handleDeleteInjury = async (injuryId: string) => {
    Alert.alert(
      'Удалить травму?',
      'Это действие нельзя отменить',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('user_injuries')
                .delete()
                .eq('id', injuryId);

              if (error) throw error;
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              loadInjuries();
            } catch (e: any) {
              Alert.alert('Ошибка', e.message);
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setBodyPart('');
    setInjuryType('');
    setSeverity('medium');
    setDescription('');
    setNotes('');
    setEditingInjury(null);
  };

  const openEditModal = (injury: Injury) => {
    setEditingInjury(injury);
    setBodyPart(injury.body_part);
    setInjuryType(injury.injury_type);
    setSeverity(injury.severity);
    setDescription(injury.description || '');
    setNotes(injury.notes || '');
    setShowAddModal(true);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return '#4CAF50';
      case 'medium': return '#FFC107';
      case 'high': return '#F44336';
      default: return colors.textSecondary;
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'low': return 'Низкая';
      case 'medium': return 'Средняя';
      case 'high': return 'Высокая';
      default: return severity;
    }
  };

  const getBodyPartLabel = (value: string) => {
    return BODY_PARTS.find(bp => bp.value === value)?.label || value;
  };

  const getBodyPartColor = (value: string) => {
    return BODY_PARTS.find(bp => bp.value === value)?.color || colors.primary;
  };

  const getInjuryTypeLabel = (value: string) => {
    return INJURY_TYPES.find(it => it.value === value)?.label || value;
  };

  const activeInjuries = injuries.filter(i => i.status !== 'recovered');
  const recoveredInjuries = injuries.filter(i => i.status === 'recovered');

  const renderInjuryCard = (injury: Injury) => {
    const bodyPartColor = getBodyPartColor(injury.body_part);
    
    return (
      <View
        key={injury.id}
        style={[
          cardStyles.compact,
          {
            borderColor: getSeverityColor(injury.severity),
            borderWidth: 1,
            marginBottom: SPACING.md,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            {/* Единая иконка Circle с цветом зоны тела */}
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
          <View
            style={{
              paddingHorizontal: SPACING.sm,
              paddingVertical: SPACING.xs,
              borderRadius: BORDER_RADIUS.sm,
              backgroundColor: getSeverityColor(injury.severity) + '20',
            }}
          >
            <Text style={[typography.caption, { color: getSeverityColor(injury.severity), fontWeight: '600' }]}>
              {getSeverityLabel(injury.severity)}
            </Text>
          </View>
        </View>

        {injury.description && (
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
              onPress={() => openEditModal(injury)}
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
              onPress={() => handleMarkAsRecovered(injury.id)}
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
              onPress={() => handleDeleteInjury(injury.id)}
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
      </View>
    );
  };

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      {/* Шапка */}
      <View style={[commonStyles.navHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={commonStyles.backButton}>
          <ChevronLeft size={24} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[typography.h4, { color: colors.textPrimary }]}>Травмы и ограничения</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}>
        {/* Статистика */}
        <View style={{ flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg }}>
          <View style={[cardStyles.compact, { flex: 1, alignItems: 'center' }]}>
            <AlertCircle size={24} color={colors.error} />
            <Text style={[typography.h3, { color: colors.textPrimary, marginTop: SPACING.xs }]}>
              {activeInjuries.length}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Активных
            </Text>
          </View>
          <View style={[cardStyles.compact, { flex: 1, alignItems: 'center' }]}>
            <CheckCircle size={24} color={colors.success} />
            <Text style={[typography.h3, { color: colors.textPrimary, marginTop: SPACING.xs }]}>
              {recoveredInjuries.length}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Восстановлено
            </Text>
          </View>
        </View>

        {/* Легенда зон тела */}
        <View style={[cardStyles.compact, { borderColor: colors.border, borderWidth: 1, marginBottom: SPACING.lg }]}>
          <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.md }]}>
            Зоны тела
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}>
              <Circle size={16} color="#2196F3" fill="#2196F320" strokeWidth={2} />
              <Text style={[typography.captionSmall, { color: colors.textSecondary, marginTop: SPACING.xs }]}>
                Руки
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Circle size={16} color="#9C27B0" fill="#9C27B020" strokeWidth={2} />
              <Text style={[typography.captionSmall, { color: colors.textSecondary, marginTop: SPACING.xs }]}>
                Корпус
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Circle size={16} color="#4CAF50" fill="#4CAF5020" strokeWidth={2} />
              <Text style={[typography.captionSmall, { color: colors.textSecondary, marginTop: SPACING.xs }]}>
                Ноги
              </Text>
            </View>
          </View>
        </View>

        {/* Активные травмы */}
        <Text style={[typography.h5, { color: colors.textPrimary, marginBottom: SPACING.md }]}>
          Активные травмы
        </Text>
        {activeInjuries.length === 0 ? (
          <View style={[cardStyles.compact, { alignItems: 'center', paddingVertical: SPACING.xl }]}>
            <Activity size={48} color={colors.textTertiary} />
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: SPACING.md, textAlign: 'center' }]}>
              У вас нет активных травм
            </Text>
          </View>
        ) : (
          activeInjuries.map((injury) => renderInjuryCard(injury))
        )}

        {/* Восстановленные травмы */}
        {recoveredInjuries.length > 0 && (
          <>
            <Text style={[typography.h5, { color: colors.textPrimary, marginBottom: SPACING.md, marginTop: SPACING.lg }]}>
              Восстановленные
            </Text>
            {recoveredInjuries.map((injury) => renderInjuryCard(injury))}
          </>
        )}
      </ScrollView>

      {/* FAB кнопка добавления */}
      <TouchableOpacity
        onPress={() => {
          resetForm();
          setShowAddModal(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }}
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
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
        }}
      >
        <Plus size={28} color="white" strokeWidth={2.5} />
      </TouchableOpacity>

      {/* Модальное окно добавления/редактирования */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '90%',
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: SPACING.xl,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}>
              <Text style={[typography.h3, { color: colors.textPrimary }]}>
                {editingInjury ? 'Редактировать травму' : 'Добавить травму'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
              {/* Часть тела */}
              <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
                Часть тела *
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg }}>
                {BODY_PARTS.map((bp) => (
                  <TouchableOpacity
                    key={bp.value}
                    onPress={() => setBodyPart(bp.value)}
                    style={[
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: SPACING.md,
                        paddingVertical: SPACING.sm,
                        borderRadius: BORDER_RADIUS.md,
                        borderWidth: 1,
                        borderColor: bodyPart === bp.value ? bp.color : colors.border,
                        backgroundColor: bodyPart === bp.value ? bp.color + '20' : colors.surface,
                      },
                    ]}
                  >
                    <Circle 
                      size={14} 
                      color={bp.color} 
                      fill={bodyPart === bp.value ? bp.color : 'transparent'}
                      strokeWidth={2}
                      style={{ marginRight: SPACING.xs }}
                    />
                    <Text style={[
                      typography.caption,
                      { color: bodyPart === bp.value ? bp.color : colors.textPrimary },
                    ]}>
                      {bp.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Тип травмы */}
              <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
                Тип травмы *
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg }}>
                {INJURY_TYPES.map((it) => (
                  <TouchableOpacity
                    key={it.value}
                    onPress={() => setInjuryType(it.value)}
                    style={[
                      {
                        paddingHorizontal: SPACING.md,
                        paddingVertical: SPACING.sm,
                        borderRadius: BORDER_RADIUS.md,
                        borderWidth: 1,
                        borderColor: injuryType === it.value ? colors.primary : colors.border,
                        backgroundColor: injuryType === it.value ? colors.primaryLight : colors.surface,
                      },
                    ]}
                  >
                    <Text style={[
                      typography.caption,
                      { color: injuryType === it.value ? colors.primary : colors.textPrimary },
                    ]}>
                      {it.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Тяжесть */}
              <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
                Тяжесть
              </Text>
              <View style={{ flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg }}>
                {(['low', 'medium', 'high'] as const).map((level) => (
                  <TouchableOpacity
                    key={level}
                    onPress={() => setSeverity(level)}
                    style={[
                      {
                        flex: 1,
                        paddingVertical: SPACING.md,
                        borderRadius: BORDER_RADIUS.md,
                        borderWidth: 2,
                        borderColor: severity === level ? getSeverityColor(level) : colors.border,
                        backgroundColor: severity === level ? getSeverityColor(level) + '20' : colors.surface,
                        alignItems: 'center',
                      },
                    ]}
                  >
                    <Text style={[
                      typography.labelBold,
                      { color: severity === level ? getSeverityColor(level) : colors.textSecondary },
                    ]}>
                      {getSeverityLabel(level)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Описание */}
              <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
                Описание
              </Text>
              <TextInput
                style={[
                  cardStyles.sheetInput,
                  { marginBottom: SPACING.lg, minHeight: 80, textAlignVertical: 'top' },
                ]}
                placeholder="Опишите травму..."
                placeholderTextColor={colors.textTertiary}
                value={description}
                onChangeText={setDescription}
                multiline
              />

              {/* Заметки */}
              <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
                Заметки
              </Text>
              <TextInput
                style={[
                  cardStyles.sheetInput,
                  { marginBottom: SPACING.xl, minHeight: 80, textAlignVertical: 'top' },
                ]}
                placeholder="Дополнительная информация..."
                placeholderTextColor={colors.textTertiary}
                value={notes}
                onChangeText={setNotes}
                multiline
              />

              {/* Кнопки */}
              <View style={{ flexDirection: 'row', gap: SPACING.md }}>
                <TouchableOpacity
                  style={[buttonStyles.secondary, { flex: 1 }]}
                  onPress={() => setShowAddModal(false)}
                >
                  <Text style={buttonStyles.textSecondary}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[buttonStyles.primary, { flex: 2 }]}
                  onPress={handleSaveInjury}
                >
                  <Save size={20} color="#fff" style={{ marginRight: SPACING.sm }} />
                  <Text style={buttonStyles.textPrimary}>
                    {editingInjury ? 'Сохранить' : 'Добавить'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}