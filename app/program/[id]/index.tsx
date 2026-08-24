import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sprout, Dumbbell, Flame, Play } from 'lucide-react-native';
import { useStore } from '../../../src/store/useStore';
import { useTheme } from '../../../src/hooks/useTheme';
import { useProgramEditor } from '../../../src/hooks/useProgramEditor';
import { mapError } from '../../../src/utils/errorMapper';
import { SPACING } from '../../../src/constants/theme';
import { commonStyles } from '../../../src/styles/common';
import { createCardStyles } from '../../../src/styles/components/card';
import { createBadgeStyles } from '../../../src/styles/components/badge';
import { createButtonStyles } from '../../../src/styles/components/button';
import { typography } from '../../../src/styles/typography';
import { ListSkeleton } from '../../../src/components/Skeleton';
import { Toast } from '../../../src/components/Toast';
import { useToast } from '../../../src/hooks/useToast';
import { LEVEL_COLORS } from '../../../src/constants/semanticColors';
import { PhaseCard } from '../../../src/components/program/PhaseCard';
import { ProgramHero } from '../../../src/components/program/ProgramHero';
import { ProgramFabs } from '../../../src/components/program/ProgramFabs';
import { ProgramDetailModals } from '../../../src/components/program/ProgramDetailModals';
import { generateShareCode, formatShareCode } from '../../../src/services/programSharingService';

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams();
  const { userId } = useStore();
  const { colors } = useTheme();
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();

  const cardStyles = useMemo(() => createCardStyles(colors), [colors]);
  const badgeStyles = useMemo(() => createBadgeStyles(colors), [colors]);
  const buttonStyles = useMemo(() => createButtonStyles(colors), [colors]);

  // Используем useProgramEditor, но только для чтения данных и запуска программы
  const {
    program,
    loading,
    starting,
    handleStartProgram,
    getDaysForPhase,
    showScheduleEditor,
    setShowScheduleEditor,
  } = useProgramEditor(id as string, userId);

  // ===== Шаринг по коду =====
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);

  const getLevelInfo = useCallback(
    (level: string) => {
      switch (level) {
        case 'beginner':
          return {
            label: 'Новичок',
            color: LEVEL_COLORS.beginner,
            icon: <Sprout size={16} color={LEVEL_COLORS.beginner} strokeWidth={1.5} />,
          };
        case 'intermediate':
          return {
            label: 'Средний',
            color: LEVEL_COLORS.intermediate,
            icon: <Dumbbell size={16} color={LEVEL_COLORS.intermediate} strokeWidth={1.5} />,
          };
        case 'advanced':
          return {
            label: 'Продвинутый',
            color: LEVEL_COLORS.advanced,
            icon: <Flame size={16} color={LEVEL_COLORS.advanced} strokeWidth={1.5} />,
          };
        default:
          return {
            label: level,
            color: colors.textSecondary,
            icon: <Dumbbell size={16} color={colors.textSecondary} strokeWidth={1.5} />,
          };
      }
    },
    [colors],
  );

  if (loading) {
    return (
      <View style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <ListSkeleton count={3} />
      </View>
    );
  }

  if (!program) {
    return (
      <View style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <Text
          style={[
            typography.body,
            { color: colors.textSecondary, textAlign: 'center', marginTop: 100 },
          ]}
        >
          Программа не найдена
        </Text>
      </View>
    );
  }

  const levelInfo = getLevelInfo(program.level);
  const phases = program.phases || [];
  const allDays = program.days || [];
  const canEdit = !!program.created_by && program.created_by === userId;

  // ===== Действия шаринга =====
  const openShare = async () => {
    setShowShareModal(true);
    if (shareCode) return;
    setShareLoading(true);
    try {
      const code = await generateShareCode(program.id);
      setShareCode(code);
    } catch (e: any) {
      console.error('[program] generateShareCode:', e);
      showToast(mapError(e), 'error');
    } finally {
      setShareLoading(false);
    }
  };

  const shareViaSystem = () => {
    if (!shareCode) return;
    const formatted = formatShareCode(shareCode);
    Share.share({
      message: `Моя программа «${program.name}» в FitTracker. Код для импорта: ${formatted}`,
      title: 'Поделиться программой',
    }).catch(() => {});
  };

  return (
    <SafeAreaView
      style={[commonStyles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <ProgramHero
          programName={program.name}
          programDescription={program.description}
          duration={program.duration}
          schedule={program.schedule}
          levelInfo={levelInfo}
          editMode={false}
          onOpenScheduleEditor={() => setShowScheduleEditor(true)}
          colors={colors}
          cardStyles={cardStyles}
          badgeStyles={badgeStyles}
        />

        {/* ===== Фазы ===== */}
        <View style={{ paddingTop: SPACING.md }}>
          {phases.map((phase, phaseIndex) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              phaseIndex={phaseIndex}
              phaseCount={phases.length}
              days={getDaysForPhase(phase.id)}
              allDays={allDays}
              editMode={false}
              colors={colors}
              cardStyles={cardStyles}
              badgeStyles={badgeStyles}
              onMoveUp={() => {}}
              onMoveDown={() => {}}
              onEditPhase={() => {}}
              onRemovePhase={() => {}}
              onAddDay={() => {}}
              onDayDragEnd={() => {}}
              onEditDaySettings={() => {}}
              onExerciseSettings={() => {}}
              onAddExercise={() => {}}
              onRemoveExercise={() => {}}
              onExerciseDragEnd={() => {}}
              onAddDayToWeek={() => {}}
              onCopyTemplateToWeek={() => {}}
              onResetWeekToTemplate={() => {}}
            />
          ))}
        </View>
      </ScrollView>

      {/* Футер с кнопкой запуска программы */}
      <View
        style={[
          commonStyles.footer,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[
            buttonStyles.primary,
            buttonStyles.large,
            { flex: 1, backgroundColor: colors.primary },
          ]}
          onPress={handleStartProgram}
          disabled={starting}
          activeOpacity={0.8}
        >
          {starting ? (
            <ActivityIndicator color={colors.textInverse} size="small" />
          ) : (
            <View style={buttonStyles.content}>
              <Play size={20} color={colors.textInverse} strokeWidth={2} fill={colors.textInverse} />
              <Text style={buttonStyles.textPrimary}>Начать программу</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ProgramFabs
        canEdit={canEdit}
        onOpenShare={openShare}
        onToggleEditMode={() => router.push(`/program/${id}/edit`)}
        colors={colors}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />

      {/* ===== Модалки Detail ===== */}
      <ProgramDetailModals
        showScheduleEditor={showScheduleEditor}
        setShowScheduleEditor={setShowScheduleEditor}
        schedule={program.schedule || []}
        onSaveSchedule={() => {}}
        showShareModal={showShareModal}
        setShowShareModal={setShowShareModal}
        shareCode={shareCode}
        shareLoading={shareLoading}
        programName={program.name}
        onShareViaSystem={shareViaSystem}
        colors={colors}
        buttonStyles={buttonStyles}
        badgeStyles={badgeStyles}
      />
    </SafeAreaView>
  );
}