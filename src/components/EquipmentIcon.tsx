// src/components/EquipmentIcon.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SvgProps } from 'react-native-svg';
import { getMuscleColor } from '../constants/muscleColors';
import { EQUIPMENT_SVG_MAP } from '../constants/equipmentIcons';
import { useTheme } from '../hooks/useTheme';

// Импорт всех SVG иконок (83 уникальных файла)
import AbBenchIcon from '../assets/equipment-icons/ab-bench.svg';
import AbCrunchIcon from '../assets/equipment-icons/ab-crunch.svg';
import AbWheelIcon from '../assets/equipment-icons/ab-wheel.svg';
import AdapterIcon from '../assets/equipment-icons/adapter.svg';
import AnkleStrapIcon from '../assets/equipment-icons/ankle-strap.svg';
import BalanceBoardIcon from '../assets/equipment-icons/balance-board.svg';
import BarbellIcon from '../assets/equipment-icons/barbell.svg';
import BarHandleIcon from '../assets/equipment-icons/bar-handle.svg';
import BattleRopesIcon from '../assets/equipment-icons/battle-ropes.svg';
import BenchPressIcon from '../assets/equipment-icons/bench-press.svg';
import BoxIcon from '../assets/equipment-icons/box.svg';
import CableCrossoverIcon from '../assets/equipment-icons/cable-crossover.svg';
import CableCrossoverDownIcon from '../assets/equipment-icons/cable-crossover-down.svg';
import CableRowIcon from '../assets/equipment-icons/cable-row.svg';
import CalfRaiseIcon from '../assets/equipment-icons/calf-raise.svg';
import ChestPressIcon from '../assets/equipment-icons/chest-press.svg';
import CurlBarIcon from '../assets/equipment-icons/curl-bar.svg';
import DeclineBenchIcon from '../assets/equipment-icons/decline-bench.svg';
import DHandleIcon from '../assets/equipment-icons/d-handle.svg';
import DipStationIcon from '../assets/equipment-icons/dip-station.svg';
import DumbbellIcon from '../assets/equipment-icons/dumbbell.svg';
import EllipticalIcon from '../assets/equipment-icons/elliptical.svg';
import ExerciseBikeIcon from '../assets/equipment-icons/exercise-bike.svg';
import EzBarIcon from '../assets/equipment-icons/ez-bar.svg';
import FacePullIcon from '../assets/equipment-icons/face-pull.svg';
import FitballIcon from '../assets/equipment-icons/fitball.svg';
import FlatBenchIcon from '../assets/equipment-icons/flat-bench.svg';
import FoamRollerIcon from '../assets/equipment-icons/foam-roller.svg';
import FrameIcon from '../assets/equipment-icons/Frame.svg';
import GhdIcon from '../assets/equipment-icons/ghd.svg';
import HackSquatIcon from '../assets/equipment-icons/hack-squat.svg';
import HeavyBagIcon from '../assets/equipment-icons/heavy-bag.svg';
import HipAbductionIcon from '../assets/equipment-icons/hip-abduction.svg';
import HyperextensionIcon from '../assets/equipment-icons/hyperextension.svg';
import InclineBenchIcon from '../assets/equipment-icons/incline-bench.svg';
import JumpRopeIcon from '../assets/equipment-icons/jump-rope.svg';
import KettlebellIcon from '../assets/equipment-icons/kettlebell.svg';
import LatPulldownIcon from '../assets/equipment-icons/lat-pulldown.svg';
import LegCurlIcon from '../assets/equipment-icons/leg-curl.svg';
import LegExtensionIcon from '../assets/equipment-icons/leg-extension.svg';
import LegPressIcon from '../assets/equipment-icons/leg-press.svg';
import LeverageChestPressIcon from '../assets/equipment-icons/leverage-chest-press.svg';
import LeverageDeadliftIcon from '../assets/equipment-icons/leverage-deadlift.svg';
import LeverageHighRowIcon from '../assets/equipment-icons/leverage-high-row.svg';
import LeverageIsoRowIcon from '../assets/equipment-icons/leverage-iso-row.svg';
import LeverageShrugIcon from '../assets/equipment-icons/leverage-shrug.svg';
import LyingMachineSquatIcon from '../assets/equipment-icons/lying-machine-squat.svg';
import LyingTBarRowIcon from '../assets/equipment-icons/lying-t-bar-row.svg';
import MatIcon from '../assets/equipment-icons/mat.svg';
import MedicineBallIcon from '../assets/equipment-icons/medicine-ball.svg';
import NordicCurlIcon from '../assets/equipment-icons/nordic-curl.svg';
import PartnerIcon from '../assets/equipment-icons/partner.svg';
import PecDeckIcon from '../assets/equipment-icons/pec-deck.svg';
import PlatformIcon from '../assets/equipment-icons/platform.svg';
import PowerRackIcon from '../assets/equipment-icons/power-rack.svg';
import PreacherBenchIcon from '../assets/equipment-icons/preacher-bench.svg';
import PreacherCurlIcon from '../assets/equipment-icons/preacher-curl.svg';
import ProwlerIcon from '../assets/equipment-icons/prowler.svg';
import PullUpBarIcon from '../assets/equipment-icons/pull-up-bar.svg';
import PushUpBarIcon from '../assets/equipment-icons/push-up-bar.svg';
import ResistanceBandsIcon from '../assets/equipment-icons/resistance-bands.svg';
import RevHyperextentionIcon from '../assets/equipment-icons/rev_hyperextention.svg';
import RingsIcon from '../assets/equipment-icons/rings.svg';
import RowingMachineIcon from '../assets/equipment-icons/rowing-machine.svg';
import ShoulderPressIcon from '../assets/equipment-icons/shoulder-press.svg';
import SissySquatIcon from '../assets/equipment-icons/sissy-squat.svg';
import SledgehammerIcon from '../assets/equipment-icons/sledgehammer.svg';
import SmithMachineIcon from '../assets/equipment-icons/smith-machine.svg';
import SquatRackIcon from '../assets/equipment-icons/squat-rack.svg';
import StairClimberIcon from '../assets/equipment-icons/stair-climber.svg';
import StepperIcon from '../assets/equipment-icons/stepper.svg';
import SupportIcon from '../assets/equipment-icons/support.svg';
import SuspensionTrainerIcon from '../assets/equipment-icons/suspension-trainer.svg';
import TBarIcon from '../assets/equipment-icons/t-bar.svg';
import TireIcon from '../assets/equipment-icons/tire.svg';
import TrapBarIcon from '../assets/equipment-icons/trap-bar.svg';
import TreadmillIcon from '../assets/equipment-icons/treadmill.svg';
import TricepPushdownIcon from '../assets/equipment-icons/tricep-pushdown.svg';
import TricepsCurlIcon from '../assets/equipment-icons/triceps-curl.svg';
import TrxTrainerIcon from '../assets/equipment-icons/trx-trainer.svg';
import VHandleIcon from '../assets/equipment-icons/v-handle.svg';
import WeightliftingBeltIcon from '../assets/equipment-icons/weightlifting-belt.svg';
import WeightPlateIcon from '../assets/equipment-icons/weight-plate.svg';

