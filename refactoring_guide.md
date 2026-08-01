Master Refactoring Guide — FitTracker RN

ОБНОВЛЕНО 01.08.2026. Исходный аудит — 29.07.2026.
Статусы задач → TASKS_STATUS.md. Инвентарь файлов → FILE_INVENTORY.md.
Этот guide сохраняет детальный разбор проблем с примерами кода.

## Обновление 31.07.2026 (дельта сверх аудита 29.07.2026)

Закрыто / реализовано в этой итерации:

| Пункт | Что сделано | Где подтверждено |
|---|---|---|
| SEC-7 | catch advanceProgramProgress больше не врёт «Успех»: Haptics.Warning + честный Alert «Тренировка сохранена» с кнопками «Повторить» (retryAdvance) / «Позже». Данные тренировки сохранены до вызова прогрессии. | useWorkoutSession.ts saveWorkout |
| FIT-1 | Активация программ: одна активная, бейдж «Текущая», кнопка «Активировать», диалог «начать заново» для завершённых (reset). | programsService.activateProgram/getUserProgramsStatus/deactivateAllPrograms, ProgramCard, programs.tsx |
| FIT-2 | Синхронизация правок программы → будущие тренировки через RPC sync_program_changes_to_workouts (атомарно; завершённые/в процессе не трогаются). | programsService.syncProgramChanges, вызов в useProgramEditor.saveProgram |
| FIT-3 | Робастное удаление программы: отвязка workouts.program_id=null, удаление user_programs (→ 0 активных), каскад, защита от FK-падения. | programsService.deleteProgram(id, userId), usePrograms.deleteMutation |
| FIT-4 | Плейсхолдер «Нет активной программы» на Dashboard + кнопка «Выбрать программу». | (tabs)/index.tsx |
| FIT-5 | Строка «Следующая: Фаза N, Неделя X» в шапке списка тренировок. | (tabs)/workouts.tsx renderHeader |
| FIT-6 | Название программы + фаза в шапке тренировки. | (tabs)/workout/[id].tsx (getWorkoutProgramInfo) |
| ARCH-3 | ProgramCard переведён на единый LEVEL_COLORS (хардкод уровней убран). ProgramFormSheet — НЕ подтверждено. | ProgramCard.tsx |
| SCALE-5 | useProgramEditor разбит: фазовая логика вынесена в useProgramPhases. | useProgramEditor.ts + useProgramPhases.ts |
| SCALE-7 | Документация актуализирована; команда регенерации типов переведена на --db-url (legacy-ключи отключены). | CLAUDE.md, этот файл |
| SEC-2|updateSet() не персистит до saveWorkout (краш = потеря тренировки)|debounce 500мс + RPC upsert_workout_logs + flush при размонтировании|useWorkoutSession.ts|
| SEC-6|неатомарный DELETE+INSERT workout_logs в saveWorkout|RPC upsert_workout_logs: INSERT ON CONFLICT + удаление отсутствующих в одной транзакции|useWorkoutSession.ts|
| PERF-1|N+1 в легаси createWorkoutsFromProgram|функция удалена (нигде не использовалась)|programsService.ts|

Новые зафиксированные факты долга:

- database.types.ts на диске в UTF-16 (артефакт PowerShell >); в Functions нет sync_program_changes_to_workouts → рассинхрон с БД (рантайм не ломается). Регенерировать через Out-File -Encoding utf8 + --db-url.
- useActiveProgram.ts — мёртвый (не импортируется; programs.tsx использует getUserProgramsStatus напрямую) → кандидат на удаление (SCALE-3).
- usePrograms.handleProgramPress — бессмысленная проверка !program.id.startsWith('user_') (безвредно).

Оговорка по верификации: сводка выше — целевое состояние. Разнобой версий в присланных файлах (programs.tsx, useWorkoutSession.ts приходят в двух вариантах) означает, что на диске может лежать старая версия. Прежде чем считать пункт закрытым, проверь grep-ом. Если grep пуст — пункт на диске открыт.

## Часть 2. Детальная инструкция по переработке

### A. Безопасность и контроль доступа

Файл/Модуль: src/services/injuriesService.ts, src/services/profileService.ts (nutrition_logs).

Текущая проблема: таблицы user_injuries и nutrition_logs отсутствуют в консолидированном списке RLS CLAUDE.md. Либо политики есть, но не задокументированы, либо их нет вовсе.

Требуемое действие: SELECT * FROM pg_policies WHERE tablename IN ('user_injuries','nutrition_logs');. Если нет — завести по образцу body_metrics (ALL по auth.uid() = user_id) и дописать в CLAUDE.md.

Пример кода (миграция, если политик нет):

    ALTER TABLE user_injuries ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can manage their own injuries" ON user_injuries
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    -- аналогично для nutrition_logs

### B. Целостность данных при записи (атомарность)

