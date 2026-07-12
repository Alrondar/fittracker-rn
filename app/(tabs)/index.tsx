import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';

// ✅ Правильные пути (../../src/...)
import DumbbellIcon from '../../src/assets/equipment-icons/dumbbell.svg';
import BarbellIcon from '../../src/assets/equipment-icons/barbell.svg';
import KettlebellIcon from '../../src/assets/equipment-icons/kettlebell.svg';
import LegPressIcon from '../../src/assets/equipment-icons/leg-press.svg';
import SquatRackIcon from '../../src/assets/equipment-icons/squat-rack.svg';

export default function TestSvg() {
  const router = useRouter();

  const icons = [
    { name: 'Гантели', Icon: DumbbellIcon, color: '#EF4444' },
    { name: 'Штанга', Icon: BarbellIcon, color: '#3B82F6' },
    { name: 'Гири', Icon: KettlebellIcon, color: '#10B981' },
    { name: 'Жим ногами', Icon: LegPressIcon, color: '#F59E0B' },
    { name: 'Стойки', Icon: SquatRackIcon, color: '#8B5CF6' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Назад</Text>
      </TouchableOpacity>
      
      <Text style={styles.title}>Тест SVG иконок</Text>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {icons.map((item, idx) => (
          <View key={idx} style={styles.iconRow}>
            <item.Icon width={80} height={80} fill={item.color} />
            <Text style={styles.iconName}>{item.name}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 16,
  },
  backText: {
    fontSize: 16,
    color: '#3B82F6',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 20,
  },
  iconName: {
    fontSize: 18,
    fontWeight: '500',
  },
});