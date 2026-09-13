# FitTracker Admin

Веб-админка для управления справочником упражнений и коррекции исторических тренировок пользователей.

## Стек
- Next.js 15 (App Router)
- React 18
- TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (SSR, service_role key на сервере)

## Установка и запуск

1. Установите зависимости:
```bash
cd admin
npm install
```

2. Скопируйте `.env.local.example` в `.env.local` и заполните переменные:
```bash
cp .env.local.example .env.local
```

Необходимые переменные:
- `NEXT_PUBLIC_SUPABASE_URL` — URL вашего Supabase проекта
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Anon key (для будущих клиентских фич)
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (ТОЛЬКО для серверного кода!)
- `ADMIN_PASSWORD` — Пароль для входа в админку

3. Запустите сервер разработки:
```bash
npm run dev
```

4. Откройте http://localhost:3001 (или другой порт, если 3000 занят)

## Архитектура безопасности

- **Service role key** используется ТОЛЬКО в server components и server actions (`src/lib/supabase/admin.ts`).
- Клиентский код НЕ имеет доступа к service role key.
- Аутентификация реализована через простой env-gate (cookie `admin_session`).
- Все мутации данных проходят через server-side функции.

## Структура

```
admin/
├── src/
│   ├── app/
│   │   ├── (dashboard)/       # Защищенные роуты с sidebar
│   │   │   ├── exercises/     # L1: Список упражнений
│   │   │   └── exercises/[id]/# L2: Детали и редактирование упражнения
│   │   ├── api/               # Server actions / API routes
│   │   ├── login/             # Страница входа
│   │   └── layout.tsx         # Root layout
│   ├── components/ui/         # shadcn/ui компоненты
│   ├── lib/
│   │   └── supabase/admin.ts  # Supabase client с service role key
│   ├── services/              # Бизнес-логика работы с БД
│   └── types/
│       └── database.types.ts  # Типы Supabase (синхронизированы с основным проектом)
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## Следующие шаги (MVP)

- [x] 1. Структура `admin/` + Next.js 15 + shadcn/ui
- [x] 2. Supabase SSR setup (server client)
- [x] 3. Аутентификация (login page + middleware)
- [x] 4. Список упражнений с поиском (L1)
- [x] 5. Детальная карточка упражнения (L2) — базовые поля
- [ ] 6. Связи упражнений (альтернативы/оборудование/противопоказания)
- [ ] 7. Экран тренировок (выбор пользователя → список → детали)
- [ ] 8. Inline-редактирование подходов (`workout_logs`)
