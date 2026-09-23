import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../src/hooks/useTheme';
import { SPACING } from '../../src/constants/theme';
import { commonStyles } from '../../src/styles/common';
import { typography } from '../../src/styles/typography';
import { ProfileSection } from '../../src/components/settings/ProfileSection';
import { AppearanceSection } from '../../src/components/settings/AppearanceSection';
import { PreferencesSection } from '../../src/components/settings/PreferencesSection';
import { RestTimerSection } from '../../src/components/settings/RestTimerSection';
import { AboutSection } from '../../src/components/settings/AboutSection';

// DA-P2-8: экран разбит на секции в src/components/settings/* (было 909 строк).
export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      {/* Шапка */}
      <View
        style={[
          commonStyles.navHeader,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={commonStyles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Назад"
        >
          <ChevronLeft size={24} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[typography.h4, { color: colors.textPrimary }]}>Настройки</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}>
        <ProfileSection />
        <AppearanceSection />
        <PreferencesSection />
        <RestTimerSection />
        <AboutSection />
      </ScrollView>
    </SafeAreaView>
  );
}
