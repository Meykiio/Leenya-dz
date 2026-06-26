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
      bookings: {
        Row: {
          booking_token: string | null
          business_id: string
          client_id: string | null
          client_name: string
          client_phone: string
          created_at: string | null
          date: string
          end_time: string
          id: string
          notes: string | null
          reminder_sent: boolean | null
          service_id: string | null
          staff_member_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["booking_status"] | null
        }
        Insert: {
          booking_token?: string | null
          business_id: string
          client_id?: string | null
          client_name: string
          client_phone: string
          created_at?: string | null
          date: string
          end_time: string
          id?: string
          notes?: string | null
          reminder_sent?: boolean | null
          service_id?: string | null
          staff_member_id?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"] | null
        }
        Update: {
          booking_token?: string | null
          business_id?: string
          client_id?: string | null
          client_name?: string
          client_phone?: string
          created_at?: string | null
          date?: string
          end_time?: string
          id?: string
          notes?: string | null
          reminder_sent?: boolean | null
          service_id?: string | null
          staff_member_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          business_id: string
          closes_at: string | null
          day_of_week: number
          id: string
          is_closed: boolean | null
          opens_at: string | null
        }
        Insert: {
          business_id: string
          closes_at?: string | null
          day_of_week: number
          id?: string
          is_closed?: boolean | null
          opens_at?: string | null
        }
        Update: {
          business_id?: string
          closes_at?: string | null
          day_of_week?: number
          id?: string
          is_closed?: boolean | null
          opens_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          accepts_appointments: boolean | null
          accepts_walkins: boolean | null
          address: string | null
          advance_booking_days: number | null
          category: Database["public"]["Enums"]["business_category"] | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          slug: string
          wilaya_code: string | null
          wilaya_name: string | null
        }
        Insert: {
          accepts_appointments?: boolean | null
          accepts_walkins?: boolean | null
          address?: string | null
          advance_booking_days?: number | null
          category?: Database["public"]["Enums"]["business_category"] | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          slug: string
          wilaya_code?: string | null
          wilaya_name?: string | null
        }
        Update: {
          accepts_appointments?: boolean | null
          accepts_walkins?: boolean | null
          address?: string | null
          advance_booking_days?: number | null
          category?: Database["public"]["Enums"]["business_category"] | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          slug?: string
          wilaya_code?: string | null
          wilaya_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          phone: string | null
          preferred_lang: string | null
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          preferred_lang?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          preferred_lang?: string | null
        }
        Relationships: []
      }
      queue_counters: {
        Row: {
          business_id: string
          counter_date: string | null
          id: string
          last_number: number | null
        }
        Insert: {
          business_id: string
          counter_date?: string | null
          id?: string
          last_number?: number | null
        }
        Update: {
          business_id?: string
          counter_date?: string | null
          id?: string
          last_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "queue_counters_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_tickets: {
        Row: {
          business_id: string
          called_at: string | null
          client_id: string | null
          client_name: string
          client_phone: string
          completed_at: string | null
          created_at: string | null
          estimated_wait_minutes: number | null
          id: string
          position_in_queue: number | null
          queue_date: string
          service_id: string | null
          staff_member_id: string | null
          status: Database["public"]["Enums"]["queue_status"] | null
          ticket_label: string
          ticket_number: number
        }
        Insert: {
          business_id: string
          called_at?: string | null
          client_id?: string | null
          client_name: string
          client_phone: string
          completed_at?: string | null
          created_at?: string | null
          estimated_wait_minutes?: number | null
          id?: string
          position_in_queue?: number | null
          queue_date?: string
          service_id?: string | null
          staff_member_id?: string | null
          status?: Database["public"]["Enums"]["queue_status"] | null
          ticket_label: string
          ticket_number: number
        }
        Update: {
          business_id?: string
          called_at?: string | null
          client_id?: string | null
          client_name?: string
          client_phone?: string
          completed_at?: string | null
          created_at?: string | null
          estimated_wait_minutes?: number | null
          id?: string
          position_in_queue?: number | null
          queue_date?: string
          service_id?: string | null
          staff_member_id?: string | null
          status?: Database["public"]["Enums"]["queue_status"] | null
          ticket_label?: string
          ticket_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "queue_tickets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_tickets_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_tickets_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string | null
          business_id: string
          client_id: string
          comment: string | null
          created_at: string | null
          id: string
          rating: number
        }
        Insert: {
          booking_id?: string | null
          business_id: string
          client_id: string
          comment?: string | null
          created_at?: string | null
          id?: string
          rating: number
        }
        Update: {
          booking_id?: string | null
          business_id?: string
          client_id?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          business_id: string
          description: string | null
          display_order: number | null
          duration_minutes: number
          id: string
          is_active: boolean | null
          name: string
          name_ar: string | null
          price_dzd: number | null
        }
        Insert: {
          business_id: string
          description?: string | null
          display_order?: number | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          name: string
          name_ar?: string | null
          price_dzd?: number | null
        }
        Update: {
          business_id?: string
          description?: string | null
          display_order?: number | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string | null
          price_dzd?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          accepts_bookings: boolean | null
          business_id: string
          display_name: string
          id: string
          is_active: boolean | null
          profile_id: string | null
        }
        Insert: {
          accepts_bookings?: boolean | null
          business_id: string
          display_name: string
          id?: string
          is_active?: boolean | null
          profile_id?: string | null
        }
        Update: {
          accepts_bookings?: boolean | null
          business_id?: string
          display_name?: string
          id?: string
          is_active?: boolean | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      booking_availability: {
        Row: {
          business_id: string | null
          date: string | null
          end_time: string | null
          staff_member_id: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
        }
        Insert: {
          business_id?: string | null
          date?: string | null
          end_time?: string | null
          staff_member_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
        }
        Update: {
          business_id?: string | null
          date?: string | null
          end_time?: string | null
          staff_member_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      generate_ticket_number: {
        Args: { p_business_id: string }
        Returns: {
          ticket_lbl: string
          ticket_num: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "staff" | "client"
      booking_status:
        | "pending"
        | "confirmed"
        | "arrived"
        | "in_service"
        | "completed"
        | "cancelled"
        | "no_show"
      business_category:
        | "beauty_salon"
        | "barbershop"
        | "clinic"
        | "dental"
        | "physiotherapy"
        | "veterinary"
        | "other"
      queue_status:
        | "waiting"
        | "called"
        | "in_service"
        | "completed"
        | "cancelled"
        | "no_show"
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
    Enums: {
      app_role: ["owner", "staff", "client"],
      booking_status: [
        "pending",
        "confirmed",
        "arrived",
        "in_service",
        "completed",
        "cancelled",
        "no_show",
      ],
      business_category: [
        "beauty_salon",
        "barbershop",
        "clinic",
        "dental",
        "physiotherapy",
        "veterinary",
        "other",
      ],
      queue_status: [
        "waiting",
        "called",
        "in_service",
        "completed",
        "cancelled",
        "no_show",
      ],
    },
  },
} as const
