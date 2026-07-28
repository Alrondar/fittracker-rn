import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Share } from 'react-native';
import { X, Share2 } from 'lucide-react-native';
import { useTheme } from '../../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { typography } from '../../../styles/typography';
import { formatShareCode } from '../../../services/programSharingService';

interface ShareProgramSheetProps {
  code: string | null;
  loading: boolean;
  programName: string;
  onShare: () => void;
  onClose: () => void;
}

export function ShareProgramSheet({ code, loading, programName, onShare, onClose }: ShareProgramSheetProps) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
      <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: SPACING.xl,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Text style={[typography.h3, { color: colors.textPrimary }]}>Поделиться программой</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={{ padding: SPACING.xl }}>
          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: SPACING.xl }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[typography.body, { color: colors.textSecondary, marginTop: SPACING.md }]}>
                Создаём код...
              </Text>
            </View>
          ) : code ? (
            <>
              <Text style={[typography.body, { color: colors.textSecondary, marginBottom: SPACING.md }]}>
                Отправьте код другу — он добавит вашу программу «{programName}» через «Программы → Импорт по коду».
              </Text>
              <View
                style={{
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: BORDER_RADIUS.lg,
                  padding: SPACING.lg,
                  alignItems: 'center',
                  marginBottom: SPACING.lg,
                }}
              >
                <Text style={[typography.h2, { color: colors.primary, fontWeight: '800', letterSpacing: 1 }]}>
                  {formatShareCode(code)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onShare}
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: SPACING.sm,
                  backgroundColor: colors.primary,
                  paddingVertical: SPACING.md,
                  borderRadius: BORDER_RADIUS.lg,
                }}
              >
                <Share2 size={20} color={colors.textInverse} strokeWidth={2} />
                <Text style={[typography.labelBold, { color: colors.textInverse }]}>Поделиться через...</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text
              style={[
                typography.body,
                { color: colors.textSecondary, textAlign: 'center', paddingVertical: SPACING.xl },
              ]}
            >
              Не удалось создать код. Можно делиться только своими программами.
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}