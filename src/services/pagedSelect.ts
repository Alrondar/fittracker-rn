// src/services/pagedSelect.ts
// Постраническое вычитывание таблицы целиком. Нужен каждый раз, когда выборка
// потенциально больше 1000 строк: Supabase срезает ответ молча, и урезанный
// результат неотличим от «данных мало» — а снимок именно на этом и строится.
const PAGE_SIZE = 500;
const MAX_PAGES = 40;

type Page = (
  from: number,
  to: number
) => PromiseLike<{ data: unknown; error: { message: string } | null }>;

export async function fetchAllPages<T>(page: Page, label: string): Promise<T[]> {
  const collected: T[] = [];
  for (let index = 0; index < MAX_PAGES; index++) {
    const from = index * PAGE_SIZE;
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${label}: ${error.message}`);
    const chunk = (data ?? []) as T[];
    collected.push(...chunk);
    if (chunk.length < PAGE_SIZE) return collected;
  }
  throw new Error(`${label}: больше ${MAX_PAGES} страниц — остановлено, чтобы не зависнуть`);
}
