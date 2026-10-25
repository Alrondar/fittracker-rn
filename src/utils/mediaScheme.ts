// src/utils/mediaScheme.ts
// В справочнике сосуществуют две схемы кадров техники — до тех пор, пока база не
// перерисована целиком (вердикт владельца 10.10):
//
//   новая:   <папка>/00f.jpg + 01f.jpg (женщина), 00m.jpg + 01m.jpg (мужчина)
//   легаси:  <папка>/0.jpg + 1.jpg  — наш хост или free-exercise-db
//
// Переключателем делает сам `media_url`: ссылка ведёт на `00f.jpg` → показываем
// гендерную пару, ведёт на `0.jpg` → легаси. Практический смысл: включение новой
// версии для позиции — это одна миграция строки, а откат строки возвращает легаси
// без правки кода и без удаления файлов.
//
// Инвариант данных (проверяется spark-output/export/check-media-names.py): URL
// переводим на новую схему только когда в папке лежат ОБЕ пары. Иначе профиль «мужчина»
// упрётся в 404, потому что на уровне кода наличие второй пары неотличимо от наличия
// первой — оба имени вычисляются из одного префикса.
//
// Номер версии (`...00f.jpg?v=3`) — способ проткнуть кэш телефона без пересборки
// приложения: кадр перезаписан под тем же именем, а адрес меняется, поэтому и дисковый
// кэш загрузки, и наше локальное хранилище кадров (src/lib/mediaCache.ts) видят новый
// ключ. Хост на это согласен: raw.githubusercontent отдаёт те же байты по адресу с
// хвостом и ключует свой край по полному адресу (проверено HEAD-запросом 24.10).
// Поэтому хвост срезается ДО сопоставления со схемой и возвращается на каждый выведенный
// кадр — якоря `$` в обеих регулярках иначе выбрасывают позицию в одиночный проброс и
// ломают пару кадров вместе с переключателем пола.

export type MediaGender = 'female' | 'male';

/** Новая схема: префикс папки + `00f`/`00m`. */
const GENDERED = /^(.*\/)00([fm])\.(jpg|jpeg|png|webp)$/i;
/** Легаси free-exercise-db: префикс папки + одна цифра. */
const LEGACY = /^(.*\/)(\d+)\.(jpg|jpeg|png|webp)$/i;

/** `https://…/00f.jpg?v=3` → путь без хвоста и сам хвост с `?`. */
const splitMediaQuery = (url: string): [string, string] => {
  const q = url.indexOf('?');
  return q < 0 ? [url, ''] : [url.slice(0, q), url.slice(q)];
};

/**
 * Парсит `media_url` из БД в список рамок слайдера.
 *
 * `gender` учитывается только для новой схемы; для легаси и списков он не нужен.
 * По умолчанию — женская пара: она точка входа схемы (`media_url` оканчивается на
 * `00f.jpg`) и она есть у всех переведённых позиций, тогда как мужская может
 * отсутствовать у позиции, ещё не прошедшей приёмку.
 */
export const parseMediaUrls = (
  mediaUrl: string | null | undefined,
  gender: MediaGender = 'female'
): string[] => {
  if (!mediaUrl) return [];
  const trimmed = String(mediaUrl).trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
          .map((u) => u.trim());
      }
    } catch {
      /* не JSON — идём дальше */
    }
  }

  if (/[,\n;]/.test(trimmed)) {
    return trimmed
      .split(/[,\n;]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const [path, query] = splitMediaQuery(trimmed);

  const gendered = path.match(GENDERED);
  if (gendered) {
    const suffix = gender === 'male' ? 'm' : 'f';
    return [
      `${gendered[1]}00${suffix}.${gendered[3]}${query}`,
      `${gendered[1]}01${suffix}.${gendered[3]}${query}`,
    ];
  }

  // Паттерн free-exercise-db: ".../0.jpg" → 0.jpg + 1.jpg
  const legacy = path.match(LEGACY);
  if (legacy) {
    return [`${legacy[1]}0.${legacy[3]}${query}`, `${legacy[1]}1.${legacy[3]}${query}`];
  }

  return [trimmed];
};

/** Есть ли у позиции гендерная схема — то есть нужен ли переключатель в UI. */
export const isGenderedMedia = (mediaUrl: string | null | undefined): boolean => {
  const [path] = splitMediaQuery(String(mediaUrl ?? '').trim());
  return GENDERED.test(path);
};
