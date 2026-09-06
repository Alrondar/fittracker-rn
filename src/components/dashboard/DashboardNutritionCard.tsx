// src/components/dashboard/DashboardNutritionCard.tsx
// AUDIT-1: L1-summary питания на Dashboard.
// 2 страницы: кольца + макросы / таблица недели.
// NUTRI-2: tap по заголовку → список записей за сегодня.

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';

import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../store/useStore';
import { typography } from '../../styles/typography';
import { SPACING, scale } from '../../constants/theme';
import { MACRO_COLORS } from '../../constants/semanticColors';
import { AppCard } from '../ui/AppCard';
import { CircularNutritionChart } from './CircularNutritionChart';
import { NutritionWeekTable } from './NutritionWeekTable';
import { useBurnedCalories } from '../../hooks/useBurnedCalories';
import { WeeklyBalanceChip } from './WeeklyBalanceChip';

interface DashboardNutritionCardProps {
  daily: {
    calories: number;
    proteins: number;
    fats: number;
    carbs: number;
    water_ml: number;
  };

  targets: {
    calories: number;
    proteins: number;
    fats: number;
    carbs: number;
  };

  onOpenModal: () => void;

  // NUTRI-2: открыть список записей.
  onOpenLogList?: () => void;
}

export function DashboardNutritionCard({
  daily,
  targets,
  onOpenModal,
  onOpenLogList,
}: DashboardNutritionCardProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { userId } = useStore();

  const { data: burned } = useBurnedCalories(userId);

  const [page, setPage] = useState(0);

  const [weekVisited, setWeekVisited] = useState(false);

  const [pageWidth, setPageWidth] = useState(0);

  const scrollRef = useRef<ScrollView>(null);

  const goToPage = useCallback(
    (idx: number) => {
      setPage(idx);

      if (idx === 1) {
        setWeekVisited(true);
      }

      scrollRef.current?.scrollTo({
        x: pageWidth * idx,
        y: 0,
        animated: true,
      });
    },
    [pageWidth]
  );

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!pageWidth) return;

      const idx = Math.round(e.nativeEvent.contentOffset.x / pageWidth);

      setPage(idx);

      if (idx === 1) {
        setWeekVisited(true);
      }
    },
    [pageWidth]
  );

  const hasTargets = targets.calories > 0 || targets.proteins > 0;

  if (!hasTargets) {
    return (
      <AppCard variant="default">
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View>
            <Text
              style={[
                typography.h5,
                {
                  color: colors.textPrimary,
                },
              ]}
            >
              Питание
            </Text>

            <Text
              style={[
                typography.caption,
                {
                  color: colors.textSecondary,
                  marginTop: 4,
                },
              ]}
            >
              Цели не заданы
            </Text>
          </View>

          <TouchableOpacity onPress={() => router.push('/profile/goals')}>
            <Text
              style={[
                typography.body,
                {
                  color: colors.primary,
                },
              ]}
            >
              Задать
            </Text>
          </TouchableOpacity>
        </View>
      </AppCard>
    );
  }

  return (
    <AppCard variant="default">
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: SPACING.md,
        }}
      >
        {/* NUTRI-2:
            Заголовок — вход в список записей. */}
        <TouchableOpacity
          onPress={onOpenLogList}
          activeOpacity={0.7}
          disabled={!onOpenLogList}
          hitSlop={{
            top: 8,
            bottom: 8,
            left: 8,
            right: 8,
          }}
        >
          <Text
            style={[
              typography.h5,
              {
                color: colors.textPrimary,
              },
            ]}
          >
            Питание сегодня
          </Text>
        </TouchableOpacity>

        {/* FEAT-3: L1 чип недельного баланса калорий.
            Скрывается автоматически при недостатке данных. */}
        <WeeklyBalanceChip />

        <TouchableOpacity
          onPress={onOpenModal}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
          hitSlop={{
            top: 10,
            bottom: 10,
            left: 10,
            right: 10,
          }}
        >
          <Plus size={scale(18)} color={colors.primary} strokeWidth={2} />

          <Text
            style={[
              typography.caption,
              {
                color: colors.primary,
              },
            ]}
          >
            Добавить
          </Text>
        </TouchableOpacity>
      </View>

      <View onLayout={(e) => setPageWidth(e.nativeEvent.layout.width)}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumEnd}
        >
          {/* Страница 1: кольца + макросы */}
          <View
            style={{
              width: pageWidth || undefined,
            }}
          >
            <CircularNutritionChart
              daily={daily}
              targets={targets}
              burnedCalories={burned ?? null}
            />

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: SPACING.lg,
                paddingTop: SPACING.md,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              <MacroItem
                label="Белки"
                current={daily.proteins}
                target={targets.proteins}
                unit="г"
                color={MACRO_COLORS.proteins}
              />

              <MacroItem
                label="Жиры"
                current={daily.fats}
                target={targets.fats}
                unit="г"
                color={MACRO_COLORS.fats}
              />

              <MacroItem
                label="Углеводы"
                current={daily.carbs}
                target={targets.carbs}
                unit="г"
                color={MACRO_COLORS.carbs}
              />

              {daily.water_ml > 0 && (
                <MacroItem
                  label="Вода"
                  current={daily.water_ml}
                  target={2000}
                  unit="мл"
                  color={MACRO_COLORS.water}
                />
              )}
            </View>
          </View>

          {/* Страница 2: таблица недели */}
          <View
            style={{
              width: pageWidth || undefined,
              paddingTop: SPACING.sm,
            }}
          >
            {weekVisited ? (
              <NutritionWeekTable userId={userId} />
            ) : (
              <View
                style={{
                  height: 280,
                }}
              />
            )}
          </View>
        </ScrollView>
      </View>

      {/* Пагинация: swipe + tap */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: SPACING.sm,
          marginTop: SPACING.md,
        }}
      >
        <TouchableOpacity
          onPress={() => goToPage(0)}
          hitSlop={{
            top: 12,
            bottom: 12,
            left: 12,
            right: 12,
          }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: page === 0 ? colors.textPrimary : colors.textTertiary,
            }}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => goToPage(1)}
          hitSlop={{
            top: 12,
            bottom: 12,
            left: 12,
            right: 12,
          }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: page === 1 ? colors.textPrimary : colors.textTertiary,
            }}
          />
        </TouchableOpacity>
      </View>
    </AppCard>
  );
}

function MacroItem({
  label,
  current,
  target,
  unit,
  color,
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
      }}
    >
      <Text
        style={[
          typography.captionSmall,
          {
            color,
            marginBottom: 2,
            fontWeight: '600',
          },
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          typography.body,
          {
            color: colors.textPrimary,
            fontWeight: '600',
          },
        ]}
      >
        {current}{' '}
        <Text
          style={{
            color: colors.textTertiary,
            fontWeight: '400',
          }}
        >
          / {target} {unit}
        </Text>
      </Text>
    </View>
  );
}
