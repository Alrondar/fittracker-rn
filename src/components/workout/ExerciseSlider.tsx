// src/components/workout/ExerciseSlider.tsx
// 05.08.2026 (PERF):
//  - P1-A: removeClippedSubviews НАМЕРЕННО НЕ ставим (SG-2, INVENTORY §10.1):
//    детач нативных вью роняет responder/blur у TextInput сетов — см. строку
//    265+ этого файла (CTR-6, аудит 28.09: комментарий был устаревшим)
//  - P1-B: stagger-загрузка альтернатив (500мс + index*100мс) — не блокирует TTI
// ENG-5: ранжирование альтернатив + подпись excludedCount
// SEARCH-ALT (16.10): над полосой слайдеров — приклеенная строка поиска замены по
// всей базе. Видна только на слайде замены, одно правило для всех упражнений:
// у упражнения без альтернатив для свайпа существует пустой слайд-слот, и
// выбранное из поиска занимает ПЕРВЫЙ слайд замены, прежние уезжают вправо.
// Карточка из поиска живёт в этом монтировании блока и в БД не пишется.
import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Platform,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { PressableScale } from '../ui/PressableScale';
import { ChevronRight, Search } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { useLayoutWidth } from '../../hooks/useLayoutWidth';
import { createCardStyles } from '../../styles/components/card';
import { ExerciseCard } from './ExerciseCard';
import { WorkoutCardDisplayMode } from '../../types/workout';
import { AlternativeExerciseCard } from './AlternativeExerciseCard';
import { ExerciseReplaceSearchControls, ExerciseReplaceSearchPanel } from './ExerciseReplaceSearch';
import { useExerciseReplaceSearch } from '../../hooks/useExerciseReplaceSearch';
import type { UserInjury } from '../../constants/injuries';
import { ExerciseData, AlternativeExercise, SetData, SetFeedbackPatch } from '../../types/workout';
import { WeightUnit } from '../../hooks/useUnitPreferences';
import { AlternativeSourceInput } from '../../engine/alternatives';
import type { FetchAlternativesResult } from '../../hooks/workout/useWorkoutSession.loader';
import type { ProgressionContext, ReadinessContext } from '../../engine/progression';

const H_GAP = SPACING.md; // UX-16 F1: плотный ритм между карточками
const PAD = 16;

/** ENG-5: плюрализация «N вариант скрыт / варианта скрыто / вариантов скрыто». */
function formatExcluded(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} вариант скрыт`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} варианта скрыто`;
  }
  return `${count} вариантов скрыто`;
}

interface ExerciseSliderProps {
  exercise: ExerciseData;
  exerciseIndex: number;
  isReplaced: boolean;
  displayMode: WorkoutCardDisplayMode;
  loadAlternatives: (
    id: string,
    source: AlternativeSourceInput
  ) => Promise<FetchAlternativesResult>;
  updateSet: (
    exIndex: number,
    setIndex: number,
    field: 'weight' | 'reps' | 'reps_left' | 'reps_right',
    value: string
  ) => void;
  updateSetFeedback: (exIndex: number, setIndex: number, patch: SetFeedbackPatch) => void;
  applyProgression: (exerciseIndex: number, newWeight: number) => void;
  isSetCompleted: (set: SetData) => boolean;
  // UX-5 Feature 1: запрос замены (caller выбирает temp vs program).
  // SEARCH-ALT: third arg — готовая карточка, выбранная из поиска по базе
  // (её нет среди связей упражнения, поэтому искать её в alternatives бессмысленно).
  onRequestReplace: (exIndex: number, altId: string, preset?: AlternativeExercise) => void;
  resetToOriginal: (exIndex: number) => void;
  /** SEARCH-ALT: активные травмы — для предупреждений в выдаче поиска замен. */
  activeInjuries: UserInjury[];
  startRestTimer: (seconds: number, ownerIndex?: number | null) => void;
  getIntensityInfo: (intensity: string) => {
    label: string;
    color: string;
    bgColor: string;
    icon: React.ReactNode;
  };
  onOpenSettings: (exerciseIndex: number, setsCount: number, restSeconds: number) => void;
  /** FEAT-1.9: открыть шторку боли (только основная карточка) */
  onOpenPain?: (exerciseIndex: number) => void;
  // MORF-PAIN: быстрый ввод боли из инлайн-морфа (проброс в ExerciseCard).
  onSavePainQuick?: (
    exerciseIndex: number,
    ps: import('../../types/workout').ExercisePainState
  ) => void;
  onClearPainQuick?: (exerciseIndex: number) => void;
  colors: any;
  cardStyles: ReturnType<typeof createCardStyles>;
  unit: WeightUnit;
  warning?: { level: 'avoid' | 'caution'; message: string } | null;
  /** ENG-3: today readiness context (optional signal). */
  readinessContext?: ReadinessContext | null;
  /** FD-1: контекст прогрессии (фаза/восстановление/цикл). */
  progressionContext?: ProgressionContext | null;
  // COACH-3: идентификатор тренировки для записи feedback (пробрасывается в ExerciseCard).
  workoutId: string;
  // ENG-13: добавить новый сет (для warmup toggle auto-add)
  addSet: (exerciseIndex: number, count?: number) => void;
}

