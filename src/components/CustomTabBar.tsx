import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, Trophy, Dumbbell, BookOpen, Clock, User } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <View style={[styles.tabBar, { backgroundColor: colors.surface }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel || options.title || route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const iconColor = isFocused ? colors.primary : colors.textSecondary;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tab}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                {isFocused && <View style={[styles.indicator, { backgroundColor: colors.primary }]} />}
                <View style={{ opacity: isFocused ? 1 : 0.6 }}>
                  {getTabIcon(route.name, iconColor)}
                </View>
              </View>
              <Text style={[styles.label, { color: isFocused ? colors.primary : colors.textSecondary }]}>
                {typeof label === 'string' ? label : route.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function getTabIcon(routeName: string, color: string) {
  const size = 22;
  const strokeWidth = 1.5; // Делаем линии тонкими для современного вида

  switch (routeName) {
    case 'index':
      return <Home size={size} color={color} strokeWidth={strokeWidth} />;
    case 'programs':
      return <Trophy size={size} color={color} strokeWidth={strokeWidth} />;
    case 'workouts':
      return <Dumbbell size={size} color={color} strokeWidth={strokeWidth} />;
    case 'exercises':
      return <BookOpen size={size} color={color} strokeWidth={strokeWidth} />;
    case 'history':
      return <Clock size={size} color={color} strokeWidth={strokeWidth} />;
    case 'profile':
      return <User size={size} color={color} strokeWidth={strokeWidth} />;
    default:
      return <Home size={size} color={color} strokeWidth={strokeWidth} />;
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.sm,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    position: 'relative',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    height: 24, // Фиксированная высота, чтобы интерфейс не прыгал
  },
  indicator: {
    position: 'absolute',
    top: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
  },
});