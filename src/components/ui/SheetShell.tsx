import React from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';

// ✅ ДОБАВЛЕНО: Объявление пропсов компонента
export interface SheetShellProps {
  visible?: boolean;
  title?: string;
  onClose: () => void;
  keyboardVerticalOffset?: number;
  children: React.ReactNode;
}

export function SheetShell({
  visible = true,
  title,
  onClose,
  keyboardVerticalOffset = 0,
  children,
}: SheetShellProps) {
  if (!visible) return null;

  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={keyboardVerticalOffset}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, backgroundColor: colors.overlay }}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={onClose}
          />

          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: BORDER_RADIUS.xl,
              borderTopRightRadius: BORDER_RADIUS.xl,
              maxHeight: '92%',
            }}
          >
            {title ? (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: SPACING.lg,
                  paddingTop: SPACING.lg,
                  paddingBottom: SPACING.md,
                }}
              >
                <Text
                  style={[typography.h5, { color: colors.textPrimary, flex: 1 }]}
                  numberOfLines={1}
                >
                  {title}
                </Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={20} color={colors.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            ) : null}

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: SPACING.lg,
                paddingBottom: Math.max(SPACING.lg, insets.bottom + SPACING.md),
              }}
            >
              {children}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}