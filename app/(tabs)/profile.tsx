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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/hooks/useTheme';
import { ThemeAccent, ThemeKey, themes } from '../../src/constants/theme';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { commonStyles } from '../../src/styles/common';
import { createCardStyles } from '../../src/styles/components/card';
import { createButtonStyles } from '../../src/styles/components/button';
import { typography } from '../../src/styles/typography';

export default function ProfileScreen() {
  const {
    colors,
    themeMode,
    themeAccent,
    setThemeMode,
    setThemeAccent,
    availableAccents,
  } = useTheme();

  const [showThemeModal, setShowThemeModal] = useState(false);

  const cardStyles = createCardStyles(colors);
  const buttonStyles = createButtonStyles(colors);

  const handleLogout = () => {
    Alert.alert(
      'Выход из аккаунта',
      'Вы уверены, что хотите выйти?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: () => {
            // TODO: логика выхода
            console.log('Logout');
          },
        },
      ]
    );
  };

  const renderThemeOption = ({ item }: { item: { key: ThemeAccent; label: string; keys: ThemeKey[] } }) => {
    const isSelected = themeAccent === item.key;
    const currentTheme = themes[item.keys[0]]; // Берём light версию для превью

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
          <Text style={[typography.h5, { color: colors.textPrimary }]}>
            {item.label}
          </Text>
        </View>

        {isSelected && (
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: 'bold' }}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
        {/* Заголовок */}
        <View style={{ marginBottom: SPACING.xl }}>
          <Text style={[typography.h1, { color: colors.textPrimary }]}>
            Профиль
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            ID: 6416429a...
          </Text>
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
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['light', 'dark', 'system'] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    {
                      paddingHorizontal: 12,
                      paddingVertical: 6,
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
                        color: themeMode === mode ? colors.primaryDark : colors.textSecondary,
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
            <View style={{ flex: 1 }}>
              <Text style={[typography.h5, { color: colors.textPrimary }]}>
                Цветовая схема
              </Text>
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                {availableAccents.find(a => a.key === themeAccent)?.label}
              </Text>
            </View>
            <Text style={{ fontSize: 20, color: colors.textTertiary }}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Другие настройки */}
        <View style={commonStyles.section}>
          {['Настройки', 'Мои цели', 'Травмы и ограничения'].map((label) => (
            <TouchableOpacity
              key={label}
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
              <Text style={[typography.h5, { color: colors.textPrimary }]}>
                {label}
              </Text>
              <Text style={{ fontSize: 20, color: colors.textTertiary }}>→</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Кнопка выхода */}
        <TouchableOpacity
          style={[buttonStyles.danger, { marginTop: SPACING.sm }]}
          onPress={handleLogout}
        >
          <Text style={buttonStyles.textDanger}>Выйти из аккаунта</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Модальное окно выбора темы */}
      <Modal
        visible={showThemeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowThemeModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
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