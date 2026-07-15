import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/hooks/useTheme';
import { ThemeAccent, ThemeKey, themes } from '../../src/constants/theme';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { commonStyles } from '../../src/styles/common';
import { createCardStyles } from '../../src/styles/components/card';
import { createButtonStyles } from '../../src/styles/components/button';
import { typography } from '../../src/styles/typography';
import { supabase } from '../../src/lib/supabase';
import { useStore } from '../../src/store/useStore';
import { User, Settings, Target, Activity, LogOut, Palette, ChevronRight, Trophy, Dumbbell, Calendar } from 'lucide-react-native';

export default function ProfileScreen() {
  const {
    colors,
    themeMode,
    themeAccent,
    setThemeMode,
    setThemeAccent,
    availableAccents,
  } = useTheme();
  const { userId } = useStore();
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    totalPrograms: 0,
    totalVolume: 0,
  });
  const [loading, setLoading] = useState(true);

  const cardStyles = createCardStyles(colors);
  const buttonStyles = createButtonStyles(colors);

  useEffect(() => {
    loadUserData();
    loadStats();
  }, [userId]);

  const loadUserData = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, email, avatar_url')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      setUserData(data);
    } catch (e) {
      console.error('Ошибка загрузки профиля:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!userId) return;
    try {
      // Загрузка статистики
      const { data: workouts } = await supabase
        .from('workouts')
        .select('id, workout_exercises (workout_logs (weight_kg, reps))')
        .eq('user_id', userId);

      const { data: programs } = await supabase
        .from('program_progress')
        .select('id')
        .eq('user_id', userId);

      let totalVolume = 0;
      let totalWorkouts = 0;

      workouts?.forEach((workout: any) => {
        const hasLogs = workout.workout_exercises?.some((ex: any) => 
          ex.workout_logs?.length > 0
        );
        if (hasLogs) {
          totalWorkouts++;
          workout.workout_exercises?.forEach((ex: any) => {
            ex.workout_logs?.forEach((log: any) => {
              totalVolume += (parseFloat(log.weight_kg) || 0) * (parseInt(log.reps) || 0);
            });
          });
        }
      });

      setStats({
        totalWorkouts,
        totalPrograms: programs?.length || 0,
        totalVolume: Math.round(totalVolume),
      });
    } catch (e) {
      console.error('Ошибка загрузки статистики:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Выход из аккаунта',
      'Вы уверены, что хотите выйти?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
            } catch (error) {
              console.error('Ошибка выхода:', error);
            }
          },
        },
      ]
    );
  };

  const renderStatCard = (icon: any, label: string, value: string, color: string) => (
    <View style={[cardStyles.statCard, { backgroundColor: colors.surface, minWidth: 100 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xs }}>
        {icon}
        <Text style={[typography.h3, { color: color, marginLeft: SPACING.xs }]}>{value}</Text>
      </View>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );

  const renderThemeOption = ({ item }: { item: { key: ThemeAccent; label: string; keys: ThemeKey[] } }) => {
    const isSelected = themeAccent === item.key;
    const currentTheme = themes[item.keys[0]];
    
    return (
      <TouchableOpacity
        style={[
          cardStyles.container,
          {
            borderColor: isSelected ? colors.primary : colors.border,
            borderWidth: 2,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          },
        ]}
        onPress={() => {
          setThemeAccent(item.key);
          setShowThemeModal(false);
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: currentTheme.colors.primary }} />
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: currentTheme.colors.success }} />
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: currentTheme.colors.warning }} />
          </View>
          <Text style={[typography.h5, { color: colors.textPrimary }]}>{item.label}</Text>
        </View>
        {isSelected && (
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: 'bold' }}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <View style={commonStyles.center}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>Загрузка...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = userData?.username || userData?.email || 'Пользователь';
  const displayEmail = userData?.email || '';

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
        {/* Шапка профиля */}
        <View style={{ alignItems: 'center', marginBottom: SPACING.xl }}>
          <View style={{ 
            width: 80, 
            height: 80, 
            borderRadius: 40, 
            backgroundColor: colors.primaryLight,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: SPACING.md,
          }}>
            {userData?.avatar_url ? (
              <Image 
                source={{ uri: userData.avatar_url }} 
                style={{ width: 80, height: 80, borderRadius: 40 }}
              />
            ) : (
              <User size={40} color={colors.primary} strokeWidth={1.5} />
            )}
          </View>
          <Text style={[typography.h3, { color: colors.textPrimary, textAlign: 'center' }]}>
            {displayName}
          </Text>
          {displayEmail && (
            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 4 }]}>
              {displayEmail}
            </Text>
          )}
        </View>

        {/* Статистика */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xl }}>
          {renderStatCard(
            <Dumbbell size={20} color={colors.primary} strokeWidth={1.5} />,
            'Тренировки',
            stats.totalWorkouts.toString(),
            colors.primary
          )}
          {renderStatCard(
            <Calendar size={20} color={colors.success} strokeWidth={1.5} />,
            'Программы',
            stats.totalPrograms.toString(),
            colors.success
          )}
          {renderStatCard(
            <Trophy size={20} color={colors.warning} strokeWidth={1.5} />,
            'Объем (кг)',
            stats.totalVolume.toLocaleString(),
            colors.warning
          )}
        </View>

        {/* Настройки темы */}
        <View style={commonStyles.section}>
          <Text style={[commonStyles.sectionTitle, { color: colors.textPrimary }]}>
            Оформление
          </Text>
          
          {/* Переключатель светлая/тёмная */}
          <View
            style={[
              cardStyles.compact,
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderColor: colors.border,
                borderWidth: 1,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[typography.h5, { color: colors.textPrimary }]}>
                Тёмная тема
              </Text>
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                {themeMode === 'dark' ? 'Включена' : 
                 themeMode === 'light' ? 'Выключена' : 'Как в системе'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', maxWidth: '60%' }}>
              {(['light', 'dark', 'system'] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    {
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: BORDER_RADIUS.md,
                      borderWidth: 1,
                      borderColor: colors.border,
                    },
                    themeMode === mode && {
                      backgroundColor: colors.primaryLight,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => setThemeMode(mode)}
                >
                  <Text
                    style={[
                      typography.buttonSmall,
                      {
                        color: themeMode === mode ? colors.primary : colors.textSecondary,
                        fontWeight: themeMode === mode ? '600' : '400',
                      },
                    ]}
                  >
                    {mode === 'light' ? 'Светлая' : mode === 'dark' ? 'Тёмная' : 'Авто'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Выбор цветовой схемы */}
          <TouchableOpacity
            style={[
              cardStyles.compact,
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderColor: colors.border,
                borderWidth: 1,
              },
            ]}
            onPress={() => setShowThemeModal(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Palette size={20} color={colors.primary} strokeWidth={1.5} style={{ marginRight: SPACING.md }} />
              <View style={{ flex: 1 }}>
                <Text style={[typography.h5, { color: colors.textPrimary }]}>
                  Цветовая схема
                </Text>
                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                  {availableAccents.find(a => a.key === themeAccent)?.label || 'Синяя'}
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Другие настройки */}
        <View style={commonStyles.section}>
          <TouchableOpacity
            style={[
              cardStyles.compact,
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderColor: colors.border,
                borderWidth: 1,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Settings size={20} color={colors.primary} strokeWidth={1.5} style={{ marginRight: SPACING.md }} />
              <Text style={[typography.h5, { color: colors.textPrimary }]}>
                Настройки
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              cardStyles.compact,
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderColor: colors.border,
                borderWidth: 1,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Target size={20} color={colors.success} strokeWidth={1.5} style={{ marginRight: SPACING.md }} />
              <Text style={[typography.h5, { color: colors.textPrimary }]}>
                Мои цели
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              cardStyles.compact,
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderColor: colors.border,
                borderWidth: 1,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Activity size={20} color={colors.error} strokeWidth={1.5} style={{ marginRight: SPACING.md }} />
              <Text style={[typography.h5, { color: colors.textPrimary }]}>
                Травмы и ограничения
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Кнопка выхода */}
        <TouchableOpacity
          style={[
            buttonStyles.danger, 
            { 
              marginTop: SPACING.xl,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: SPACING.md,
            }
          ]}
          onPress={handleLogout}
        >
          <LogOut size={20} color="#ffffff" strokeWidth={2} />
          <Text style={buttonStyles.textDanger}>Выйти из аккаунта</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Модальное окно выбора темы */}
      <Modal
        visible={showThemeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowThemeModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={[{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.xl, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={[typography.h3, { color: colors.textPrimary }]}>
                Выберите цветовую схему
              </Text>
              <TouchableOpacity onPress={() => setShowThemeModal(false)}>
                <Text style={[typography.buttonSmall, { color: colors.primary }]}>
                  Закрыть
                </Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={availableAccents}
              renderItem={renderThemeOption}
              keyExtractor={(item) => item.key}
              contentContainerStyle={{ padding: SPACING.lg }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}