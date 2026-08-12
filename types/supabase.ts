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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      oc_ai_conversations: {
        Row: {
          action_result: Json | null
          action_taken: string | null
          ai_audio_url: string | null
          ai_response: string
          created_at: string | null
          entities: Json | null
          id: string
          intent: string | null
          session_id: string | null
          turn_number: number | null
          user_audio_url: string | null
          user_id: string
          user_input: string
        }
        Insert: {
          action_result?: Json | null
          action_taken?: string | null
          ai_audio_url?: string | null
          ai_response: string
          created_at?: string | null
          entities?: Json | null
          id?: string
          intent?: string | null
          session_id?: string | null
          turn_number?: number | null
          user_audio_url?: string | null
          user_id: string
          user_input: string
        }
        Update: {
          action_result?: Json | null
          action_taken?: string | null
          ai_audio_url?: string | null
          ai_response?: string
          created_at?: string | null
          entities?: Json | null
          id?: string
          intent?: string | null
          session_id?: string | null
          turn_number?: number | null
          user_audio_url?: string | null
          user_id?: string
          user_input?: string
        }
        Relationships: [
          {
            foreignKeyName: "oc_ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "oc_users"
            referencedColumns: ["id"]
          },
        ]
      }
      oc_ai_murmurs: {
        Row: {
          created_at: string
          elder_id: string
          id: string
          share_status: string
          shared_at: string | null
          shared_message_ids: string[]
          source_text: string
          summary: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          elder_id: string
          id?: string
          share_status?: string
          shared_at?: string | null
          shared_message_ids?: string[]
          source_text: string
          summary: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          elder_id?: string
          id?: string
          share_status?: string
          shared_at?: string | null
          shared_message_ids?: string[]
          source_text?: string
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "oc_ai_murmurs_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: false
            referencedRelation: "oc_users"
            referencedColumns: ["id"]
          },
        ]
      }
      oc_auth_challenges: {
        Row: {
          activated_at: string | null
          attempt_count: number
          challenge_kind: string
          created_at: string
          expires_at: string
          lookup_key: string
          reserved_at: string | null
          secret_digest: string
          state: string
          updated_at: string
          version: string
        }
        Insert: {
          activated_at?: string | null
          attempt_count?: number
          challenge_kind: string
          created_at?: string
          expires_at: string
          lookup_key: string
          reserved_at?: string | null
          secret_digest: string
          state: string
          updated_at?: string
          version?: string
        }
        Update: {
          activated_at?: string | null
          attempt_count?: number
          challenge_kind?: string
          created_at?: string
          expires_at?: string
          lookup_key?: string
          reserved_at?: string | null
          secret_digest?: string
          state?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      oc_broadcast_play_history: {
        Row: {
          broadcast_id: string
          completed: boolean | null
          created_at: string | null
          id: string
          liked: boolean | null
          play_duration: number | null
          played_at: string | null
          user_id: string
        }
        Insert: {
          broadcast_id: string
          completed?: boolean | null
          created_at?: string | null
          id?: string
          liked?: boolean | null
          play_duration?: number | null
          played_at?: string | null
          user_id: string
        }
        Update: {
          broadcast_id?: string
          completed?: boolean | null
          created_at?: string | null
          id?: string
          liked?: boolean | null
          play_duration?: number | null
          played_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oc_broadcast_play_history_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "oc_health_broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oc_broadcast_play_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "oc_users"
            referencedColumns: ["id"]
          },
        ]
      }
      oc_elder_care_messages: {
        Row: {
          audio_duration: number | null
          audio_url: string | null
          category: string
          content: string | null
          created_at: string | null
          id: string
          is_ai_generated: boolean | null
          is_read: boolean | null
          read_at: string | null
          receiver_id: string
          sender_id: string
          type: string
        }
        Insert: {
          audio_duration?: number | null
          audio_url?: string | null
          category?: string
          content?: string | null
          created_at?: string | null
          id?: string
          is_ai_generated?: boolean | null
          is_read?: boolean | null
          read_at?: string | null
          receiver_id: string
          sender_id: string
          type: string
        }
        Update: {
          audio_duration?: number | null
          audio_url?: string | null
          category?: string
          content?: string | null
          created_at?: string | null
          id?: string
          is_ai_generated?: boolean | null
          is_read?: boolean | null
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "oc_elder_care_messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "oc_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oc_elder_care_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "oc_users"
            referencedColumns: ["id"]
          },
        ]
      }
      oc_elder_family_binds: {
        Row: {
          bind_code: string | null
          bound_at: string | null
          can_edit_health: boolean
          can_edit_medication: boolean | null
          can_receive_emergency: boolean | null
          can_view_health: boolean | null
          created_at: string | null
          elder_id: string
          expires_at: string | null
          family_id: string | null
          id: string
          relation: string | null
          status: string | null
        }
        Insert: {
          bind_code?: string | null
          bound_at?: string | null
          can_edit_health?: boolean
          can_edit_medication?: boolean | null
          can_receive_emergency?: boolean | null
          can_view_health?: boolean | null
          created_at?: string | null
          elder_id: string
          expires_at?: string | null
          family_id?: string | null
          id?: string
          relation?: string | null
          status?: string | null
        }
        Update: {
          bind_code?: string | null
          bound_at?: string | null
          can_edit_health?: boolean
          can_edit_medication?: boolean | null
          can_receive_emergency?: boolean | null
          can_view_health?: boolean | null
          created_at?: string | null
          elder_id?: string
          expires_at?: string | null
          family_id?: string | null
          id?: string
          relation?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oc_elder_family_binds_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: false
            referencedRelation: "oc_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oc_elder_family_binds_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "oc_users"
            referencedColumns: ["id"]
          },
        ]
      }
      oc_family_bind_attempt_limits: {
        Row: {
          attempt_count: number
          blocked_until: string | null
          family_id: string
          updated_at: string
          window_started_at: string
        }
        Insert: {
          attempt_count?: number
          blocked_until?: string | null
          family_id: string
          updated_at?: string
          window_started_at?: string
        }
        Update: {
          attempt_count?: number
          blocked_until?: string | null
          family_id?: string
          updated_at?: string
          window_started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "oc_family_bind_attempt_limits_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: true
            referencedRelation: "oc_users"
            referencedColumns: ["id"]
          },
        ]
      }
      oc_emergency_calls: {
        Row: {
          answered_at: string | null
          called_contacts: Json | null
          called_numbers: string[] | null
          cancel_reason: string | null
          cancelled_by: string | null
          created_at: string | null
          ended_at: string | null
          id: string
          location: Json | null
          notification_sent_at: string | null
          notified_families: string[] | null
          recording_duration: number | null
          recording_url: string | null
          request_id: string | null
          status: string | null
          trigger_method: string
          triggered_at: string | null
          user_id: string
        }
        Insert: {
          answered_at?: string | null
          called_contacts?: Json | null
          called_numbers?: string[] | null
          cancel_reason?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          ended_at?: string | null
          id?: string
          location?: Json | null
          notification_sent_at?: string | null
          notified_families?: string[] | null
          recording_duration?: number | null
          recording_url?: string | null
          request_id?: string | null
          status?: string | null
          trigger_method: string
          triggered_at?: string | null
          user_id: string
        }
        Update: {
          answered_at?: string | null
          called_contacts?: Json | null
          called_numbers?: string[] | null
          cancel_reason?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          ended_at?: string | null
          id?: string
          location?: Json | null
          notification_sent_at?: string | null
          notified_families?: string[] | null
          recording_duration?: number | null
          recording_url?: string | null
          request_id?: string | null
          status?: string | null
          trigger_method?: string
          triggered_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oc_emergency_calls_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "oc_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oc_emergency_calls_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "oc_users"
            referencedColumns: ["id"]
          },
        ]
      }
      oc_health_broadcasts: {
        Row: {
          ai_prompt: string | null
          audio_duration: number | null
          audio_url: string | null
          category: string
          content: string
          created_at: string | null
          generated_by: string | null
          id: string
          is_published: boolean | null
          play_count: number | null
          target_age_max: number | null
          target_age_min: number | null
          target_diseases: string[] | null
          target_season: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          ai_prompt?: string | null
          audio_duration?: number | null
          audio_url?: string | null
          category: string
          content: string
          created_at?: string | null
          generated_by?: string | null
          id?: string
          is_published?: boolean | null
          play_count?: number | null
          target_age_max?: number | null
          target_age_min?: number | null
          target_diseases?: string[] | null
          target_season?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          ai_prompt?: string | null
          audio_duration?: number | null
          audio_url?: string | null
          category?: string
          content?: string
          created_at?: string | null
          generated_by?: string | null
          id?: string
          is_published?: boolean | null
          play_count?: number | null
          target_age_max?: number | null
          target_age_min?: number | null
          target_diseases?: string[] | null
          target_season?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      oc_health_records: {
        Row: {
          abnormal_reason: string | null
          created_at: string | null
          id: string
          input_method: string | null
          is_abnormal: boolean | null
          measured_at: string
          notes: string | null
          record_type: string
          recorded_by: string | null
          symptoms: string | null
          user_id: string
          values: Json
        }
        Insert: {
          abnormal_reason?: string | null
          created_at?: string | null
          id?: string
          input_method?: string | null
          is_abnormal?: boolean | null
          measured_at?: string
          notes?: string | null
          record_type: string
          recorded_by?: string | null
          symptoms?: string | null
          user_id: string
          values: Json
        }
        Update: {
          abnormal_reason?: string | null
          created_at?: string | null
          id?: string
          input_method?: string | null
          is_abnormal?: boolean | null
          measured_at?: string
          notes?: string | null
          record_type?: string
          recorded_by?: string | null
          symptoms?: string | null
          user_id?: string
          values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "oc_health_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "oc_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oc_health_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "oc_users"
            referencedColumns: ["id"]
          },
        ]
      }
      oc_medication_plans: {
        Row: {
          created_at: string | null
          created_by: string | null
          dosage: string
          end_date: string | null
          id: string
          is_active: boolean | null
          medicine_name: string
          notes: string | null
          remind_before_minutes: number | null
          remind_enabled: boolean | null
          repeat_days: number[] | null
          schedule_times: string[]
          side_effects: string | null
          start_date: string
          unit: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          dosage: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          medicine_name: string
          notes?: string | null
          remind_before_minutes?: number | null
          remind_enabled?: boolean | null
          repeat_days?: number[] | null
          schedule_times: string[]
          side_effects?: string | null
          start_date: string
          unit?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          dosage?: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          medicine_name?: string
          notes?: string | null
          remind_before_minutes?: number | null
          remind_enabled?: boolean | null
          repeat_days?: number[] | null
          schedule_times?: string[]
          side_effects?: string | null
          start_date?: string
          unit?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oc_medication_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "oc_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oc_medication_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "oc_users"
            referencedColumns: ["id"]
          },
        ]
      }
      oc_medication_records: {
        Row: {
          confirmed_by: string | null
          created_at: string | null
          delayed_count: number | null
          id: string
          notes: string | null
          plan_id: string
          scheduled_time: string
          status: string | null
          taken_at: string | null
          user_id: string
        }
        Insert: {
          confirmed_by?: string | null
          created_at?: string | null
          delayed_count?: number | null
          id?: string
          notes?: string | null
          plan_id: string
          scheduled_time: string
          status?: string | null
          taken_at?: string | null
          user_id: string
        }
        Update: {
          confirmed_by?: string | null
          created_at?: string | null
          delayed_count?: number | null
          id?: string
          notes?: string | null
          plan_id?: string
          scheduled_time?: string
          status?: string | null
          taken_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oc_medication_records_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "oc_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oc_medication_records_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "oc_medication_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oc_medication_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "oc_users"
            referencedColumns: ["id"]
          },
        ]
      }
      oc_users: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          chronic_diseases: string[] | null
          created_at: string | null
          email: string | null
          font_size: string | null
          gender: string | null
          id: string
          last_active_at: string | null
          name: string
          phone: string | null
          role: string
          updated_at: string | null
          voice_speed: number | null
          wake_word: string | null
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          chronic_diseases?: string[] | null
          created_at?: string | null
          email?: string | null
          font_size?: string | null
          gender?: string | null
          id?: string
          last_active_at?: string | null
          name: string
          phone?: string | null
          role: string
          updated_at?: string | null
          voice_speed?: number | null
          wake_word?: string | null
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          chronic_diseases?: string[] | null
          created_at?: string | null
          email?: string | null
          font_size?: string | null
          gender?: string | null
          id?: string
          last_active_at?: string | null
          name?: string
          phone?: string | null
          role?: string
          updated_at?: string | null
          voice_speed?: number | null
          wake_word?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      oc_get_message_overview: {
        Args: {
          p_user_id: string
        }
        Returns: Json
      }
      oc_share_ai_murmur: {
        Args: {
          p_elder_id: string
          p_murmur_id: string
          p_summary: string
        }
        Returns: string[]
      }
      oc_trigger_emergency: {
        Args: {
          p_elder_id: string
          p_location: Json | null
          p_request_id: string
          p_trigger_method: string
        }
        Returns: Json
      }
      oc_get_care_dashboard_snapshot: {
        Args: {
          p_end: string
          p_include_health: boolean
          p_include_medication: boolean
          p_start: string
          p_user_id: string
        }
        Returns: Json
      }
      oc_create_family_bind_code: {
        Args: {
          p_bind_code: string
          p_elder_id: string
          p_expires_at: string
        }
        Returns: string
      }
      oc_auth_challenge_activate_otp: {
        Args: {
          p_lookup_key: string
          p_version: string
        }
        Returns: boolean
      }
      oc_auth_challenge_consume_captcha: {
        Args: {
          p_lookup_key: string
          p_secret_digest: string
        }
        Returns: string
      }
      oc_auth_challenge_consume_otp: {
        Args: {
          p_lookup_key: string
          p_max_attempts: number
          p_secret_digest: string
        }
        Returns: string
      }
      oc_auth_challenge_put_captcha: {
        Args: {
          p_lookup_key: string
          p_secret_digest: string
          p_ttl_seconds: number
        }
        Returns: undefined
      }
      oc_auth_challenge_reserve_otp: {
        Args: {
          p_lookup_key: string
          p_rate_limit_seconds: number
          p_secret_digest: string
          p_ttl_seconds: number
        }
        Returns: Json
      }
      oc_auth_challenge_rollback_otp: {
        Args: {
          p_lookup_key: string
          p_version: string
        }
        Returns: boolean
      }
      oc_reserve_family_bind_attempt: {
        Args: {
          p_family_id: string
          p_lock_seconds: number
          p_max_attempts: number
          p_window_seconds: number
        }
        Returns: Json
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