// Маппинг имён файлов к импортированным компонентам
const ICON_MAP: Record<string, React.FC<SvgProps>> = {
  // Свободные веса
  'barbell.svg': BarbellIcon,
  'dumbbell.svg': DumbbellIcon,
  'ez-bar.svg': EzBarIcon,
  't-bar.svg': TBarIcon,
  'trap-bar.svg': TrapBarIcon,
  'kettlebell.svg': KettlebellIcon,
  'weight-plate.svg': WeightPlateIcon,
  'medicine-ball.svg': MedicineBallIcon,
  'fitball.svg': FitballIcon,
  // Скамьи
  'flat-bench.svg': FlatBenchIcon,
  'incline-bench.svg': InclineBenchIcon,
  'preacher-bench.svg': PreacherBenchIcon,
  'ab-bench.svg': AbBenchIcon,
  'decline-bench.svg': DeclineBenchIcon,
  // Тренажёры для ног
  'hack-squat.svg': HackSquatIcon,
  'leg-press.svg': LegPressIcon,
  'lying-machine-squat.svg': LyingMachineSquatIcon,
  'leg-extension.svg': LegExtensionIcon,
  'leg-curl.svg': LegCurlIcon,
  'calf-raise.svg': CalfRaiseIcon,
  'hip-abduction.svg': HipAbductionIcon,
  // Тренажёры для верхней части тела
  'shoulder-press.svg': ShoulderPressIcon,
  'chest-press.svg': ChestPressIcon,
  'pec-deck.svg': PecDeckIcon,
  'hyperextension.svg': HyperextensionIcon,
  'rev_hyperextention.svg': RevHyperextentionIcon,
  'rowing-machine.svg': RowingMachineIcon,
  'lying-t-bar-row.svg': LyingTBarRowIcon,
  'preacher-curl.svg': PreacherCurlIcon,
  'tricep-pushdown.svg': TricepPushdownIcon,
  'triceps-curl.svg': TricepsCurlIcon,
  'dip-station.svg': DipStationIcon,
  'ab-crunch.svg': AbCrunchIcon,
  'smith-machine.svg': SmithMachineIcon,
  'nordic-curl.svg': NordicCurlIcon,
  'sissy-squat.svg': SissySquatIcon,
  'ghd.svg': GhdIcon,
  // Hammer Strength
  'bench-press.svg': BenchPressIcon,
  // Рычажные тренажёры
  'leverage-chest-press.svg': LeverageChestPressIcon,
  'leverage-deadlift.svg': LeverageDeadliftIcon,
  'leverage-high-row.svg': LeverageHighRowIcon,
  'leverage-shrug.svg': LeverageShrugIcon,
  'leverage-iso-row.svg': LeverageIsoRowIcon,
  // Кардио
  'treadmill.svg': TreadmillIcon,
  'exercise-bike.svg': ExerciseBikeIcon,
  'elliptical.svg': EllipticalIcon,
  'stair-climber.svg': StairClimberIcon,
  'stepper.svg': StepperIcon,
  // Блочные системы
  'lat-pulldown.svg': LatPulldownIcon,
  'cable-row.svg': CableRowIcon,
  'cable-crossover.svg': CableCrossoverIcon,
  'cable-crossover-down.svg': CableCrossoverDownIcon,
  // Рукояти
  'face-pull.svg': FacePullIcon,
  'bar-handle.svg': BarHandleIcon,
  'd-handle.svg': DHandleIcon,
  'v-handle.svg': VHandleIcon,
  'ankle-strap.svg': AnkleStrapIcon,
  // Стойки, рамы, перекладины
  'squat-rack.svg': SquatRackIcon,
  'power-rack.svg': PowerRackIcon,
  'pull-up-bar.svg': PullUpBarIcon,
  'rings.svg': RingsIcon,
  'trx-trainer.svg': TrxTrainerIcon,
  // Функциональный тренинг
  'prowler.svg': ProwlerIcon,
  'sledgehammer.svg': SledgehammerIcon,
  'tire.svg': TireIcon,
  'heavy-bag.svg': HeavyBagIcon,
  'battle-ropes.svg': BattleRopesIcon,
  // Аксессуары и разное
  'box.svg': BoxIcon,
  'platform.svg': PlatformIcon,
  'support.svg': SupportIcon,
  'partner.svg': PartnerIcon,
  'suspension-trainer.svg': SuspensionTrainerIcon,
  'mat.svg': MatIcon,
  'jump-rope.svg': JumpRopeIcon,
  'foam-roller.svg': FoamRollerIcon,
  'resistance-bands.svg': ResistanceBandsIcon,
  'curl-bar.svg': CurlBarIcon,
  'ab-wheel.svg': AbWheelIcon,
  'balance-board.svg': BalanceBoardIcon,
  'adapter.svg': AdapterIcon,
  'weightlifting-belt.svg': WeightliftingBeltIcon,
  'push-up-bar.svg': PushUpBarIcon,
  // Универсальный fallback
  'Frame.svg': FrameIcon,
};

