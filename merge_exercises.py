#!/usr/bin/env python3
"""
FitTracker — Скрипт анализа и объединения баз упражнений
=========================================================
b1 = all_new_exercises.json (большая база, источник изображений)
b2 = db_exercises.json (твоя база, меньшая)

Задачи:
  1. Найти несовпадения media_url между b1 и b2
  2. Заполнить name_eng в b2 из b1
  3. Сравнить переводы и предложить лучший вариант
  4. Подготовить безопасный merge без потери данных

Запуск: python merge_exercises.py
"""

import json
import re
import os
import uuid
from difflib import SequenceMatcher
from datetime import datetime

# ============================================================
# КОНФИГУРАЦИЯ
# ============================================================
B1_FILE = "all_new_exercises.json"
B2_FILE = "db_exercises.json"
OUTPUT_DIR = "merge_output"
FUZZY_THRESHOLD = 0.65

# ============================================================
# УТИЛИТЫ
# ============================================================

def load_json(filepath: str) -> list:
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(data: list, filepath: str):
    os.makedirs(os.path.dirname(filepath) if os.path.dirname(filepath) else ".", exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  💾 Сохранено: {filepath}")

def extract_exercise_slug_from_url(url: str) -> str:
    """.../exercises/Barbell_Squat/0.jpg → Barbell_Squat"""
    if not url:
        return ""
    match = re.search(r"/exercises/([^/]+)/", url)
    return match.group(1) if match else ""

def slug_to_name_eng(slug: str) -> str:
    return slug.replace("_", " ").replace("-", " ").strip()

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
# ИНДЕКСАЦИЯ b1
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

# ============================================================
# МАТЧИНГ
# ============================================================

def match_exercises(b1: list, b2: list) -> dict:
    b1_index = build_b1_index(b1)
    matched = []
    unmatched_b2 = []
    matched_b1_urls = set()

    for b2_ex in b2:
        b1_ex = None
        method = None
        confidence = 0.0

        # Метод 1: По media_url (самый надёжный)
        b2_url = normalize_url(b2_ex.get("media_url", ""))
        if b2_url and b2_url in b1_index["by_url"]:
            b1_ex = b1_index["by_url"][b2_url]
            method = "media_url"
            confidence = 1.0

        # Метод 2: По name_eng
        if not b1_ex:
            b2_name_eng = normalize_text(b2_ex.get("name_eng", ""))
            if b2_name_eng and b2_name_eng in b1_index["by_name_eng"]:
                b1_ex = b1_index["by_name_eng"][b2_name_eng]
                method = "name_eng"
                confidence = 0.95

        # Метод 3: По slug из URL
        if not b1_ex:
            b2_slug = extract_exercise_slug_from_url(b2_ex.get("media_url", "")).lower()
            if b2_slug and b2_slug in b1_index["by_slug"]:
                b1_ex = b1_index["by_slug"][b2_slug]
                method = "url_slug"
                confidence = 0.9

        # Метод 4: Fuzzy по русскому названию
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
            matched.append({"b2": b2_ex, "b1": b1_ex, "method": method, "confidence": confidence})
            matched_b1_urls.add(normalize_url(b1_ex.get("media_url", "")))
        else:
            unmatched_b2.append(b2_ex)

    unmatched_b1 = [ex for ex in b1 if normalize_url(ex.get("media_url", "")) not in matched_b1_urls]

    return {"matched": matched, "unmatched_b2": unmatched_b2, "unmatched_b1": unmatched_b1}

# ============================================================
# АНАЛИЗ РАСХОЖДЕНИЙ
# ============================================================

def analyze_mismatches(matched: list) -> dict:
    issues = {
        "url_mismatch": [],
        "name_eng_missing": [],
        "name_eng_diff": [],
        "name_diff": [],
        "technique_diff": [],
        "muscles_diff": [],
        "category_diff": [],
    }

    for pair in matched:
        b2_ex, b1_ex = pair["b2"], pair["b1"]
        b2_id = b2_ex.get("id", "?")[:8]

        # media_url
        if normalize_url(b2_ex.get("media_url")) != normalize_url(b1_ex.get("media_url")):
            issues["url_mismatch"].append({
                "b2_id": b2_id, "b2_name": b2_ex.get("name"),
                "b2_url": b2_ex.get("media_url"),
                "b1_name": b1_ex.get("name"), "b1_url": b1_ex.get("media_url"),
                "method": pair["method"],
            })

        # name_eng
        b2_eng = b2_ex.get("name_eng") or ""
        b1_eng = b1_ex.get("name_eng") or ""
        if not b2_eng and b1_eng:
            issues["name_eng_missing"].append({"b2_id": b2_id, "b2_name": b2_ex.get("name"), "b1_name_eng": b1_eng})
        elif b2_eng and b1_eng and normalize_text(b2_eng) != normalize_text(b1_eng):
            issues["name_eng_diff"].append({"b2_id": b2_id, "b2_name_eng": b2_eng, "b1_name_eng": b1_eng})

        # Русское название
        b2_name, b1_name = b2_ex.get("name", ""), b1_ex.get("name", "")
        if normalize_text(b2_name) != normalize_text(b1_name):
            sim = similarity(b2_name, b1_name)
            issues["name_diff"].append({
                "b2_id": b2_id, "b2_name": b2_name, "b1_name": b1_name,
                "similarity": round(sim, 3),
                "recommendation": "b2" if sim > 0.8 else "review",
            })

        # Техника
        b2_tech, b1_tech = b2_ex.get("technique", ""), b1_ex.get("technique", "")
        if normalize_text(b2_tech) != normalize_text(b1_tech):
            sim = similarity(b2_tech, b1_tech)
            if sim < 0.9:
                issues["technique_diff"].append({
                    "b2_id": b2_id, "b2_name": b2_name,
                    "b2_technique": b2_tech[:100] + "...",
                    "b1_technique": b1_tech[:100] + "...",
                    "similarity": round(sim, 3),
                })

        # Мышцы
        if sorted(b2_ex.get("primary_muscles", [])) != sorted(b1_ex.get("primary_muscles", [])):
            issues["muscles_diff"].append({
                "b2_id": b2_id, "b2_name": b2_name,
                "b2_primary": sorted(b2_ex.get("primary_muscles", [])),
                "b1_primary": sorted(b1_ex.get("primary_muscles", [])),
            })

        # Категория
        if b2_ex.get("category") != b1_ex.get("category"):
            issues["category_diff"].append({
                "b2_id": b2_id, "b2_name": b2_name,
                "b2_category": b2_ex.get("category"), "b1_category": b1_ex.get("category"),
            })

    return issues

# ============================================================
# ОТЧЁТ
# ============================================================

def generate_report(match_result: dict, issues: dict) -> str:
    lines = []
    lines.append("=" * 70)
    lines.append("  ОТЧЁТ ПО СРАВНЕНИЮ БАЗ УПРАЖНЕНИЙ")
    lines.append(f"  Дата: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append("=" * 70)
    lines.append("")

    matched = match_result["matched"]
    unmatched_b2 = match_result["unmatched_b2"]
    unmatched_b1 = match_result["unmatched_b1"]

    lines.append("📊 ОБЩАЯ СТАТИСТИКА")
    lines.append("-" * 40)
    lines.append(f"  b1 (all_new_exercises):  {len(matched) + len(unmatched_b1)} упражнений")
    lines.append(f"  b2 (db_exercises):       {len(matched) + len(unmatched_b2)} упражнений")
    lines.append(f"  Совпадений (matched):    {len(matched)}")
    lines.append(f"  Уникальных в b2:         {len(unmatched_b2)}")
    lines.append(f"  Уникальных в b1:         {len(unmatched_b1)}")
    lines.append("")

    methods = {}
    for m in matched:
        methods[m["method"]] = methods.get(m["method"], 0) + 1
    lines.append("🔗 МЕТОДЫ МАТЧИНГА")
    lines.append("-" * 40)
    for method, count in sorted(methods.items(), key=lambda x: -x[1]):
        lines.append(f"  {method:20s}: {count}")
    lines.append("")

    lines.append(f"🖼️  РАСХОЖДЕНИЯ MEDIA_URL: {len(issues['url_mismatch'])}")
    lines.append("-" * 40)
    for item in issues["url_mismatch"][:20]:
        lines.append(f"  [{item['b2_id']}] {item['b2_name']}")
        lines.append(f"    b2 URL: {item['b2_url']}")
        lines.append(f"    b1 URL: {item['b1_url']} (→ {item['b1_name']})")
        lines.append("")

    lines.append(f"🏷️  ОТСУТСТВУЕТ name_eng В b2: {len(issues['name_eng_missing'])}")
    lines.append("-" * 40)
    for item in issues["name_eng_missing"][:15]:
        lines.append(f"  [{item['b2_id']}] {item['b2_name']} → {item['b1_name_eng']}")
    lines.append("")

    lines.append(f"📝 РАЗЛИЧИЯ В РУССКИХ НАЗВАНИЯХ: {len(issues['name_diff'])}")
    lines.append("-" * 40)
    for item in issues["name_diff"][:20]:
        rec = "✅ оставить b2" if item["recommendation"] == "b2" else "⚠️  проверить"
        lines.append(f"  [{item['b2_id']}] sim={item['similarity']}")
        lines.append(f"    b2: {item['b2_name']}")
        lines.append(f"    b1: {item['b1_name']}  → {rec}")
        lines.append("")

    lines.append(f"🔒 УНИКАЛЬНЫЕ В b2 (НЕ ТРОГАТЬ!): {len(unmatched_b2)}")
    lines.append("-" * 40)
    for ex in unmatched_b2:
        lines.append(f"  [{ex.get('id', '?')[:8]}] {ex.get('name')}")
    lines.append("")

    lines.append(f"➕ УНИКАЛЬНЫЕ В b1 (кандидаты на merge): {len(unmatched_b1)}")
    lines.append("-" * 40)
    for ex in unmatched_b1[:30]:
        lines.append(f"  {ex.get('name_eng', '?')} → {ex.get('name', '?')}")
    if len(unmatched_b1) > 30:
        lines.append(f"  ... и ещё {len(unmatched_b1) - 30}")

    return "\n".join(lines)

# ============================================================
# ИСПРАВЛЕНИЕ b2
# ============================================================

def fix_b2(matched: list, b2: list) -> tuple:
    """
    Безопасное исправление b2:
    1. Заполняет name_eng из b1 (если null)
    2. Исправляет media_url если slug не совпадает
    3. НЕ трогает русские названия
    4. НЕ трогает id (критично для программ!)
    """
    fix_map = {}
    for pair in matched:
        b2_id = pair["b2"].get("id")
        if b2_id:
            fix_map[b2_id] = pair["b1"]

    fixed_b2 = []
    changes_log = []

    for ex in b2:
        ex_copy = dict(ex)
        b2_id = ex.get("id")
        b1_ex = fix_map.get(b2_id)

        if b1_ex:
            # 1. Заполняем name_eng
            if not ex_copy.get("name_eng") and b1_ex.get("name_eng"):
                ex_copy["name_eng"] = b1_ex["name_eng"]
                changes_log.append(f"  [{b2_id[:8]}] name_eng: null → '{b1_ex['name_eng']}'")

            # 2. Исправляем media_url (только если slug не совпадает)
            b2_slug = extract_exercise_slug_from_url(ex_copy.get("media_url", ""))
            b1_slug = extract_exercise_slug_from_url(b1_ex.get("media_url", ""))
            if b2_slug and b1_slug and b2_slug.lower() != b1_slug.lower():
                old_url = ex_copy.get("media_url")
                ex_copy["media_url"] = b1_ex["media_url"]
                changes_log.append(f"  [{b2_id[:8]}] media_url: '{old_url}' → '{b1_ex['media_url']}'")

        fixed_b2.append(ex_copy)

    return fixed_b2, changes_log

# ============================================================
# MERGE-КАНДИДАТЫ
# ============================================================

def prepare_merge_candidates(unmatched_b1: list) -> list:
    candidates = []
    for ex in unmatched_b1:
        candidate = dict(ex)
        candidate["id"] = str(uuid.uuid4())
        candidate["created_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S.000000+00")
        if not candidate.get("name_eng"):
            slug = extract_exercise_slug_from_url(candidate.get("media_url", ""))
            candidate["name_eng"] = slug_to_name_eng(slug)
        candidates.append(candidate)
    return candidates

# ============================================================
# MAIN
# ============================================================

def main():
    print("🚀 FitTracker — Анализ и объединение баз упражнений")
    print("=" * 50)

    print("\n📂 Загрузка файлов...")
    b1 = load_json(B1_FILE)
    b2 = load_json(B2_FILE)
    print(f"  b1: {len(b1)} упражнений")
    print(f"  b2: {len(b2)} упражнений")

    print("\n🔗 Матчинг упражнений...")
    match_result = match_exercises(b1, b2)
    print(f"  Совпадений: {len(match_result['matched'])}")
    print(f"  Уникальных в b2: {len(match_result['unmatched_b2'])}")
    print(f"  Уникальных в b1: {len(match_result['unmatched_b1'])}")

    print("\n🔍 Анализ расхождений...")
    issues = analyze_mismatches(match_result["matched"])
    for key, items in issues.items():
        if items:
            print(f"  {key}: {len(items)}")

    print("\n📝 Генерация отчёта...")
    report = generate_report(match_result, issues)
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(os.path.join(OUTPUT_DIR, "analysis_report.txt"), "w", encoding="utf-8") as f:
        f.write(report)

    print("\n🔧 Исправление b2...")
    fixed_b2, changes_log = fix_b2(match_result["matched"], b2)
    print(f"  Внесено изменений: {len(changes_log)}")
    for change in changes_log[:20]:
        print(change)

    save_json(fixed_b2, os.path.join(OUTPUT_DIR, "db_exercises_fixed.json"))

    print("\n➕ Подготовка merge-кандидатов из b1...")
    candidates = prepare_merge_candidates(match_result["unmatched_b1"])
    save_json(candidates, os.path.join(OUTPUT_DIR, "merge_candidates.json"))

    print("\n📦 Создание объединённой базы...")
    merged = fixed_b2 + candidates
    save_json(merged, os.path.join(OUTPUT_DIR, "db_exercises_merged.json"))
    print(f"  Итого: {len(merged)} = {len(fixed_b2)} (b2) + {len(candidates)} (b1 новых)")

    with open(os.path.join(OUTPUT_DIR, "changes_log.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(changes_log))

    print("\n✅ Готово! Файлы в merge_output/")
    print("\n⚠️  ПОРЯДОК ДЕЙСТВИЙ:")
    print("  1. Прочитай analysis_report.txt")
    print("  2. Запусти manual_review.py для спорных случаев")
    print("  3. Заполни manual_review_template.json")
    print("  4. Запусти apply_review.py")
    print("  5. Только после проверки заменяй db_exercises.json!")

if __name__ == "__main__":
    main()