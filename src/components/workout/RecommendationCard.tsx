// src/components/workout/RecommendationCard.tsx
// COACH-1: Recommendation Card — canonical hierarchy (PRODUCT.md §3.3, §4.5,
// UX_AUDIT_PLAN): primary = вес × повторы, secondary = Принять/Изменить,
// tertiary = Почему? (collapsible).
//
// Consumes ENG-1/2/4/3 data produced by SetsGrid: recommendation (with
// safetyOverride/readinessOverride) and explanationItems from explainProgression.
//
// Does NOT touch engine, does NOT make server calls — pure presentation.
// All colors come from the `colors` prop (semantic tokens) — CLAUDE.md §7.
import { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Target, TrendingDown, Minus, ChevronDown, EyeOff } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import type {
  ProgressionResult,
  SafetyOverride,
  ReadinessOverride,
  ExplanationItem,
} from '../../engine/progression';
import { WeightUnit } from '../../hooks/useUnitPreferences';

interface RecommendationCardProps {
  recommendation: ProgressionResult & {
    safetyOverride?: SafetyOverride | null;
    readinessOverride?: ReadinessOverride | null;
  };
  explanationItems: ExplanationItem[];
  /** Цвет акцента карточки (success/warning/primary) — уже вычислен SetsGrid'ом. */
  accentColor: string;
  /** Semantic tokens из useTheme(). */
  colors: any;
  /** Форматирование веса: toDisplay(kgStr). */
  toDisplay: (kgStr: string) => string;
  unit: WeightUnit;
  // State
  expanded: boolean;
  // Handlers
  onToggleExpand: () => void;
  onAccept: () => void;
  onChange: () => void;
  onDismiss: () => void;
  // Guards
  /** Принять disabled если нет незавершённого сета. */
  acceptDisabled: boolean;
  /** «Изменить» активен (чипы раскрыты) — подсвечиваем кнопку. */
  chipsOpen: boolean;
}

/** Формат primary value: 87.5 кг × 8 — или только вес, если reps нет. */
function formatPrimaryValue(
  suggestedWeight: number | null | undefined,
  suggestedReps: number | null | undefined,
  toDisplay: (kg: string) => string,
  unit: WeightUnit,
): string {
  if (suggestedWeight == null) return '—';
  const weightText = `${toDisplay(String(suggestedWeight))} ${unit}`;
  if (suggestedReps != null) return `${weightText} × ${suggestedReps}`;
  return weightText;
}