Файл/Модуль: src/hooks/useWorkoutSession.ts. Проблемы: SEC-2 (updateSet не персистит), SEC-7 (закрыто 31.07), cleanup-эффект на deps [isWorkoutActive, isFinishing, workoutId] (лишний UPDATE при смене isFinishing).

Требуемое действие: debounce-автосохранение через RPC upsert_workout_logs (закрывает SEC-2 + SEC-6); cleanup вынести в useEffect(() => () => {...}, []) + читать флаги через ref.

Пример бага SEC-7 (старое поведение, до 31.07):

    } catch (progressError: any) {
      console.error('Ошибка обновления прогресса:', progressError);
      Alert.alert(
        'Успех', // ← должно быть честное сообщение + progressError.message
        `Тренировка завершена!\nВремя: ${formattedTime}\nСохранено подходов: ${totalLogs}`
      );
      router.replace('/(tabs)/history');
    }

Файл/Модуль: src/hooks/useProgramEditor.ts → saveProgram(). Проблема: PERF-4 (2 запроса на упражнение), PERF-6 (нет транзакции; supabase-js резолвит промис с {error}, Promise.all не прерывается → тихое частичное искажение).

Требуемое действие: свернуть сохранение в один Postgres RPC с транзакцией, принимающий JSON-снапшот дерева программы.

Пример кода (текущее поведение):

    updatePromises.push(Promise.resolve(supabase.rpc('update_exercise_position', {...})));
    updatePromises.push(Promise.resolve(supabase.from('program_exercises').update({...}).eq('id', exercise.id)));
    // ...
    const results = await Promise.all(updatePromises); // не прерывается на ошибке
    const errors = results.filter((r: any) => r && r.error);
    if (errors.length > 0) throw errors[0].error; // остальные N-1 успешных мутаций уже применены

### C. Корректность бизнес-логики

Файл/Модуль: src/services/dashboardService.ts. Проблемы: PR-bias (.order('weight_kg', { ascending: false }).limit(50) без группировки по упражнению); разные формулы калорий (дашборд * 300 vs профиль 5.0 * вес * часы).

Требуемое действие: SELECT DISTINCT ON (exercise_id) ... ORDER BY exercise_id, weight_kg DESC или переиспользовать profileService.getPersonalRecords; формулу калорий вынести в один метод и дёргать из дашборда.

### D. Дизайн-система: несогласованность оверлеев шторок (ARCH-1)

DaySettingsSheet / ExerciseSettingsSheet (без затемнения) vs EquipmentSheet / ExercisePickerSheet / ProgramFormSheet (хардкод rgba) vs SheetShell-based и модалки в profile.tsx / metrics.tsx (colors.overlay).

Требуемое действие: централизовать на SheetShell.

Пример кода (что убрать):

    // DaySettingsSheet.tsx / ExerciseSettingsSheet.tsx — нет затемнения:
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
      ...
    // EquipmentSheet.tsx / ExercisePickerSheet.tsx / ProgramFormSheet.tsx — хардкод:
    backgroundColor: 'rgba(0,0,0,0.5)', // должно быть colors.overlay

### E. Дизайн-система: хардкод цветов (ARCH-5)

ProgramCard уровни закрыто (31.07). Остаются: EquipmentIcon #6B7280 → colors.textTertiary; ProgramProgressCard color="white" → colors.textInverse; ExerciseSettingsSheet hex → токены.

### F. Мёртвый код и рассинхрон карт иконок

EQUIPMENT_SVG_MAP ↔ ICON_MAP разошлись: support.svg замаплен, но недостижим; partner.svg есть в SVG_MAP, но не замаплен (рендерится fallback). Плюс ~12 неиспользуемых SVG. useActiveProgram.ts мёртвый.

Требуемое действие: добавить partner.svg в ICON_MAP, убрать/переиспользовать support.svg, dev-time assert «каждое значение SVG_MAP есть ключом в ICON_MAP», удалить мёртвые ассеты + useActiveProgram.ts.

Пример теста:

    test('every equipment icon reference resolves', () => {
      Object.values(EQUIPMENT_SVG_MAP).forEach(file => {
        expect(ICON_MAP[file]).toBeDefined();
      });
    });

### G. Производительность рендера списков (частично 31.07)

workouts.tsx render* обёрнуты в useCallback (закрыто). history.tsx — проверить.

### H. Нарушение слоя данных в UI (SEC-10 остаток)

history/[id].tsx — прямой supabase.from('workouts'); при сетевой ошибке catch логирует, пользователь видит то же «не найдена», что и при 404. Требуемое действие: historyService.getWorkoutDetail(id) + различать not-found/error.

### I. Излишние разрешения

app.json включает RECORD_AUDIO/MODIFY_AUDIO_SETTINGS, но timerSounds.ts только воспроизводит. Требуемое действие: убрать RECORD_AUDIO.

Последнее обновление: 31.07.2026