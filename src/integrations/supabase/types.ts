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
      admin_users: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          password_hash: string
          role: string | null
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          password_hash: string
          role?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          password_hash?: string
          role?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      auto_report_histories: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      bonuses: {
        Row: {
          amount: number
          bonus_date: string
          created_at: string | null
          created_by: string | null
          id: string
          reason: string | null
          sale_id: string | null
          staff_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          bonus_date: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          reason?: string | null
          sale_id?: string | null
          staff_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          bonus_date?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          reason?: string | null
          sale_id?: string | null
          staff_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bonuses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonuses_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonuses_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_thuchi_histories: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      commission_brackets: {
        Row: {
          created_at: string | null
          id: string
          max_revenue: number | null
          min_revenue: number
          month: string
          percentage: number
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_revenue?: number | null
          min_revenue: number
          month: string
          percentage: number
          sort_order: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          max_revenue?: number | null
          min_revenue?: number
          month?: string
          percentage?: number
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      competitor_products: {
        Row: {
          competitor_id: string
          competitor_product_name: string | null
          competitor_product_url: string
          created_at: string
          current_price: number | null
          id: string
          is_available: boolean | null
          last_scraped_at: string | null
          product_id: string
          updated_at: string
        }
        Insert: {
          competitor_id: string
          competitor_product_name?: string | null
          competitor_product_url: string
          created_at?: string
          current_price?: number | null
          id?: string
          is_available?: boolean | null
          last_scraped_at?: string | null
          product_id: string
          updated_at?: string
        }
        Update: {
          competitor_id?: string
          competitor_product_name?: string | null
          competitor_product_url?: string
          created_at?: string
          current_price?: number | null
          id?: string
          is_available?: boolean | null
          last_scraped_at?: string | null
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_products_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      competitors: {
        Row: {
          category_id: string | null
          created_at: string
          display_name: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitors_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cuong7_bot_thuchi_histories: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      "dữ liệu doanh thu": {
        Row: {
          created_at: string
          "doanh thu": string | null
          id: number
        }
        Insert: {
          created_at?: string
          "doanh thu"?: string | null
          id?: number
        }
        Update: {
          created_at?: string
          "doanh thu"?: string | null
          id?: number
        }
        Relationships: []
      }
      "DỮ LIỆU SUPABASE": {
        Row: {
          created_at: string
          id: number
          "Pass/key": string | null
          Tên: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          "Pass/key"?: string | null
          Tên?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          "Pass/key"?: string | null
          Tên?: string | null
        }
        Relationships: []
      }
      "FAQ Lỗi phạt": {
        Row: {
          created_at: string
          id: number
          Lỗi: string | null
          "Số tiền phạt": number | null
        }
        Insert: {
          created_at?: string
          id?: number
          Lỗi?: string | null
          "Số tiền phạt"?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          Lỗi?: string | null
          "Số tiền phạt"?: number | null
        }
        Relationships: []
      }
      hilink_menu_items: {
        Row: {
          created_at: string | null
          icon: string
          id: string
          is_default: boolean
          name: string
          order: number
          updated_at: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          icon?: string
          id: string
          is_default?: boolean
          name: string
          order?: number
          updated_at?: string | null
          url?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string | null
          icon?: string
          id?: string
          is_default?: boolean
          name?: string
          order?: number
          updated_at?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      hilink_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hilink_reminders: {
        Row: {
          completed: boolean
          created_at: string
          due_date: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          due_date?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          due_date?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      images: {
        Row: {
          created_at: string
          delete_url: string | null
          display_url: string
          file_size: number | null
          filename: string
          folder: string
          height: number | null
          id: string
          imgbb_id: string
          mime_type: string | null
          tags: string[] | null
          updated_at: string
          url: string
          width: number | null
        }
        Insert: {
          created_at?: string
          delete_url?: string | null
          display_url: string
          file_size?: number | null
          filename: string
          folder: string
          height?: number | null
          id?: string
          imgbb_id: string
          mime_type?: string | null
          tags?: string[] | null
          updated_at?: string
          url: string
          width?: number | null
        }
        Update: {
          created_at?: string
          delete_url?: string | null
          display_url?: string
          file_size?: number | null
          filename?: string
          folder?: string
          height?: number | null
          id?: string
          imgbb_id?: string
          mime_type?: string | null
          tags?: string[] | null
          updated_at?: string
          url?: string
          width?: number | null
        }
        Relationships: []
      }
      loi_phat_tien: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      marketing_assistant_histories: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      monthly_sales_targets: {
        Row: {
          created_at: string | null
          id: string
          minimum_sales_target: number
          month: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          minimum_sales_target?: number
          month: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          minimum_sales_target?: number
          month?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          id: string
          notification_id: string | null
          read_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          notification_id?: string | null
          read_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          notification_id?: string | null
          read_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_targets: {
        Row: {
          created_at: string | null
          id: string
          notification_id: string | null
          target_user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notification_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notification_id?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_targets_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_targets_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          priority: string
          target_audience: string
          target_type: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: string
          target_audience?: string
          target_type?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: string
          target_audience?: string
          target_type?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_assistant_histories: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      price_history: {
        Row: {
          competitor_product_id: string
          created_at: string
          id: string
          is_available: boolean | null
          price: number
          scraped_at: string
        }
        Insert: {
          competitor_product_id: string
          created_at?: string
          id?: string
          is_available?: boolean | null
          price: number
          scraped_at?: string
        }
        Update: {
          competitor_product_id?: string
          created_at?: string
          id?: string
          is_available?: boolean | null
          price?: number
          scraped_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_competitor_product_id_fkey"
            columns: ["competitor_product_id"]
            isOneToOne: false
            referencedRelation: "competitor_products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          category_id: string
          created_at: string
          id: string
          is_active: boolean | null
          model: string | null
          name: string
          our_price: number | null
          target_url: string | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          model?: string | null
          name: string
          our_price?: number | null
          target_url?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          model?: string | null
          name?: string
          our_price?: number | null
          target_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          base_salary: number | null
          branch: string | null
          created_at: string | null
          full_name: string
          id: string
          minimum_sales_target: number | null
          password: string
          phone: string | null
          role: string
          status: string
          updated_at: string | null
          username: string
        }
        Insert: {
          base_salary?: number | null
          branch?: string | null
          created_at?: string | null
          full_name: string
          id?: string
          minimum_sales_target?: number | null
          password: string
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string | null
          username: string
        }
        Update: {
          base_salary?: number | null
          branch?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          minimum_sales_target?: number | null
          password?: string
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      sales_data: {
        Row: {
          branch: string
          category: string
          channel: string
          created_at: string | null
          customer_address: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          product_name: string
          quantity: number
          revenue: number
          sale_date: string
          updated_at: string | null
          user_id: string
          warranty: string | null
        }
        Insert: {
          branch: string
          category: string
          channel: string
          created_at?: string | null
          customer_address?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          product_name: string
          quantity?: number
          revenue: number
          sale_date: string
          updated_at?: string | null
          user_id: string
          warranty?: string | null
        }
        Update: {
          branch?: string
          category?: string
          channel?: string
          created_at?: string | null
          customer_address?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          product_name?: string
          quantity?: number
          revenue?: number
          sale_date?: string
          updated_at?: string | null
          user_id?: string
          warranty?: string | null
        }
        Relationships: []
      }
      scrape_schedules: {
        Row: {
          category_id: string
          created_at: string
          frequency_days: number
          id: string
          is_active: boolean | null
          last_run_at: string | null
          next_run_at: string | null
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          frequency_days?: number
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          frequency_days?: number
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scrape_schedules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      website_articles: {
        Row: {
          category: string | null
          content: string
          created_at: string
          id: string
          image_url: string | null
          is_published: boolean | null
          published_at: string | null
          slug: string
          summary: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          published_at?: string | null
          slug: string
          summary?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          published_at?: string | null
          slug?: string
          summary?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      website_content: {
        Row: {
          content: Json | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          section: string
          title: string | null
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          section: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          section?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      website_docs: {
        Row: {
          author: string | null
          category: string | null
          content: string | null
          created_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          sort_order: number | null
          status: string | null
          tags: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          sort_order?: number | null
          status?: string | null
          tags?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          sort_order?: number | null
          status?: string | null
          tags?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      website_news: {
        Row: {
          author: string | null
          category: string | null
          content: string | null
          created_at: string | null
          excerpt: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          publish_date: string | null
          read_time: string | null
          sort_order: number | null
          status: string | null
          tags: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          publish_date?: string | null
          read_time?: string | null
          sort_order?: number | null
          status?: string | null
          tags?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          publish_date?: string | null
          read_time?: string | null
          sort_order?: number | null
          status?: string | null
          tags?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      website_products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          features: Json | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price: number | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price?: number | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price?: number | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      website_sessions: {
        Row: {
          created_at: string
          id: string
          last_accessed: string
          session_data: Json | null
          updated_at: string
          user_id: string
          website_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_accessed?: string
          session_data?: Json | null
          updated_at?: string
          user_id?: string
          website_url: string
        }
        Update: {
          created_at?: string
          id?: string
          last_accessed?: string
          session_data?: Json | null
          updated_at?: string
          user_id?: string
          website_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_competitors_by_category: {
        Args: { category_uuid: string }
        Returns: {
          display_name: string
          id: string
          is_active: boolean
          name: string
          website_url: string
        }[]
      }
      get_current_user_role: { Args: never; Returns: string }
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
