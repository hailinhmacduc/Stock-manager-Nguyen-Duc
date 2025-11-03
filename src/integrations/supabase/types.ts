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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      error_reports: {
        Row: {
          created_at: string
          description: string
          error_type: string
          id: string
          item_serial: string | null
          reported_by: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          description: string
          error_type: string
          id?: string
          item_serial?: string | null
          reported_by: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          description?: string
          error_type?: string
          id?: string
          item_serial?: string | null
          reported_by?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "error_reports_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "error_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          condition: string
          cost: number
          id: string
          last_move_at: string | null
          location: string
          received_at: string | null
          serial_number: string
          sku_id: string
          sold_at: string | null
          status: string
          supplier: string | null
        }
        Insert: {
          condition?: string
          cost: number
          id?: string
          last_move_at?: string | null
          location: string
          received_at?: string | null
          serial_number: string
          sku_id: string
          sold_at?: string | null
          status?: string
          supplier?: string | null
        }
        Update: {
          condition?: string
          cost?: number
          id?: string
          last_move_at?: string | null
          location?: string
          received_at?: string | null
          serial_number?: string
          sku_id?: string
          sold_at?: string | null
          status?: string
          supplier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "sku_info"
            referencedColumns: ["sku_id"]
          },
        ]
      }
      sku_info: {
        Row: {
          brand: string
          created_at: string | null
          default_cost: number
          model_name: string
          sku_id: string
          spec: string
        }
        Insert: {
          brand: string
          created_at?: string | null
          default_cost: number
          model_name: string
          sku_id: string
          spec: string
        }
        Update: {
          brand?: string
          created_at?: string | null
          default_cost?: number
          model_name?: string
          sku_id?: string
          spec?: string
        }
        Relationships: []
      }
      stock_move_logs: {
        Row: {
          from_location: string
          id: string
          item_id: string
          moved_at: string | null
          moved_by: string
          serial_number: string
          to_location: string
        }
        Insert: {
          from_location: string
          id?: string
          item_id: string
          moved_at?: string | null
          moved_by: string
          serial_number: string
          to_location: string
        }
        Update: {
          from_location?: string
          id?: string
          item_id?: string
          moved_at?: string | null
          moved_by?: string
          serial_number?: string
          to_location?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_move_logs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          can_add_items: boolean | null
          can_move_items: boolean | null
          can_sell_items: boolean | null
          can_view_inventory: boolean | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          is_admin: boolean | null
          is_full_access: boolean | null
          password_hash: string
          role: string
        }
        Insert: {
          can_add_items?: boolean | null
          can_move_items?: boolean | null
          can_sell_items?: boolean | null
          can_view_inventory?: boolean | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          is_admin?: boolean | null
          is_full_access?: boolean | null
          password_hash: string
          role?: string
        }
        Update: {
          can_add_items?: boolean | null
          can_move_items?: boolean | null
          can_sell_items?: boolean | null
          can_view_inventory?: boolean | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          is_admin?: boolean | null
          is_full_access?: boolean | null
          password_hash?: string
          role?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database["public"]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
