import { View, Text, StyleSheet, TouchableOpacity, Alert, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import * as Haptics from 'expo-haptics';

export default function ProfileScreen() {
  const router = useRouter();
  const { setAuth, userId } = useStore();
  const { colors, themeMode, setThemeMode, isDark } = useTheme();

  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Выйти из аккаунта',
      'Вы уверены, что хотите выйти?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              setAuth(null);
              router.replace('/(auth)/login');
            } catch (error: any) {
              Alert.alert('Ошибка', error.message);
            }
          },
        },
      ]
    );
  };

  const toggleTheme = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setThemeMode(isDark ? 'light' : 'dark');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
        <Text style={styles.avatarText}>👤</Text>
      </View>
      
      <Text style={[styles.title, { color: colors.textPrimary }]}>Профиль</Text>
      {userId && (
        <Text style={[styles.userId, { color: colors.textTertiary }]}>ID: {userId.slice(0, 8)}...</Text>
      )}
      
      {/* Переключатель темы */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingIcon, { fontSize: 24 }]}>🌙</Text>
            <View style={styles.settingText}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Темная тема</Text>
              <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                {isDark ? 'Включена' : 'Выключена'}
              </Text>
            </View>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={isDark ? colors.primary : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        >
          <Text style={styles.menuIcon}>⚙️</Text>
          <Text style={[styles.menuText, { color: colors.textPrimary }]}>Настройки</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        >
          <Text style={styles.menuIcon}>🎯</Text>
          <Text style={[styles.menuText, { color: colors.textPrimary }]}>Мои цели</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        >
          <Text style={styles.menuIcon}>🚨</Text>
          <Text style={[styles.menuText, { color: colors.textPrimary }]}>Травмы и ограничения</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.logoutButton, { backgroundColor: colors.error }]} 
        onPress={handleLogout}
      >
        <Text style={[styles.logoutText, { color: colors.textInverse }]}>Выйти из аккаунта</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: SPACING.xl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  avatarText: { fontSize: 48 },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginBottom: SPACING.xs,
  },
  userId: { 
    fontSize: 12, 
    textAlign: 'center', 
    marginBottom: SPACING.xxl,
  },
  section: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: SPACING.md,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
  },
  menuIcon: { 
    fontSize: 24, 
    marginRight: SPACING.md,
  },
  menuText: { 
    fontSize: 16,
  },
  logoutButton: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});