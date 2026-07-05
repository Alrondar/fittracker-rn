import { Tabs } from 'expo-router';
import { CustomTabBar } from '../../src/components/CustomTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Главная',
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Тренировки',
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: 'Справочник',
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'История',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профиль',
        }}
      />
    </Tabs>
  );
}