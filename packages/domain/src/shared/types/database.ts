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
      program_load_overrides: {
        Row: {
          id: string
          key: string
          program_instance_id: string
          selector: Json
          user_id: string
          value: number
        }
        Insert: {
          id?: string
          key: string
          program_instance_id: string
          selector: Json
          user_id: string
          value: number
        }
        Update: {
          id?: string
          key?: string
          program_instance_id?: string
          selector?: Json
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_load_overrides_program_instance_id_user_id_fkey"
            columns: ["program_instance_id", "user_id"]
            isOneToOne: false
            referencedRelation: "program_instances"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      program_load_adjustments: {
        Row: {
          action: string
          changes: Json
          created_at: string
          id: string
          intent: Json
          program_instance_id: string
          request_id: string
          resulting_version: number
          superseded_decision_ids: string[]
          user_id: string
        }
        Insert: {
          action: string
          changes: Json
          created_at?: string
          id?: string
          intent: Json
          program_instance_id: string
          request_id: string
          resulting_version: number
          superseded_decision_ids?: string[]
          user_id: string
        }
        Update: {
          action?: string
          changes?: Json
          created_at?: string
          id?: string
          intent?: Json
          program_instance_id?: string
          request_id?: string
          resulting_version?: number
          superseded_decision_ids?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_load_adjustments_program_instance_id_user_id_fkey"
            columns: ["program_instance_id", "user_id"]
            isOneToOne: false
            referencedRelation: "program_instances"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      program_return_periods: {
        Row: {
          completed_workouts: number
          ended_at: string | null
          id: string
          policy_version: number
          program_instance_id: string
          settings: Json
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          completed_workouts?: number
          ended_at?: string | null
          id?: string
          policy_version?: number
          program_instance_id: string
          settings: Json
          started_at?: string
          status: string
          user_id: string
        }
        Update: {
          completed_workouts?: number
          ended_at?: string | null
          id?: string
          policy_version?: number
          program_instance_id?: string
          settings?: Json
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_return_periods_program_instance_id_user_id_fkey"
            columns: ["program_instance_id", "user_id"]
            isOneToOne: false
            referencedRelation: "program_instances"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
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
      equipment_mode_policy_versions: {
        Row: {
          created_at: string
          definition: Json
          definition_checksum: string
          id: string
          mode: string
          schema_version: string
          version: string
        }
        Insert: {
          created_at?: string
          definition: Json
          definition_checksum?: never
          id?: string
          mode: string
          schema_version: string
          version: string
        }
        Update: {
          created_at?: string
          definition?: Json
          definition_checksum?: never
          id?: string
          mode?: string
          schema_version?: string
          version?: string
        }
        Relationships: []
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
            foreignKeyName: "exercise_logs_session_owner_fkey"
            columns: ["session_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id", "user_id"]
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
            foreignKeyName: "feedback_events_decision_owner_fkey"
            columns: ["decision_id", "user_id"]
            isOneToOne: false
            referencedRelation: "progression_decisions"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "feedback_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_events_session_owner_fkey"
            columns: ["session_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id", "user_id"]
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
          aliases: string[]
          canonical_free_weight_movement_id: string | null
          category: string
          default_unit: string
          equipment: string[]
          id: string
          is_competition: boolean
          load_convention: string
          name: string
          pattern: string
          primary_muscles: string[]
          replaced_by_movement_id: string | null
          required_equipment: string[]
          resistance_mode: string | null
          secondary_muscles: string[]
          status: string
          variation_of: string | null
        }
        Insert: {
          aliases?: string[]
          canonical_free_weight_movement_id?: string | null
          category: string
          default_unit?: string
          equipment?: string[]
          id: string
          is_competition?: boolean
          load_convention: string
          name: string
          pattern: string
          primary_muscles?: string[]
          replaced_by_movement_id?: string | null
          required_equipment?: string[]
          resistance_mode?: string | null
          secondary_muscles?: string[]
          status?: string
          variation_of?: string | null
        }
        Update: {
          aliases?: string[]
          canonical_free_weight_movement_id?: string | null
          category?: string
          default_unit?: string
          equipment?: string[]
          id?: string
          is_competition?: boolean
          load_convention?: string
          name?: string
          pattern?: string
          primary_muscles?: string[]
          replaced_by_movement_id?: string | null
          required_equipment?: string[]
          resistance_mode?: string | null
          secondary_muscles?: string[]
          status?: string
          variation_of?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movements_canonical_free_weight_movement_id_fkey"
            columns: ["canonical_free_weight_movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movements_replaced_by_movement_id_fkey"
            columns: ["replaced_by_movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
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
          id: string
          live_onboarding_dismissed: boolean
          onboarding_completed: boolean
          post_workout_feedback_dismissed: boolean
          program_state_defaults: Json
          rounding: number
          sex: string | null
          theme_preference: string
          timezone: string | null
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
          id: string
          live_onboarding_dismissed?: boolean
          onboarding_completed?: boolean
          post_workout_feedback_dismissed?: boolean
          program_state_defaults?: Json
          rounding?: number
          sex?: string | null
          theme_preference?: string
          timezone?: string | null
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
          id?: string
          live_onboarding_dismissed?: boolean
          onboarding_completed?: boolean
          post_workout_feedback_dismissed?: boolean
          program_state_defaults?: Json
          rounding?: number
          sex?: string | null
          theme_preference?: string
          timezone?: string | null
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
            foreignKeyName: "program_accessory_additions_program_owner_fkey"
            columns: ["program_instance_id", "user_id"]
            isOneToOne: false
            referencedRelation: "program_instances"
            referencedColumns: ["id", "user_id"]
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
      program_equipment_mode_choices: {
        Row: {
          created_at: string
          equipment_mode: string
          id: string
          phase_key: string
          policy_rule_id: string
          program_instance_id: string
          replacement_movement_id: string
          role: string
          slot_id: string
          source_movement_id: string
          template_session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          equipment_mode: string
          id?: string
          phase_key: string
          policy_rule_id: string
          program_instance_id: string
          replacement_movement_id: string
          role: string
          slot_id: string
          source_movement_id: string
          template_session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          equipment_mode?: string
          id?: string
          phase_key?: string
          policy_rule_id?: string
          program_instance_id?: string
          replacement_movement_id?: string
          role?: string
          slot_id?: string
          source_movement_id?: string
          template_session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_equipment_mode_choices_program_instance_id_fkey"
            columns: ["program_instance_id"]
            isOneToOne: false
            referencedRelation: "program_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_equipment_mode_choices_program_owner_fkey"
            columns: ["program_instance_id", "user_id"]
            isOneToOne: false
            referencedRelation: "program_instances"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "program_equipment_mode_choices_replacement_movement_id_fkey"
            columns: ["replacement_movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_equipment_mode_choices_source_movement_id_fkey"
            columns: ["source_movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_equipment_mode_choices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      program_instances: {
        Row: {
          client_mutation_id: string | null
          created_at: string
          current_block_id: string | null
          current_week_index: number
          customization_status: string
          customization_summary: Json
          equipment_mode: string
          free_weight_choices_hash: string | null
          free_weight_policy_version_id: string | null
          id: string
          rounding: number
          start_date: string
          state_version: number
          status: string
          template_id: string
          template_version_id: string
          title: string
          units: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_mutation_id?: string | null
          created_at?: string
          current_block_id?: string | null
          current_week_index?: number
          customization_status?: string
          customization_summary?: Json
          equipment_mode?: string
          free_weight_choices_hash?: string | null
          free_weight_policy_version_id?: string | null
          id?: string
          rounding: number
          start_date?: string
          state_version?: number
          status?: string
          template_id: string
          template_version_id: string
          title: string
          units: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_mutation_id?: string | null
          created_at?: string
          current_block_id?: string | null
          current_week_index?: number
          customization_status?: string
          customization_summary?: Json
          equipment_mode?: string
          free_weight_choices_hash?: string | null
          free_weight_policy_version_id?: string | null
          id?: string
          rounding?: number
          start_date?: string
          state_version?: number
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
            foreignKeyName: "program_instances_free_weight_policy_version_id_fkey"
            columns: ["free_weight_policy_version_id"]
            isOneToOne: false
            referencedRelation: "equipment_mode_policy_versions"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "program_instances_template_version_matches_template_fkey"
            columns: ["template_version_id", "template_id"]
            isOneToOne: false
            referencedRelation: "program_template_versions"
            referencedColumns: ["id", "template_id"]
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
            foreignKeyName: "program_movement_overrides_program_owner_fkey"
            columns: ["program_instance_id", "user_id"]
            isOneToOne: false
            referencedRelation: "program_instances"
            referencedColumns: ["id", "user_id"]
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
            foreignKeyName: "program_movement_overrides_source_exercise_owner_fkey"
            columns: ["source_exercise_log_id", "user_id"]
            isOneToOne: false
            referencedRelation: "exercise_logs"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "program_movement_overrides_source_session_id_fkey"
            columns: ["source_session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_movement_overrides_source_session_owner_fkey"
            columns: ["source_session_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id", "user_id"]
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
            foreignKeyName: "program_state_values_program_owner_fkey"
            columns: ["program_instance_id", "user_id"]
            isOneToOne: false
            referencedRelation: "program_instances"
            referencedColumns: ["id", "user_id"]
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
          definition_checksum: string | null
          id: string
          template_id: string
          version: string
        }
        Insert: {
          created_at?: string
          definition: Json
          definition_checksum?: string | null
          id?: string
          template_id: string
          version: string
        }
        Update: {
          created_at?: string
          definition?: Json
          definition_checksum?: string | null
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
          resolution_request_id: string | null
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
          resolution_request_id?: string | null
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
          resolution_request_id?: string | null
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
            foreignKeyName: "progression_decisions_program_owner_fkey"
            columns: ["program_instance_id", "user_id"]
            isOneToOne: false
            referencedRelation: "program_instances"
            referencedColumns: ["id", "user_id"]
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
      session_mutation_receipts: {
        Row: {
          created_at: string
          mutation_kind: string
          payload_hash: string
          request_id: string
          resulting_state_version: number
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          mutation_kind: string
          payload_hash: string
          request_id: string
          resulting_state_version: number
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          mutation_kind?: string
          payload_hash?: string
          request_id?: string
          resulting_state_version?: number
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_mutation_receipts_session_id_user_id_fkey"
            columns: ["session_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "session_mutation_receipts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_program_change_journal: {
        Row: {
          before_row: Json | null
          created_at: string
          entity_id: string
          entity_key: string
          entity_type: string
          id: string
          program_instance_id: string
          session_id: string
          user_id: string
        }
        Insert: {
          before_row?: Json | null
          created_at?: string
          entity_id: string
          entity_key: string
          entity_type: string
          id?: string
          program_instance_id: string
          session_id: string
          user_id: string
        }
        Update: {
          before_row?: Json | null
          created_at?: string
          entity_id?: string
          entity_key?: string
          entity_type?: string
          id?: string
          program_instance_id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_program_change_journal_program_instance_id_fkey"
            columns: ["program_instance_id"]
            isOneToOne: false
            referencedRelation: "program_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_program_change_journal_program_owner_fkey"
            columns: ["program_instance_id", "user_id"]
            isOneToOne: false
            referencedRelation: "program_instances"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "session_program_change_journal_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_program_change_journal_session_owner_fkey"
            columns: ["session_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "session_program_change_journal_user_id_fkey"
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
            foreignKeyName: "set_logs_exercise_owner_fkey"
            columns: ["exercise_log_id", "user_id"]
            isOneToOne: false
            referencedRelation: "exercise_logs"
            referencedColumns: ["id", "user_id"]
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
            foreignKeyName: "substitution_logs_session_owner_fkey"
            columns: ["session_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id", "user_id"]
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
          discard_journal_version: number | null
          finish_payload_hash: string | null
          finish_request_id: string | null
          id: string
          is_favorite: boolean
          notes: string | null
          planned_session_id: string | null
          prescription_snapshot: Json
          program_instance_id: string | null
          prs: Json | null
          reflection_improve: string | null
          return_recommendations: Json | null
          reflection_win: string | null
          scheduled_date: string
          session_rpe: number | null
          source_session_id: string | null
          started_at: string | null
          state_version: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_mutation_id?: string | null
          completed_at?: string | null
          created_at?: string
          discard_journal_version?: number | null
          finish_payload_hash?: string | null
          finish_request_id?: string | null
          id?: string
          is_favorite?: boolean
          notes?: string | null
          planned_session_id?: string | null
          prescription_snapshot: Json
          program_instance_id?: string | null
          prs?: Json | null
          reflection_improve?: string | null
          return_recommendations?: Json | null
          reflection_win?: string | null
          scheduled_date?: string
          session_rpe?: number | null
          source_session_id?: string | null
          started_at?: string | null
          state_version?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_mutation_id?: string | null
          completed_at?: string | null
          created_at?: string
          discard_journal_version?: number | null
          finish_payload_hash?: string | null
          finish_request_id?: string | null
          id?: string
          is_favorite?: boolean
          notes?: string | null
          planned_session_id?: string | null
          prescription_snapshot?: Json
          program_instance_id?: string | null
          prs?: Json | null
          reflection_improve?: string | null
          return_recommendations?: Json | null
          reflection_win?: string | null
          scheduled_date?: string
          session_rpe?: number | null
          source_session_id?: string | null
          started_at?: string | null
          state_version?: number
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
            foreignKeyName: "workout_sessions_program_owner_fkey"
            columns: ["program_instance_id", "user_id"]
            isOneToOne: false
            referencedRelation: "program_instances"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "workout_sessions_source_owner_fkey"
            columns: ["source_session_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id", "user_id"]
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
      finish_session_v3: {
        Args: {
          p_decisions: Json
          p_expected_program_version: number | null
          p_expected_session_version: number
          p_notes: string | null
          p_prs: Json
          p_reflection_improve: string | null
          p_reflection_win: string | null
          p_request_id: string
          p_session_id: string
          p_session_rpe: number | null
        }
        Returns: string
      }
      start_session_v3: {
        Args: {
          p_client_mutation_id: string
          p_expected_program_version: number
          p_planned_session_id: string
          p_prescription_snapshot: Json
          p_program_instance_id: string
          p_scheduled_date: string
          p_source_session_id?: string | null
        }
        Returns: string
      }
      change_program_return_v1: {
        Args: {
          p_action: string
          p_changes: Json
          p_expected_version: number
          p_pending_decision_ids: string[]
          p_program_id: string
          p_request_id: string
          p_settings: Json
        }
        Returns: Json
      }
      add_ad_hoc_exercise_v2: {
        Args: {
          p_exercise: Json
          p_expected_state_version: number
          p_intent: Json
          p_next_snapshot: Json
          p_request_id: string
          p_session_id: string
          p_sets: Json
        }
        Returns: Json
      }
      add_session_accessory_v2: {
        Args: {
          p_exercise: Json
          p_expected_state_version: number
          p_future_addition: Json | null
          p_intent: Json
          p_next_snapshot: Json
          p_request_id: string
          p_session_id: string
          p_sets: Json
        }
        Returns: Json
      }
      add_session_set_v2: {
        Args: {
          p_exercise_log_id: string
          p_expected_state_version: number
          p_intent: Json
          p_next_snapshot: Json
          p_request_id: string
          p_session_id: string
          p_set: Json
        }
        Returns: Json
      }
      advance_program_position_v2: {
        Args: {
          p_current_week_index: number
          p_expected_state_version: number
          p_program_id: string
        }
        Returns: Json
      }
      claim_session_mutation_v2: {
        Args: {
          p_expected_state_version: number
          p_mutation_kind: string
          p_payload_hash: string
          p_request_id: string
          p_session_id: string
        }
        Returns: number
      }
      complete_session_mutation_v2: {
        Args: {
          p_expected_state_version: number
          p_mutation_kind: string
          p_next_snapshot?: Json
          p_payload_hash: string
          p_request_id: string
          p_session_id: string
        }
        Returns: Json
      }
      create_custom_program_template_v2: {
        Args: { p_definition: Json; p_template: Json }
        Returns: string
      }
      delete_own_account: {
        Args: { p_confirmation: string }
        Returns: undefined
      }
      derive_previous_comparable_v2: {
        Args: {
          p_performed_movement_id: string
          p_planned_movement_id: string
          p_role: string
          p_slot_id: string
          p_target_scheduled_date: string
          p_target_snapshot: Json
          p_user_id: string
        }
        Returns: Json
      }
      discard_workout_session: {
        Args: { p_session_id: string }
        Returns: string
      }
      discard_workout_session_unsafe_internal: {
        Args: { p_session_id: string }
        Returns: string
      }
      finish_session_v2: {
        Args: {
          p_decisions: Json
          p_expected_program_version: number | null
          p_expected_session_version: number
          p_notes: string | null
          p_prs: Json
          p_reflection_improve: string | null
          p_reflection_win: string | null
          p_request_id: string
          p_session_id: string
          p_session_rpe: number | null
        }
        Returns: string
      }
      is_email_allowed: { Args: { check_email: string }; Returns: boolean }
      insert_program_equipment_mode_choices_v1: {
        Args: {
          p_choices: Json
          p_program_instance_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      normalize_free_weight_choices_v1: {
        Args: {
          p_choices: Json
          p_policy_checksum: string
          p_policy_version_id: string
        }
        Returns: Json
      }
      refresh_program_customization_summary: {
        Args: { p_program_instance_id: string; p_user_id: string }
        Returns: undefined
      }
      resolve_program_equipment_source_v1: {
        Args: {
          p_include_future: boolean
          p_phase_key: string
          p_program_instance_id: string
          p_role: string
          p_slot_id: string
          p_template_session_id: string
        }
        Returns: string
      }
      remove_ad_hoc_exercise_v2: {
        Args: {
          p_exercise_log_id: string
          p_exercise_orders: Json
          p_expected_state_version: number
          p_intent: Json
          p_next_snapshot: Json
          p_request_id: string
          p_session_id: string
        }
        Returns: Json
      }
      remove_session_accessory_v2: {
        Args: {
          p_exercise_log_id: string
          p_exercise_orders: Json
          p_expected_state_version: number
          p_future_addition_id: string | null
          p_future_remaining_ids: string[] | null
          p_intent: Json
          p_next_snapshot: Json
          p_request_id: string
          p_session_id: string
        }
        Returns: Json
      }
      rename_session_v2: {
        Args: {
          p_expected_state_version: number
          p_request_id: string
          p_session_id: string
          p_title: string
        }
        Returns: Json
      }
      reorder_session_accessories_v2: {
        Args: {
          p_exercise_orders: Json
          p_expected_state_version: number
          p_future_addition_ids: string[] | null
          p_future_order_indexes: number[] | null
          p_intent: Json
          p_next_snapshot: Json
          p_request_id: string
          p_session_id: string
        }
        Returns: Json
      }
      resolve_progression_decisions_v2: {
        Args: {
          p_action: string
          p_decision_ids: string[]
          p_request_id: string
        }
        Returns: number
      }
      session_insert_program_accessory_addition: {
        Args: {
          p_effective_from_week_index: number
          p_movement_id: string
          p_note: string | null
          p_phase_key: string
          p_prescription_id: string
          p_progression_method: string
          p_session_id: string
          p_sets: Json
          p_slot_id: string
          p_target_summary: string | null
          p_template_session_id: string
        }
        Returns: string
      }
      session_remove_program_accessory_addition: {
        Args: {
          p_addition_id: string
          p_remaining_ids: string[]
          p_session_id: string
        }
        Returns: undefined
      }
      session_reorder_program_accessory_additions: {
        Args: {
          p_addition_ids: string[]
          p_order_indexes: number[]
          p_session_id: string
        }
        Returns: undefined
      }
      session_set_program_movement_override: {
        Args: {
          p_original_movement_id: string
          p_phase_key: string
          p_replacement_movement_id: string
          p_restore_default: boolean
          p_role: string
          p_session_id: string
          p_slot_id: string
          p_source_exercise_log_id: string
        }
        Returns: undefined
      }
      set_session_favorite_v2: {
        Args: {
          p_favorite: boolean
          p_session_id: string
          p_title: string | null
        }
        Returns: string
      }
      set_program_equipment_mode_v1: {
        Args: {
          p_expected_state_version: number
          p_free_weight_choices: Json | null
          p_free_weight_policy_checksum: string | null
          p_free_weight_policy_version_id: string | null
          p_program_id: string
          p_target_mode: string
        }
        Returns: Json
      }
      start_ad_hoc_session_v2: {
        Args: {
          p_client_mutation_id: string
          p_prescription_snapshot: Json
          p_scheduled_date: string
          p_source_session_id?: string | null
        }
        Returns: string
      }
      start_program_v2: {
        Args: {
          p_accessory_additions: Json
          p_current_block_id: string | null
          p_definition_checksum: string
          p_movement_overrides: Json
          p_replace_active: boolean
          p_request_id: string
          p_rounding: number
          p_start_date: string
          p_state_values: Json
          p_template_id: string
          p_template_version_id: string
          p_title: string
          p_units: string
        }
        Returns: string
      }
      start_program_v3: {
        Args: {
          p_accessory_additions: Json
          p_current_block_id: string | null
          p_definition_checksum: string
          p_equipment_mode: string
          p_free_weight_choices: Json
          p_free_weight_policy_checksum: string | null
          p_free_weight_policy_version_id: string | null
          p_movement_overrides: Json
          p_replace_active: boolean
          p_request_id: string
          p_rounding: number
          p_start_date: string
          p_state_values: Json
          p_template_id: string
          p_template_version_id: string
          p_title: string
          p_units: string
        }
        Returns: string
      }
      start_session_v2: {
        Args: {
          p_client_mutation_id: string
          p_expected_program_version: number
          p_planned_session_id: string
          p_prescription_snapshot: Json
          p_program_instance_id: string
          p_scheduled_date: string
          p_source_session_id?: string | null
        }
        Returns: string
      }
      substitute_session_movement_v2: {
        Args: {
          p_exercise_log_id: string
          p_expected_state_version: number
          p_intent: Json
          p_note: string | null
          p_performed_movement_id: string
          p_phase_key: string
          p_previous?: Json | null
          p_reason: string
          p_request_id: string
          p_scope: string
          p_session_id: string
        }
        Returns: Json
      }
      upsert_session_set_v2: {
        Args: {
          p_actual_load: number | null
          p_actual_reps: number | null
          p_actual_rir: number | null
          p_actual_rpe: number | null
          p_client_mutation_id: string | null
          p_completed: boolean
          p_exercise_log_id: string
          p_expected_state_version: number
          p_note: string | null
          p_session_id: string
          p_set_index: number
        }
        Returns: Json
      }
      validate_previous_comparable_v2: {
        Args: { p_performed_movement_id: string; p_previous: Json }
        Returns: undefined
      }
      validate_program_equipment_snapshot_v1: {
        Args: { p_program_instance_id: string; p_snapshot: Json }
        Returns: undefined
      }
      validate_free_weight_choice_completeness_v1: {
        Args: { p_choices: Json; p_program_instance_id: string }
        Returns: undefined
      }
      validate_session_sets_v2: { Args: { p_sets: Json }; Returns: undefined }
      validate_session_snapshot_v2: {
        Args: { p_snapshot: Json }
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
