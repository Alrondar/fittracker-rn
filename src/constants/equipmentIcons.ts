// src/constants/equipmentIcons.ts

export const EQUIPMENT_SVG_MAP: Record<string, string> = {
  // === Свободные веса ===
  'Штанга': 'barbell.svg',
  'Гантели': 'dumbbell.svg',
  'EZ-гриф': 'ez-bar.svg',
  'Т-гриф': 'trap-bar.svg',
  'Гири': 'kettlebell.svg',
  'Блин': 'weight-plate.svg',
  'Медбол': 'medicine-ball.svg',
  
  // === Скамьи ===
  'Скамья': 'flat-bench.svg',
  'Наклонная скамья': 'incline-bench.svg',
  'Скамья Скотта': 'preacher-bench.svg',
  'Скамья со спинкой': 'flat-bench.svg',
  
  // === Тренажёры для ног ===
  'Гакк-тренажер': 'hack-squat.svg',
  'Тренажер для жима ногами': 'leg-press.svg',
  'Тренажер для разгибаний ног': 'leg-extension.svg',
  'Тренажер для сгибаний ног лежа': 'leg-curl.svg',
  'Тренажер для сгибаний ног сидя': 'leg-curl.svg',
  'Тренажер для подъемов на носки сидя': 'calf-raise.svg',
  'Тренажер для разведений ног': 'hip-abduction.svg',
  
  // === Тренажёры для верхней части ===
  'Тренажер для жима на плечи': 'shoulder-press.svg',
  'Тренажер Chest Press': 'chest-press.svg',
  'Тренажер Pec Deck': 'pec-deck.svg',
  'Тренажер Pec Deck (обратные разведения)': 'pec-deck.svg',
  'Тренажер для гиперэкстензии': 'hyperextension.svg',
  'Тренажер для тяги': 'rowing-machine.svg',
  'Тренажер для сгибаний рук': 'preacher-curl.svg',
  'Тренажер для отжиманий на брусьях': 'dip-station.svg',
  'Тренажер для скручиваний': 'ab-crunch.svg',
  'Тренажер Смита': 'smith-machine.svg',
  'Тренажер Nordic': 'nordic-curl.svg',
  'Тренажер Sissy Squat': 'sissy-squat.svg',
  
  // === Hammer Strength ===
  'Тренажер Hammer Strength (горизонтальный жим)': 'bench-press.svg',
  'Тренажер Hammer Strength (жим на плечи)': 'shoulder-press.svg',
  
  // === Блочные системы ===
  'Верхний блок': 'lat-pulldown.svg',
  'Нижний блок': 'cable-row.svg',
  'Кроссовер': 'cable-crossover.svg',
  'Кроссовер (верхний блок)': 'cable-crossover.svg',
  'Кроссовер (нижний блок)': 'cable-crossover-down.svg',
  'Кроссовер (верхний/средний блок)': 'cable-crossover.svg',
  
  // === Рукояти ===
  'Канатная рукоять': 'face-pull.svg',
  'Прямая рукоять': 'bar-handle.svg',
  'D-образная рукоять': 'd-handle.svg',
  'V-образная рукоять': 'v-handle.svg', // fallback, т.к. нет отдельной иконки
  'Длинная рукоять': 'bar-handle.svg',
  'Петли для рук': 'face-pull.svg',
  'Манжета': 'd-handle.svg',
  
  // === Стойки и рамы ===
  'Стойки': 'squat-rack.svg',
  'Турник': 'pull-up-bar.svg',
  'Брусья': 'dip-station.svg',
  'Брусья с упорами для локтей': 'dip-station.svg',
  'Опора': 'box.svg',
  
  // === Разное ===
  'Платформа': 'platform.svg',
  'Тумба 30–50 см': 'box.svg',
  'Коврик': 'foam-roller.svg', // fallback, если нет mat.svg
  'Пол': 'foam-roller.svg', // fallback
  'Ролик для запястий': 'curl-bar.svg', // fallback, если нет wrist-roller.svg
  'Ролик для пресса': 'ab-wheel.svg',
  'Партнер': 'support.svg', // fallback, если нет partner.svg
  'Адаптер': 'd-handle.svg', // fallback, если нет adapter.svg
  
  // === Универсальные fallback ===
  'Тренажер': 'chest-press.svg',
};