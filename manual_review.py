#!/usr/bin/env python3
"""
FitTracker — Генерация шаблона ручного ревью
=============================================
Запускается ПОСЛЕ merge_exercises.py.
Читает merge_output/analysis_report.txt и создаёт
JSON-шаблон для ручного выбора спорных случаев.

Запуск: python manual_review.py
"""

import json
import os
import re
from difflib import SequenceMatcher

# ============================================================
# КОНФИГУРАЦИЯ
# ============================================================
B1_FILE = "all_new_exercises.json"
B2_FILE = "db_exercises.json"
OUTPUT_DIR = "merge_output"
TEMPLATE_FILE = os.path.join(OUTPUT_DIR, "manual_review_template.json")
FUZZY_THRESHOLD = 0.65


# ============================================================
# УТИЛИТЫ (дублируем, чтобы скрипт был автономным)
# ============================================================

def load_json(filepath: str) -> list:
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


def normalize_text(text: str) -> str:
    if not text:
        return ""
    text = text.lower().strip()
    text = re.sub(r"\(.*?\)", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def similarity(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, normalize_text(a), normalize_text(b)).ratio()


def normalize_url(url: str) -> str:
    return (url or "").strip().rstrip("/").lower()


# ============================================================
# МАТЧИНГ (упрощённый, только для генерации шаблона)
# ============================================================

def build_b1_index(b1: list) -> dict:
    index = {"by_url": {}, "by_name_eng": {}, "by_slug": {}}
    for ex in b1:
        url = normalize_url(ex.get("media_url", ""))
        name_eng = normalize_text(ex.get("name_eng", ""))
        slug = extract_exercise_slug_from_url(ex.get("media_url", ""))
        if url:
            index["by_url"][url] = ex
        if name_eng:
            index["by_name_eng"][name_eng] = ex
        if slug:
            index["by_slug"][slug.lower()] = ex
    return index


def match_exercises(b1: list, b2: list) -> list:
    b1_index = build_b1_index(b1)
    matched = []

    for b2_ex in b2:
        b1_ex = None
        method = None
        confidence = 0.0

        b2_url = normalize_url(b2_ex.get("media_url", ""))
        if b2_url and b2_url in b1_index["by_url"]:
            b1_ex = b1_index["by_url"][b2_url]
            method = "media_url"
            confidence = 1.0

        if not b1_ex:
            b2_name_eng = normalize_text(b2_ex.get("name_eng", ""))
            if b2_name_eng and b2_name_eng in b1_index["by_name_eng"]:
                b1_ex = b1_index["by_name_eng"][b2_name_eng]
                method = "name_eng"
                confidence = 0.95

        if not b1_ex:
            b2_slug = extract_exercise_slug_from_url(b2_ex.get("media_url", "")).lower()
            if b2_slug and b2_slug in b1_index["by_slug"]:
                b1_ex = b1_index["by_slug"][b2_slug]
                method = "url_slug"
                confidence = 0.9

        if not b1_ex:
            b2_name = b2_ex.get("name", "")
            best_score = 0.0
            best_match = None
            for b1_candidate in b1:
                score = similarity(b2_name, b1_candidate.get("name", ""))
                if score > best_score:
                    best_score = score
                    best_match = b1_candidate
            if best_score >= FUZZY_THRESHOLD:
                b1_ex = best_match
                method = "fuzzy_name"
                confidence = best_score

        if b1_ex:
            matched.append({
                "b2": b2_ex,
                "b1": b1_ex,
                "method": method,
                "confidence": confidence,
            })

    return matched


# ============================================================
# ГЕНЕРАЦИЯ ШАБЛОНА РЕВЬЮ
# ============================================================

def generate_review_template(matched: list) -> list:
    """
    Создаёт список спорных случаев для ручного ревью.
    Включает только те пары, где есть расхождения.
    """
    review_items = []
    item_index = 0

    for pair in matched:
        b2_ex = pair["b2"]
        b1_ex = pair["b1"]
        disputes = []

        # --- Русское название ---
        b2_name = b2_ex.get("name", "")
        b1_name = b1_ex.get("name", "")
        if normalize_text(b2_name) != normalize_text(b1_name):
            sim = similarity(b2_name, b1_name)
            disputes.append({
                "field": "name",
                "b2_value": b2_name,
                "b1_value": b1_name,
                "similarity": round(sim, 3),
                "note": "По умолчанию оставляем b2 (твой перевод). Поставь 'b1' если вариант из большой базы лучше.",
            })

        # --- name_eng ---
        b2_eng = b2_ex.get("name_eng") or ""
        b1_eng = b1_ex.get("name_eng") or ""
        if not b2_eng and b1_eng:
            disputes.append({
                "field": "name_eng",
                "b2_value": None,
                "b1_value": b1_eng,
                "note": "В b2 отсутствует. Рекомендуется взять из b1.",
            })
        elif b2_eng and b1_eng and normalize_text(b2_eng) != normalize_text(b1_eng):
            disputes.append({
                "field": "name_eng",
                "b2_value": b2_eng,
                "b1_value": b1_eng,
                "note": "Разные английские названия. Выбери более точное.",
            })

        # --- media_url ---
        b2_url = b2_ex.get("media_url", "")
        b1_url = b1_ex.get("media_url", "")
        if normalize_url(b2_url) != normalize_url(b1_url):
            b2_slug = extract_exercise_slug_from_url(b2_url)
            b1_slug = extract_exercise_slug_from_url(b1_url)
            disputes.append({
                "field": "media_url",
                "b2_value": b2_url,
                "b1_value": b1_url,
                "b2_slug": b2_slug,
                "b1_slug": b1_slug,
                "note": "URL изображений различаются. Проверь, какая картинка корректна.",
            })

        # --- Техника ---
        b2_tech = b2_ex.get("technique", "")
        b1_tech = b1_ex.get("technique", "")
        if b2_tech and b1_tech:
            tech_sim = similarity(b2_tech, b1_tech)
            if tech_sim < 0.85:
                disputes.append({
                    "field": "technique",
                    "b2_value": b2_tech[:200] + ("..." if len(b2_tech) > 200 else ""),
                    "b1_value": b1_tech[:200] + ("..." if len(b1_tech) > 200 else ""),
                    "similarity": round(tech_sim, 3),
                    "note": "Тексты техники существенно различаются. Выбери более понятный.",
                })

        # --- Основные мышцы ---
        b2_muscles = sorted(b2_ex.get("primary_muscles", []))
        b1_muscles = sorted(b1_ex.get("primary_muscles", []))
        if b2_muscles != b1_muscles:
            disputes.append({
                "field": "primary_muscles",
                "b2_value": b2_muscles,
                "b1_value": b1_muscles,
                "note": "Разные основные мышцы. Проверь анатомию.",
            })

        # --- Категория ---
        if b2_ex.get("category") != b1_ex.get("category"):
            disputes.append({
                "field": "category",
                "b2_value": b2_ex.get("category"),
                "b1_value": b1_ex.get("category"),
                "note": "Разные категории.",
            })

        # --- Оборудование ---
        if b2_ex.get("equipment") != b1_ex.get("equipment"):
            disputes.append({
                "field": "equipment",
                "b2_value": b2_ex.get("equipment"),
                "b1_value": b1_ex.get("equipment"),
                "note": "Разное оборудование.",
            })

        # Добавляем в шаблон только если есть споры
        if disputes:
            item_index += 1
            review_items.append({
                "index": item_index,
                "b2_id": b2_ex.get("id"),
                "b2_name": b2_name,
                "b1_name": b1_name,
                "match_method": pair["method"],
                "match_confidence": round(pair["confidence"], 3),
                "disputes": disputes,
                # Пользователь заполняет это поле:
                # "b2" — оставить как есть
                # "b1" — взять из большой базы
                # "custom" — вписать своё в custom_values
                "choice": "b2",
                "custom_values": {},
            })

    return review_items


# ============================================================
# MAIN
# ============================================================

def main():
    print("🔍 FitTracker — Генерация шаблона ручного ревью")
    print("=" * 50)

    # Проверяем, что файлы существуют
    if not os.path.exists(B1_FILE):
        print(f"❌ Файл не найден: {B1_FILE}")
        return
    if not os.path.exists(B2_FILE):
        print(f"❌ Файл не найден: {B2_FILE}")
        return

    print("\n📂 Загрузка файлов...")
    b1 = load_json(B1_FILE)
    b2 = load_json(B2_FILE)
    print(f"  b1: {len(b1)} упражнений")
    print(f"  b2: {len(b2)} упражнений")

    print("\n🔗 Матчинг упражнений...")
    matched = match_exercises(b1, b2)
    print(f"  Совпадений: {len(matched)}")

    print("\n📝 Генерация шаблона ревью...")
    template = generate_review_template(matched)
    print(f"  Спорных случаев: {len(template)}")

    # Подсчёт по типам расхождений
    field_counts = {}
    for item in template:
        for dispute in item["disputes"]:
            field = dispute["field"]
            field_counts[field] = field_counts.get(field, 0) + 1

    print("\n📊 Расхождения по полям:")
    for field, count in sorted(field_counts.items(), key=lambda x: -x[1]):
        print(f"  {field:25s}: {count}")

    # Сохраняем шаблон
    save_json(template, TEMPLATE_FILE)

    # Инструкция
    print("\n" + "=" * 50)
    print("📋 ИНСТРУКЦИЯ:")
    print("=" * 50)
    print(f"""
  1. Открой файл: {TEMPLATE_FILE}
  2. Для каждого спорного случая выбери:
     - "choice": "b2"     → оставить твой вариант (по умолчанию)
     - "choice": "b1"     → взять из большой базы
     - "choice": "custom" → вписать своё в "custom_values"

  3. Пример для custom:
     {{
       "choice": "custom",
       "custom_values": {{
         "name": "Жим штанги лёжа на наклонной",
         "technique": "Свой текст техники..."
       }}
     }}

  4. После заполнения запусти: python apply_review.py
""")

    if not template:
        print("✅ Спорных случаев не найдено! Можно сразу запускать apply_review.py")


if __name__ == "__main__":
    main()