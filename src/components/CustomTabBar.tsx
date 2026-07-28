import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Trophy, Dumbbell, BookOpen, Clock, User } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS, scale, fontScale } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import * as Haptics from 'expo-haptics';

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  // ✅ Резерв под системную навигацию: кнопки Android больше не перекрывают подписи.
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: 'transparent', paddingBottom: insets.bottom + SPACING.sm }]}>
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
              {/* ✅ Подпись не переносится: flex:1 + numberOfLines + центрирование.
                  Размер масштабируется, чтобы на узких экранах влезало в долю вкладки. */}
              <Text
                style={[
                  styles.label,
                  { color: isFocused ? colors.primary : colors.textSecondary },
                ]}
                numberOfLines={1}
              >
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
  const size = scale(22);
  const strokeWidth = 1.5;
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
    paddingHorizontal: 2,
    position: 'relative',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    height: 24,
  },
  indicator: {
    position: 'absolute',
    top: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  label: {
    // ✅ flex:1 + центрирование дают тексту всю ширину доли вкладки;
    // numberOfLines={1} (в JSX) режет перенос. Размер — масштабируемый.
    flex: 1,
    textAlign: 'center',
    fontSize: fontScale(10),
    fontWeight: '500',
  },
});