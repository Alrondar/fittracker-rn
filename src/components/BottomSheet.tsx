import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  PanResponder,
  ScrollView,
  Platform,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../constants/theme';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BottomSheetItem {
  label: string;
  icon?: string;
  onPress: () => void;
  destructive?: boolean;
}

interface CustomBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: BottomSheetItem[];
}

export function CustomBottomSheet({
  visible,
  onClose,
  title,
  items,
}: CustomBottomSheetProps) {
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  // Используем CAPTURE версию для перехвата жестов до того, как их получит Modal
const panResponder = useRef(
  PanResponder.create({
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        slideAnim.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {

      if (gestureState.dy > 100 || gestureState.vy > 0.5) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onClose();
      } else {
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }).start();
      }
    },
  })
).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setMounted(false);
      });
    }
  }, [visible]);

  const handleItemPress = (onPress: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    setTimeout(() => onPress(), 300);
  };

  if (!mounted) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              backgroundColor: colors.overlay,
              opacity: backdropAnim,
            },
          ]}
        />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surface,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Зона свайпа: ручка + заголовок */}
        <View {...panResponder.panHandlers} style={styles.dragZone}>
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.textTertiary }]} />
          </View>

          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          </View>
        </View>

        {/* Список элементов */}
        <ScrollView
          style={styles.items}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {items.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.item,
                { borderBottomColor: colors.borderLight },
                item.destructive && { backgroundColor: colors.errorLight },
              ]}
              onPress={() => handleItemPress(item.onPress)}
              activeOpacity={0.7}
            >
              {item.icon && <Text style={styles.itemIcon}>{item.icon}</Text>}
              <Text
                style={[
                  styles.itemLabel,
                  { color: item.destructive ? colors.error : colors.textPrimary },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ height: 40 }} />
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: SCREEN_HEIGHT * 0.6,
    paddingBottom: 30,
  },
  dragZone: {
    // Вся эта зона реагирует на свайп
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    paddingHorizontal: SPACING.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  items: {
    paddingHorizontal: SPACING.lg,
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  itemIcon: {
    fontSize: 20,
    marginRight: SPACING.md,
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
});