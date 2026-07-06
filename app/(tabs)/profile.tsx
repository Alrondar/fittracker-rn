import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/hooks/useTheme';
import { ThemeAccent, ThemeKey, themes } from '../../src/constants/theme';

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
          styles.themeOption,
          {
            backgroundColor: colors.surface,
            borderColor: isSelected ? colors.primary : colors.border,
          },
        ]}
        onPress={() => {
          setThemeAccent(item.key);
          setShowThemeModal(false);
        }}
      >
        <View style={styles.themeInfo}>
          <View style={styles.themePreview}>
            <View
              style={[
                styles.previewCircle,
                { backgroundColor: currentTheme.colors.primary },
              ]}
            />
            <View
              style={[
                styles.previewCircle,
                { backgroundColor: currentTheme.colors.success },
              ]}
            />
            <View
              style={[
                styles.previewCircle,
                { backgroundColor: currentTheme.colors.warning },
              ]}
            />
          </View>
          <Text style={[styles.themeLabel, { color: colors.textPrimary }]}>
            {item.label}
          </Text>
        </View>

        {isSelected && (
          <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Заголовок */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Профиль
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            ID: 6416429a...
          </Text>
        </View>

        {/* Настройки темы */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Оформление
          </Text>

          {/* Переключатель светлая/тёмная */}
          <View
            style={[
              styles.settingRow,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                Тёмная тема
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {themeMode === 'dark' ? 'Включена' : 
                 themeMode === 'light' ? 'Выключена' : 'Как в системе'}
              </Text>
            </View>
            <View style={styles.modeButtons}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  {
                    backgroundColor: themeMode === 'light' ? colors.primaryLight : 'transparent',
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setThemeMode('light')}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    {
                      color: themeMode === 'light' ? colors.primaryDark : colors.textSecondary,
                    },
                  ]}
                >
                  Светлая
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  {
                    backgroundColor: themeMode === 'dark' ? colors.primaryLight : 'transparent',
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setThemeMode('dark')}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    {
                      color: themeMode === 'dark' ? colors.primaryDark : colors.textSecondary,
                    },
                  ]}
                >
                  Тёмная
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  {
                    backgroundColor: themeMode === 'system' ? colors.primaryLight : 'transparent',
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setThemeMode('system')}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    {
                      color: themeMode === 'system' ? colors.primaryDark : colors.textSecondary,
                    },
                  ]}
                >
                  Авто
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Выбор цветовой схемы */}
          <TouchableOpacity
            style={[
              styles.settingRow,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => setShowThemeModal(true)}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                Цветовая схема
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {availableAccents.find(a => a.key === themeAccent)?.label}
              </Text>
            </View>
            <Text style={[styles.chevron, { color: colors.textTertiary }]}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Другие настройки */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[
              styles.settingRow,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
              Настройки
            </Text>
            <Text style={[styles.chevron, { color: colors.textTertiary }]}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.settingRow,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
              Мои цели
            </Text>
            <Text style={[styles.chevron, { color: colors.textTertiary }]}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.settingRow,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
              Травмы и ограничения
            </Text>
            <Text style={[styles.chevron, { color: colors.textTertiary }]}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Кнопка выхода */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.error }]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Выйти из аккаунта</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Модальное окно выбора темы */}
      <Modal
        visible={showThemeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowThemeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Выберите цветовую схему
              </Text>
              <TouchableOpacity onPress={() => setShowThemeModal(false)}>
                <Text style={[styles.modalClose, { color: colors.primary }]}>
                  Закрыть
                </Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={availableAccents}
              renderItem={renderThemeOption}
              keyExtractor={(item) => item.key}
              contentContainerStyle={styles.modalList}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
  },
  modeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 20,
    marginLeft: 8,
  },
  logoutButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Модальное окно
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalClose: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalList: {
    padding: 16,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  themeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themePreview: {
    flexDirection: 'row',
    gap: 6,
  },
  previewCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  themeLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});