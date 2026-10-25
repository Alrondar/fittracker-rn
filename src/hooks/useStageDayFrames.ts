import { useEffect, useRef } from 'react';
import { parseMediaUrls } from '../utils/mediaScheme';
import { stageFrames } from '../lib/mediaCache';
import { useMediaGender } from './useMediaGender';

/**
 * Скачивает заранее кадры техники, которые сегодня точно понадобятся, — упражнения
 * дня и подобранные к ним разминки. После этого техника на экране тренировки и
 * плашки разминки открываются и без связи.
 *
 * Список внутри ограничивается потолком хранилища и вытеснением по давности
 * (src/lib/mediaCache.ts), поэтому «заранее» не означает «бесконечно».
 * Повторный вызов с теми же адресами ничего не качает: день пересобирается на
 * каждую правку подходов, а кадр за ним не меняется.
 */
export function useStageDayFrames(mediaUrls: (string | null | undefined)[], ready = true): void {
  const gender = useMediaGender();
  const lastKeyRef = useRef('');

  useEffect(() => {
    if (!ready) return;
    const frames = mediaUrls.flatMap((url) => parseMediaUrls(url, gender));
    const key = frames.join('|');
    if (!frames.length || key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    // Ошибки (нет связи, 404, диск забит) глушит stageFrames: подогрев — улучшение,
    // а не зависимость, экран в любом случае дотянет кадр из сети.
    void stageFrames(frames);
  }, [mediaUrls, gender, ready]);
}
