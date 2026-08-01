export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      body_metrics: {
        Row: { id: string; user_id: string; metric_date: string; weight_kg: number | null; chest_cm: number | null; waist_cm: number | null; hips_cm: number | null; thigh_cm: number | null; arm_cm: number | null; neck_cm: number | null; notes: string | null; photo_url: string | null; created_at: string | null }
        Insert: { id?: string; user_id: string; metric_date?: string; weight_kg?: number | null; chest_cm?: number | null; waist_cm?: number | null; hips_cm?: number | null; thigh_cm?: number | null; arm_cm?: number | null; neck_cm?: number | null; notes?: string | null; photo_url?: string | null; created_at?: string | null }
        Update: { id?: string; user_id?: string; metric_date?: string; weight_kg?: number | null; chest_cm?: number | null; waist_cm?: number | null; hips_cm?: number | null; thigh_cm?: number | null; arm_cm?: number | null; neck_cm?: number | null; notes?: string | null; photo_url?: string | null; created_at?: string | null }
      }
      exercises: {
        Row: { id: string; name: string; name_eng: string | null; category: string | null; primary_muscles: string[]; secondary_muscles: string[] | null; equipment: string[] | null; can_be_activation: boolean; media_url: string | null; description: string | null; benefits: string | null; technique: string | null; risks: string | null; alternatives: string[] | null; settings: string | null; injuries: string[] | null; created_at: string | null }
        Insert: { id?: string; name: string; name_eng?: string | null; category?: string | null; primary_muscles: string[]; secondary_muscles?: string[] | null; equipment?: string[] | null; can_be_activation?: boolean; media_url?: string | null; description?: string | null; benefits?: string | null; technique?: string | null; risks?: string | null; alternatives?: string[] | null; settings?: string | null; injuries?: string[] | null; created_at?: string | null }
        Update: { id?: string; name?: string; name_eng?: string | null; category?: string | null; primary_muscles?: string[]; secondary_muscles?: string[] | null; equipment?: string[] | null; can_be_activation?: boolean; media_url?: string | null; description?: string | null; benefits?: string | null; technique?: string | null; risks?: string | null; alternatives?: string[] | null; settings?: string | null; injuries?: string[] | null; created_at?: string | null }
      }
      program_days: {
        Row: { id: string; program_id: string; phase_id: string | null; week_number: number; day_number: number; name: string; position: number | null; created_at: string | null }
        Insert: { id?: string; program_id: string; phase_id?: string | null; week_number: number; day_number: number; name: string; position?: number | null; created_at?: string | null }
        Update: { id?: string; program_id?: string; phase_id?: string | null; week_number?: number; day_number?: number; name?: string; position?: number | null; created_at?: string | null }
      }
      program_exercises: {
        Row: { id: string; program_day_id: string; exercise_id: string | null; exercise_name: string; sets: number; reps_range: string; rest_seconds: number; intensity: string; position: number; created_at: string | null }
        Insert: { id?: string; program_day_id: string; exercise_id?: string | null; exercise_name: string; sets: number; reps_range: string; rest_seconds: number; intensity: string; position: number; created_at?: string | null }
        Update: { id?: string; program_day_id?: string; exercise_id?: string | null; exercise_name?: string; sets?: number; reps_range?: string; rest_seconds?: number; intensity?: string; position?: number; created_at?: string | null }
      }
      program_phases: {
        Row: { id: string; program_id: string; phase_number: number; name: string; phase_type: string; weeks_count: number; description: string | null; position: number | null; created_at: string | null }
        Insert: { id?: string; program_id: string; phase_number: number; name: string; phase_type?: string; weeks_count?: number; description?: string | null; position?: number | null; created_at?: string | null }
        Update: { id?: string; program_id?: string; phase_number?: number; name?: string; phase_type?: string; weeks_count?: number; description?: string | null; position?: number | null; created_at?: string | null }
      }
      programs: {
        Row: { id: string; name: string; level: string; duration: number; description: string | null; schedule: string[] | null; share_code: string | null; source_program_id: string | null; created_by: string | null; created_at: string | null; updated_at: string | null }
        Insert: { id?: string; name: string; level: string; duration: number; description?: string | null; schedule?: string[] | null; share_code?: string | null; source_program_id?: string | null; created_by?: string | null; created_at?: string | null; updated_at?: string | null }
        Update: { id?: string; name?: string; level?: string; duration?: number; description?: string | null; schedule?: string[] | null; share_code?: string | null; source_program_id?: string | null; created_by?: string | null; created_at?: string | null; updated_at?: string | null }
      }
      profiles: {
        Row: { id: string; username: string | null; full_name: string | null; avatar_url: string | null; gender: string | null; birth_date: string | null; height_cm: number | null; current_weight_kg: number | null; goal: string | null; activity_level: number | null; target_calories: number | null; target_proteins: number | null; target_carbs: number | null; target_fats: number | null; pharmacology_type: string | null; pharmacology_details: string | null; created_at: string | null; updated_at: string | null }
        Insert: { id: string; username?: string | null; full_name?: string | null; avatar_url?: string | null; gender?: string | null; birth_date?: string | null; height_cm?: number | null; current_weight_kg?: number | null; goal?: string | null; activity_level?: number | null; target_calories?: number | null; target_proteins?: number | null; target_carbs?: number | null; target_fats?: number | null; pharmacology_type?: string | null; pharmacology_details?: string | null; created_at?: string | null; updated_at?: string | null }
        Update: { id?: string; username?: string | null; full_name?: string | null; avatar_url?: string | null; gender?: string | null; birth_date?: string | null; height_cm?: number | null; current_weight_kg?: number | null; goal?: string | null; activity_level?: number | null; target_calories?: number | null; target_proteins?: number | null; target_carbs?: number | null; target_fats?: number | null; pharmacology_type?: string | null; pharmacology_details?: string | null; created_at?: string | null; updated_at?: string | null }
      }
      user_injuries: {
        Row: { id: string; user_id: string | null; injury_type: string; body_part: string; severity: string | null; description: string | null; notes: string | null; status: string | null; restricted_exercises: string[] | null; created_at: string | null; recovered_at: string | null }
        Insert: { id?: string; user_id?: string | null; injury_type: string; body_part: string; severity?: string | null; description?: string | null; notes?: string | null; status?: string | null; restricted_exercises?: string[] | null; created_at?: string | null; recovered_at?: string | null }
        Update: { id?: string; user_id?: string | null; injury_type?: string; body_part?: string; severity?: string | null; description?: string | null; notes?: string | null; status?: string | null; restricted_exercises?: string[] | null; created_at?: string | null; recovered_at?: string | null }
      }
      user_programs: {
        Row: { id: string; user_id: string; program_id: string; current_phase: number; current_week: number | null; current_day: number | null; started_at: string | null; completed_at: string | null; is_active: boolean | null; created_at: string | null }
        Insert: { id?: string; user_id: string; program_id: string; current_phase: number; current_week?: number | null; current_day?: number | null; started_at?: string | null; completed_at?: string | null; is_active?: boolean | null; created_at?: string | null }
        Update: { id?: string; user_id?: string; program_id?: string; current_phase?: number; current_week?: number | null; current_day?: number | null; started_at?: string | null; completed_at?: string | null; is_active?: boolean | null; created_at?: string | null }
      }
      workout_exercises: {
        Row: { id: string; workout_id: string; exercise_id: string; order_index: number; target_sets: number | null; target_reps: number | null; target_reps_range: string | null; rest_seconds: number | null; intensity: string | null; position: number | null }
        Insert: { id?: string; workout_id: string; exercise_id: string; order_index: number; target_sets?: number | null; target_reps?: number | null; target_reps_range?: string | null; rest_seconds?: number | null; intensity?: string | null; position?: number | null }
        Update: { id?: string; workout_id?: string; exercise_id?: string; order_index?: number; target_sets?: number | null; target_reps?: number | null; target_reps_range?: string | null; rest_seconds?: number | null; intensity?: string | null; position?: number | null }
      }
      workout_logs: {
        Row: { id: string; workout_exercise_id: string; set_number: number; weight_kg: number | null; reps: number | null; completed_at: string | null }
        Insert: { id?: string; workout_exercise_id: string; set_number: number; weight_kg?: number | null; reps?: number | null; completed_at?: string | null }
        Update: { id?: string; workout_exercise_id?: string; set_number?: number; weight_kg?: number | null; reps?: number | null; completed_at?: string | null }
      }
      workouts: {
        Row: { id: string; user_id: string; program_id: string | null; name: string; description: string | null; phase_number: number | null; week_number: number | null; day_index: number | null; started_at: string | null; finished_at: string | null; duration_seconds: number | null; created_at: string | null; updated_at: string | null }
        Insert: { id?: string; user_id: string; program_id?: string | null; name: string; description?: string | null; phase_number?: number | null; week_number?: number | null; day_index?: number | null; started_at?: string | null; finished_at?: string | null; duration_seconds?: number | null; created_at?: string | null; updated_at?: string | null }
        Update: { id?: string; user_id?: string; program_id?: string | null; name?: string; description?: string | null; phase_number?: number | null; week_number?: number | null; day_index?: number | null; started_at?: string | null; finished_at?: string | null; duration_seconds?: number | null; created_at?: string | null; updated_at?: string | null }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      // --- КРИТИЧЕСКИ ВАЖНЫЕ RPC ДЛЯ СПРИНТА 1 ---
      sync_program_changes_to_workouts: {
        Args: { p_program_id: string }
        Returns: {
          deleted_workouts: number
          updated_workouts: number
          deleted_exercises: number
          updated_exercises: number
          inserted_exercises: number
        }
      }
      upsert_workout_logs: {
        Args: { 
          p_workout_exercise_id: string
          p_logs: Json 
        }
        Returns: undefined
      }
      // --- ОСТАЛЬНЫЕ RPC ---
      create_workouts_for_program: {
        Args: { p_program_id: string; p_user_id: string }
        Returns: number
      }
      generate_share_code: {
        Args: { p_program_id: string }
        Returns: string
      }
      copy_program_for_user: {
        Args: { p_program_id: string; p_user_id: string }
        Returns: string
      }
      search_exercises: {
        Args: { q?: string; category_filter?: string[]; muscle_filter?: string[]; equipment_filter?: string[]; activation_filter?: boolean; sort_by?: string; page_limit?: number; page_offset?: number }
        Returns: { id: string; name: string; category: string; primary_muscles: string[]; equipment: string[]; can_be_activation: boolean; popularity: number }[]
      }
      update_day_position: {
        Args: { p_day_id: string; p_new_position: number }
        Returns: undefined
      }
      update_exercise_position: {
        Args: { p_exercise_id: string; p_new_position: number }
        Returns: undefined
      }
      get_exercise_filter_counts: {
        Args: Record<string, never>
        Returns: {
          categories: { value: string; count: number }[]
          equipment: { value: string; count: number }[]
        }
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never