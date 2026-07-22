import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { X, Link2 } from 'lucide-react-native';
import { useTheme } from '../../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { typography } from '../../../styles/typography';

interface ImportProgramSheetProps {
  code: string;
  onChangeCode: (v: string) => void;
  importing: boolean;
  error: string | null;
  onImport: () => void;
  onClose: () => void;
}

export function ImportProgramSheet({ code, onChangeCode, importing, error, onImport, onClose }: ImportProgramSheetProps) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
      <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.xl, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={[typography.h3, { color: colors.textPrimary }]}>Импорт по коду</Text>
          <TouchableOpacity onPress={onClose}><X size={24} color={colors.textSecondary} /></TouchableOpacity>
        </View>
        <View style={{ padding: SPACING.xl }}>
          <Text style={[typography.body, { color: colors.textSecondary, marginBottom: SPACING.md }]}>
            Введите код, который вам отправили (например, FIT-ABC123).
          </Text>
          <TextInput
            style={{ backgroundColor: colors.surface, color: colors.textPrimary, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, fontSize: 18, fontWeight: '700', letterSpacing: 1, borderWidth: 1, borderColor: error ? colors.error : colors.border, textAlign: 'center', marginBottom: SPACING.md }}
            placeholder="FIT-ABC123"
            placeholderTextColor={colors.textTertiary}
            value={code}
            onChangeText={onChangeCode}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={12}
          />
          {error ? (
            <Text style={[typography.caption, { color: colors.error, marginBottom: SPACING.md, textAlign: 'center' }]}>{error}</Text>
          ) : null}
          <TouchableOpacity
            onPress={onImport}
            disabled={importing || code.trim().length < 4}
            activeOpacity={0.8}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: importing || code.trim().length < 4 ? colors.textTertiary : colors.primary, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.lg, opacity: importing || code.trim().length < 4 ? 0.6 : 1 }}
          >
            {importing ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Link2 size={20} color={colors.textInverse} strokeWidth={2} />
            )}
            <Text style={[typography.labelBold, { color: colors.textInverse }]}>{importing ? 'Импорт...' : 'Добавить программу'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}