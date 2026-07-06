import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { CustomTabBar } from '../../src/components/CustomTabBar';
import { useTheme } from '../../src/hooks/useTheme';

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'Главная' }}
        />
        <Tabs.Screen
          name="programs"
          options={{ title: 'Программы' }}
        />
        <Tabs.Screen
          name="workouts"
          options={{ title: 'Тренировки' }}
        />
        <Tabs.Screen
          name="exercises"
          options={{ title: 'Справочник' }}
        />
        <Tabs.Screen
          name="history"
          options={{ title: 'История' }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: 'Профиль' }}
        />
      </Tabs>
    </View>
  );
}