export const ExerciseSlider = memo(function ExerciseSlider({
  exercise,
  exerciseIndex,
  isReplaced,
  displayMode,
  loadAlternatives,
  updateSet,
  updateSetFeedback,
  applyProgression,
  isSetCompleted,
  onRequestReplace,
  activeInjuries,
  resetToOriginal,
  startRestTimer,
  getIntensityInfo,
  onOpenSettings,
  onOpenPain,
  onSavePainQuick,
  onClearPainQuick,
  colors,
  cardStyles,
  unit,
  warning = null,
  readinessContext = null,
  progressionContext = null,
  workoutId,
  addSet,
}: ExerciseSliderProps) {
  // WEB-2: ширина макета, а не окна браузера (на нативе значения совпадают).
  const screenWidth = useLayoutWidth();
  const cardWidth = screenWidth - 32;
  // Ритм между упражнениями (SP-1, переработано в FX-2): высота ОСНОВНОЙ
  // карточки — ориентир для страниц альтернатив (их maxHeight). Раньше ей
  // жёстко фиксировался height самого слайдера, но замер шёл с ребёнка,
  // растянутого по viewport, — высота замерла и обрезала рост контента
  // (Info/баннеры/добавленные подходы) вместе с их тапами. Теперь это
  // живой onLayout основной карточки: она никогда не клиппуется.
  const [mainHeight, setMainHeight] = useState(0);

  const [alternatives, setAlternatives] = useState<AlternativeExercise[]>([]);
  const [excludedCount, setExcludedCount] = useState(0); // ENG-5: скрытые травмами
  const [loadingAlts, setLoadingAlts] = useState(false);
  const [altsMounted, setAltsMounted] = useState(false);

  const hasAlts = exercise.alternatives.length > 0 || isReplaced;

  // ===== SEARCH-ALT (16.10) =====
  const [pageIndex, setPageIndex] = useState(0);
  const [picked, setPicked] = useState<AlternativeExercise | null>(null);
  const [controlsBox, setControlsBox] = useState({ y: 0, h: 0 });
  // Общий ref полосы: им пользуются и WEB-2 (тап по peek-странице), и SEARCH-ALT
  // (скролл к выбранному из поиска и возврат к основной карточке после замены).
  const scrollRef = useRef<ScrollView>(null);

  // Строка видна на слайде замены — одно правило для всех упражнений (вердикт
  // владельца 16.10): над основной карточкой её нет. У упражнения без альтернатив
  // для свайпа есть пустой слайд-слот, карточка в него встаёт только по выбору.
  const showSearch = pageIndex > 0;
  const searchSlot = !hasAlts && !picked;
  const search = useExerciseReplaceSearch(activeInjuries, showSearch);

  // Выбранное стало основным упражнением (замена прошла) → слот из поиска
  // больше не нужен. Отмена в подтверждении и откат программной замены id не
  // меняют, поэтому карточка остаётся на месте.
  useEffect(() => {
    if (picked && picked.id === exercise.id) {
      setPicked(null);
      // Замена приземлилась в основную карточку — к ней и возвращаемся.
      scrollRef.current?.scrollTo({ x: 0, animated: true });
      setPageIndex(0);
    }
  }, [exercise.id, picked]);

  const scrollToPickedRef = useRef(false);

  const handlePicked = useCallback((card: AlternativeExercise) => {
    setPicked(card);
    // Слот выбранного — первый справа от основной карточки. Скроллим по
    // onContentSizeChange: страница только что добавлена, и пока контент не
    // измерен, scrollTo клампится к прежней ширине (Android).
    scrollToPickedRef.current = true;
  }, []);

  const handleContentSizeChange = useCallback(() => {
    if (!scrollToPickedRef.current) return;
    scrollToPickedRef.current = false;
    scrollRef.current?.scrollTo({ x: cardWidth + H_GAP, animated: true });
  }, [cardWidth]);

  const handlePickedReplace = useCallback(
    (exIndex: number, altId: string) => {
      if (picked) onRequestReplace(exIndex, altId, picked);
    },
    [onRequestReplace, picked]
  );

  const handleSliderScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const page = Math.round(e.nativeEvent.contentOffset.x / (cardWidth + H_GAP));
      // Только при смене страницы: писать стейт на каждый кадр — новый рендер
      // блока на скролле (CLAUDE.md §8).
      setPageIndex((prev) => (prev === page ? prev : page));
    },
    [cardWidth]
  );

  // PERF (фризы скролла): страницы альтернатив монтируются ТОЛЬКО по первому
  // горизонтальному свайпу этого слайдера (handleScrollBeginDrag), а не по
  // InteractionManager после загрузки. Раньше для каждого упражнения в окне
  // монтировался полный набор AlternativeExerciseCard — это попадало в середину
  // вертикального скролла и блокировало JS-поток на сотни мс. Сеть/ранжирование
  // (setAlternatives) остаются дешёвыми, пока страниц нет в дереве.
  useEffect(() => {
    if (!hasAlts) return;
    let alive = true;
    const delay = 500 + exerciseIndex * 100;

    const timeout = setTimeout(() => {
      if (!alive) return;
      setLoadingAlts(true);
      // ENG-5: контекст для ранжирования (мышцы/оборудование/боль)
      loadAlternatives(exercise.id, {
        primaryMuscles: exercise.primary_muscles,
        secondaryMuscles: exercise.secondary_muscles,
        equipment: exercise.equipment,
        hasPain: !!exercise.painState,
      })
        .then((result) => {
          if (alive) {
            setAlternatives(result.alternatives);
            setExcludedCount(result.excludedCount);
          }
        })
        .finally(() => {
          if (alive) setLoadingAlts(false);
        });
    }, delay);

    return () => {
      alive = false;
      clearTimeout(timeout);
    };
    // ENG-5: muscles/equipment/painState читаются в эффекте (source для ранжирования).
    // Ссылки стабильны при вводе подходов (spread сохраняет), меняются при замене
    // упражнения (id) или записи боли → корректно включаем в deps.
  }, [
    hasAlts,
    exercise.id,
    exerciseIndex,
    loadAlternatives,
    exercise.primary_muscles,
    exercise.secondary_muscles,
    exercise.equipment,
    exercise.painState,
    readinessContext,
  ]);

  const handleScrollBeginDrag = useCallback(() => {
    if (!altsMounted && hasAlts) setAltsMounted(true);
  }, [altsMounted, hasAlts]);

  // WEB-2 + SEARCH-ALT: на вебе `onScrollBeginDrag` от мыши/колеса не приходит,
  // поэтому открытие страниц замен живёт в том же onScroll, что считает активную
  // страницу. На нативе ветка пустая: там работает onScrollBeginDrag.
  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (Platform.OS === 'web') handleScrollBeginDrag();
      handleSliderScroll(e);
    },
    [handleScrollBeginDrag, handleSliderScroll]
  );

  // WEB-2: тап по peek-странице — tap-альтернатива жесту (PRODUCT.md §3.2). На
  // десктопе горизонтальный скролл мышью недоступен, а на вебе ещё и
  // `onScrollBeginDrag` не выстреливает, поэтому страницы замен не открывались
  // вообще. Нативный путь остаётся свайпом: обработчик навешивается только на
  // web-ветке рендера.
  const openAlternatives = useCallback(() => {
    setAltsMounted(true);
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ x: cardWidth + H_GAP, animated: true })
    );
  }, [cardWidth]);

  // SEARCH-ALT на десктопе: у упражнения без альтернатив нет peek-карточки, за
  // которую обычно тянут полосу, поэтому скролл к слоту даёт сам слот.
  const openSearchSlot = useCallback(() => {
    scrollRef.current?.scrollTo({ x: cardWidth + H_GAP, animated: true });
  }, [cardWidth]);

  const peekCard = (
    <View
      style={{
        width: cardWidth,
        height: mainHeight > 0 ? mainHeight : undefined,
        justifyContent: 'center',
        alignItems: 'center',
        gap: SPACING.sm,
        backgroundColor: colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.lg,
      }}
    >
      <ChevronRight size={22} color={colors.textTertiary} strokeWidth={2} />
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 12,
          fontWeight: '600',
          textAlign: 'center',
        }}
      >
        Свайпни для замен
      </Text>
    </View>
  );

  // SEARCH-ALT: пустой слайд-слот у упражнения без альтернатив. Рамки нет
  // намеренно: карточки здесь быть не должно (вердикт владельца 16.10).
  const searchSlotBody = (
    <View
      style={{
        height: mainHeight > 0 ? mainHeight : undefined,
        justifyContent: 'center',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingHorizontal: SPACING.lg,
      }}
    >
      <Search size={20} color={colors.textTertiary} strokeWidth={2} />
      <Text
        style={{
          color: colors.textTertiary,
          fontSize: 12,
          fontWeight: '600',
          textAlign: 'center',
        }}
      >
        Упражнение из поиска появится здесь
      </Text>
      {Platform.OS === 'web' && (
        <Text style={{ color: colors.textTertiary, fontSize: 11 }}>Тапни, чтобы открыть</Text>
      )}
    </View>
  );

  const showPlaceholder = loadingAlts;
  const showPeek = !loadingAlts && hasAlts && !altsMounted;
  const showAlts = !loadingAlts && altsMounted && alternatives.length > 0;
  // ENG-5: все альтернативы скрыты травмами → объясняем вместо пустоты
  const showAllExcluded =
    !loadingAlts && altsMounted && alternatives.length === 0 && excludedCount > 0;

  // SEARCH-ALT: выбранное из поиска занимает первый слайд замены, поэтому из
  // списка движка оно исключается — иначе две одинаковые карточки подряд.
  const shownAlts = picked ? alternatives.filter((alt) => alt.id !== picked.id) : alternatives;

  const childCount =
    1 +
    (picked ? 1 : 0) +
    (searchSlot ? 1 : 0) +
    (showPlaceholder ? 1 : 0) +
    (showPeek ? 1 : 0) +
    (showAlts ? shownAlts.length : 0) +
    (showAllExcluded ? 1 : 0);

  const snapOffsets = useMemo(
    () => Array.from({ length: childCount }, (_, i) => i * (cardWidth + H_GAP)),
    [childCount, cardWidth]
  );

  /**
   * Страница-замена: FX-2 — если карточка выше основной, внутри страницы свой
   * вертикальный скролл (maxHeight = высота основной карточки, которая растёт
   * вместе с её контентом). Ритм между упражнениями одинаковый, но основная
   * карточка не клиппуется. ALT-L2 (08.10): при развёрнутом блоке Info карточка
   * замены заведомо выше основной — без nestedScrollEnabled вертикальный
   * ScrollView внутри FlatList → горизонтального ScrollView на Android не
   * скроллится вообще, и всё, что ушло за maxHeight (в т.ч. CTA), становится
   * недостижимым.
   */
  const renderAltPage = (card: AlternativeExercise, fromSearch: boolean) => (
    <View key={card.id} style={{ width: cardWidth }}>
      <ScrollView
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        style={mainHeight > 0 ? { maxHeight: mainHeight } : undefined}
      >
        <AlternativeExerciseCard
          exercise={card}
          exerciseIndex={exerciseIndex}
          onRequestReplace={fromSearch ? handlePickedReplace : onRequestReplace}
          fromSearch={fromSearch}
          colors={colors}
          cardStyles={cardStyles}
        />
      </ScrollView>
    </View>
  );

  // Панель выдачи не должна выходить за границы ячейки списка (на Android
  // вылезший за cell оверлей теряет тапы) → потолок = высота основной карточки.
  const panelMaxHeight = Math.max(200, Math.min(340, mainHeight || 340));

  return (
    <View style={{ marginTop: SPACING.md }}>
      {isReplaced && (
        <View style={[cardStyles.replacedBadgeContainer, { backgroundColor: colors.primaryLight }]}>
          <Text style={[cardStyles.replacedBadgeText, { color: colors.primary }]}>Заменено</Text>
          <PressableScale onPress={() => resetToOriginal(exerciseIndex)}>
            <Text style={[cardStyles.replacedResetText, { color: colors.primary }]}>Вернуть</Text>
          </PressableScale>
        </View>
      )}

      {/* ENG-5: подпись о скрытых вариантах. Над слайдером, а не под ним:
          нижний край блока = низ карточки, поэтому вертикальный ритм между
          упражнениями одинаковый (SPACING.md) на всех карточках. */}
      {showAlts && excludedCount > 0 && (
        <Text
          style={{
            color: colors.textTertiary,
            fontSize: 11,
            marginBottom: SPACING.xs,
            paddingHorizontal: PAD,
          }}
        >
          {formatExcluded(excludedCount)} из-за травм и противопоказаний
        </Text>
      )}

      {/* SEARCH-ALT: строка приклеена над полосой и НЕ скроллится по горизонтали.
          Её высота замеряется, чтобы панель выдачи встала ровно под неё. */}
      {showSearch && (
        <View
          onLayout={(e) => {
            const { y, height } = e.nativeEvent.layout;
            setControlsBox((prev) => (prev.y === y && prev.h === height ? prev : { y, h: height }));
          }}
        >
          <ExerciseReplaceSearchControls search={search} sideInset={PAD} />
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToOffsets={snapOffsets}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onContentSizeChange={handleContentSizeChange}
        // removeClippedSubviews убран (см. workout/[id].tsx): карточки содержат
        // TextInput, детач вью ронял responder/blur ячеек SetsGrid. Не возвращать.
        // FX-2 (26.09): высота слайдера БОЛЬШЕ не фиксируется через style.height.
        // SP-1 замерял mainHeight с обёртки основной карточки, но в горизонтальном
        // ScrollView дети по умолчанию растягиваются (stretch) по высоте viewport'а:
        // после первой замерки обёртка = mainHeight, onLayout больше не менялся,
        // и любой рост контента (Info, баннер «прошлый раз», addSet) уходил за clip
        // — Info открывался «вникуда», а обрезанные ячейки теряли тапы (overflow
        // hidden на Android обрезает и hit-testing). Теперь alignItems flex-start:
        // карточка мерируется по реальному контенту, mainHeight растёт вместе с ней,
        // а альтернативы ограничены maxHeight (внутренний вертикальный скролл).
        onScrollBeginDrag={handleScrollBeginDrag}
        contentContainerStyle={{ paddingHorizontal: PAD, gap: H_GAP, alignItems: 'flex-start' }}
      >
        <View
          style={{ width: cardWidth }}
          onLayout={(e) => setMainHeight(e.nativeEvent.layout.height)}
        >
          <ExerciseCard
            exercise={exercise}
            isMain
            isReplaced={isReplaced}
            exerciseIndex={exerciseIndex}
            alternatives={alternatives}
            displayMode={displayMode}
            updateSet={updateSet}
            updateSetFeedback={updateSetFeedback}
            applyProgression={applyProgression}
            isSetCompleted={isSetCompleted}
            startRestTimer={startRestTimer}
            getIntensityInfo={getIntensityInfo}
            onOpenSettings={onOpenSettings}
            onOpenPain={onOpenPain}
            onSavePainQuick={onSavePainQuick}
            onClearPainQuick={onClearPainQuick}
            colors={colors}
            cardStyles={cardStyles}
            unit={unit}
            warning={warning}
            readinessContext={readinessContext}
            progressionContext={progressionContext}
            workoutId={workoutId}
            addSet={addSet}
          />
        </View>

        {/* SEARCH-ALT: слайд выбранного из поиска — первым справа от основной */}
        {picked && renderAltPage(picked, true)}

        {/* SEARCH-ALT: у упражнения без альтернатив — пустой слайд-слот: карточки
            в нём нет, она появится только после выбора из поиска. Без слота
            свайпать некуда и строка была бы недостижима; рамки не рисуем
            намеренно — это не карточка. */}
        {searchSlot &&
          (Platform.OS === 'web' ? (
            // WEB-2: горизонтального свайпа на десктопе нет, поэтому слот — кнопка.
            <PressableScale
              key="search-slot"
              onPress={openSearchSlot}
              accessibilityRole="button"
              accessibilityLabel="Открыть поиск упражнения для замены"
              style={{ width: cardWidth }}
            >
              {searchSlotBody}
            </PressableScale>
          ) : (
            <View key="search-slot" style={{ width: cardWidth }}>
              {searchSlotBody}
            </View>
          ))}

        {showPlaceholder && (
          <View
            style={{
              width: cardWidth,
              height: mainHeight > 0 ? mainHeight : undefined,
              justifyContent: 'center',
              alignItems: 'center',
              gap: SPACING.sm,
              backgroundColor: colors.surfaceSecondary,
              borderRadius: BORDER_RADIUS.lg,
            }}
          >
            <ActivityIndicator color={colors.primary} />
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Загружаем замены…</Text>
          </View>
        )}

        {showPeek &&
          (Platform.OS === 'web' ? (
            // WEB-2: тап вместо недоступного на десктопе горизонтального свайпа
            // (onScrollBeginDrag от мыши/колеса не приходит).
            <PressableScale
              key="peek"
              onPress={openAlternatives}
              accessibilityRole="button"
              accessibilityLabel="Показать варианты замены"
              style={{ width: cardWidth }}
            >
              {peekCard}
            </PressableScale>
          ) : (
            peekCard
          ))}

        {showAlts && shownAlts.map((alt) => renderAltPage(alt, false))}

        {showAllExcluded && (
          <View
            style={{
              width: cardWidth,
              height: mainHeight > 0 ? mainHeight : undefined,
              justifyContent: 'center',
              alignItems: 'center',
              gap: SPACING.sm,
              backgroundColor: colors.surfaceSecondary,
              borderRadius: BORDER_RADIUS.lg,
              paddingHorizontal: SPACING.lg,
            }}
          >
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 12,
                fontWeight: '600',
                textAlign: 'center',
              }}
            >
              Все варианты замен скрыты из-за травм и противопоказаний
            </Text>
          </View>
        )}
      </ScrollView>

      {/* SEARCH-ALT: выдача — последний ребёнок блока, чтобы лежать ПОВЕРХ
          карточек (на Android следующий sibling рисуется поверх предыдущего).
          Пока строка не измерена (h = 0), панель не показываем: иначе на один
          кадр она легла бы на самое себя, а не под строку. */}
      {showSearch && controlsBox.h > 0 && (
        <ExerciseReplaceSearchPanel
          search={search}
          excludeExerciseId={exercise.id}
          top={controlsBox.y + controlsBox.h + SPACING.xs}
          sideInset={PAD}
          maxHeight={panelMaxHeight}
          onPicked={handlePicked}
        />
      )}
    </View>
  );
});
