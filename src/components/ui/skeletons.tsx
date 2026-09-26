// src/components/ui/skeletons.tsx
// UX-2 (L-1): скелетоны, повторяющие макет конкретных экранов, — вместо
// generic-«трёх прямоугольников». Форма/радиусы/spacing берутся из тех же
// токенов, что реальные карточки, поэтому переход skeleton→data читается как
// «экран почти готов». Оборачиваются в <ShimmerWrap> на стороне хоста.
import type { ReactNode } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS, scale } from '../../constants/theme';
import { Skeleton } from '../Skeleton';

/** Оболочка-«карточка», мимикрирующая AppCard. */
function Card({
  children,
  style,
  height,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  height?: number;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        height != null ? { height } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Dashboard: greeting → streak → insight → hero программы → статус → питание → календарь. */
export function DashboardSkeleton() {
  return (
    <View style={styles.stack}>
      {/* greeting */}
      <View style={{ marginBottom: SPACING.sm }}>
        <Skeleton width="55%" height={22} borderRadius={6} />
        <Skeleton width="35%" height={13} borderRadius={4} style={{ marginTop: SPACING.sm }} />
      </View>

      {/* streak + insight */}
      <Card height={92}>
        <Skeleton width="60%" height={16} borderRadius={5} />
        <Skeleton width="40%" height={12} borderRadius={4} style={{ marginTop: 10 }} />
      </Card>
      <Card height={64}>
        <Skeleton width="75%" height={14} borderRadius={5} />
      </Card>

      {/* hero активной программы */}
      <Card height={168}>
        <Skeleton width={scale(96)} height={20} borderRadius={6} />
        <Skeleton width="70%" height={14} borderRadius={4} style={{ marginTop: SPACING.md }} />
        <Skeleton width="100%" height={10} borderRadius={5} style={{ marginTop: SPACING.lg }} />
        <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg }}>
          <Skeleton width={44} height={44} borderRadius={BORDER_RADIUS.md} />
          <View style={{ flex: 1 }}>
            <Skeleton width="70%" height={13} borderRadius={4} />
            <Skeleton width="45%" height={11} borderRadius={4} style={{ marginTop: 8 }} />
          </View>
        </View>
      </Card>

      {/* «полоска из двух» — статус/питание */}
      <View style={styles.row}>
        <Card style={{ flex: 1 }} height={110} />
        <Card style={{ flex: 1 }} height={110} />
      </View>

      {/* календарь */}
      <Card height={220} />
    </View>
  );
}

/** Карточка программы в списке Programs: баннер-полоса + заголовок + бейджи + футер. */
export function ProgramCardSkeleton() {
  const { colors } = useTheme();
  return (
    <Card height={148} style={{ marginBottom: SPACING.md }}>
      <Skeleton width="65%" height={18} borderRadius={5} />
      <Skeleton width="40%" height={12} borderRadius={4} style={{ marginTop: SPACING.sm }} />
      <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md }}>
        <Skeleton width={70} height={22} borderRadius={BORDER_RADIUS.full} />
        <Skeleton width={54} height={22} borderRadius={BORDER_RADIUS.full} />
        <Skeleton width={62} height={22} borderRadius={BORDER_RADIUS.full} />
      </View>
      <View
        style={{
          marginTop: SPACING.md,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          paddingTop: SPACING.md,
        }}
      >
        <Skeleton width="100%" height={8} borderRadius={4} />
      </View>
    </Card>
  );
}

/** Список программ: N карточек-скелетонов. */
export function ProgramListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <ProgramCardSkeleton key={i} />
      ))}
    </View>
  );
}

/** Progress hero: крупное число + подпись + дельта. */
export function ProgressHeroSkeleton() {
  return (
    <Card height={132}>
      <Skeleton width={140} height={40} borderRadius={8} />
      <Skeleton width="45%" height={13} borderRadius={4} style={{ marginTop: SPACING.md }} />
      <Skeleton
        width={90}
        height={20}
        borderRadius={BORDER_RADIUS.full}
        style={{ marginTop: SPACING.md }}
      />
    </Card>
  );
}

/** Progress stats: сетка 2×2 малых стат-карт. */
export function StatsGridSkeleton() {
  return (
    <View style={styles.grid}>
      {[0, 1, 2, 3].map((i) => (
        <Card key={i} height={88} style={{ flexBasis: '48%' }}>
          <Skeleton width="50%" height={18} borderRadius={5} />
          <Skeleton width="65%" height={11} borderRadius={4} style={{ marginTop: 8 }} />
        </Card>
      ))}
    </View>
  );
}

/** Экран тренировки: header + карточки упражнений со «стопкой» строк сетов. */
export function WorkoutSkeleton() {
  return (
    <View style={styles.stack}>
      <Card height={64}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
          <Skeleton width={36} height={36} borderRadius={BORDER_RADIUS.md} />
          <View style={{ flex: 1 }}>
            <Skeleton width="55%" height={16} borderRadius={5} />
            <Skeleton width="35%" height={11} borderRadius={4} style={{ marginTop: 7 }} />
          </View>
        </View>
      </Card>
      {[0, 1, 2].map((i) => (
        <Card key={i} height={128}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
            <Skeleton width={44} height={18} borderRadius={BORDER_RADIUS.full} />
            <Skeleton width="55%" height={16} borderRadius={5} style={{ flexShrink: 1 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg }}>
            <Skeleton width={64} height={44} borderRadius={BORDER_RADIUS.md} />
            <Skeleton width={64} height={44} borderRadius={BORDER_RADIUS.md} />
            <Skeleton width={64} height={44} borderRadius={BORDER_RADIUS.md} />
            <Skeleton width={44} height={44} borderRadius={BORDER_RADIUS.md} />
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  card: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
  },
});