export const RecommendationCard = memo(function RecommendationCard({
  recommendation,
  explanationItems,
  accentColor,
  colors,
  toDisplay,
  unit,
  expanded,
  onToggleExpand,
  onAccept,
  onChange,
  onDismiss,
  acceptDisabled,
  chipsOpen,
}: RecommendationCardProps) {
  // Иконка действия
  const Icon =
    recommendation.action === 'increase'
      ? Target
      : recommendation.action === 'decrease'
        ? TrendingDown
        : Minus;

  // One-liner: safety override > readiness override > reason
  const oneLinerText =
    recommendation.safetyOverride?.ruText ??
    recommendation.readinessOverride?.ruText ??
    recommendation.reason.ruText;

  // Primary value
  const primaryValue = formatPrimaryValue(
    recommendation.suggestedWeight,
    recommendation.suggestedReps,
    toDisplay,
    unit,
  );

  // Для suppressed (action=no_data) — не рендерим карточку (caller'ы уже фильтруют).
  if (recommendation.action === 'no_data') return null;

  // Вложенный в hint-блок (primary+08): прозрачный фон, тонкая обводка акцентом,
  // скругление SM чтобы не «съедать» геометрию внешнего блока.
  return (
    <View
      style={{
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: accentColor + '40',
        borderRadius: BORDER_RADIUS.sm,
        padding: SPACING.sm,
        marginTop: SPACING.sm,
      }}
    >
      {/* === TERTIARY: header row (reason + chevron affordance → expand/collapse) === */}
      <TouchableOpacity
        onPress={onToggleExpand}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          marginBottom: SPACING.sm,
        }}
      >
        <Icon size={14} color={accentColor} strokeWidth={2.2} />
        <Text
          style={[
            typography.captionSmall,
            { color: accentColor, fontWeight: '700', flex: 1 },
          ]}
          numberOfLines={2}
        >
          {oneLinerText}
        </Text>
        <Text
          style={[
            typography.captionSmall,
            { color: accentColor, fontWeight: '600', opacity: 0.8 },
          ]}
        >
          Почему?
        </Text>
        <ChevronDown
          size={14}
          color={accentColor}
          strokeWidth={2.2}
          style={{
            transform: [{ rotate: expanded ? '180deg' : '0deg' }],
          }}
        />
      </TouchableOpacity>

      {/* === PRIMARY: weight × reps (large, accent color) === */}
      <Text
        style={{
          fontSize: 28,
          fontWeight: '800',
          color: accentColor,
          letterSpacing: -0.5,
          marginBottom: SPACING.md,
        }}
      >
        {primaryValue}
      </Text>

      {/* === SECONDARY: Принять / Изменить === */}
      <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
        {/* Принять — primary action */}
        <TouchableOpacity
          onPress={onAccept}
          disabled={acceptDisabled}
          activeOpacity={0.8}
          style={{
            flex: 1,
            backgroundColor: acceptDisabled ? colors.border : accentColor,
            paddingVertical: 10,
            borderRadius: BORDER_RADIUS.sm,
            alignItems: 'center',
            opacity: acceptDisabled ? 0.5 : 1,
          }}
        >
          <Text
            style={[
              typography.button,
              {
                color: colors.textInverse,
                fontWeight: '700',
                fontSize: 14,
              },
            ]}
          >
            Принять
          </Text>
        </TouchableOpacity>

        {/* Изменить — secondary action, активен когда chipsOpen */}
        <TouchableOpacity
          onPress={onChange}
          activeOpacity={0.7}
          style={{
            flex: 1,
            backgroundColor: chipsOpen ? accentColor + '20' : 'transparent',
            borderWidth: 1,
            borderColor: accentColor,
            paddingVertical: 10,
            borderRadius: BORDER_RADIUS.sm,
            alignItems: 'center',
          }}
        >
          <Text
            style={[
              typography.button,
              {
                color: accentColor,
                fontWeight: '600',
                fontSize: 14,
              },
            ]}
          >
            Изменить
          </Text>
        </TouchableOpacity>
      </View>

      {/* === TERTIARY: expanded block (ENG-2 facts + Скрыть) === */}
      {expanded && (
        <View
          style={{
            marginTop: SPACING.md,
            paddingTop: SPACING.sm,
            paddingLeft: SPACING.sm,
            borderLeftWidth: 2,
            borderLeftColor: accentColor + '60',
          }}
        >
          {explanationItems.map((item, idx) => {
            const color =
              item.emphasis === 'success'
                ? colors.success
                : item.emphasis === 'warning'
                  ? colors.warning
                  : item.emphasis === 'primary'
                    ? accentColor
                    : colors.textSecondary;
            const isConclusion = item.kind === 'conclusion';
            return (
              <View
                key={idx}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <Text
                  style={[
                    typography.captionSmall,
                    {
                      color: colors.textTertiary,
                      fontWeight: '600',
                      minWidth: 90,
                    },
                  ]}
                >
                  {item.label}
                </Text>
                <Text
                  style={[
                    typography.captionSmall,
                    {
                      color,
                      fontWeight: isConclusion ? '700' : '400',
                      flex: 1,
                    },
                  ]}
                >
                  {item.value}
                </Text>
              </View>
            );
          })}

          {/* Скрыть — session-local dismiss (PRODUCT.md §3: user control) */}
          <TouchableOpacity
            onPress={onDismiss}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              marginTop: SPACING.xs,
              paddingVertical: 2,
              alignSelf: 'flex-start',
            }}
          >
            <EyeOff size={12} color={colors.textTertiary} strokeWidth={2} />
            <Text
              style={[
                typography.captionSmall,
                { color: colors.textTertiary, fontWeight: '500' },
              ]}
            >
              Скрыть
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});
