import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, Image as NativeImage } from 'react-native';
import { PressableScale } from '../ui/PressableScale';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { FONT_FAMILIES } from '../../constants/fonts';
import { mediaBoxHeight } from '../../utils/mediaFit';
import { Image as ImageIcon } from 'lucide-react-native';

import { useTheme } from '../../hooks/useTheme';
import { useMediaGender } from '../../hooks/useMediaGender';
import { parseMediaUrls, isGenderedMedia, type MediaGender } from '../../utils/mediaScheme';
import {
  SPACING,
  BORDER_RADIUS,
  ON_MEDIA_SCRIM,
  ON_MEDIA_TEXT,
  ON_MEDIA_TEXT_DIM,
} from '../../constants/theme';

const AUTOPLAY_MS = 3000;
/** Активный чип пола лежит белым по тёмному скриму — тот же приём, что у лейбла «ТЕХНИКА». */
const ON_MEDIA_CHIP_TEXT = '#101315';

function GenderChip({
  active,
  label,
  accessibilityLabel,
  onPress,
}: {
  active: boolean;
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
      style={{
        minWidth: 20,
        alignItems: 'center',
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: BORDER_RADIUS.sm,
        borderWidth: 1,
        borderColor: active ? ON_MEDIA_TEXT : ON_MEDIA_TEXT_DIM,
        backgroundColor: active ? ON_MEDIA_TEXT : 'transparent',
      }}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: '700',
          fontFamily: FONT_FAMILIES.textBold,
          color: active ? ON_MEDIA_CHIP_TEXT : ON_MEDIA_TEXT,
        }}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

