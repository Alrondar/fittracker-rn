import json
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
FREE_DB_PATH = "data/free-exercise-db-main/free-exercise-db-main/dist/exercises.json"

# Подключение к Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("📥 Загрузка данных...\n")

# 1. Загружаем английские названия из Free Exercise DB
with open(FREE_DB_PATH, 'r', encoding='utf-8') as f:
    free_db = json.load(f)

english_names = sorted([ex['name'] for ex in free_db])

# 2. Загружаем русские названия из Supabase
response = supabase.table('exercises').select('name, media_url').execute()
russian_exercises = response.data

# 3. Сортируем: сначала с картинками, потом без
with_images = [ex for ex in russian_exercises if ex.get('media_url')]
without_images = [ex for ex in russian_exercises if not ex.get('media_url')]

print(f"✅ Английских упражнений: {len(english_names)}")
print(f"✅ Русских упражнений: {len(russian_exercises)}")
print(f"   - С изображениями: {len(with_images)}")
print(f"   - Без изображений: {len(without_images)}\n")

# 4. Сохраняем в файл
output = []
output.append("=" * 80)
output.append("АНГЛИЙСКИЕ НАЗВАНИЯ (из Free Exercise DB)")
output.append("=" * 80)
for name in english_names:
    output.append(name)

output.append("\n" + "=" * 80)
output.append("РУССКИЕ НАЗВАНИЯ С ИЗОБРАЖЕНИЯМИ (уже есть в БД)")
output.append("=" * 80)
for ex in with_images:
    output.append(f"✅ {ex['name']}")

output.append("\n" + "=" * 80)
output.append("РУССКИЕ НАЗВАНИЯ БЕЗ ИЗОБРАЖЕНИЙ (нужно найти)")
output.append("=" * 80)
for ex in without_images:
    output.append(f"❌ {ex['name']}")

output_text = "\n".join(output)

# Сохраняем в файл
with open('exercise_names_comparison.txt', 'w', encoding='utf-8') as f:
    f.write(output_text)

print("💾 Сохранено в: exercise_names_comparison.txt\n")
print("📋 Скопируй содержимое файла и пришли мне - я составлю точный маппинг!")