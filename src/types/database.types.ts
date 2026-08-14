export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      body_metrics: {
        Row: {
          abdomen_cm: number | null
          arm_cm: number | null
          biceps_left_cm: number | null
          biceps_right_cm: number | null
          calf_left_cm: number | null
          calf_right_cm: number | null
          chest_cm: number | null
          created_at: string | null
          forearm_left_cm: number | null
          forearm_right_cm: number | null
          hips_cm: number | null
          id: string
          metric_date: string
          neck_cm: number | null
          notes: string | null
          photo_url: string | null
          shoulder_cm: number | null
          thigh_cm: number | null
          user_id: string
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          abdomen_cm?: number | null
          arm_cm?: number | null
          biceps_left_cm?: number | null
          biceps_right_cm?: number | null
          calf_left_cm?: number | null
          calf_right_cm?: number | null
          chest_cm?: number | null
          created_at?: string | null
          forearm_left_cm?: number | null
          forearm_right_cm?: number | null
          hips_cm?: number | null
          id?: string
          metric_date?: string
          neck_cm?: number | null
          notes?: string | null
          photo_url?: string | null
          shoulder_cm?: number | null
          thigh_cm?: number | null
          user_id: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          abdomen_cm?: number | null
          arm_cm?: number | null
          biceps_left_cm?: number | null
          biceps_right_cm?: number | null
          calf_left_cm?: number | null
          calf_right_cm?: number | null
          chest_cm?: number | null
          created_at?: string | null
          forearm_left_cm?: number | null
          forearm_right_cm?: number | null
          hips_cm?: number | null
          id?: string
          metric_date?: string
          neck_cm?: number | null
          notes?: string | null
          photo_url?: string | null
          shoulder_cm?: number | null
          thigh_cm?: number | null
          user_id?: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "body_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_readiness: {
        Row: {
          created_at: string
          date: string
          fatigue: number | null
          id: string
          notes: string | null
          readiness: number | null
          sleep_hours: number | null
          sleep_quality: number | null
          soreness: number | null
          stress: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          fatigue?: number | null
          id?: string
          notes?: string | null
          readiness?: number | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          soreness?: number | null
          stress?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          fatigue?: number | null
          id?: string
          notes?: string | null
          readiness?: number | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          soreness?: number | null
          stress?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      equipment: {
        Row: {
          color: string
          created_at: string | null
          icon: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          icon?: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string | null
          icon?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      exercise_equipment: {
        Row: {
          equipment_id: string
          exercise_id: string
        }
        Insert: {
          equipment_id: string
          exercise_id: string
        }
        Update: {
          equipment_id?: string
          exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_equipment_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_equipment_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_media: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          license: string | null
          media_type: string
          position: number
          source: string | null
          url: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          license?: string | null
          media_type?: string
          position?: number
          source?: string | null
          url: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          license?: string | null
          media_type?: string
          position?: number
          source?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_media_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_relationships: {
        Row: {
          confidence: string
          created_at: string
          exercise_id: string
          id: string
          related_exercise_id: string
          relation_type: string
          status: string
        }
        Insert: {
          confidence?: string
          created_at?: string
          exercise_id: string
          id?: string
          related_exercise_id: string
          relation_type: string
          status?: string
        }
        Update: {
          confidence?: string
          created_at?: string
          exercise_id?: string
          id?: string
          related_exercise_id?: string
          relation_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_relationships_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_relationships_related_exercise_id_fkey"
            columns: ["related_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          aliases: string[]
          benefits: string | null
          can_be_activation: boolean
          category: string | null
          created_at: string | null
          difficulty: string | null
          id: string
          media_url: string | null
          movement_pattern: string | null
          name: string
          name_eng: string | null
          primary_muscles: string[]
          reps_range: string | null
          risks: string | null
          search_text: string | null
          secondary_muscles: string[] | null
          settings: string | null
          short_name: string | null
          status: string
          tags: string[]
          technique: string | null
          updated_at: string
        }
        Insert: {
          aliases?: string[]
          benefits?: string | null
          can_be_activation?: boolean
          category?: string | null
          created_at?: string | null
          difficulty?: string | null
          id?: string
          media_url?: string | null
          movement_pattern?: string | null
          name: string
          name_eng?: string | null
          primary_muscles: string[]
          reps_range?: string | null
          risks?: string | null
          search_text?: string | null
          secondary_muscles?: string[] | null
          settings?: string | null
          short_name?: string | null
          status?: string
          tags?: string[]
          technique?: string | null
          updated_at?: string
        }
        Update: {
          aliases?: string[]
          benefits?: string | null
          can_be_activation?: boolean
          category?: string | null
          created_at?: string | null
          difficulty?: string | null
          id?: string
          media_url?: string | null
          movement_pattern?: string | null
          name?: string
          name_eng?: string | null
          primary_muscles?: string[]
          reps_range?: string | null
          risks?: string | null
          search_text?: string | null
          secondary_muscles?: string[] | null
          settings?: string | null
          short_name?: string | null
          status?: string
          tags?: string[]
          technique?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      injury_exercise_restrictions: {
        Row: {
          created_at: string | null
          exercise_id: string | null
          id: string
          injury_id: string | null
          reason: string | null
          restriction_type: string | null
        }
        Insert: {
          created_at?: string | null
          exercise_id?: string | null
          id?: string
          injury_id?: string | null
          reason?: string | null
          restriction_type?: string | null
        }
        Update: {
          created_at?: string | null
          exercise_id?: string | null
          id?: string
          injury_id?: string | null
          reason?: string | null
          restriction_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "injury_exercise_restrictions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "injury_exercise_restrictions_injury_id_fkey"
            columns: ["injury_id"]
            isOneToOne: false
            referencedRelation: "user_injuries"
            referencedColumns: ["id"]
          },
        ]
      }
      injury_exercise_warnings: {
        Row: {
          body_part: string
          exercise_id: string | null
          id: string
          injury_type: string | null
          level: string | null
          muscle_group: string
          recommendation: string | null
          warning_level: string | null
        }
        Insert: {
          body_part: string
          exercise_id?: string | null
          id?: string
          injury_type?: string | null
          level?: string | null
          muscle_group: string
          recommendation?: string | null
          warning_level?: string | null
        }
        Update: {
          body_part?: string
          exercise_id?: string | null
          id?: string
          injury_type?: string | null
          level?: string | null
          muscle_group?: string
          recommendation?: string | null
          warning_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "injury_exercise_warnings_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_logs: {
        Row: {
          calories: number | null
          carbs: number | null
          created_at: string | null
          fats: number | null
          id: string
          log_date: string
          meal_type: string
          proteins: number | null
          user_id: string
          water_ml: number | null
        }
        Insert: {
          calories?: number | null
          carbs?: number | null
          created_at?: string | null
          fats?: number | null
          id?: string
          log_date?: string
          meal_type: string
          proteins?: number | null
          user_id: string
          water_ml?: number | null
        }
        Update: {
          calories?: number | null
          carbs?: number | null
          created_at?: string | null
          fats?: number | null
          id?: string
          log_date?: string
          meal_type?: string
          proteins?: number | null
          user_id?: string
          water_ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pain_events: {
        Row: {
          body_part: string | null
          exercise_id: string | null
          id: string
          notes: string | null
          occurred_at: string
          pain_level: number
          pain_type: string | null
          stop_exercise: boolean
          user_id: string
          workout_id: string | null
        }
        Insert: {
          body_part?: string | null
          exercise_id?: string | null
          id?: string
          notes?: string | null
          occurred_at?: string
          pain_level: number
          pain_type?: string | null
          stop_exercise?: boolean
          user_id: string
          workout_id?: string | null
        }
        Update: {
          body_part?: string | null
          exercise_id?: string | null
          id?: string
          notes?: string | null
          occurred_at?: string
          pain_level?: number
          pain_type?: string | null
          stop_exercise?: boolean
          user_id?: string
          workout_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: number | null
          avatar_url: string | null
          birth_date: string | null
          created_at: string | null
          current_weight_kg: number | null
          full_name: string | null
          gender: string | null
          goal: string | null
          height_cm: number | null
          id: string
          onboarding_data: Json | null
          pharmacology_details: string | null
          pharmacology_type: string | null
          target_calories: number | null
          target_carbs: number | null
          target_fats: number | null
          target_proteins: number | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          activity_level?: number | null
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string | null
          current_weight_kg?: number | null
          full_name?: string | null
          gender?: string | null
          goal?: string | null
          height_cm?: number | null
          id: string
          onboarding_data?: Json | null
          pharmacology_details?: string | null
          pharmacology_type?: string | null
          target_calories?: number | null
          target_carbs?: number | null
          target_fats?: number | null
          target_proteins?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          activity_level?: number | null
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string | null
          current_weight_kg?: number | null
          full_name?: string | null
          gender?: string | null
          goal?: string | null
          height_cm?: number | null
          id?: string
          onboarding_data?: Json | null
          pharmacology_details?: string | null
          pharmacology_type?: string | null
          target_calories?: number | null
          target_carbs?: number | null
          target_fats?: number | null
          target_proteins?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      program_days: {
        Row: {
          created_at: string | null
          day_number: number
          id: string
          name: string
          phase_id: string | null
          position: number | null
          program_id: string
          week_number: number
        }
        Insert: {
          created_at?: string | null
          day_number: number
          id?: string
          name: string
          phase_id?: string | null
          position?: number | null
          program_id: string
          week_number?: number
        }
        Update: {
          created_at?: string | null
          day_number?: number
          id?: string
          name?: string
          phase_id?: string | null
          position?: number | null
          program_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_days_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "program_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_days_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_exercises: {
        Row: {
          created_at: string | null
          exercise_id: string | null
          exercise_name: string
          id: string
          intensity: string
          position: number
          program_day_id: string
          reps_range: string
          rest_seconds: number
          sets: number
        }
        Insert: {
          created_at?: string | null
          exercise_id?: string | null
          exercise_name: string
          id?: string
          intensity: string
          position: number
          program_day_id: string
          reps_range: string
          rest_seconds: number
          sets: number
        }
        Update: {
          created_at?: string | null
          exercise_id?: string | null
          exercise_name?: string
          id?: string
          intensity?: string
          position?: number
          program_day_id?: string
          reps_range?: string
          rest_seconds?: number
          sets?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_exercises_program_day_id_fkey"
            columns: ["program_day_id"]
            isOneToOne: false
            referencedRelation: "program_days"
            referencedColumns: ["id"]
          },
        ]
      }
      program_phases: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          phase_number: number
          phase_type: string
          position: number | null
          program_id: string
          weeks_count: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          phase_number: number
          phase_type?: string
          position?: number | null
          program_id: string
          weeks_count?: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          phase_number?: number
          phase_type?: string
          position?: number | null
          program_id?: string
          weeks_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_phases_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          duration: number
          id: string
          level: string
          name: string
          schedule: string[] | null
          share_code: string | null
          source_program_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration: number
          id?: string
          level: string
          name: string
          schedule?: string[] | null
          share_code?: string | null
          source_program_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration?: number
          id?: string
          level?: string
          name?: string
          schedule?: string[] | null
          share_code?: string | null
          source_program_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      session_sets: {
        Row: {
          exercise_id: string
          id: string
          is_warmup: boolean | null
          reps: number | null
          rpe: number | null
          session_id: string
          weight_kg: number | null
        }
        Insert: {
          exercise_id: string
          id?: string
          is_warmup?: boolean | null
          reps?: number | null
          rpe?: number | null
          session_id: string
          weight_kg?: number | null
        }
        Update: {
          exercise_id?: string
          id?: string
          is_warmup?: boolean | null
          reps?: number | null
          rpe?: number | null
          session_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "session_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_sets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_injuries: {
        Row: {
          body_part: string
          created_at: string | null
          description: string | null
          id: string
          injury_type: string
          notes: string | null
          recovered_at: string | null
          restricted_exercises: string[] | null
          severity: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          body_part: string
          created_at?: string | null
          description?: string | null
          id?: string
          injury_type: string
          notes?: string | null
          recovered_at?: string | null
          restricted_exercises?: string[] | null
          severity?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          body_part?: string
          created_at?: string | null
          description?: string | null
          id?: string
          injury_type?: string
          notes?: string | null
          recovered_at?: string | null
          restricted_exercises?: string[] | null
          severity?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_programs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_day: number | null
          current_phase: number
          current_week: number | null
          id: string
          is_active: boolean | null
          program_id: string
          started_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_day?: number | null
          current_phase?: number
          current_week?: number | null
          id?: string
          is_active?: boolean | null
          program_id: string
          started_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_day?: number | null
          current_phase?: number
          current_week?: number | null
          id?: string
          is_active?: boolean | null
          program_id?: string
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_programs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercises: {
        Row: {
          exercise_id: string
          id: string
          intensity: string | null
          order_index: number
          position: number | null
          reps: string | null
          rest_seconds: number | null
          sets: number | null
          target_reps: number | null
          target_reps_range: string | null
          target_sets: number | null
          workout_id: string
        }
        Insert: {
          exercise_id: string
          id?: string
          intensity?: string | null
          order_index: number
          position?: number | null
          reps?: string | null
          rest_seconds?: number | null
          sets?: number | null
          target_reps?: number | null
          target_reps_range?: string | null
          target_sets?: number | null
          workout_id: string
        }
        Update: {
          exercise_id?: string
          id?: string
          intensity?: string | null
          order_index?: number
          position?: number | null
          reps?: string | null
          rest_seconds?: number | null
          sets?: number | null
          target_reps?: number | null
          target_reps_range?: string | null
          target_sets?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          difficulty: string | null
          id: string
          reps: number | null
          rir: number | null
          rpe: number | null
          set_number: number
          weight_kg: number | null
          workout_exercise_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          difficulty?: string | null
          id?: string
          reps?: number | null
          rir?: number | null
          rpe?: number | null
          set_number: number
          weight_kg?: number | null
          workout_exercise_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          difficulty?: string | null
          id?: string
          reps?: number | null
          rir?: number | null
          rpe?: number | null
          set_number?: number
          weight_kg?: number | null
          workout_exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_workout_exercise_id_fkey"
            columns: ["workout_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          finished_at: string | null
          id: string
          notes: string | null
          started_at: string
          user_id: string
          workout_id: string | null
        }
        Insert: {
          finished_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string
          user_id: string
          workout_id?: string | null
        }
        Update: {
          finished_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string
          user_id?: string
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          created_at: string | null
          day_index: number | null
          day_of_week: number | null
          description: string | null
          duration_seconds: number | null
          finished_at: string | null
          id: string
          name: string
          phase_number: number | null
          program_id: string | null
          started_at: string | null
          updated_at: string | null
          user_id: string
          week_number: number | null
        }
        Insert: {
          created_at?: string | null
          day_index?: number | null
          day_of_week?: number | null
          description?: string | null
          duration_seconds?: number | null
          finished_at?: string | null
          id?: string
          name: string
          phase_number?: number | null
          program_id?: string | null
          started_at?: string | null
          updated_at?: string | null
          user_id: string
          week_number?: number | null
        }
        Update: {
          created_at?: string | null
          day_index?: number | null
          day_of_week?: number | null
          description?: string | null
          duration_seconds?: number | null
          finished_at?: string | null
          id?: string
          name?: string
          phase_number?: number | null
          program_id?: string | null
          started_at?: string | null
          updated_at?: string | null
          user_id?: string
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      copy_program_for_user: {
        Args: { p_program_id: string; p_user_id: string }
        Returns: string
      }
      create_workouts_for_program: {
        Args: { p_program_id: string; p_user_id: string }
        Returns: number
      }
      generate_share_code: { Args: { p_program_id: string }; Returns: string }
      get_exercise_filter_counts: { Args: never; Returns: Json }
      migrate_exercise_equipment: { Args: never; Returns: undefined }
      normalize_equipment_array: { Args: { arr: string[] }; Returns: string[] }
      normalize_equipment_final: { Args: { item: string }; Returns: string }
      normalize_equipment_item: { Args: { item: string }; Returns: string[] }
      normalize_equipment_item_simple: {
        Args: { item: string }
        Returns: string
      }
      normalize_equipment_name: { Args: { item: string }; Returns: string }
      replace_in_array: {
        Args: { arr: string[]; new_val: string; old_val: string }
        Returns: string[]
      }
      save_program_snapshot: {
        Args: {
          p_deleted_day_ids: Json
          p_deleted_exercise_ids: Json
          p_deleted_phase_ids: Json
          p_phases: Json
          p_program_id: string
          p_schedule: Json
        }
        Returns: undefined
      }
      search_exercises: {
        Args: {
          activation_filter?: boolean
          category_filter?: string[]
          equipment_filter?: string[]
          muscle_filter?: string[]
          page_limit?: number
          page_offset?: number
          q?: string
          sort_by?: string
        }
        Returns: {
          can_be_activation: boolean
          category: string
          equipment: string[]
          id: string
          name: string
          popularity: number
          primary_muscles: string[]
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      split_equipment: { Args: { item: string }; Returns: string[] }
      split_equipment_final: { Args: { item: string }; Returns: string[] }
      sync_program_changes_to_workouts: {
        Args: { p_program_id: string }
        Returns: Json
      }
      update_day_position: {
        Args: { p_day_id: string; p_new_position: number }
        Returns: undefined
      }
      update_exercise_position: {
        Args: { p_exercise_id: string; p_new_position: number }
        Returns: undefined
      }
      upsert_workout_logs: {
        Args: { p_logs: Json; p_workout_exercise_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
