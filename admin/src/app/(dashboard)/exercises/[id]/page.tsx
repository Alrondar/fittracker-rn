'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getExerciseById, updateExercise } from '@/services/exercises';
import type { Database } from '@/types/database.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

type Exercise = Database['public']['Tables']['exercises']['Row'];

export default function ExerciseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<Partial<Exercise>>({});

  useEffect(() => {
    const fetchExercise = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getExerciseById(id);
        setExercise(data);
        setFormData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки');
      } finally {
        setIsLoading(false);
      }
    };

    fetchExercise();
  }, [id]);

  const handleSave = async () => {
    setIsSaving(true);
    setSuccess(false);
    try {
      const updated = await updateExercise(id, formData);
      setExercise(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="space-y-4">
          <div className="h-8 bg-muted animate-pulse rounded-md w-1/3" />
          <div className="h-64 bg-muted animate-pulse rounded-md" />
        </div>
      </div>
    );
  }

  if (error || !exercise) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-destructive mb-4">{error || 'Упражнение не найдено'}</p>
            <Link href="/exercises">
              <Button variant="outline">Назад к списку</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <Link href="/exercises">
          <Button variant="ghost">← Назад к списку</Button>
        </Link>
        <div className="flex gap-2">
          {success && <span className="text-green-600 text-sm self-center">Сохранено</span>}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Редактирование упражнения</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Название (RU)</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name_eng">Название (EN)</Label>
              <Input
                id="name_eng"
                value={formData.name_eng || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name_eng: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary_muscles">Основные мышцы (через запятую)</Label>
              <Input
                id="primary_muscles"
                value={formData.primary_muscles?.join(', ') || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, primary_muscles: e.target.value.split(',').map((s: string) => s.trim()) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondary_muscles">Вторичные мышцы (через запятую)</Label>
              <Input
                id="secondary_muscles"
                value={formData.secondary_muscles?.join(', ') || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, secondary_muscles: e.target.value.split(',').map((s: string) => s.trim()) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="difficulty">Сложность</Label>
              <select
                id="difficulty"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={formData.difficulty || ''}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, difficulty: e.target.value || null })}
              >
                <option value="">Не указано</option>
                <option value="easy">Легко</option>
                <option value="moderate">Средне</option>
                <option value="hard">Тяжело</option>
                <option value="max">Максимум</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="movement_pattern">Паттерн движения</Label>
              <Input
                id="movement_pattern"
                value={formData.movement_pattern || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, movement_pattern: e.target.value || null })}
                placeholder="Например: push, pull, squat"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reps_range">Диапазон повторений</Label>
              <Input
                id="reps_range"
                value={formData.reps_range || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, reps_range: e.target.value || null })}
                placeholder="Например: 8-12"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="technique">Техника выполнения</Label>
            <textarea
              id="technique"
              className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={formData.technique || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, technique: e.target.value || null })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="benefits">Польза</Label>
            <textarea
              id="benefits"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
              value={formData.benefits || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, benefits: e.target.value || null })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="risks" className="text-destructive">Риски / Противопоказания</Label>
            <textarea
              id="risks"
              className="flex min-h-[80px] w-full rounded-md border border-destructive/50 bg-transparent px-3 py-2 text-sm shadow-sm"
              value={formData.risks || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, risks: e.target.value || null })}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Связи (в разработке)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Управление альтернативами, оборудованием и противопоказаниями будет добавлено на следующем шаге.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
