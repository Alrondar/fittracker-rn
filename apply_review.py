#!/usr/bin/env python3
"""
FitTracker — Применение решений ручного ревью
===============================================
Запускается ПОСЛЕ заполнения manual_review_template.json.
Применяет выбранные варианты к исправленной базе b2.

Запуск: python apply_review.py
"""

import json
import os
import re
from datetime import datetime

# ============================================================
# КОНФИГУРАЦИЯ
# ============================================================
B1_FILE = "all_new_exercises.json"
B2_FILE = "db_exercises.json"
OUTPUT_DIR = "merge_output"
FIXED_B2_FILE = os.path.join(OUTPUT_DIR, "db_exercises_fixed.json")
TEMPLATE_FILE = os.path.join(OUTPUT_DIR, "manual_review_template.json")
FINAL_FILE = os.path.join(OUTPUT_DIR, "db_exercises_final.json")
MERGED_FILE = os.path.join(OUTPUT_DIR, "db_exercises_merged.json")
CANDIDATES_FILE = os.path.join(OUTPUT_DIR, "merge_candidates.json")
REVIEW_LOG_FILE = os.path.join(OUTPUT_DIR, "review_changes_log.txt")


# ============================================================
# УТИЛИТЫ
# ============================================================

def load_json(filepath: str):
    if not os.path.exists(filepath):
        print(f"❌ Файл не найден: {filepath}")
        return None
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(data, filepath: str):
    os.makedirs(os.path.dirname(filepath) if os.path.dirname(filepath) else ".", exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  💾 Сохранено: {filepath}")


def extract_exercise_slug_from_url(url: str) -> str:
    if not url:
        return ""
    match = re.search(r"/exercises/([^/]+)/", url)
    return match.group(1) if match else ""


def slug_to_name_eng(slug: str) -> str:
    return slug.replace("_", " ").replace("-", " ").strip()


# ============================================================
# ПРИМЕНЕНИЕ РЕВЬЮ
# ============================================================

def apply_review(fixed_b2: list, template: list) -> tuple:
    """
    Применяет решения из шаблона ревью к исправленной b2.

    Возвращает: (final_b2, changes_log)
    """
    # Строим мапу: b2_id → review_item
    review_map = {}
    for item in template:
        b2_id = item.get("b2_id")
        if b2_id:
            review_map[b2_id] = item

    final_b2 = []
    changes_log = []
    stats = {"b2_kept": 0, "b1_applied": 0, "custom_applied": 0, "no_review": 0}

    for ex in fixed_b2:
        ex_copy = dict(ex)
        b2_id = ex.get("id")
        review_item = review_map.get(b2_id)

        if not review_item:
            # Нет спорных случаев — оставляем как есть
            stats["no_review"] += 1
            final_b2.append(ex_copy)
            continue

        choice = review_item.get("choice", "b2")

        if choice == "b2":
            # Оставляем текущий вариант (уже в fixed_b2)
            stats["b2_kept"] += 1
            final_b2.append(ex_copy)
            continue

        if choice == "b1":
            # Берём все спорные поля из b1
            stats["b1_applied"] += 1
            for dispute in review_item.get("disputes", []):
                field = dispute["field"]
                b1_value = dispute.get("b1_value")

                if b1_value is not None:
                    old_value = ex_copy.get(field)
                    ex_copy[field] = b1_value
                    changes_log.append(
                        f"  [{b2_id[:8]}] {field}: '{_truncate(old_value)}' → '{_truncate(b1_value)}' (из b1)"
                    )

            final_b2.append(ex_copy)
            continue

        if choice == "custom":
            # Берём пользовательские значения
            stats["custom_applied"] += 1
            custom_values = review_item.get("custom_values", {})

            for field, value in custom_values.items():
                old_value = ex_copy.get(field)
                ex_copy[field] = value
                changes_log.append(
                    f"  [{b2_id[:8]}] {field}: '{_truncate(old_value)}' → '{_truncate(value)}' (custom)"
                )

            # Для полей, не указанных в custom, берём из b1
            for dispute in review_item.get("disputes", []):
                field = dispute["field"]
                if field not in custom_values:
                    b1_value = dispute.get("b1_value")
                    if b1_value is not None:
                        old_value = ex_copy.get(field)
                        ex_copy[field] = b1_value
                        changes_log.append(
                            f"  [{b2_id[:8]}] {field}: '{_truncate(old_value)}' → '{_truncate(b1_value)}' (из b1, не в custom)"
                        )

            final_b2.append(ex_copy)
            continue

        # Неизвестный choice — оставляем как есть
        stats["b2_kept"] += 1
        final_b2.append(ex_copy)

    return final_b2, changes_log, stats


def _truncate(value, max_len: int = 60) -> str:
    """Обрезает длинное значение для лога."""
    if value is None:
        return "null"
    if isinstance(value, list):
        return str(value)
    s = str(value)
    return s[:max_len] + "..." if len(s) > max_len else s


# ============================================================
# MERGE С КАНДИДАТАМИ ИЗ b1
# ============================================================

def merge_with_candidates(final_b2: list, candidates: list) -> list:
    """
    Объединяет финальную b2 с новыми упражнениями из b1.
    Кандидаты уже имеют новые UUID (сгенерированы в merge_exercises.py).
    """
    # Проверяем, что нет конфликтов по id
    existing_ids = {ex.get("id") for ex in final_b2}
    new_candidates = []
    skipped = 0

    for candidate in candidates:
        if candidate.get("id") not in existing_ids:
            new_candidates.append(candidate)
        else:
            skipped += 1

    if skipped > 0:
        print(f"  ⚠️  Пропущено {skipped} кандидатов с конфликтующими id")

    return final_b2 + new_candidates


# ============================================================
# MAIN
# ============================================================

def main():
    print("🔧 FitTracker — Применение решений ручного ревью")
    print("=" * 50)

    # Загружаем исправленную b2
    print("\n📂 Загрузка файлов...")
    fixed_b2 = load_json(FIXED_B2_FILE)
    if fixed_b2 is None:
        print("❌ Сначала запусти merge_exercises.py!")
        return
    print(f"  fixed_b2: {len(fixed_b2)} упражнений")

    # Загружаем шаблон ревью
    template = load_json(TEMPLATE_FILE)
    if template is None:
        print("❌ Сначала запусти manual_review.py!")
        return
    print(f"  review items: {len(template)}")

    # Проверяем, заполнен ли шаблон
    unfilled = [item for item in template if item.get("choice") not in ("b1", "b2", "custom")]
    if unfilled:
        print(f"\n⚠️  ВНИМАНИЕ: {len(unfilled)} элементов без выбора (choice)!")
        print("  Они будут обработаны как 'b2' (оставить как есть).")
        print("  Если хочешь изменить — заполни шаблон и перезапусти.")

    # Применяем ревью
    print("\n🔧 Применение решений...")
    final_b2, changes_log, stats = apply_review(fixed_b2, template)

    print(f"\n📊 Статистика решений:")
    print(f"  Оставлено b2:      {stats['b2_kept']}")
    print(f"  Взято из b1:       {stats['b1_applied']}")
    print(f"  Custom:            {stats['custom_applied']}")
    print(f"  Без ревью:         {stats['no_review']}")
    print(f"  Всего изменений:   {len(changes_log)}")

    # Сохраняем финальную b2
    save_json(final_b2, FINAL_FILE)

    # Логируем изменения
    if changes_log:
        with open(REVIEW_LOG_FILE, "w", encoding="utf-8") as f:
            f.write(f"Изменения после ручного ревью ({datetime.now().strftime('%Y-%m-%d %H:%M')})\n")
            f.write("=" * 60 + "\n\n")
            f.write("\n".join(changes_log))
        print(f"  📝 Лог изменений: {REVIEW_LOG_FILE}")

    # Merge с кандидатами из b1
    candidates = load_json(CANDIDATES_FILE)
    if candidates:
        print(f"\n➕ Объединение с {len(candidates)} новыми упражнениями из b1...")
        merged = merge_with_candidates(final_b2, candidates)
        save_json(merged, MERGED_FILE)
        print(f"  Итого: {len(merged)} = {len(final_b2)} (b2) + {len(candidates)} (b1 новых)")
    else:
        print("\nℹ️  Файл merge_candidates.json не найден — пропускаем merge.")
        merged = final_b2

    # Финальная инструкция
    print("\n" + "=" * 50)
    print("✅ ГОТОВО!")
    print("=" * 50)
    print(f"""
  Файлы в {OUTPUT_DIR}/:
  ├── db_exercises_final.json    ← b2 после ревью (без новых из b1)
  ├── db_exercises_merged.json   ← ПОЛНАЯ объединённая база
  └── review_changes_log.txt     ← лог всех изменений

  ⚠️  ПОРЯДОК ДЕЙСТВИЙ:
  1. Открой db_exercises_merged.json и проверь:
     - Все ли упражнения на месте
     - Корректны ли media_url
     - Нет ли дубликатов
  2. Если всё ок — замени db_exercises.json:
     cp {MERGED_FILE} {B2_FILE}
  3. Загрузи обновлённую базу в Supabase
  4. Проверь программы в приложении!
""")


if __name__ == "__main__":
    main()