// src/components/EquipmentIcon.tsx

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SvgProps } from 'react-native-svg';
import { getMuscleColor } from '../constants/muscleColors';
import { EQUIPMENT_SVG_MAP } from '../constants/equipmentIcons';

// Импорт всех SVG иконок (44 уникальных файла)
import BarbellIcon from '../assets/equipment-icons/barbell.svg';
import DumbbellIcon from '../assets/equipment-icons/dumbbell.svg';
import EzBarIcon from '../assets/equipment-icons/ez-bar.svg';
import TrapBarIcon from '../assets/equipment-icons/trap-bar.svg';
import KettlebellIcon from '../assets/equipment-icons/kettlebell.svg';
import WeightPlateIcon from '../assets/equipment-icons/weight-plate.svg';
import MedicineBallIcon from '../assets/equipment-icons/medicine-ball.svg';

import FlatBenchIcon from '../assets/equipment-icons/flat-bench.svg';
import InclineBenchIcon from '../assets/equipment-icons/incline-bench.svg';
import PreacherBenchIcon from '../assets/equipment-icons/preacher-bench.svg';

import HackSquatIcon from '../assets/equipment-icons/hack-squat.svg';
import LegPressIcon from '../assets/equipment-icons/leg-press.svg';
import LegExtensionIcon from '../assets/equipment-icons/leg-extension.svg';
import LegCurlIcon from '../assets/equipment-icons/leg-curl.svg';
import CalfRaiseIcon from '../assets/equipment-icons/calf-raise.svg';
import HipAbductionIcon from '../assets/equipment-icons/hip-abduction.svg';

import ShoulderPressIcon from '../assets/equipment-icons/shoulder-press.svg';
import ChestPressIcon from '../assets/equipment-icons/chest-press.svg';
import PecDeckIcon from '../assets/equipment-icons/pec-deck.svg';
import HyperextensionIcon from '../assets/equipment-icons/hyperextension.svg';
import RowingMachineIcon from '../assets/equipment-icons/rowing-machine.svg';
import PreacherCurlIcon from '../assets/equipment-icons/preacher-curl.svg';
import DipStationIcon from '../assets/equipment-icons/dip-station.svg';
import AbCrunchIcon from '../assets/equipment-icons/ab-crunch.svg';
import SmithMachineIcon from '../assets/equipment-icons/smith-machine.svg';
import NordicCurlIcon from '../assets/equipment-icons/nordic-curl.svg';
import SissySquatIcon from '../assets/equipment-icons/sissy-squat.svg';
import BenchPressIcon from '../assets/equipment-icons/bench-press.svg';

import LatPulldownIcon from '../assets/equipment-icons/lat-pulldown.svg';
import CableRowIcon from '../assets/equipment-icons/cable-row.svg';
import CableCrossoverIcon from '../assets/equipment-icons/cable-crossover.svg';
import CableCrossoverDownIcon from '../assets/equipment-icons/cable-crossover-down.svg';

import FacePullIcon from '../assets/equipment-icons/face-pull.svg';
import BarHandleIcon from '../assets/equipment-icons/bar-handle.svg';
import DHandleIcon from '../assets/equipment-icons/d-handle.svg';
import VHandleIcon from '../assets/equipment-icons/v-handle.svg';

import SquatRackIcon from '../assets/equipment-icons/squat-rack.svg';
import PullUpBarIcon from '../assets/equipment-icons/pull-up-bar.svg';

import BoxIcon from '../assets/equipment-icons/box.svg';
import PlatformIcon from '../assets/equipment-icons/platform.svg';
import FoamRollerIcon from '../assets/equipment-icons/foam-roller.svg';
import CurlBarIcon from '../assets/equipment-icons/curl-bar.svg';
import AbWheelIcon from '../assets/equipment-icons/ab-wheel.svg';
import SupportIcon from '../assets/equipment-icons/support.svg';
import MatIcon from '../assets/equipment-icons/mat.svg';

