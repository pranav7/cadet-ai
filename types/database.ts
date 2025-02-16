export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
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
  public: {
    Tables: {
      apps: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          app_id: string
          content: string
          created_at: string
          document_id: number
          embedding: string | null
          id: number
          updated_at: string
        }
        Insert: {
          app_id: string
          content: string
          created_at?: string
          document_id: number
          embedding?: string | null
          id?: never
          updated_at?: string
        }
        Update: {
          app_id?: string
          content?: string
          created_at?: string
          document_id?: number
          embedding?: string | null
          id?: never
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_with_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          app_id: string
          content: string
          created_at: string
          created_by: string
          external_id: string
          id: number
          metadata: Json
          name: string
          processed: boolean | null
          source: number
          summary: string | null
          updated_at: string
        }
        Insert: {
          app_id: string
          content: string
          created_at?: string
          created_by: string
          external_id: string
          id?: never
          metadata?: Json
          name: string
          processed?: boolean | null
          source: number
          summary?: string | null
          updated_at?: string
        }
        Update: {
          app_id?: string
          content?: string
          created_at?: string
          created_by?: string
          external_id?: string
          id?: never
          metadata?: Json
          name?: string
          processed?: boolean | null
          source?: number
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      documents_tags: {
        Row: {
          document_id: number
          tag_id: number
        }
        Insert: {
          document_id: number
          tag_id: number
        }
        Update: {
          document_id?: number
          tag_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_tags_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tags_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      end_user_documents: {
        Row: {
          created_at: string | null
          document_id: number
          end_user_id: string
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_id: number
          end_user_id: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: number
          end_user_id?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "end_user_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "end_user_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "end_user_documents_end_user_id_fkey"
            columns: ["end_user_id"]
            isOneToOne: false
            referencedRelation: "end_users"
            referencedColumns: ["id"]
          },
        ]
      }
      end_users: {
        Row: {
          app_id: string
          created_at: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          type: number
          updated_at: string | null
        }
        Insert: {
          app_id: string
          created_at?: string | null
          email: string
          first_name: string
          id?: string
          last_name: string
          type?: number
          updated_at?: string | null
        }
        Update: {
          app_id?: string
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          type?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "end_users_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      intercom_settings: {
        Row: {
          api_key: string | null
          app_id: string
          created_at: string | null
          created_by: string
          id: number
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          app_id: string
          created_at?: string | null
          created_by: string
          id?: never
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          app_id?: string
          created_at?: string | null
          created_by?: string
          id?: never
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intercom_settings_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intercom_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          app_id: string
          created_at: string
          id: number
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          app_id: string
          created_at?: string
          id?: never
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          app_id?: string
          created_at?: string
          id?: never
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          app_id: string | null
          auth_id: string
          created_at: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          updated_at: string | null
        }
        Insert: {
          app_id?: string | null
          auth_id: string
          created_at?: string | null
          email: string
          first_name: string
          id?: string
          last_name: string
          updated_at?: string | null
        }
        Update: {
          app_id?: string | null
          auth_id?: string
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      documents_with_tags: {
        Row: {
          app_id: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          external_id: string | null
          id: number | null
          metadata: Json | null
          name: string | null
          processed: boolean | null
          source: number | null
          summary: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_current_app: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string | null
          created_by: string
          id: string
          name: string
          slug: string
          updated_at: string | null
        }
      }
      get_current_user: {
        Args: Record<PropertyKey, never>
        Returns: {
          app_id: string | null
          auth_id: string
          created_at: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          updated_at: string | null
        }
      }
      match_document_sections: {
        Args: {
          embedding: string
          match_threshold: number
        }
        Returns: {
          app_id: string
          content: string
          created_at: string
          document_id: number
          embedding: string | null
          id: number
          updated_at: string
        }[]
      }
      supabase_url: {
        Args: Record<PropertyKey, never>
        Returns: string
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

