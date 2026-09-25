// src/components/workout/WarmupExerciseSheet.tsx
// L2 лист упражнения разминки: демонстрация техники видна сразу (не в аккордеоне),
// аналоги изучаемы внутри листа (просмотр без замены) с бейджами relation_type.
// Замена — явный CTA, а не тап по карточке (в отличие от старого слайдера альтернатив).
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  BookOpen,
  Sparkles,
  AlertTriangle,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Shuffle,
  Check,
  RotateCcw,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS, withAlpha } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { SheetShell } from '../ui/SheetShell';
import { AppButton } from '../ui/AppButton';
import { TechniqueMediaSlider, parseMediaUrls } from './TechniqueMediaSlider';
import { ExerciseInfoAccordion } from './ExerciseInfoAccordion';
import { SectionSubheading } from './sections/ExerciseCardTechnique';
import { WarmupTypeChip } from './WarmupExerciseCard';
import { WarmupExercise, WarmupRelationType } from '../../services/warmupService';

const RELATION_META: Record<
  WarmupRelationType,
  { label: string; Icon: typeof Shuffle; color: 'primary' | 'warning' | 'textSecondary' }
> = {
  progression: { label: 'Прогрессия', Icon: TrendingUp, color: 'primary' },
  regression: { label: 'Упрощение', Icon: TrendingDown, color: 'warning' },
  variation: { label: 'Вариант', Icon: Shuffle, color: 'textSecondary' },
  alternative: { label: 'Вариант', Icon: Shuffle, color: 'textSecondary' },
};

function RelationBadge({ relation }: { relation: WarmupRelationType }) {
  const { colors } = useTheme();
  const meta = RELATION_META[relation];
  const color = colors[meta.color];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor:
          meta.color === 'textSecondary'
            ? colors.surfaceSecondary
            : withAlpha(color as string, 0.082),
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: BORDER_RADIUS.sm,
      }}
    >
      <meta.Icon size={11} color={color as string} strokeWidth={2} />
      <Text style={[typography.captionSmall, { color, fontWeight: '700' }]}>{meta.label}</Text>
    </View>
  );
}

interface AlternativeRowProps {
  alt: WarmupExercise;
  onPress: (alt: WarmupExercise) => void;
}