// Регистронезависимый индекс: строки в exercises.equipment могут отличаться
// регистром от ключей карты (например, "Кроссовер (верхний блок)" vs "Кроссовер (Верхний Блок)").
// Строится один раз на уровне модуля, в рендере — O(1) lookup.
const EQUIPMENT_SVG_MAP_LOWER: Record<string, string> = Object.fromEntries(
  Object.entries(EQUIPMENT_SVG_MAP).map(([key, value]) => [key.trim().toLowerCase(), value]),
);

// Dev-time assert: каждое значение EQUIPMENT_SVG_MAP должно быть ключом в ICON_MAP
// (закрывает ref-guide 2.F — предотвращает будущий рассинхрон)
if (__DEV__) {
  Object.values(EQUIPMENT_SVG_MAP).forEach((file) => {
    if (!ICON_MAP[file]) {
      console.warn(
        `[EquipmentIcon] EQUIPMENT_SVG_MAP ссылается на "${file}", которого нет в ICON_MAP`,
      );
    }
  });
}

interface EquipmentIconProps {
  name: string;
  primaryMuscles?: string[];
  size?: number;
  style?: any;
  scale?: number;
}

export const EquipmentIcon: React.FC<EquipmentIconProps> = ({
  name,
  primaryMuscles = [],
  size = 24,
  style,
  scale = 0.85,
}) => {
  const { colors } = useTheme();
  const svgFileName =
    EQUIPMENT_SVG_MAP_LOWER[(name ?? '').trim().toLowerCase()] || 'dumbbell.svg';
  const IconComponent = ICON_MAP[svgFileName];
  const iconColor =
    primaryMuscles.length > 0 ? getMuscleColor(primaryMuscles[0]) : colors.textTertiary;

  if (!IconComponent) {
    // Fallback на универсальную иконку
    return (
      <View style={[styles.container, { width: size, height: size }, style]}>
        <DumbbellIcon
          width={size * 0.7}
          height={size * 0.7}
          fill={iconColor}
          stroke={iconColor}
          strokeWidth={3}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <View style={{ transform: [{ scale }] }}>
        {React.createElement(IconComponent, {
          width: size,
          height: size,
          fill: iconColor,
          stroke: iconColor,
          strokeWidth: 3,
          viewBox: '0 0 100 100',
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export { EQUIPMENT_SVG_MAP, ICON_MAP };