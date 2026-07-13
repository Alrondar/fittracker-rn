import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase клиент
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Wger API
const WGER_API = 'https://wger.de/api/v2';

// Маппинг русских названий на английские (для поиска в Wger)
const EXERCISE_NAME_MAP: Record<string, string[]> = {
  'Жим штанги лёжа': ['barbell bench press', 'bench press'],
  'Приседания со штангой': ['barbell squat', 'squat'],
  'Становая тяга': ['deadlift', 'barbell deadlift'],
  'Подтягивания': ['pull-up', 'pullup'],
  'Отжимания': ['push-up', 'pushup'],
  'Жим гантелей сидя': ['dumbbell shoulder press', 'seated dumbbell press'],
  'Тяга штанги в наклоне': ['barbell row', 'bent over row'],
  'Жим ногами': ['leg press'],
  'Сгибания рук со штангой': ['barbell curl', 'bicep curl'],
  'Разгибания рук на блоке': ['tricep pushdown', 'cable pushdown'],
  'Скручивания': ['crunch', 'sit-up'],
  'Планка': ['plank'],
  'Выпады': ['lunge', 'walking lunge'],
  'Тяга верхнего блока': ['lat pulldown'],
  'Жим гантелей лёжа': ['dumbbell bench press'],
  'Разводка гантелей': ['dumbbell fly', 'chest fly'],
  'Тяга гантели в наклоне': ['dumbbell row', 'one arm row'],
  'Подъём на носки': ['calf raise', 'standing calf raise'],
  'Французский жим': ['french press', 'tricep extension'],
  'Молоток': ['hammer curl'],
};

interface WgerExercise {
  id: number;
  name: string;
  category: number;
  muscles: number[];
  muscles_secondary: number[];
  equipment: number[];
}

interface WgerExerciseImage {
  id: number;
  exercise: number;
  image: string;
  is_main: boolean;
}

// Получить все упражнения из Wger
async function fetchWgerExercises(): Promise<WgerExercise[]> {
  const allExercises: WgerExercise[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const response = await fetch(
      `${WGER_API}/exercise/?limit=${limit}&offset=${offset}&language=2`
    );
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) break;
    
    allExercises.push(...data.results);
    offset += limit;
    
    if (allExercises.length >= data.count) break;
  }

  return allExercises;
}

// Получить изображения для упражнения
async function fetchExerciseImages(exerciseId: number): Promise<WgerExerciseImage[]> {
  const response = await fetch(
    `${WGER_API}/exerciseimage/?exercise=${exerciseId}`
  );
  const data = await response.json();
  return data.results || [];
}

// Найти упражнение в Wger по названию
function findWgerExercise(
  exerciseName: string,
  wgerExercises: WgerExercise[]
): WgerExercise | null {
  const nameLower = exerciseName.toLowerCase();
  
  // 1. Точное совпадение через маппинг
  if (EXERCISE_NAME_MAP[exerciseName]) {
    const englishNames = EXERCISE_NAME_MAP[exerciseName];
    for (const engName of englishNames) {
      const found = wgerExercises.find(ex => 
        ex.name.toLowerCase().includes(engName.toLowerCase())
      );
      if (found) return found;
    }
  }
  
  // 2. Поиск по ключевым словам
  const keywords = exerciseName.split(' ').filter(w => w.length > 3);
  for (const keyword of keywords) {
    const found = wgerExercises.find(ex => 
      ex.name.toLowerCase().includes(keyword.toLowerCase())
    );
    if (found) return found;
  }
  
  return null;
}

// Основная функция
async function main() {
  console.log('🏋️ Начинаем загрузку GIF для упражнений...\n');

  // 1. Получаем все упражнения из Wger
  console.log('📥 Загружаем упражнения из Wger API...');
  const wgerExercises = await fetchWgerExercises();
  console.log(`✅ Загружено ${wgerExercises.length} упражнений из Wger\n`);

  // 2. Получаем все упражнения из БД
  console.log(' Загружаем упражнения из Supabase...');
  const { data: dbExercises, error } = await supabase
    .from('exercises')
    .select('id, name, media_url')
    .not('media_url', 'is', null);

  if (error) {
    console.error('❌ Ошибка загрузки из БД:', error);
    return;
  }

  // Получаем только упражнения БЕЗ media_url
  const { data: exercisesWithoutGif } = await supabase
    .from('exercises')
    .select('id, name')
    .is('media_url', null);

  console.log(`✅ Найдено ${exercisesWithoutGif?.length || 0} упражнений без GIF\n`);

  if (!exercisesWithoutGif || exercisesWithoutGif.length === 0) {
    console.log('✨ Все упражнения уже имеют GIF!');
    return;
  }

  // 3. Обрабатываем каждое упражнение
  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (const exercise of exercisesWithoutGif) {
    console.log(`🔍 Ищем: "${exercise.name}"`);

    const wgerExercise = findWgerExercise(exercise.name, wgerExercises);

    if (!wgerExercise) {
      console.log(`   ⚠️  Не найдено в Wger\n`);
      notFound++;
      continue;
    }

    console.log(`   ✅ Найдено: "${wgerExercise.name}" (ID: ${wgerExercise.id})`);

    // Получаем изображения
    const images = await fetchExerciseImages(wgerExercise.id);
    
    if (images.length === 0) {
      console.log(`   ⚠️  Нет изображений\n`);
      notFound++;
      continue;
    }

    // Берём основное изображение или первое
    const mainImage = images.find(img => img.is_main) || images[0];
    const gifUrl = mainImage.image;

    console.log(`   ️  GIF: ${gifUrl}`);

    // Обновляем БД
    const { error: updateError } = await supabase
      .from('exercises')
      .update({ media_url: gifUrl })
      .eq('id', exercise.id);

    if (updateError) {
      console.error(`   ❌ Ошибка обновления: ${updateError.message}\n`);
      errors++;
    } else {
      console.log(`   ✅ Обновлено!\n`);
      updated++;
    }

    // Небольшая задержка чтобы не спамить API
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Результаты:');
  console.log(`   ✅ Обновлено: ${updated}`);
  console.log(`   ⚠️  Не найдено: ${notFound}`);
  console.log(`   ❌ Ошибок: ${errors}`);
  console.log('='.repeat(50));
}

main().catch(console.error);