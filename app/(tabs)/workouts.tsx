import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { Workout } from '../../src/types';
import { useStore } from '../../src/store/useStore';

export default function WorkoutsScreen() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { setWorkouts: setStoreWorkouts } = useStore();

  useEffect(() => {
    console.log('🔵 WorkoutsScreen: Загрузка тренировок');
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    try {
      console.log('🔵 Запрос к Supabase: workouts');
      const { data, error } = await supabase
        .from('workouts')
        .select()
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('🔴 Ошибка загрузки тренировок:', error);
        Alert.alert('Ошибка', error.message);
        return;
      }

      console.log('✅ Загружено тренировок:', data?.length || 0);
      const list = data || [];
      setWorkouts(list);
      setStoreWorkouts(list);
    } catch (e: any) {
      console.error('🔴 Исключение при загрузке:', e);
      Alert.alert('Ошибка', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    console.log('🔄 Обновление списка тренировок');
    setRefreshing(true);
    loadWorkouts();
  };

  const deleteWorkout = async (id: string, name: string) => {
    Alert.alert(
      'Удалить тренировку?',
      `"${name}" будет удалена навсегда`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            console.log('🗑️ Удаление тренировки:', id);
            try {
              // Сначала удаляем workout_exercises
              const { error: weError } = await supabase
                .from('workout_exercises')
                .delete()
                .eq('workout_id', id);
              
              if (weError) {
                console.error('🔴 Ошибка удаления workout_exercises:', weError);
                throw weError;
              }

              // Потом удаляем саму тренировку
              const { error } = await supabase
                .from('workouts')
                .delete()
                .eq('id', id);
              
              if (error) {
                console.error('🔴 Ошибка удаления тренировки:', error);
                throw error;
              }

              console.log('✅ Тренировка удалена');
              Alert.alert('Успех', 'Тренировка удалена');
              loadWorkouts();
            } catch (e: any) {
              console.error('🔴 Исключение при удалении:', e);
              Alert.alert('Ошибка', e.message);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'long',
      year: 'numeric' 
    });
  };

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🏋️</Text>
      <Text style={styles.emptyText}>Нет тренировок</Text>
      <Text style={styles.emptySubtext}>Создай свою первую тренировку!</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>Загрузка...</Text>
        </View>
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                console.log('👆 Открытие тренировки:', item.id);
                router.push(`/workout/${item.id}`);
              }}
              onLongPress={() => {
                console.log('👆 Долгое нажатие на тренировку:', item.name);
                Alert.alert('Действия', item.name, [
                  { 
                    text: 'Редактировать', 
                    onPress: () => {
                      console.log('✏️ Редактирование:', item.id);
                      router.push(`/workout/create?edit=${item.id}`);
                    }
                  },
                  { 
                    text: 'Удалить', 
                    style: 'destructive', 
                    onPress: () => deleteWorkout(item.id, item.name) 
                  },
                  { text: 'Отмена', style: 'cancel' },
                ]);
              }}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
              </View>
              <Text style={styles.cardSubtitle}>
                {item.description || 'Нет описания'}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#7c3aed']}
            />
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          console.log('➕ Создание новой тренировки');
          router.push('/workout/create');
        }}
      >
        <Text style={styles.fabText}>+ Создать</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf5ff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#6b7280' },
  empty: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    paddingVertical: 60 
  },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, color: '#6b7280', marginBottom: 8 },
  emptySubtext: { color: '#9ca3af', fontSize: 14 },
  list: { padding: 16 },
  card: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: { 
    fontSize: 18, 
    fontWeight: 'bold',
    flex: 1,
    marginRight: 12,
  },
  cardDate: { 
    color: '#9ca3af', 
    fontSize: 12 
  },
  cardSubtitle: { 
    color: '#6b7280',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#7c3aed',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 28,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: { 
    color: 'white', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
});