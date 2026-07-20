#!/usr/bin/env python3
"""
FitTracker — Автозаполнение manual_review_template.json (v2)
=============================================================
Исправлена критическая ошибка: для mismatch-записей
все dispute-поля из b2 теперь кладутся в custom_values,
чтобы apply_review.py не перезаписал их из b1.

Запуск: python generate_filled_template.py
"""

import json
import os

TEMPLATE_FILE = os.path.join("merge_output", "manual_review_template.json")
OUTPUT_FILE = os.path.join("merge_output", "manual_review_template.json")

# ============================================================
# MISMATCH-ЗАПИСИ (разные упражнения, ничего из b1 не брать)
# ============================================================
MISMATCH_INDICES = {
    6, 14, 19, 21, 23, 27, 34, 36, 41, 50,
    51, 54, 57, 64, 66, 67, 74, 81, 84, 86,
    88, 89, 94, 95,
}

# ============================================================
# ЗАПИСИ С CUSTOM TECHNIQUE (b1 описывает другой вариант)
# ============================================================
CUSTOM_TECHNIQUE = {
    30: (
        "Закрепите манжету на лодыжке, подключите к нижнему блоку. "
        "Встаньте лицом к тренажёру, слегка наклонитесь вперёд. "
        "Отведите прямую ногу назад, напрягая ягодицы, затем медленно верните."
    ),
    32: (
        "Лягте на скамью между нижними блоками, возьмите рукояти. "
        "Выжмите рукояти вверх и вперёд, сводя их вместе над грудью. "
        "Медленно разведите руки, сохраняя контроль."
    ),
}

# ============================================================
# ПОЛЯ, КОТОРЫЕ ВСЕГДА ОСТАВЛЯЕМ ИЗ b2
# ============================================================
KEEP_FROM_B2_FIELDS = {"name", "primary_muscles", "equipment", "media_url", "category"}


def load_template(filepath: str) -> list:
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def save_template(data: list, filepath: str):
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  💾 Сохранено: {filepath}")


def fill_template(template: list) -> tuple:
    filled = []
    stats = {"mismatch": 0, "custom": 0, "custom_technique": 0}

    for item in template:
        idx = item.get("index")
        item_copy = dict(item)
        disputes = item_copy.get("disputes", [])

        # --------------------------------------------------
        # MISMATCH: разные упражнения
        # ВСЕ dispute-поля из b2 → в custom_values
        # name_eng → null (сброс неправильного из fix_b2)
        # --------------------------------------------------
        if idx in MISMATCH_INDICES:
            stats["mismatch"] += 1
            item_copy["choice"] = "custom"
            custom = {"name_eng": None}

            # Кладём ВСЕ dispute-поля из b2 в custom_values
            # чтобы apply_review.py НЕ перезаписал их из b1
            for d in disputes:
                field = d["field"]
                b2_value = d.get("b2_value")
                if field == "name_eng":
                    continue  # уже обработан выше (null)
                if b2_value is not None:
                    custom[field] = b2_value

            item_copy["custom_values"] = custom
            item_copy["_note"] = (
                "MISMATCH: b1 и b2 — разные упражнения. "
                "Все поля из b2, name_eng сброшен в null."
            )
            filled.append(item_copy)
            continue

        # --------------------------------------------------
        # CUSTOM TECHNIQUE: b1 описывает другой вариант
        # --------------------------------------------------
        if idx in CUSTOM_TECHNIQUE:
            stats["custom_technique"] += 1
            item_copy["choice"] = "custom"
            custom = {}
            for d in disputes:
                field = d["field"]
                if field in KEEP_FROM_B2_FIELDS and d.get("b2_value") is not None:
                    custom[field] = d["b2_value"]
                if field == "technique":
                    custom["technique"] = CUSTOM_TECHNIQUE[idx]
            item_copy["custom_values"] = custom
            item_copy["_note"] = (
                "CUSTOM TECHNIQUE: b1 описывает другой вариант. "
                "technique написан вручную."
            )
            filled.append(item_copy)
            continue

        # --------------------------------------------------
        # СТАНДАРТНЫЙ CUSTOM:
        # name/muscles/equip/media_url из b2
        # name_eng/technique из b1 (автоматически)
        # --------------------------------------------------
        stats["custom"] += 1
        item_copy["choice"] = "custom"
        custom = {}
        for d in disputes:
            field = d["field"]
            b2_value = d.get("b2_value")
            if field in KEEP_FROM_B2_FIELDS and b2_value is not None:
                custom[field] = b2_value
            # name_eng и technique НЕ кладём → возьмутся из b1
        item_copy["custom_values"] = custom
        item_copy["_note"] = (
            "STANDARD: name/muscles/equip из b2, "
            "name_eng/technique из b1."
        )
        filled.append(item_copy)

    return filled, stats


def main():
    print("🤖 FitTracker — Автозаполнение шаблона ревью (v2)")
    print("=" * 50)

    if not os.path.exists(TEMPLATE_FILE):
        print(f"❌ Файл не найден: {TEMPLATE_FILE}")
        print("   Сначала запусти: python manual_review.py")
        return

    print("\n📂 Загрузка шаблона...")
    template = load_template(TEMPLATE_FILE)
    print(f"  Записей: {len(template)}")

    print("\n🔧 Применение рекомендаций...")
    filled, stats = fill_template(template)

    print(f"\n📊 Статистика:")
    print(f"  MISMATCH (всё из b2, name_eng=null): {stats['mismatch']}")
    print(f"  CUSTOM TECHNIQUE (ручной текст):      {stats['custom_technique']}")
    print(f"  STANDARD CUSTOM (b2+b1 микс):         {stats['custom']}")
    print(f"  Итого:                                {len(filled)}")

    # Валидация
    print("\n🔍 Валидация...")
    errors = []
    for item in filled:
        idx = item.get("index")
        choice = item.get("choice")
        custom = item.get("custom_values", {})
        disputes = item.get("disputes", [])
        dispute_fields = {d["field"] for d in disputes}

        if choice not in ("b1", "b2", "custom"):
            errors.append(f"  #{idx}: невалидный choice '{choice}'")

        # Для mismatch: проверяем что ВСЕ dispute-поля покрыты
        if idx in MISMATCH_INDICES:
            uncovered = dispute_fields - set(custom.keys())
            # name_eng может быть null (это ок), но должен быть в custom
            if uncovered:
                errors.append(
                    f"  #{idx}: mismatch, но поля не покрыты: {uncovered}"
                )
            if "name_eng" not in custom:
                errors.append(f"  #{idx}: mismatch, но name_eng не сброшен!")

    if errors:
        print("  ⚠️  Найдены проблемы:")
        for e in errors:
            print(e)
    else:
        print("  ✅ Все записи валидны")

    save_template(filled, OUTPUT_FILE)

    print(f"""
✅ Готово! Шаблон заполнен.

📋 Следующий шаг:
   1. (Опционально) Проверь {OUTPUT_FILE}
   2. Запусти: python apply_review.py
   3. Проверь merge_output/db_exercises_final.json
   4. Замени db_exercises.json только после проверки!
""")


if __name__ == "__main__":
    main()