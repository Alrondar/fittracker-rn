import json
import os
import time
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
FREE_DB_PATH = "data/free-exercise-db-main/free-exercise-db-main/dist/exercises.json"
MAPPING_PATH = "verified_mapping.json"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def load_free_db():
    with open(FREE_DB_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def load_mapping():
    with open(MAPPING_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def find_exact(en_name, free_db):
    """Ищет ТОЧНОЕ совпадение названия в Free DB"""
    for ex in free_db:
        if en_name.lower() == ex.get('name', '').lower():
            return ex
    return None

def get_image_url(exercise):
    images = exercise.get('image_urls', [])
    if images:
        return images[0]
    images = exercise.get('images', [])
    if images:
        img_path = images[0]
        return f"https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/{img_path}"
    return None

def update_with_retry(supabase, ex_id, updates, max_retries=3):
    """Обновление с retry при ошибках сети"""
    for attempt in range(max_retries):
        try:
            response = supabase.table('exercises').update(updates).eq('id', ex_id).execute()
            if response.data:
                return True
            return False
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"      ⚠️ Попытка {attempt + 1} не удалась, ждем 2 сек...")
                time.sleep(2)
            else:
                raise e
    return False

def main():
    print("🔄 Загрузка данных...")
    free_db = load_free_db()
    mapping = load_mapping()
    
    print(f"✅ Загружено {len(free_db)} упражнений из Free DB")
    print(f"✅ Загружено {len(mapping)} ПРОВЕРЕННЫХ соответствий")
    
    # Загружаем упражнения из БД
    print("\n📥 Загрузка упражнений из Supabase...")
    response = supabase.table('exercises').select('id, name').execute()
    db_exercises = {ex['name']: ex['id'] for ex in response.data}
    print(f"✅ Загружено {len(db_exercises)} упражнений из БД\n")
    
    stats = {
        'total_mapping': len(mapping),
        'found': 0,
        'not_found': 0,
        'updated': 0,
        'errors': 0,
        'not_found_list': []
    }
    
    print("🔄 Применяю ТОЛЬКО проверенный маппинг...\n")
    
    for ru_name, en_name in mapping.items():
        if ru_name not in db_exercises:
            continue
        
        ex_id = db_exercises[ru_name]
        
        # Ищем ТОЧНОЕ совпадение
        matched = find_exact(en_name, free_db)
        
        if not matched:
            print(f"❌ {ru_name} → {en_name} - НЕ НАЙДЕНО в Free DB")
            stats['not_found'] += 1
            stats['not_found_list'].append(f"{ru_name} → {en_name}")
            continue
        
        stats['found'] += 1
        image_url = get_image_url(matched)
        
        # Обновляем в БД с retry
        try:
            if image_url:
                success = update_with_retry(supabase, ex_id, {'media_url': image_url})
                if success:
                    stats['updated'] += 1
                    print(f"✅ {ru_name} → {matched['name']}")
                else:
                    stats['errors'] += 1
                    print(f"❌ Ошибка обновления: {ru_name}")
                
                # Задержка между запросами (0.5 сек)
                time.sleep(0.5)
            else:
                print(f"⚠️ Нет изображения: {ru_name}")
        except Exception as e:
            stats['errors'] += 1
            print(f"❌ Ошибка: {ru_name} - {e}")
    
    print("\n" + "="*60)
    print("📊 ИТОГОВАЯ СТАТИСТИКА:")
    print("="*60)
    print(f"  Всего в проверенном списке: {stats['total_mapping']}")
    print(f"  Найдено точных совпадений:  {stats['found']}")
    print(f"  Не найдено в Free DB:       {stats['not_found']}")
    print(f"  ✅ УСПЕШНО ОБНОВЛЕНО В БД:  {stats['updated']}")
    print(f"  Ошибок:                     {stats['errors']}")
    
    if stats['not_found_list']:
        print(f"\n️ НЕ НАЙДЕНЫ В FREE DB (будут использовать иконки):")
        for item in stats['not_found_list']:
            print(f"  - {item}")
    
    print("="*60)
    print("💡 Готово! В базе только 100% правильные изображения.")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()