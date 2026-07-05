import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../constants/theme';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DELETE_THRESHOLD = SCREEN_WIDTH * 0.3;
const LONG_PRESS_DURATION = 500;
const SWIPE_THRESHOLD = 30;

interface SwipeableCardProps {
  children: React.ReactNode;
  onDelete: () => void;
  onLongPress?: () => void;
  onPress?: () => void;
  disabled?: boolean;
}

export function SwipeToDeleteCard({ children, onDelete, onLongPress, onPress, disabled = false }: SwipeableCardProps) {
  const { colors } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const hasMoved = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      // ВАЖНО: захватываем жест сразу при касании
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      
      onPanResponderGrant: () => {
        console.log('🔵 onPanResponderGrant - запускаем таймер');
        isLongPress.current = false;
        hasMoved.current = false;

        longPressTimer.current = setTimeout(() => {
          console.log('⏰ ТАЙМЕР СРАБОТАЛ - долгое нажатие!');
          isLongPress.current = true;
          Haptics.impactAsync();
          if (onLongPress) {
            console.log('🔥 Вызываем onLongPress!');
            onLongPress();
          }
        }, LONG_PRESS_DURATION);
      },
      
      onPanResponderMove: (_, gestureState) => {
        // Если движение больше порога — это свайп
        if (Math.abs(gestureState.dx) > SWIPE_THRESHOLD) {
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
            console.log('❌ Таймер отменён - это свайп');
          }
          hasMoved.current = true;
        }

        // Двигаем карточку только при свайпе влево
        if (gestureState.dx < 0 && !isLongPress.current) {
          translateX.setValue(gestureState.dx);
        }
      },
      
      onPanResponderRelease: (_, gestureState) => {
        console.log('🔴 onPanResponderRelease, dx:', gestureState.dx, 'dy:', gestureState.dy, 'isLongPress:', isLongPress.current, 'hasMoved:', hasMoved.current);

        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }

        // Если сработало долгое нажатие
        if (isLongPress.current) {
          console.log('✅ Долгое нажатие');
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
          return;
        }

        // Если свайп для удаления
        if (gestureState.dx < -DELETE_THRESHOLD || gestureState.vx < -0.5) {
          console.log('🗑️ Свайп для удаления');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          Animated.timing(translateX, {
            toValue: -SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onDelete();
            translateX.setValue(0);
          });
        } 
        // Если не было движения — это короткое нажатие
        else if (!hasMoved.current && Math.abs(gestureState.dx) < 10 && Math.abs(gestureState.dy) < 10) {
          console.log('👆 Короткое нажатие');
          Haptics.impactAsync();
          if (onPress) {
            onPress();
          }
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        } 
        // Возврат карточки
        else {
          console.log('↩️ Возврат карточки');
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        }
      },
    })
  ).current;

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.deleteButton, { backgroundColor: colors.error }]}>
        <Text style={styles.deleteIcon}>🗑️</Text>
        <Text style={styles.deleteText}>Удалить</Text>
      </View>

      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  deleteButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.3,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
  },
  deleteIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  deleteText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  card: {
  },
});