import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import { View, Text, FlatList } from 'react-native';
import { PressableScale } from '../ui/PressableScale';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Image, type ImageLoadEventData } from 'expo-image';
import { FONT_FAMILIES } from '../../constants/fonts';
import { pickMediaFit } from '../../utils/mediaFit';
import { Image as ImageIcon } from 'lucide-react-native';

import { useTheme } from '../../hooks/useTheme';
import {
  SPACING,
  BORDER_RADIUS,
  ON_MEDIA_SCRIM,
  ON_MEDIA_TEXT,
  ON_MEDIA_TEXT_DIM,
} from '../../constants/theme';

const AUTOPLAY_MS = 3000;

/**
 * Парсит media_url из БД.
 * Паттерн free-exercise-db: ".../0.jpg" → генерирует 0.jpg + 1.jpg.
 * Также поддерживает JSON-массив и список через запятую/перенос.
 */
export const parseMediaUrls = (mediaUrl: string | null | undefined): string[] => {
  if (!mediaUrl) return [];
  const trimmed = String(mediaUrl).trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
          .map((u) => u.trim());
      }
    } catch {
      /* не JSON — идём дальше */
    }
  }

  if (/[,\n;]/.test(trimmed)) {
    return trimmed
      .split(/[,\n;]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Паттерн free-exercise-db: ".../0.jpg" → 0.jpg + 1.jpg
  const match = trimmed.match(/^(.*\/)(\d+)\.(jpg|jpeg|png|webp)$/i);
  if (match) {
    return [`${match[1]}0.${match[3]}`, `${match[1]}1.${match[3]}`];
  }

  return [trimmed];
};

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

// MED-FIT: формула потерь кадра и порог — в src/utils/mediaFit.ts (проверяется на
// реальных размерах каталога через tsx, без монтирования компонента).

/** Радиус размытия подложки под «целиком» — чтобы contain не висел на сером поле. */
const BACKDROP_BLUR = 28;

interface MediaSlideProps {
  uri: string;
  width: number;
  height: number;
}

/**
 * Один слайд: стартует как cover (им и остаётся для 93% каталога), а по реальным
 * размерам из onLoad решает, не слишком ли много отсекается. Если слишком —
 * перерисовывается в contain по размытой подложке из той же картинки.
 */
const MediaSlide = memo(function MediaSlide({ uri, width, height }: MediaSlideProps) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  const handleLoad = useCallback((e: ImageLoadEventData) => {
    const src = e?.source;
    if (!src?.width || !src?.height) return;
    setNatural((prev) =>
      prev && prev.w === src.width && prev.h === src.height ? prev : { w: src.width, h: src.height }
    );
  }, []);

  const w = width > 0 ? width : '100%';
  const fit = natural ? pickMediaFit(natural.w, natural.h, width, height) : 'cover';

  if (fit === 'contain') {
    return (
      <View style={{ width: w, height, overflow: 'hidden' }}>
        <Image
          source={{ uri }}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
          contentFit="cover"
          blurRadius={BACKDROP_BLUR}
        />
        <Image
          source={{ uri }}
          style={{ width: w, height }}
          contentFit="contain"
          transition={250}
        />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={{ width: w, height }}
      contentFit="cover"
      transition={250}
      onLoad={handleLoad}
    />
  );
});

export function TechniqueMediaSlider({
  mediaUrl,
  height = 190,
  autoPlay = true,
}: TechniqueMediaSliderProps) {
  const { colors } = useTheme();
  const urls = useMemo(() => parseMediaUrls(mediaUrl), [mediaUrl]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [width, setWidth] = useState(0);
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

  if (urls.length === 0) return null;

  return (
    <View style={{ marginTop: SPACING.md }}>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{
          height,
          borderRadius: BORDER_RADIUS.md,
          overflow: 'hidden',
          backgroundColor: colors.surfaceSecondary,
        }}
      >
        <FlatList
          ref={listRef}
          data={urls}
          keyExtractor={(_, i) => `media-${i}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScrollBeginDrag={() => setIsTouching(true)}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={(e) => {
            const vx = Math.abs(e.nativeEvent.velocity?.x ?? 0);
            if (vx < 0.5) handleScrollEnd(e);
          }}
          renderItem={({ item }) => <MediaSlide uri={item} width={width} height={height} />}
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
