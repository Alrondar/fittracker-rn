import { supabase } from './src/lib/supabase';

async function testRpc() {
  // Тест 1: Проверка, что RPC вызывается без ошибок типизации
  const { data, error } = await supabase.rpc('sync_program_changes_to_workouts', {
    p_program_id: 'test-id', // Неважно, что ID несуществующий
  });
  
  console.log('RPC вызван:', { data, error });
  
  // Тест 2: Проверка структуры таблиц
  const { data: logs, error: logsError } = await supabase
    .from('workout_logs')
    .select('id, workout_exercise_id, set_number, weight_kg, reps')
    .limit(1);
  
  console.log('workout_logs:', { logs, logsError });
}

testRpc();