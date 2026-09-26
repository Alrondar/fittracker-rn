import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Trophy, Dumbbell, BookOpen, Activity, User } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SPACING, BORDER_RADIUS, scale, fontScale } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import * as Haptics from 'expo-haptics';

// UX-1 (audit-9): pill ездит на spring (лёгкий overshoot вместо linear-затухания),
// иконка получает scale-pop при фокусе.
const PILL_SPRING = { damping: 22, stiffness: 260, mass: 0.9 };
const POP_SPRING = { damping: 12, stiffness: 500, mass: 0.8 };

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  // ✅ Резерв под системную навигацию: кнопки Android больше не перекрывают подписи.
  const insets = useSafeAreaInsets();
  const [tabWidth, setTabWidth] = useState(0);

  const translateX = useSharedValue(0);
  const laidOutRef = useRef(false);
  useEffect(() => {
    if (tabWidth <= 0) return;
    // Первый layout — мгновенная установка, чтобы pill не «прилетал» из 0.
    translateX.value = laidOutRef.current
      ? withSpring(state.index * tabWidth, PILL_SPRING)
      : withTiming(state.index * tabWidth, { duration: 0 });
    laidOutRef.current = true;
  }, [state.index, tabWidth, translateX]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: tabWidth > 0 ? 1 : 0,
  }));

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: 'transparent', paddingBottom: insets.bottom + SPACING.sm },
      ]}
    >
      <View
        style={[styles.tabBar, { backgroundColor: colors.surface }]}
        onLayout={(e) => {
          const inner = e.nativeEvent.layout.width - SPACING.xs * 2;
          setTabWidth(inner / state.routes.length);
        }}
      >
        {/* Скользящий pill-индикатор */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pill,
            {
              width: Math.max(tabWidth - 4, 0),
              left: SPACING.xs + 2,
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
            },
            pillStyle,
          ]}
        />
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

          const iconColor = isFocused ? colors.textInverse : colors.textSecondary;
          const strokeWidth = isFocused ? 2 : 1.5;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tab}
              activeOpacity={0.8}
            >
              <TabIcon
                name={route.name}
                color={iconColor}
                strokeWidth={strokeWidth}
                focused={isFocused}
              />

              <Text
                style={[
                  styles.label,
                  {
                    color: isFocused ? colors.textInverse : colors.textSecondary,
                    fontWeight: isFocused ? '600' : '500',
                  },
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

// UX-1 (audit-9): pop-анимация иконки при фокусе таба (первый монтаж не анимируем).
function TabIcon({
  name,
  color,
  strokeWidth,
  focused,
}: {
  name: string;
  color: string;
  strokeWidth: number;
  focused: boolean;
}) {
  const pop = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (focused) {
      pop.value = withSequence(withSpring(1.16, POP_SPRING), withSpring(1, POP_SPRING));
    }
  }, [focused, pop]);

  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }));

  return (
    <Animated.View style={[styles.iconContainer, popStyle]}>
      {getTabIcon(name, color, strokeWidth)}
    </Animated.View>
  );
}

function getTabIcon(routeName: string, color: string, strokeWidth: number) {
  const size = scale(22);
  switch (routeName) {
    case 'index':
      return <Home size={size} color={color} strokeWidth={strokeWidth} />;
    case 'programs':
      return <Trophy size={size} color={color} strokeWidth={strokeWidth} />;
    case 'workouts':
      return <Dumbbell size={size} color={color} strokeWidth={strokeWidth} />;
    case 'exercises':
      return <BookOpen size={size} color={color} strokeWidth={strokeWidth} />;
    case 'progress':
      return <Activity size={size} color={color} strokeWidth={strokeWidth} />;
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
    padding: SPACING.xs, // Компактный padding для 6 табов
    backgroundColor: 'transparent', // Фон управляется SafeAreaView/контейнером
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    position: 'relative',
    borderRadius: BORDER_RADIUS.full,
  },
  pill: {
    position: 'absolute',
    top: SPACING.xs + 2,
    bottom: SPACING.xs + 2,
    borderRadius: BORDER_RADIUS.full,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 0,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    height: 24,
    zIndex: 1, // Иконка поверх pill
  },
  label: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontScale(10),
    fontWeight: '500',
    zIndex: 1, // Текст поверх pill
  },
});
