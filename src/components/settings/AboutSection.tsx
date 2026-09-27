// src/components/settings/AboutSection.tsx
// DA-P2-8: секция «О приложении».
import React from 'react';
import { View } from 'react-native';
import { feedback } from '../../lib/feedback';
import { Info, HelpCircle } from 'lucide-react-native';
import { commonStyles } from '../../styles/common';
import { LinkRow, SectionTitle } from './SettingsRows';

export function AboutSection() {
  return (
    <View style={commonStyles.section}>
      <SectionTitle title="О приложении" />
      <LinkRow
        icon={Info}
        title="О приложении"
        onPress={() =>
          feedback.alert('О приложении', 'FitTracker v1.0.0\nСоздано с ❤️ для спортсменов')
        }
      />
      <LinkRow
        icon={HelpCircle}
        title="Помощь и поддержка"
        onPress={() => feedback.alert('Помощь', 'Свяжитесь с нами: support@fittracker.app')}
      />
    </View>
  );
}
