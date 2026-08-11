// src/constants/equipmentIcons.ts
// Маппинг: название оборудования (из БД) → SVG-файл в assets/equipment-icons/
// Значения совпадают с полем equipment.icon в таблице equipment.
// Примечание: дубли по регистру убраны — нормализация выполняется в EquipmentIcon.tsx
// через EQUIPMENT_SVG_MAP_LOWER (toLowerCase + trim).

export const EQUIPMENT_SVG_MAP: Record<string, string> = {
  // === Свободные веса ===
  'Штанга': 'barbell.svg',
  'Гантели': 'dumbbell.svg',
  'EZ-гриф': 'ez-bar.svg',
  'Т-гриф': 't-bar.svg',
  'Трэп-гриф': 'trap-bar.svg',
  'Гири': 'kettlebell.svg',
  'Блин': 'weight-plate.svg',
  'Медбол': 'medicine-ball.svg',
  'Фитбол': 'fitball.svg',

  // === Рукояти ===
  'D-образная рукоять': 'd-handle.svg',
  'V-образная рукоять': 'v-handle.svg',
  'Прямая рукоять': 'bar-handle.svg',
  'Длинная рукоять': 'bar-handle.svg',
  'Канатная рукоять': 'face-pull.svg',
  'Манжета': 'ankle-strap.svg',

  // === Скамьи ===
  'Скамья': 'flat-bench.svg',
  'Горизонтальная скамья': 'flat-bench.svg',
  'Наклонная скамья': 'incline-bench.svg',
  'Регулируемая наклонная скамья': 'incline-bench.svg',
  'Скамья со спинкой': 'incline-bench.svg',
  'Скамья Скотта': 'preacher-bench.svg',
  'Скамья для пресса': 'ab-bench.svg',
  'Скамья с наклоном вниз': 'decline-bench.svg',

  // === Блочные системы ===
  'Верхний блок': 'lat-pulldown.svg',
  'Нижний блок': 'cable-row.svg',
  'Кроссовер': 'cable-crossover.svg',
  'Кроссовер (Верхний Блок)': 'cable-crossover.svg',
  'Кроссовер (Верхний/Средний Блок)': 'cable-crossover.svg',
  'Кроссовер (Нижний Блок)': 'cable-crossover-down.svg',

  // === Тренажёры для ног ===
  'Гакк-тренажер': 'hack-squat.svg',
  'Тренажер для жима ногами': 'leg-press.svg',
  'Тренажер для приседаний лежа': 'lying-machine-squat.svg',
  'Тренажер для разгибаний ног': 'leg-extension.svg',
  'Тренажер для сгибаний ног лежа': 'leg-curl.svg',
  'Тренажер для сгибаний ног сидя': 'leg-curl.svg',
  'Тренажер для разведений ног': 'hip-abduction.svg',
  'Тренажер для подъемов на носки сидя': 'calf-raise.svg',

  // === Тренажёры для верхней части тела ===
  'Тренажер для жима на плечи': 'shoulder-press.svg',
  'Тренажер Chest Press': 'chest-press.svg',
  'Тренажер Pec Deck': 'pec-deck.svg',
  'Тренажер Pec Deck (обратные разведения)': 'pec-deck.svg',
  'Тренажер для тяги': 'cable-row.svg',
  'Тренажер для тяги Т-грифа': 'lying-t-bar-row.svg',
  'Тренажер для сгибаний рук': 'preacher-curl.svg',
  'Тренажер для разгибаний рук на трицепс': 'tricep-pushdown.svg',
  'Тренажер для трицепса': 'triceps-curl.svg',
  'Тренажер для отжиманий на брусьях': 'dip-station.svg',
  'Тренажер для скручиваний': 'ab-crunch.svg',
  'Тренажер для гиперэкстензии': 'hyperextension.svg',
  'Тренажер для обратной гиперэкстензии': 'rev_hyperextention.svg',
  'Тренажер Смита': 'smith-machine.svg',
  'Тренажер Nordic': 'nordic-curl.svg',
  'Тренажер Sissy Squat': 'sissy-squat.svg',
  'Тренажер GHD': 'ghd.svg',

  // === Hammer Strength ===
  'Тренажер Hammer Strength (горизонтальный жим)': 'bench-press.svg',
  'Тренажер Hammer Strength (жим на плечи)': 'shoulder-press.svg',

  // === Рычажные тренажёры (Leverage / Plate-Loaded) ===
  'Рычажный тренажер (грудь)': 'leverage-chest-press.svg',
  'Рычажный тренажер (становая тяга)': 'leverage-deadlift.svg',
  'Рычажный тренажер (тяга к верху)': 'leverage-high-row.svg',
  'Рычажный тренажер (шраги)': 'leverage-shrug.svg',
  'Изометрический тренажер для тяги': 'leverage-iso-row.svg',

  // === Кардио-тренажёры ===
  'Беговая дорожка': 'treadmill.svg',
  'Велотренажер': 'exercise-bike.svg',
  'Эллиптический тренажер': 'elliptical.svg',
  'Степпер': 'stair-climber.svg',
  'Мини-степпер': 'stepper.svg',
  'Гребной тренажер': 'rowing-machine.svg',

  // === Стойки, рамы, перекладины ===
  'Стойки': 'squat-rack.svg',
  'Силовая рама': 'power-rack.svg',
  'Турник': 'pull-up-bar.svg',
  'Брусья': 'dip-station.svg',
  'Брусья с упорами для локтей': 'dip-station.svg',
  'Гимнастические кольца': 'rings.svg',
  'TRX-петли': 'trx-trainer.svg',

  // === Функциональный тренинг ===
  'Сани (Prowler)': 'prowler.svg',
  'Кувалда': 'sledgehammer.svg',
  'Покрышка': 'tire.svg',
  'Боксерский мешок': 'heavy-bag.svg',
  'Боевые канаты': 'battle-ropes.svg',

  // === Аксессуары и разное ===
  'Платформа': 'platform.svg',
  'Тумба': 'box.svg',
  'Тумба 30–50 См': 'box.svg',
  'Опора': 'support.svg',
  'Партнер': 'partner.svg',
  'Петли для рук': 'suspension-trainer.svg',
  'Коврик': 'mat.svg',
  'Пол': 'floor.svg',
  'Скакалка': 'jump-rope.svg',
  'МФР-ролик': 'foam-roller.svg',
  'Фитнес-резинки': 'resistance-bands.svg',
  'Ролик для запястий': 'wrist-roller.svg',
  'Ролик для пресса': 'ab-wheel.svg',
  'Балансировочная доска': 'balance-board.svg',
  'Адаптер': 'adapter.svg',
  'Атлетический пояс': 'weightlifting-belt.svg',
  'Упоры для отжиманий': 'push-up-bar.svg',

  // === Универсальный fallback ===
  'Тренажер': 'Frame.svg',
};