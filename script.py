import json

# Загружаем результаты анализа
with open('duplicates_analysis_report.json', 'r', encoding='utf-8') as f:
    analysis = json.load(f)

# Загружаем оригинальный файл для деталей
with open('duplicates_report.json', 'r', encoding='utf-8') as f:
    duplicates = json.load(f)

print("="*100)
print("📋 ТАБЛИЦА ДЛЯ РУЧНОГО ВЫБОРА")
print("="*100)
print(f"{'№':<3} | {'Название':<40} | {'Тип':<15} | {'NEW':<5} | {'DB':<5} | {'Рекомендация':<15}")
print("-"*100)

for i, (r, dup) in enumerate(zip(analysis, duplicates['duplicates']), 1):
    name = r['name'][:38] if len(r['name']) > 38 else r['name']
    match_type = dup['match_type'][:13] if len(dup['match_type']) > 13 else dup['match_type']
    winner = r['winner'][:13] if len(r['winner']) > 13 else r['winner']
    
    print(f"{i:<3} | {name:<40} | {match_type:<15} | {r['new_score']:<5} | {r['db_score']:<5} | {winner:<15}")

print("="*100)

# Создаем файл для ручного выбора
manual_selection = []
for i, (r, dup) in enumerate(zip(analysis, duplicates['duplicates']), 1):
    manual_selection.append({
        'id': i,
        'name': r['name'],
        'name_eng': dup['new_exercise'].get('name_eng'),
        'recommended': r['winner'],
        'reason': r['reason'],
        'manual_choice': '',  # Поле для ручного заполнения
        'notes': ''  # Поле для заметок
    })

with open('manual_selection_template.json', 'w', encoding='utf-8') as f:
    json.dump(manual_selection, f, ensure_ascii=False, indent=2)

print(f"\n✅ Шаблон для ручного выбора сохранен в manual_selection_template.json")
print(f"   Заполните поле 'manual_choice' для каждого дубликата:")
print(f"   - 'NEW' - выбрать вариант из новой базы")
print(f"   - 'DB' - выбрать вариант из существующей базы")
print(f"   - 'MERGE' - объединить лучшее из обоих")