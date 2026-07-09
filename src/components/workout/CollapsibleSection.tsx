import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  borderColor: string;
  children: React.ReactNode;
  colors: any;
}

export function CollapsibleSection({ title, icon, expanded, onToggle, borderColor, children, colors }: CollapsibleSectionProps) {
  return (
    <View style={{ marginBottom: SPACING.sm, borderWidth: 1.5, borderColor, borderRadius: BORDER_RADIUS.md, overflow: 'hidden' }}>
      <TouchableOpacity
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md, backgroundColor: colors.surfaceSecondary }}
        onPress={onToggle}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 }}>
          {icon}
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>{title}</Text>
        </View>
        {expanded ? <ChevronDown size={16} color={colors.textSecondary} strokeWidth={2} /> : <ChevronRight size={16} color={colors.textSecondary} strokeWidth={2} />}
      </TouchableOpacity>
      {expanded && <View style={{ padding: SPACING.md, backgroundColor: colors.surface }}>{children}</View>}
    </View>
  );
}