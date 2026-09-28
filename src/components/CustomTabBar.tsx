import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { PressableScale } from './ui/PressableScale';
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
import { SPACING, BORDER_RADIUS, scale } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import * as Haptics from 'expo-haptics';

// UX-1 (audit-9): pill ездит на spring (лёгкий overshoot вместо linear-затухания),
// иконка получает scale-pop при фокусе.
// UX-5 (27.09): канон §3.6 — подписи убраны, пилюля = капсула вокруг иконки
// (решение владельца: компактный бар на 6 вкладок; доступность — accessibilityLabel).
// 28.09: владелец подтвердил форму — капсула, шире высоты (как в исходном
// референсе), а не круг: пилюля занимает ячейку вкладки с полями.
const PILL_SPRING = { damping: 22, stiffness: 260, mass: 0.9 };
const POP_SPRING = { damping: 12, stiffness: 500, mass: 0.8 };
const TAB_HEIGHT = scale(46) + SPACING.xs * 2;
// Капсула (28.09): заметно шире высоты, как в референсе. Пилюля позиционируется
// от tabBar (его padding SPACING.xs сверху/снизу), поэтому top = padding +
// половина свободного места ячейки.
const PILL_HEIGHT = scale(40);
const PILL_TOP = SPACING.xs + (TAB_HEIGHT - PILL_HEIGHT) / 2;

// WEB-2: на вебе `useSafeAreaInsets()` отдаёт нули (insets — нативная концепция),
// а iOS Safari прячет часть бара под адресной строкой → берём CSS env().
const IS_WEB = Platform.OS === 'web';
const WEB_BOTTOM_INSET = 'calc(env(safe-area-inset-bottom, 0px) + 8px)';

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
        { backgroundColor: 'transparent' },
        IS_WEB
          ? { paddingBottom: WEB_BOTTOM_INSET as unknown as number }
          : { paddingBottom: insets.bottom + SPACING.sm },
      ]}
    >
      <View
        style={[styles.tabBar, { backgroundColor: colors.surface }]}
        onLayout={(e) => {
          const inner = e.nativeEvent.layout.width - SPACING.xs * 2;
          setTabWidth(inner / state.routes.length);
        }}
      >
        {/* Скользящий pill-индикатор: капсула на всю ячейку (28.09) */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pill,
            {
              width: Math.max(tabWidth - SPACING.xs, 0),
              height: PILL_HEIGHT,
              left: SPACING.xs + SPACING.xs / 2,
              top: PILL_TOP,
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
            // WEB-3d: хаптика на вебе бесполезна и шумит в консоль (см. PressableScale).
            if (!IS_WEB) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
            <PressableScale
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              // UX-5: подписей нет → имя вкладки обязано жить в accessibilityLabel.
              accessibilityLabel={
                options.tabBarAccessibilityLabel || (typeof label === 'string' ? label : route.name)
              }
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tab}
              haptic="none"
            >
              <TabIcon
                name={route.name}
                color={iconColor}
                strokeWidth={strokeWidth}
                focused={isFocused}
              />
            </PressableScale>
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
    height: TAB_HEIGHT,
    paddingHorizontal: SPACING.xs,
    position: 'relative',
    borderRadius: BORDER_RADIUS.full,
  },
  pill: {
    position: 'absolute',
    // top — инлайном (PILL_TOP), height/width — из стиля пилюли.
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
    zIndex: 1, // Иконка поверх pill
  },
});
