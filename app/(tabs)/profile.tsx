import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useStore } from '../../src/store/useStore';
import * as Haptics from 'expo-haptics';

export default function ProfileScreen() {
  const router = useRouter();
  const { setAuth, userId } = useStore();

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

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>👤</Text>
      </View>
      
      <Text style={styles.title}>Профиль</Text>
      {userId && (
        <Text style={styles.userId}>ID: {userId.slice(0, 8)}...</Text>
      )}
      
      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
          <Text style={styles.menuIcon}>⚙️</Text>
          <Text style={styles.menuText}>Настройки</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
          <Text style={styles.menuIcon}>🎯</Text>
          <Text style={styles.menuText}>Мои цели</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
          <Text style={styles.menuIcon}>🚨</Text>
          <Text style={styles.menuText}>Травмы и ограничения</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Выйти из аккаунта</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf5ff', padding: 24 },
  avatar: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#ede9fe',
    justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 16,
  },
  avatarText: { fontSize: 48 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 8, color: '#1f2937' },
  userId: { fontSize: 12, textAlign: 'center', color: '#9ca3af', marginBottom: 32 },
  section: {
    backgroundColor: 'white', borderRadius: 12, overflow: 'hidden', marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  menuIcon: { fontSize: 24, marginRight: 16 },
  menuText: { fontSize: 16, color: '#1f2937' },
  logoutButton: {
    backgroundColor: '#ef4444', padding: 16, borderRadius: 12, alignItems: 'center',
  },
  logoutText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});