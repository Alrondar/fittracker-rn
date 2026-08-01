import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomTabBar } from '../../src/components/CustomTabBar';
import { useTheme } from '../../src/hooks/useTheme';
import { commonStyles } from '../../src/styles/common';

export default function TabsLayout() {
  const { colors, isDark } = useTheme();

  return (
    <SafeAreaView 
      style={[commonStyles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      <View style={commonStyles.container}>
        <Tabs
          tabBar={(props) => <CustomTabBar {...props} />}
          screenOptions={{
            headerShown: false,
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
    </SafeAreaView>
  );
}