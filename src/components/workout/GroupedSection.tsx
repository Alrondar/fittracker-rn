import { View } from 'react-native';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';

interface GroupedSectionProps {
  borderColor: string;
  children: React.ReactNode;
  colors: any;
}

export function GroupedSection({ borderColor, children, colors }: GroupedSectionProps) {
  return (
    <View style={{ marginBottom: SPACING.sm, borderWidth: 1.5, borderColor, borderRadius: BORDER_RADIUS.md, overflow: 'hidden' }}>
      <View style={{ padding: SPACING.md, backgroundColor: colors.surface }}>{children}</View>
    </View>
  );
}