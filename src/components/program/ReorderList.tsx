// src/components/program/ReorderList.tsx
// WEB-3b: перемещение элементов списка на вебе.
//
// `react-native-draggable-flatlist` на RNW не работает (drag-жест RNGH живёт
// только на нативных платформах). Первая итерация WEB-3b (28.09) вешала на
// вебе колонку ▲▼ — владелец отклонил 30.09: в конструкторе их было три
// (фазы/дни/упражнения) и они противоречат нативной модели «всё
// перетаскивается за грип». Здесь: на вебе `drag()` запускается тем же
// `onLongPress` грипa (RNW Pressable поддерживает delayLongPress — проверено
// в dist/exports/Pressable), дальше список сам ведёт pointer-перетаскивание:
// live-reorder по мере пересечения серединок соседних строк. Контракт
// (`data` + `renderItem({item, index, drag, isActive, getIndex})` +
// `onDragEnd({data})`) идентичен нативному, обработчики редактора не
// различают источник. На нативе — сквозной проброс в NestableDraggableFlatList.
//
// Ограничение (осознанное): авто-скролл у краёв экрана при drag не сделан —
// на типовой длине программы (несколько фаз) не требуется; чинить через
// requestAnimationFrame + scrollBy, если появится жалоба.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { NestableDraggableFlatList, ScaleDecorator } from 'react-native-draggable-flatlist';

/**
 * Обёртка строки списка. НАЙДЕНО В ПРОГОНЕ 27.09: `ScaleDecorator` вне
 * `NestableDraggableFlatList` кидает «useIsActive must be called from within
 * CellProvider!» и роняет весь экран редактора; на вебе списка-провайдера
 * нет вовсе. Потребители оборачивают строки только через RowDecorator.
 */
export function RowDecorator({ children }: { children: React.ReactNode }) {
  if (Platform.OS === 'web') return <>{children}</>;
  return <ScaleDecorator>{children}</ScaleDecorator>;
}

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

const moveItem = <T,>(data: T[], from: number, to: number): T[] => {
  const next = [...data];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

function WebReorderList<T>({ data, keyExtractor, renderItem, onDragEnd }: ReorderListProps<T>) {
  // Перетаскиваемый элемент отслеживаем КЛЮЧОМ, а не индексом: live-reorder
  // переставляет data родителем на каждом пересечении, индекс «едет», ключ — нет.
  const [dragKey, setDragKey] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, View>());
  const dataRef = useRef(data);
  dataRef.current = data;
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  const startDrag = useCallback((key: string) => setDragKey(key), []);

  useEffect(() => {
    if (dragKey === null) return undefined;

    const onMove = (event: PointerEvent) => {
      const y = event.clientY;
      const items = dataRef.current;
      const from = items.findIndex((it, i) => keyExtractor(it, i) === dragKey);
      if (from < 0) return;
      for (let i = 0; i < items.length; i++) {
        if (i === from) continue;
        const el = rowRefs.current.get(keyExtractor(items[i], i)) as unknown as
          HTMLElement | undefined;
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (y >= r.top && y <= r.bottom) {
          onDragEndRef.current({ data: moveItem(items, from, i) });
          return;
        }
      }
    };
    const finish = () => setDragKey(null);
    // Без отмены touchmove палец вместо drag запускал прокрутку страницы.
    const preventScroll = (event: TouchEvent) => event.preventDefault();

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', finish);
    document.addEventListener('pointercancel', finish);
    document.addEventListener('touchmove', preventScroll, { passive: false });
    document.body.classList.add('ft-dragging'); // см. src/lib/webFixes.ts
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', finish);
      document.removeEventListener('touchmove', preventScroll);
      document.body.classList.remove('ft-dragging');
    };
  }, [dragKey, keyExtractor]);

  return (
    <View>
      {data.map((item, index) => {
        const key = keyExtractor(item, index);
        return (
          <View
            key={key}
            ref={(r) => {
              if (r) rowRefs.current.set(key, r);
              else rowRefs.current.delete(key);
            }}
          >
            {renderItem({
              item,
              index,
              drag: () => startDrag(key),
              isActive: dragKey === key,
              getIndex: () => index,
            })}
          </View>
        );
      })}
    </View>
  );
}

export function ReorderList<T>({ data, keyExtractor, renderItem, onDragEnd }: ReorderListProps<T>) {
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

  return (
    <WebReorderList
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      onDragEnd={onDragEnd}
    />
  );
}
