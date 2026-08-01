import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Image as ImageIcon } from 'lucide-react-native';

import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';

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
        return parsed.filter((u): u is string => typeof u === 'string' && u.trim().length > 0).map(u => u.trim());
      }
    } catch { /* не JSON — идём дальше */ }
  }

  if (/[,\n;]/.test(trimmed)) {
    return trimmed.split(/[,\n;]/).map(s => s.trim()).filter(Boolean);
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
    <TouchableOpacity onPress={onPress} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
      <Animated.View
        style={[{ height: 6, borderRadius: 3, backgroundColor: active ? '#FFFFFF' : 'rgba(255,255,255,0.55)' }, style]}
      />
    </TouchableOpacity>
  );
}

interface TechniqueMediaSliderProps {
  mediaUrl: string | null;
  height?: number;
  autoPlay?: boolean;
}

export function TechniqueMediaSlider({ mediaUrl, height = 190, autoPlay = true }: TechniqueMediaSliderProps) {
  const { colors } = useTheme();
  const urls = useMemo(() => parseMediaUrls(mediaUrl), [mediaUrl]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [width, setWidth] = useState(0);
  const [isTouching, setIsTouching] = useState(false);
  const listRef = useRef<FlatList<string>>(null);
  const activeIndexRef = useRef(0);

  const goTo = useCallback((index: number) => {
    if (width <= 0 || urls.length === 0) return;
    const clamped = ((index % urls.length) + urls.length) % urls.length;
    activeIndexRef.current = clamped;
    setActiveIndex(clamped);
    listRef.current?.scrollToOffset({ offset: clamped * width, animated: true });
  }, [width, urls.length]);

  // Автоплей: только когда autoPlay=true, секция открыта и пользователь не трогает
  useEffect(() => {
    if (!autoPlay || urls.length <= 1 || isTouching || width <= 0) return;
    const timer = setInterval(() => goTo(activeIndexRef.current + 1), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [autoPlay, urls.length, isTouching, width, goTo]);

  const handleScrollEnd = useCallback((e: any) => {
    const w = e.nativeEvent.layoutMeasurement.width;
    if (w > 0) {
      const idx = Math.round(e.nativeEvent.contentOffset.x / w);
      const clamped = Math.max(0, Math.min(urls.length - 1, idx));
      activeIndexRef.current = clamped;
      setActiveIndex(clamped);
    }
    setIsTouching(false);
  }, [urls.length]);

  if (urls.length === 0) return null;

  return (
    <View style={{ marginTop: SPACING.md }}>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ height, borderRadius: BORDER_RADIUS.md, overflow: 'hidden', backgroundColor: colors.surfaceSecondary }}
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
          renderItem={({ item }) => (
            <Image
              source={{ uri: item }}
              style={{ width: width > 0 ? width : '100%', height }}
              contentFit="cover"
              transition={250}
            />
          )}
        />
      </View>

      {/* Лейбл на тёмном скриме — белый фиксирован (подложка всегда тёмная) */}
      <View style={{
        position: 'absolute', top: SPACING.sm, left: SPACING.sm,
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: SPACING.sm, paddingVertical: 3,
        borderRadius: BORDER_RADIUS.sm,
      }}>
        <ImageIcon size={11} color="#FFFFFF" />
        <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>ТЕХНИКА</Text>
      </View>

      {urls.length > 1 && (
        <>
          <View style={{
            position: 'absolute', bottom: SPACING.sm, left: 0, right: 0,
            flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
          }}>
            {urls.map((_, i) => (
              <Dot key={`dot-${i}`} active={i === activeIndex} onPress={() => goTo(i)} />
            ))}
          </View>
          <View style={{
            position: 'absolute', bottom: SPACING.sm, right: SPACING.sm,
            backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 6, paddingVertical: 2,
            borderRadius: BORDER_RADIUS.sm,
          }}>
            <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>
              {activeIndex + 1}/{urls.length}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}