// Маппинг имён файлов к импортированным компонентам
const ICON_MAP: Record<string, React.FC<SvgProps>> = {
  'barbell.svg': BarbellIcon,
  'dumbbell.svg': DumbbellIcon,
  'ez-bar.svg': EzBarIcon,
  'trap-bar.svg': TrapBarIcon,
  'kettlebell.svg': KettlebellIcon,
  'weight-plate.svg': WeightPlateIcon,
  'medicine-ball.svg': MedicineBallIcon,
  'flat-bench.svg': FlatBenchIcon,
  'incline-bench.svg': InclineBenchIcon,
  'preacher-bench.svg': PreacherBenchIcon,
  'hack-squat.svg': HackSquatIcon,
  'leg-press.svg': LegPressIcon,
  'leg-extension.svg': LegExtensionIcon,
  'leg-curl.svg': LegCurlIcon,
  'calf-raise.svg': CalfRaiseIcon,
  'hip-abduction.svg': HipAbductionIcon,
  'shoulder-press.svg': ShoulderPressIcon,
  'chest-press.svg': ChestPressIcon,
  'pec-deck.svg': PecDeckIcon,
  'hyperextension.svg': HyperextensionIcon,
  'rowing-machine.svg': RowingMachineIcon,
  'preacher-curl.svg': PreacherCurlIcon,
  'dip-station.svg': DipStationIcon,
  'ab-crunch.svg': AbCrunchIcon,
  'smith-machine.svg': SmithMachineIcon,
  'nordic-curl.svg': NordicCurlIcon,
  'sissy-squat.svg': SissySquatIcon,
  'bench-press.svg': BenchPressIcon,
  'lat-pulldown.svg': LatPulldownIcon,
  'cable-row.svg': CableRowIcon,
  'cable-crossover.svg': CableCrossoverIcon,
  'cable-crossover-down.svg': CableCrossoverDownIcon,
  'face-pull.svg': FacePullIcon,
  'bar-handle.svg': BarHandleIcon,
  'd-handle.svg': DHandleIcon,
  'v-handle.svg': VHandleIcon,
  'squat-rack.svg': SquatRackIcon,
  'pull-up-bar.svg': PullUpBarIcon,
  'box.svg': BoxIcon,
  'platform.svg': PlatformIcon,
  'foam-roller.svg': FoamRollerIcon,
  'curl-bar.svg': CurlBarIcon,
  'ab-wheel.svg': AbWheelIcon,
   'mat.svg': MatIcon,
  'support.svg': SupportIcon,
};

interface EquipmentIconProps {
  name: string;
  primaryMuscles?: string[]; // Для цветовой кодировки
  size?: number;
  style?: any;
  scale?: number; // Для "громоздких" иконок (0.7-1.0)
}

export const EquipmentIcon: React.FC<EquipmentIconProps> = ({
  name,
  primaryMuscles = [],
  size = 24,
  style,
  scale = 0.85, // По умолчанию уменьшаем на 15% для громоздких
}) => {
  // Определяем файл иконки по названию оборудования
  const svgFileName = EQUIPMENT_SVG_MAP[name] || 'dumbbell.svg';
  const IconComponent = ICON_MAP[svgFileName];

  // Определяем цвет на основе мышц
  const iconColor = primaryMuscles.length > 0
    ? getMuscleColor(primaryMuscles[0])
    : '#6B7280'; // серый по умолчанию

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

  // ✅ УМНЫЙ КОМПОНЕНТ: передаём И fill, И stroke
  // - Если иконка fill-based (hakk-squat, kettlebell) → окрасится через fill
  // - Если иконка stroke-based (dumbbell, barbell, elliptical) → окрасится через stroke
  // - stroke-width нужен только для stroke-based иконок
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <View style={{ transform: [{ scale }] }}>
        {React.createElement(IconComponent, {
          width: size,
          height: size,
          fill: iconColor,        // для fill-based иконок
          stroke: iconColor,      // для stroke-based иконок
          strokeWidth: 3,         // толщина контура (игнорируется fill-based)
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

// Экспорт маппинга для использования в других местах
export { EQUIPMENT_SVG_MAP, ICON_MAP };