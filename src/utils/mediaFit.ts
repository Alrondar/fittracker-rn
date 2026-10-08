// src/utils/mediaFit.ts
// MED-FIT (08.10): чистая логика выбора режима показа кадра техники.
//
// Бокс слайдера — фиксированная высота × плавающая ширина (TechniqueMediaSlider:
// height 190 в карточках / 220 на странице упражнения). Каталог смешанный: по замеру
// JPEG-заголовков случайной выборки из 70 упражнений 93% кадров 3:2 (850×567, 750×500)
// и ~7% вертикальных 2:3 (850×1275, 500×750). Глобальный `contentFit="cover"` срезал с
// вертикальных 60–65% высоты — у стоящего человека не оставалось ни головы, ни ног.
//
// Решение принимается на месте по реальным размерам картинки из onLoad: cover остаётся,
// пока он не съедает слишком много; иначе кадр показывается целиком.
// Отделено от компонента, чтобы формулу можно было прогнать на реальных числах (tsx).

/** Порог потерь кадра, выше которого `cover` менять на `contain`. */
export const COVER_LOSS_MAX = 0.35;

/**
 * Доля кадра, которую `cover` отсекает у изображения imgW×imgH в боксе boxW×boxH.
 * 0 — пропорции совпали, потерь нет; →1 — отрезано почти всё.
 * При неизвестных размерах (0) возвращает 0: пока картинка не загружена, показываем
 * так, как подавляющее большинство каталога.
 */
export function coverCropLoss(imgW: number, imgH: number, boxW: number, boxH: number): number {
  if (!imgW || !imgH || !boxW || !boxH) return 0;
  const imgRatio = imgW / imgH;
  const boxRatio = boxW / boxH;
  return 1 - Math.min(imgRatio, boxRatio) / Math.max(imgRatio, boxRatio);
}

/** cover (как раньше) или contain (кадр целиком, по размытой подложке). */
export function pickMediaFit(
  imgW: number,
  imgH: number,
  boxW: number,
  boxH: number
): 'cover' | 'contain' {
  return coverCropLoss(imgW, imgH, boxW, boxH) > COVER_LOSS_MAX ? 'contain' : 'cover';
}
