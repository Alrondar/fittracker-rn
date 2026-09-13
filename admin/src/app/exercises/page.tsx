'use client';

import { useState, useEffect } from 'react';
import { getExercises } from '@/services/exercises';
import type { Database } from '@/types/database.types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

type Exercise = Database['public']['Tables']['exercises']['Row'];

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExercises = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getExercises(search);
        setExercises(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки');
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchExercises, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Упражнения</CardTitle>
          <div className="flex gap-2 mt-4">
            <Input
              placeholder="Поиск по названию..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
              ))}
            </div>
          ) : error ? (
            <div className="text-destructive text-center py-8">
              <p>{error}</p>
              <Button variant="outline" className="mt-2" onClick={() => window.location.reload()}>
                Повторить
              </Button>
            </div>
          ) : exercises.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Упражнения не найдены</p>
              {search && (
                <Button variant="link" onClick={() => setSearch('')}>
                  Сбросить фильтры
                </Button>
              )}
            </div>
          ) : (
            <div className="border rounded-md">
              <div className="grid grid-cols-12 gap-4 p-3 bg-muted/50 font-medium text-sm">
                <div className="col-span-5">Название</div>
                <div className="col-span-3">Мышцы</div>
                <div className="col-span-2">Сложность</div>
                <div className="col-span-2 text-right">Действия</div>
              </div>
              <div className="divide-y">
                {exercises.map((exercise) => (
                  <div key={exercise.id} className="grid grid-cols-12 gap-4 p-3 items-center hover:bg-muted/30 transition-colors">
                    <div className="col-span-5 font-medium truncate" title={exercise.name}>
                      {exercise.name}
                    </div>
                    <div className="col-span-3 text-sm text-muted-foreground truncate">
                      {exercise.primary_muscles?.join(', ') || '—'}
                    </div>
                    <div className="col-span-2 text-sm">
                      {exercise.difficulty ? (
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          exercise.difficulty === 'easy' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          exercise.difficulty === 'moderate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {exercise.difficulty}
                        </span>
                      ) : '—'}
                    </div>
                    <div className="col-span-2 text-right">
                      <Link href={`/exercises/${exercise.id}`}>
                        <Button variant="outline" size="sm">Редактировать</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