function Dot({ active, onPress }: { active: boolean; onPress: () => void }) {
  const widthSV = useSharedValue(active ? 16 : 6);
  useEffect(() => {
    widthSV.value = withTiming(active ? 16 : 6, { duration: 220 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  const style = useAnimatedStyle(() => ({ width: widthSV.value }));
  return (
    <PressableScale onPress={onPress} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
      <Animated.View
        style={[
          {
            height: 6,
            borderRadius: 3,
            backgroundColor: active ? ON_MEDIA_TEXT : ON_MEDIA_TEXT_DIM,
          },
          style,
        ]}
      />
    </PressableScale>
  );
}

interface TechniqueMediaSliderProps {
  mediaUrl: string | null;
  height?: number;
  autoPlay?: boolean;
}

export function TechniqueMediaSlider({
  mediaUrl,
  height = 190,
  autoPlay = true,
}: TechniqueMediaSliderProps) {
  const { colors } = useTheme();
  const profileGender = useMediaGender();
  // Override живёт в компоненте: тап по чипу пола не трогает профиль и не уезжает в кэш.
  const [genderOverride, setGenderOverride] = useState<MediaGender | null>(null);
  const gender = genderOverride ?? profileGender;
  // Переключатель нужен только там, где есть вторая пара кадров: у легаси выбирать нечего.
  const gendered = isGenderedMedia(mediaUrl);
  const urls = useMemo(() => parseMediaUrls(mediaUrl, gender), [mediaUrl, gender]);
  // MED-FIT-2 (08.10): объект источника живёт в memo, а не в литерале внутри renderItem.
  // Литерал `{{ uri: item }}` создаётся заново на каждый рендер, а перерисовка случается
  // по трём поводам (onLayout ширины, onLoad пропорций, конец скролла) — на Android
  // expo-image перезапускал загрузку и показывал placeholder контейнера: вторая рамка
  // мелькала и гасла до серого квадрата.
  const sources = useMemo(() => urls.map((uri) => ({ uri })), [urls]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [width, setWidth] = useState(0);
  // MED-FIT-3 (08.10): высота бокса известна ДО монтирования списка.
  //
  // MED-FIT v2 брал пропорции из onLoad уже отрендеренного Image: высота менялась
  // 220→253 на живых слайдах, VirtualizedList перемонтировал ячейки, и обе рамки
  // грузились повторно (замер на устройстве: два полных цикла onLoad на одно открытие).
  // Офскриновый второй кадр после такой пересборки не перекрашивался — на экране это
  // серый контейнер через долю секунды после появления кадра.
  // Поэтому размер кадра теперь замеряется заранее через NativeImage.getSize по первому
  // URI (рамки одного упражнения пропорциональны — см. замер каталога в mediaFit.ts),
  // а FlatList монтируется один раз с финальной высотой.
  const [probed, setProbed] = useState<{ w: number; h: number } | null>(null);
  const [probeDone, setProbeDone] = useState(false);
  // Ключ папки, для которой размер уже снят. Смена пола меняет только суффикс файла
  // (`00f` → `00m`), пропорции остаются прежние, а пересъёмка размера на каждый тап
  // схлопнула бы бокс до фиксированной высоты — тот самый серый кадр из MED-FIT-3.
  const folderKey = urls.length > 0 ? urls[0].slice(0, urls[0].lastIndexOf('/')) : '';
  const probedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const first = urls[0];
    if (!first) {
      setProbeDone(true);
      return;
    }
    if (probedKeyRef.current === folderKey) return;
    setProbed(null);
    setProbeDone(false);
    let alive = true;
    NativeImage.getSize(
      first,
      (w, h) => {
        if (!alive) return;
        setProbed({ w, h });
        setProbeDone(true);
        probedKeyRef.current = folderKey;
      },
      () => {
        if (!alive) return;
        setProbeDone(true); // держим прежнюю фиксированную высоту, список всё равно смонтируется
      }
    );
    return () => {
      alive = false;
    };
  }, [urls, folderKey]);
  const boxH = mediaBoxHeight(width, probed?.w ?? 0, probed?.h ?? 0, height);
  const slideW = width > 0 ? width : '100%';
  const [isTouching, setIsTouching] = useState(false);
  const listRef = useRef<FlatList<string>>(null);
  const activeIndexRef = useRef(0);

  const goTo = useCallback(
    (index: number) => {
      if (width <= 0 || urls.length === 0) return;
      const clamped = ((index % urls.length) + urls.length) % urls.length;
      activeIndexRef.current = clamped;
      setActiveIndex(clamped);
      listRef.current?.scrollToOffset({ offset: clamped * width, animated: true });
    },
    [width, urls.length]
  );

  // Автоплей: только когда autoPlay=true, секция открыта и пользователь не трогает
  useEffect(() => {
    if (!autoPlay || urls.length <= 1 || isTouching || width <= 0) return;
    const timer = setInterval(() => goTo(activeIndexRef.current + 1), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [autoPlay, urls.length, isTouching, width, goTo]);

  const handleScrollEnd = useCallback(
    (e: any) => {
      const w = e.nativeEvent.layoutMeasurement.width;
      if (w > 0) {
        const idx = Math.round(e.nativeEvent.contentOffset.x / w);
        const clamped = Math.max(0, Math.min(urls.length - 1, idx));
        activeIndexRef.current = clamped;
        setActiveIndex(clamped);
      }
      setIsTouching(false);
    },
    [urls.length]
  );

  // Хук обязан быть до раннего return — иначе порядок хуков плывёт на пустом каталоге.
  const renderItem = useCallback(
    ({ index }: { index: number }) => (
      <Image
        source={sources[index]}
        style={{ width: slideW, height: boxH }}
        contentFit="cover"
        transition={250}
      />
    ),
    [sources, slideW, boxH]
  );

  if (urls.length === 0) return null;
  // Пока размер кадра не известен, список не монтируем: иначе первая же смена высоты
  // пересоберёт ячейки и вернёт тот самый серый кадр (MED-FIT-3).
  if (!probeDone) return <View style={{ marginTop: SPACING.md, height }} />;

  return (
    <View style={{ marginTop: SPACING.md }}>
      <View
        onLayout={(e) => {
          // WEB-FZ-6: guard против ResizeObserver-дребезга (см. Reveal/Skeleton) —
          // без него каждое событие переставляет все страницы карусели.
          const next = e.nativeEvent.layout.width;
          setWidth((prev) => (Math.abs(prev - next) < 1 ? prev : next));
        }}
        style={{
          height: boxH,
          borderRadius: BORDER_RADIUS.md,
          overflow: 'hidden',
          backgroundColor: colors.surfaceSecondary,
        }}
      >
        <FlatList
          ref={listRef}
          data={urls}
          keyExtractor={(uri) => uri}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScrollBeginDrag={() => setIsTouching(true)}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={(e) => {
            const vx = Math.abs(e.nativeEvent.velocity?.x ?? 0);
            if (vx < 0.5) handleScrollEnd(e);
          }}
          renderItem={renderItem}
        />
      </View>

      {/* Лейбл на тёмном скриме — белый фиксирован (подложка всегда тёмная) */}
      <View
        style={{
          position: 'absolute',
          top: SPACING.sm,
          left: SPACING.sm,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          backgroundColor: ON_MEDIA_SCRIM,
          paddingHorizontal: SPACING.sm,
          paddingVertical: 3,
          borderRadius: BORDER_RADIUS.sm,
        }}
      >
        <ImageIcon size={11} color={ON_MEDIA_TEXT} />
        <Text style={{ color: ON_MEDIA_TEXT, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>
          ТЕХНИКА
        </Text>
        {gendered && (
          <View style={{ flexDirection: 'row', gap: 4, marginLeft: 2 }}>
            <GenderChip
              active={gender === 'female'}
              label="Ж"
              accessibilityLabel="Показать технику на женской фигуре"
              onPress={() => setGenderOverride('female')}
            />
            <GenderChip
              active={gender === 'male'}
              label="М"
              accessibilityLabel="Показать технику на мужской фигуре"
              onPress={() => setGenderOverride('male')}
            />
          </View>
        )}
      </View>

      {urls.length > 1 && (
        <>
          <View
            style={{
              position: 'absolute',
              bottom: SPACING.sm,
              left: 0,
              right: 0,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {urls.map((_, i) => (
              <Dot key={`dot-${i}`} active={i === activeIndex} onPress={() => goTo(i)} />
            ))}
          </View>
          <View
            style={{
              position: 'absolute',
              bottom: SPACING.sm,
              right: SPACING.sm,
              backgroundColor: ON_MEDIA_SCRIM,
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: BORDER_RADIUS.sm,
            }}
          >
            <Text
              style={{
                color: ON_MEDIA_TEXT,
                fontSize: 10,
                fontWeight: '700',
                fontFamily: FONT_FAMILIES.textBold,
              }}
            >
              {activeIndex + 1}/{urls.length}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}