function AlternativeRow({ alt, onPress }: AlternativeRowProps) {
  const { colors } = useTheme();
  const thumb = parseMediaUrls(alt.media_url)[0];
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`Изучить вариант: ${alt.name}`}
      onPress={() => onPress(alt)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        backgroundColor: colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.sm,
      }}
    >
      {thumb ? (
        <Image
          source={{ uri: thumb }}
          style={{
            width: 44,
            height: 44,
            borderRadius: BORDER_RADIUS.sm,
            backgroundColor: colors.surface,
          }}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: BORDER_RADIUS.sm,
            backgroundColor: colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <BookOpen size={16} color={colors.textTertiary} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text
          style={[typography.captionSmall, { color: colors.textPrimary, fontWeight: '700' }]}
          numberOfLines={2}
        >
          {alt.name}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginTop: 4,
            flexWrap: 'wrap',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Clock size={11} color={colors.textTertiary} />
            <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
              {alt.duration_seconds} сек
            </Text>
          </View>
          <WarmupTypeChip canBeActivation={alt.can_be_activation} />
          {alt.relation_type ? <RelationBadge relation={alt.relation_type} /> : null}
        </View>
      </View>
      <ChevronRight size={16} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

interface WarmupExerciseSheetProps {
  /** null во время анимации закрытия — лист держит последний контент до конца exit-анимации. */
  exercise: WarmupExercise | null;
  index: number;
  completed: boolean;
  onClose: () => void;
  onMarkCompleted: (id: string) => void;
  loadAlternatives: (id: string, muscles: string[]) => Promise<WarmupExercise[]>;
  onReplace: (index: number, alt: WarmupExercise) => void;
}

export function WarmupExerciseSheet({
  exercise,
  index,
  completed,
  onClose,
  onMarkCompleted,
  loadAlternatives,
  onReplace,
}: WarmupExerciseSheetProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const [alts, setAlts] = useState<WarmupExercise[]>([]);
  const [loadingAlts, setLoadingAlts] = useState(false);
  const [viewingAltId, setViewingAltId] = useState<string | null>(null);

  // Держим последний непустой exercise: SheetShell размонтируется после exit-анимации,
  // контент не должен схлопнуться в пустой лист на 200 мс.
  const lastExerciseRef = useRef<WarmupExercise | null>(exercise);
  if (exercise) lastExerciseRef.current = exercise;
  const main = exercise ?? lastExerciseRef.current;

  const visible = !!exercise;

  // Ленивая загрузка вариантов — только при открытии листа (не на монтировании ленты).
  useEffect(() => {
    if (!visible || !main) return;
    let alive = true;
    setViewingAltId(null);
    setAlts([]);
    setLoadingAlts(true);
    loadAlternatives(main.id, main.primary_muscles)
      .then((list) => {
        if (alive) setAlts(list);
      })
      .finally(() => {
        if (alive) setLoadingAlts(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, main?.id]);

  const viewingAlt = viewingAltId ? (alts.find((a) => a.id === viewingAltId) ?? null) : null;
  const displayed = viewingAlt ?? main;

  const openAlt = useCallback((alt: WarmupExercise) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setViewingAltId(alt.id);
  }, []);

  const backToMain = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setViewingAltId(null);
  }, []);

  const handleReplace = useCallback(() => {
    if (!viewingAlt) return;
    onReplace(index, viewingAlt);
    onClose();
  }, [viewingAlt, index, onReplace, onClose]);

  if (!main || !displayed) return null;

  const hasTechnique = !!(displayed.technique || displayed.media_url);
  const isViewingAlt = !!viewingAlt;

  return (
    // Рендер в корне экрана (state — в workout/[id].tsx), вне ScrollView: absolute-оверлей
    // внутри скролл-контента обрезается клипом. visible управляет SheetShell напрямую —
    // так guard SheetShell (защита от релиза тапа, открывшего лист) обновляется при
    // каждом открытии; у Modal-паттерна (PainSheet) SheetShell смонтирован постоянно.
    <SheetShell visible={visible} title={displayed.name} onClose={onClose}>
      {/* Навигация просмотра: изучаем аналог без замены */}
      {isViewingAlt && (
        <TouchableOpacity
          onPress={backToMain}
          accessibilityRole="button"
          accessibilityLabel={`Вернуться к ${main.name}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 2,
            alignSelf: 'flex-start',
            marginBottom: SPACING.sm,
            paddingVertical: SPACING.xs,
          }}
        >
          <ChevronLeft size={16} color={colors.primary} />
          <Text style={[typography.captionSmall, { color: colors.primary, fontWeight: '700' }]}>
            {main.name}
          </Text>
        </TouchableOpacity>
      )}

      {/* Демонстрация — сразу наверху, без аккордеона */}
      {hasTechnique ? (
        <View>
          {displayed.media_url && <TechniqueMediaSlider mediaUrl={displayed.media_url} autoPlay />}
          {displayed.technique && (
            <View style={{ marginTop: SPACING.md }}>
              <SectionSubheading
                icon={<BookOpen size={12} color={colors.textPrimary} />}
                label="Описание техники"
                color={colors.textPrimary}
              />
              <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18 }]}>
                {displayed.technique}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={{ padding: SPACING.md, alignItems: 'center' }}>
          <Text style={[typography.bodySmall, { color: colors.textTertiary }]}>
            Нет данных по технике
          </Text>
        </View>
      )}

      {displayed.benefits && (
        <ExerciseInfoAccordion
          icon={<Sparkles size={13} color={colors.success} />}
          title="Польза"
          titleColor={colors.success}
        >
          <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18 }]}>
            {displayed.benefits}
          </Text>
        </ExerciseInfoAccordion>
      )}

      {displayed.risks && (
        <ExerciseInfoAccordion
          icon={<AlertTriangle size={13} color={colors.warning} />}
          title="Риски"
          titleColor={colors.warning}
        >
          <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18 }]}>
            {displayed.risks}
          </Text>
        </ExerciseInfoAccordion>
      )}

      {displayed.injuries.length > 0 && (
        <ExerciseInfoAccordion
          icon={<ShieldAlert size={13} color={colors.error} />}
          title="Противопоказания"
          titleColor={colors.error}
        >
          {displayed.injuries.map((item, i) => (
            <View
              key={i}
              style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}
            >
              <Text style={[typography.bodySmall, { color: colors.error, marginRight: 6 }]}>•</Text>
              <Text
                style={[
                  typography.bodySmall,
                  { color: colors.textSecondary, lineHeight: 18, flex: 1 },
                ]}
              >
                {item}
              </Text>
            </View>
          ))}
        </ExerciseInfoAccordion>
      )}

      {/* Действия над выбранным аналогом */}
      {isViewingAlt && (
        <AppButton
          title={`Заменить на «${displayed.name}»`}
          variant="primary"
          size="medium"
          icon={<RotateCcw size={16} color={colors.textInverse} />}
          onPress={handleReplace}
          style={{ marginTop: SPACING.md }}
        />
      )}

      {/* Похожие варианты — изучаемы до замены */}
      {!isViewingAlt && (loadingAlts || alts.length > 0) && (
        <View style={{ marginTop: SPACING.md }}>
          <Text
            style={[
              typography.captionSmall,
              {
                color: colors.textTertiary,
                fontWeight: '700',
                marginBottom: SPACING.sm,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              },
            ]}
          >
            Похожие варианты
          </Text>
          {loadingAlts ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: SPACING.sm,
                paddingVertical: SPACING.md,
              }}
            >
              <ActivityIndicator size="small" color={colors.warning} />
              <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
                Подбираем варианты...
              </Text>
            </View>
          ) : (
            <View style={{ gap: SPACING.sm }}>
              {alts.map((alt) => (
                <AlternativeRow key={alt.id} alt={alt} onPress={openAlt} />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Футер основного упражнения */}
      {!isViewingAlt && (
        <View style={{ marginTop: SPACING.lg, gap: SPACING.sm }}>
          {!completed && (
            <AppButton
              title="Отметить выполненным"
              variant="secondary"
              size="medium"
              icon={<Check size={16} color={colors.primary} />}
              onPress={() => onMarkCompleted(main.id)}
            />
          )}
          <TouchableOpacity
            onPress={() => router.push(`/exercise/${displayed.id}`)}
            accessibilityRole="link"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              paddingVertical: SPACING.sm,
            }}
          >
            <Text style={[typography.captionSmall, { color: colors.primary, fontWeight: '700' }]}>
              Полная карточка упражнения
            </Text>
            <ChevronRight size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}
    </SheetShell>
  );
}
