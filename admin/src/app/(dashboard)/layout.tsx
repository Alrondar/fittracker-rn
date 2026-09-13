import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 border-r bg-card hidden md:block">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">FitTracker Admin</h1>
        </div>
        <nav className="p-4 space-y-2">
          <Link href="/exercises">
            <Button variant="ghost" className="w-full justify-start">
              🏋️ Упражнения
            </Button>
          </Link>
          <Link href="/workouts">
            <Button variant="ghost" className="w-full justify-start">
              📋 Тренировки
            </Button>
          </Link>
          <Link href="/users">
            <Button variant="ghost" className="w-full justify-start">
              👥 Пользователи
            </Button>
          </Link>
        </nav>
        <div className="absolute bottom-4 left-4 right-4">
          <form action="/api/logout" method="POST">
            <Button variant="outline" className="w-full" type="submit">
              Выйти
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
