// src/components/ui/WebRefreshButton.tsx
// WEB-BUG-4: в мобильном браузере жеста pull-to-refresh НЕТ — RNW `RefreshControl`
// это обёртка над `View` (`onRefresh` не вызывается; проверено в
// react-native-web/dist/exports/RefreshControl). При `staleTime` 5 мин (Q.SLOW)
// пользователь браузера не мог принудительно обновить данные. Кнопка-замена
// живёт в шапках табов; на нативных платформах рендерит `null` (там PTR работает).
import { Platform, ActivityIndicator } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { scale, withAlpha } from '../../constants/theme';
import { PressableScale } from './PressableScale';

interface WebRefreshButtonProps {
  onPress: () => void;
  /** Крутится, пока идёт рефетч (isFetching/refreshing экрана). */
  refreshing?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function WebRefreshButton({ onPress, refreshing = false, style }: WebRefreshButtonProps) {
  const { colors } = useTheme();
  if (Platform.OS !== 'web') return null;
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Обновить данные"
      hitSlop={8}
      style={[
        {
          width: scale(36),
          height: scale(36),
          borderRadius: scale(18),
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: withAlpha(colors.primary, 0.08),
        },
        style,
      ]}
    >
      {refreshing ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <RefreshCw size={scale(18)} color={colors.primary} strokeWidth={2} />
      )}
    </PressableScale>
  );
}
