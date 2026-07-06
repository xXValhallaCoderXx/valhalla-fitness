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
      allowed_emails: {
        Row: {
          added_at: string
          added_by: string | null
          email: string
          note: string | null
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          email: string
          note?: string | null
        }
        Update: {
          added_at?: string
          added_by?: string | null
          email?: string
          note?: string | null
        }
        Relationships: []
      }
      bodyweight_entries: {
        Row: {
          created_at: string
          id: string
          recorded_on: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          id?: string
          recorded_on: string
          user_id: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          id?: string
          recorded_on?: string
          user_id?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "bodyweight_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_logs: {
        Row: {
          client_mutation_id: string | null
          created_at: string
          id: string
          notes: string | null
          order_index: number
          performed_movement_id: string
          planned_movement_id: string
          role: string
          session_id: string
          slot_id: string
          target_summary: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_mutation_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_index: number
          performed_movement_id: string
          planned_movement_id: string
          role: string
          session_id: string
          slot_id: string
          target_summary: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_mutation_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_index?: number
          performed_movement_id?: string
          planned_movement_id?: string
          role?: string
          session_id?: string
          slot_id?: string
          target_summary?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_logs_performed_movement_id_fkey"
            columns: ["performed_movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_logs_planned_movement_id_fkey"
            columns: ["planned_movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_events: {
        Row: {
          answer: string | null
          category: string | null
          created_at: string
          decision_id: string | null
          id: string
          message: string | null
          metadata: Json
          route: string | null
          session_id: string | null
          source: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          category?: string | null
          created_at?: string
          decision_id?: string | null
          id?: string
          message?: string | null
          metadata?: Json
          route?: string | null
          session_id?: string | null
          source: string
          user_id: string
        }
        Update: {
          answer?: string | null
          category?: string | null
          created_at?: string
          decision_id?: string | null
          id?: string
          message?: string | null
          metadata?: Json
          route?: string | null
          session_id?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_events_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "progression_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      movement_replacement_rules: {
        Row: {
          allow_phase_slot_scope: boolean
          allow_session_scope: boolean
          created_at: string
          id: string
          is_active: boolean
          phase_key: string | null
          relationship_label: string
          replacement_movement_id: string
          role: string
          slot_id: string | null
          source_movement_id: string
          template_id: string | null
        }
        Insert: {
          allow_phase_slot_scope?: boolean
          allow_session_scope?: boolean
          created_at?: string
          id: string
          is_active?: boolean
          phase_key?: string | null
          relationship_label: string
          replacement_movement_id: string
          role: string
          slot_id?: string | null
          source_movement_id: string
          template_id?: string | null
        }
        Update: {
          allow_phase_slot_scope?: boolean
          allow_session_scope?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          phase_key?: string | null
          relationship_label?: string
          replacement_movement_id?: string
          role?: string
          slot_id?: string | null
          source_movement_id?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movement_replacement_rules_replacement_movement_id_fkey"
            columns: ["replacement_movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movement_replacement_rules_source_movement_id_fkey"
            columns: ["source_movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movement_replacement_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "program_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      movements: {
        Row: {
          category: string
          default_unit: string
          equipment: string[]
          id: string
          is_competition: boolean
          name: string
          variation_of: string | null
        }
        Insert: {
          category: string
          default_unit?: string
          equipment?: string[]
          id: string
          is_competition?: boolean
          name: string
          variation_of?: string | null
        }
        Update: {
          category?: string
          default_unit?: string
          equipment?: string[]
          id?: string
          is_competition?: boolean
          name?: string
          variation_of?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movements_variation_of_fkey"
            columns: ["variation_of"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auto_start_timer: boolean
          created_at: string
          default_rest_seconds: number
          display_name: string | null
          email: string | null
          equipment_profile: string[]
          feedback_prompt_dismissed: boolean
          id: string
          live_onboarding_dismissed: boolean
          onboarding_completed: boolean
          post_workout_feedback_dismissed: boolean
          program_state_defaults: Json
          rounding: number
          sex: string | null
          theme_preference: string
          units: string
          updated_at: string
        }
        Insert: {
          auto_start_timer?: boolean
          created_at?: string
          default_rest_seconds?: number
          display_name?: string | null
          email?: string | null
          equipment_profile?: string[]
          feedback_prompt_dismissed?: boolean
          id: string
          live_onboarding_dismissed?: boolean
          onboarding_completed?: boolean
          post_workout_feedback_dismissed?: boolean
          program_state_defaults?: Json
          rounding?: number
          sex?: string | null
          theme_preference?: string
          units?: string
          updated_at?: string
        }
        Update: {
          auto_start_timer?: boolean
          created_at?: string
          default_rest_seconds?: number
          display_name?: string | null
          email?: string | null
          equipment_profile?: string[]
          feedback_prompt_dismissed?: boolean
          id?: string
          live_onboarding_dismissed?: boolean
          onboarding_completed?: boolean
          post_workout_feedback_dismissed?: boolean
          program_state_defaults?: Json
          rounding?: number
          sex?: string | null
          theme_preference?: string
          units?: string
          updated_at?: string
        }
        Relationships: []
      }
      program_accessory_additions: {
        Row: {
          created_at: string
          effective_from_week_index: number
          id: string
          movement_id: string
          note: string | null
          order_index: number
          phase_key: string
          prescription_id: string
          program_instance_id: string
          progression_method: string
          session_id: string
          sets: Json
          slot_id: string
          source_slot_id: string | null
          target_summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          effective_from_week_index?: number
          id?: string
          movement_id: string
          note?: string | null
          order_index: number
          phase_key?: string
          prescription_id: string
          program_instance_id: string
          progression_method?: string
          session_id: string
          sets?: Json
          slot_id: string
          source_slot_id?: string | null
          target_summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          effective_from_week_index?: number
          id?: string
          movement_id?: string
          note?: string | null
          order_index?: number
          phase_key?: string
          prescription_id?: string
          program_instance_id?: string
          progression_method?: string
          session_id?: string
          sets?: Json
          slot_id?: string
          source_slot_id?: string | null
          target_summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_accessory_additions_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_accessory_additions_program_instance_id_fkey"
            columns: ["program_instance_id"]
            isOneToOne: false
            referencedRelation: "program_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_accessory_additions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      program_instances: {
        Row: {
          created_at: string
          current_block_id: string | null
          current_week_index: number
          customization_status: string
          customization_summary: Json
          id: string
          rounding: number
          start_date: string
          status: string
          template_id: string
          template_version_id: string
          title: string
          units: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_block_id?: string | null
          current_week_index?: number
          customization_status?: string
          customization_summary?: Json
          id?: string
          rounding: number
          start_date?: string
          status?: string
          template_id: string
          template_version_id: string
          title: string
          units: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_block_id?: string | null
          current_week_index?: number
          customization_status?: string
          customization_summary?: Json
          id?: string
          rounding?: number
          start_date?: string
          status?: string
          template_id?: string
          template_version_id?: string
          title?: string
          units?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "program_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_instances_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "program_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_instances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      program_movement_overrides: {
        Row: {
          created_at: string
          effective_from_week_index: number
          id: string
          original_movement_id: string
          phase_key: string
          program_instance_id: string
          replacement_movement_id: string
          role: string
          slot_id: string
          source_exercise_log_id: string | null
          source_session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          effective_from_week_index: number
          id?: string
          original_movement_id: string
          phase_key: string
          program_instance_id: string
          replacement_movement_id: string
          role: string
          slot_id: string
          source_exercise_log_id?: string | null
          source_session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          effective_from_week_index?: number
          id?: string
          original_movement_id?: string
          phase_key?: string
          program_instance_id?: string
          replacement_movement_id?: string
          role?: string
          slot_id?: string
          source_exercise_log_id?: string | null
          source_session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_movement_overrides_original_movement_id_fkey"
            columns: ["original_movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_movement_overrides_program_instance_id_fkey"
            columns: ["program_instance_id"]
            isOneToOne: false
            referencedRelation: "program_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_movement_overrides_replacement_movement_id_fkey"
            columns: ["replacement_movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_movement_overrides_source_exercise_log_id_fkey"
            columns: ["source_exercise_log_id"]
            isOneToOne: false
            referencedRelation: "exercise_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_movement_overrides_source_session_id_fkey"
            columns: ["source_session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_movement_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      program_state_values: {
        Row: {
          created_at: string
          id: string
          key: string
          label: string | null
          metadata: Json
          movement_id: string
          program_instance_id: string
          state_type: string
          unit: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          label?: string | null
          metadata?: Json
          movement_id: string
          program_instance_id: string
          state_type: string
          unit: string
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          label?: string | null
          metadata?: Json
          movement_id?: string
          program_instance_id?: string
          state_type?: string
          unit?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_state_values_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_state_values_program_instance_id_fkey"
            columns: ["program_instance_id"]
            isOneToOne: false
            referencedRelation: "program_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_state_values_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      program_template_versions: {
        Row: {
          created_at: string
          definition: Json
          id: string
          template_id: string
          version: string
        }
        Insert: {
          created_at?: string
          definition: Json
          id?: string
          template_id: string
          version: string
        }
        Update: {
          created_at?: string
          definition?: Json
          id?: string
          template_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "program_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      program_templates: {
        Row: {
          complexity: string
          created_at: string
          created_by: string | null
          days_per_week: number
          description: string
          id: string
          is_active: boolean
          name: string
          origin: string
          parent_template_id: string | null
          progression_label: string
          schema_version: string
          source: string
          tags: string[]
        }
        Insert: {
          complexity: string
          created_at?: string
          created_by?: string | null
          days_per_week: number
          description: string
          id: string
          is_active?: boolean
          name: string
          origin?: string
          parent_template_id?: string | null
          progression_label: string
          schema_version: string
          source: string
          tags?: string[]
        }
        Update: {
          complexity?: string
          created_at?: string
          created_by?: string | null
          days_per_week?: number
          description?: string
          id?: string
          is_active?: boolean
          name?: string
          origin?: string
          parent_template_id?: string | null
          progression_label?: string
          schema_version?: string
          source?: string
          tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "program_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_templates_parent_template_id_fkey"
            columns: ["parent_template_id"]
            isOneToOne: false
            referencedRelation: "program_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      progression_decisions: {
        Row: {
          created_at: string
          id: string
          input_summary: string
          movement_id: string
          previous_value: number | null
          program_instance_id: string
          recommendation: string
          recommended_value: number | null
          resolved_at: string | null
          rule_id: string
          scope: string
          state_key: string | null
          state_type: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          input_summary: string
          movement_id: string
          previous_value?: number | null
          program_instance_id: string
          recommendation: string
          recommended_value?: number | null
          resolved_at?: string | null
          rule_id: string
          scope: string
          state_key?: string | null
          state_type?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          input_summary?: string
          movement_id?: string
          previous_value?: number | null
          program_instance_id?: string
          recommendation?: string
          recommended_value?: number | null
          resolved_at?: string | null
          rule_id?: string
          scope?: string
          state_key?: string | null
          state_type?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progression_decisions_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progression_decisions_program_instance_id_fkey"
            columns: ["program_instance_id"]
            isOneToOne: false
            referencedRelation: "program_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progression_decisions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      set_logs: {
        Row: {
          actual_load: number | null
          actual_reps: number | null
          actual_rir: number | null
          actual_rpe: number | null
          client_mutation_id: string | null
          completed: boolean
          created_at: string
          exercise_log_id: string
          id: string
          is_amrap: boolean
          is_backoff: boolean
          is_top_set: boolean
          note: string | null
          set_index: number
          target_load: number | null
          target_rep_max: number | null
          target_rep_min: number | null
          target_reps: number | null
          target_rir: number | null
          target_rpe: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_load?: number | null
          actual_reps?: number | null
          actual_rir?: number | null
          actual_rpe?: number | null
          client_mutation_id?: string | null
          completed?: boolean
          created_at?: string
          exercise_log_id: string
          id?: string
          is_amrap?: boolean
          is_backoff?: boolean
          is_top_set?: boolean
          note?: string | null
          set_index: number
          target_load?: number | null
          target_rep_max?: number | null
          target_rep_min?: number | null
          target_reps?: number | null
          target_rir?: number | null
          target_rpe?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_load?: number | null
          actual_reps?: number | null
          actual_rir?: number | null
          actual_rpe?: number | null
          client_mutation_id?: string | null
          completed?: boolean
          created_at?: string
          exercise_log_id?: string
          id?: string
          is_amrap?: boolean
          is_backoff?: boolean
          is_top_set?: boolean
          note?: string | null
          set_index?: number
          target_load?: number | null
          target_rep_max?: number | null
          target_rep_min?: number | null
          target_reps?: number | null
          target_rir?: number | null
          target_rpe?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "set_logs_exercise_log_id_fkey"
            columns: ["exercise_log_id"]
            isOneToOne: false
            referencedRelation: "exercise_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      substitution_logs: {
        Row: {
          created_at: string
          id: string
          note: string | null
          performed_movement_id: string
          planned_movement_id: string
          reason: string
          session_id: string
          slot_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          performed_movement_id: string
          planned_movement_id: string
          reason: string
          session_id: string
          slot_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          performed_movement_id?: string
          planned_movement_id?: string
          reason?: string
          session_id?: string
          slot_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "substitution_logs_performed_movement_id_fkey"
            columns: ["performed_movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "substitution_logs_planned_movement_id_fkey"
            columns: ["planned_movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "substitution_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "substitution_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          client_mutation_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          is_favorite: boolean
          notes: string | null
          planned_session_id: string | null
          prescription_snapshot: Json
          program_instance_id: string | null
          scheduled_date: string
          source_session_id: string | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_mutation_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          is_favorite?: boolean
          notes?: string | null
          planned_session_id?: string | null
          prescription_snapshot: Json
          program_instance_id?: string | null
          scheduled_date?: string
          source_session_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_mutation_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          is_favorite?: boolean
          notes?: string | null
          planned_session_id?: string | null
          prescription_snapshot?: Json
          program_instance_id?: string | null
          scheduled_date?: string
          source_session_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_program_instance_id_fkey"
            columns: ["program_instance_id"]
            isOneToOne: false
            referencedRelation: "program_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_source_session_id_fkey"
            columns: ["source_session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_user_id_fkey"
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
      is_email_allowed: { Args: { check_email: string }; Returns: boolean }
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

