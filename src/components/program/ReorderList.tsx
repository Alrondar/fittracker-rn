// src/components/program/ReorderList.tsx
// WEB-3b: перемещение элементов списка на вебе.
//
// `react-native-draggable-flatlist` на RNW не работает (drag-жест RNGH живёт
// только на нативных платформах), поэтому редактор программ на вебе получал
// непереставляемые списки. Здесь тот же контракт, что у NestableDraggableFlatList
// (`data` + `renderItem({item, drag, isActive, getIndex})` + `onDragEnd({data})`),
// но на вебе каждая строка получает колонку ▲▼, а `onDragEnd` вызывается с той
// же форме данных — обработчики перестановки в редакторе не различают источник.
// На нативе — сквозной проброс в NestableDraggableFlatList, поведение не меняется.
import React from 'react';
import { Platform, View } from 'react-native';
import { NestableDraggableFlatList } from 'react-native-draggable-flatlist';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { BORDER_RADIUS, SPACING } from '../../constants/theme';
import { PressableScale } from '../ui/PressableScale';

export interface ReorderListProps<T> {
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: (info: {
    item: T;
    index: number;
    drag: () => void;
    isActive: boolean;
    getIndex: () => number;
  }) => React.ReactElement;
  onDragEnd: (info: { data: T[] }) => void;
}

export function ReorderList<T>({ data, keyExtractor, renderItem, onDragEnd }: ReorderListProps<T>) {
  const { colors } = useTheme();

  if (Platform.OS !== 'web') {
    return (
      <NestableDraggableFlatList
        data={data}
        onDragEnd={onDragEnd}
        keyExtractor={keyExtractor as (item: T) => string}
        renderItem={(info) => {
          // RenderItemParams библиотеки не несёт index (только getIndex(),
          // «last known»); наш контракт — index + getIndex, считаем оба из
          // info с страховкой через indexOf.
          const idx = info.getIndex() ?? data.indexOf(info.item);
          return renderItem({
            item: info.item,
            index: idx,
            drag: info.drag,
            isActive: info.isActive,
            getIndex: () => idx,
          });
        }}
      />
    );
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= data.length || from === to) return;
    const next = [...data];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onDragEnd({ data: next });
  };

  return (
    <View>
      {data.map((item, index) => (
        <View key={keyExtractor(item, index)} style={{ flexDirection: 'row' }}>
          {/* Колонка перемещения: только на вебе, 36px, по центру строки. */}
          <View
            style={{
              width: 36,
              justifyContent: 'center',
              alignItems: 'center',
              gap: SPACING.xs,
            }}
          >
            <PressableScale
              onPress={() => move(index, index - 1)}
              disabled={index === 0}
              haptic="none"
              accessibilityRole="button"
              accessibilityLabel="Переместить выше"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                opacity: index === 0 ? 0.3 : 1,
                width: 28,
                height: 28,
                borderRadius: BORDER_RADIUS.full,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChevronUp size={18} color={colors.textSecondary} strokeWidth={2} />
            </PressableScale>
            <PressableScale
              onPress={() => move(index, index + 1)}
              disabled={index === data.length - 1}
              haptic="none"
              accessibilityRole="button"
              accessibilityLabel="Переместить ниже"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                opacity: index === data.length - 1 ? 0.3 : 1,
                width: 28,
                height: 28,
                borderRadius: BORDER_RADIUS.full,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChevronDown size={18} color={colors.textSecondary} strokeWidth={2} />
            </PressableScale>
          </View>
          <View style={{ flex: 1 }}>
            {renderItem({
              item,
              index,
              drag: () => {},
              isActive: false,
              getIndex: () => index,
            })}
          </View>
        </View>
      ))}
    </View>
  );
}
