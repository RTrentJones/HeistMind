export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  development: {
    Tables: {
      characters: {
        Row: {
          adaptations: Json | null
          advancement_history: Json | null
          avatar_url: string | null
          character_data: Json
          created_at: string | null
          created_by: string
          description: string | null
          experience_points: number | null
          game_id: string
          id: string
          is_template: boolean | null
          name: string
          original_ruleset_id: string | null
          playbook_type: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          adaptations?: Json | null
          advancement_history?: Json | null
          avatar_url?: string | null
          character_data: Json
          created_at?: string | null
          created_by: string
          description?: string | null
          experience_points?: number | null
          game_id: string
          id?: string
          is_template?: boolean | null
          name: string
          original_ruleset_id?: string | null
          playbook_type: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          adaptations?: Json | null
          advancement_history?: Json | null
          avatar_url?: string | null
          character_data?: Json
          created_at?: string | null
          created_by?: string
          description?: string | null
          experience_points?: number | null
          game_id?: string
          id?: string
          is_template?: boolean | null
          name?: string
          original_ruleset_id?: string | null
          playbook_type?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "characters_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "characters_original_ruleset_id_fkey"
            columns: ["original_ruleset_id"]
            isOneToOne: false
            referencedRelation: "rulesets"
            referencedColumns: ["id"]
          },
        ]
      }
      clocks: {
        Row: {
          created_at: string | null
          created_by: string | null
          filled: number
          game_id: string
          id: string
          linked_id: string | null
          linked_type: string | null
          name: string
          segments: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          filled?: number
          game_id: string
          id?: string
          linked_id?: string | null
          linked_type?: string | null
          name: string
          segments?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          filled?: number
          game_id?: string
          id?: string
          linked_id?: string | null
          linked_type?: string | null
          name?: string
          segments?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clocks_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      crews: {
        Row: {
          claims: Json
          cohorts: Json
          coin: number
          created_at: string | null
          created_by: string | null
          crew_abilities: string[]
          crew_type: string | null
          game_id: string
          heat: number
          hold: string
          id: string
          name: string | null
          rep: number
          resources: Json
          tier: number
          updated_at: string | null
          vault: number
          wanted: number
        }
        Insert: {
          claims?: Json
          cohorts?: Json
          coin?: number
          created_at?: string | null
          created_by?: string | null
          crew_abilities?: string[]
          crew_type?: string | null
          game_id: string
          heat?: number
          hold?: string
          id?: string
          name?: string | null
          rep?: number
          resources?: Json
          tier?: number
          updated_at?: string | null
          vault?: number
          wanted?: number
        }
        Update: {
          claims?: Json
          cohorts?: Json
          coin?: number
          created_at?: string | null
          created_by?: string | null
          crew_abilities?: string[]
          crew_type?: string | null
          game_id?: string
          heat?: number
          hold?: string
          id?: string
          name?: string | null
          rep?: number
          resources?: Json
          tier?: number
          updated_at?: string | null
          vault?: number
          wanted?: number
        }
        Relationships: [
          {
            foreignKeyName: "crews_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: true
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      factions: {
        Row: {
          created_at: string | null
          created_by: string | null
          faction_type: string | null
          game_id: string
          id: string
          name: string
          notes: string | null
          status: number
          tier: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          faction_type?: string | null
          game_id: string
          id?: string
          name: string
          notes?: string | null
          status?: number
          tier?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          faction_type?: string | null
          game_id?: string
          id?: string
          name?: string
          notes?: string | null
          status?: number
          tier?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "factions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_players: {
        Row: {
          game_id: string
          id: string
          invited_at: string | null
          joined_at: string | null
          left_at: string | null
          permissions: Json | null
          player_id: string
          role: string | null
          status: string | null
        }
        Insert: {
          game_id: string
          id?: string
          invited_at?: string | null
          joined_at?: string | null
          left_at?: string | null
          permissions?: Json | null
          player_id: string
          role?: string | null
          status?: string | null
        }
        Update: {
          game_id?: string
          id?: string
          invited_at?: string | null
          joined_at?: string | null
          left_at?: string | null
          permissions?: Json | null
          player_id?: string
          role?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          allow_co_gms: boolean | null
          allow_spectators: boolean | null
          created_at: string | null
          created_by: string
          current_players: number | null
          description: string | null
          house_rules: string | null
          id: string
          invite_only: boolean | null
          max_players: number | null
          name: string
          public_listing: boolean | null
          rule_overrides: Json | null
          ruleset_id: string
          state: string | null
          updated_at: string | null
        }
        Insert: {
          allow_co_gms?: boolean | null
          allow_spectators?: boolean | null
          created_at?: string | null
          created_by: string
          current_players?: number | null
          description?: string | null
          house_rules?: string | null
          id?: string
          invite_only?: boolean | null
          max_players?: number | null
          name: string
          public_listing?: boolean | null
          rule_overrides?: Json | null
          ruleset_id: string
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          allow_co_gms?: boolean | null
          allow_spectators?: boolean | null
          created_at?: string | null
          created_by?: string
          current_players?: number | null
          description?: string | null
          house_rules?: string | null
          id?: string
          invite_only?: boolean | null
          max_players?: number | null
          name?: string
          public_listing?: boolean | null
          rule_overrides?: Json | null
          ruleset_id?: string
          state?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_ruleset_id_fkey"
            columns: ["ruleset_id"]
            isOneToOne: false
            referencedRelation: "rulesets"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string | null
          expires_at: string | null
          game_id: string
          id: string
          invite_code: string | null
          invited_by: string
          invited_player: string | null
          max_uses: number | null
          responded_at: string | null
          status: string | null
          used_count: number | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          game_id: string
          id?: string
          invite_code?: string | null
          invited_by: string
          invited_player?: string | null
          max_uses?: number | null
          responded_at?: string | null
          status?: string | null
          used_count?: number | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          game_id?: string
          id?: string
          invite_code?: string | null
          invited_by?: string
          invited_player?: string | null
          max_uses?: number | null
          responded_at?: string | null
          status?: string | null
          used_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      rolls: {
        Row: {
          character_id: string | null
          created_at: string | null
          dice: number
          effect: string | null
          game_id: string
          id: string
          kind: string
          label: string | null
          note: string | null
          outcome: string
          position: string | null
          results: number[]
          user_id: string
        }
        Insert: {
          character_id?: string | null
          created_at?: string | null
          dice?: number
          effect?: string | null
          game_id: string
          id?: string
          kind?: string
          label?: string | null
          note?: string | null
          outcome?: string
          position?: string | null
          results?: number[]
          user_id: string
        }
        Update: {
          character_id?: string | null
          created_at?: string | null
          dice?: number
          effect?: string | null
          game_id?: string
          id?: string
          kind?: string
          label?: string | null
          note?: string | null
          outcome?: string
          position?: string | null
          results?: number[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rolls_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rolls_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      rulesets: {
        Row: {
          compatibility_flags: Json | null
          content: Json
          created_at: string | null
          created_by: string
          description: string | null
          file_size: number | null
          id: string
          is_public: boolean | null
          name: string
          original_filename: string | null
          schema_version: string
          status: string | null
          tags: string[] | null
          updated_at: string | null
          version: string
        }
        Insert: {
          compatibility_flags?: Json | null
          content: Json
          created_at?: string | null
          created_by: string
          description?: string | null
          file_size?: number | null
          id?: string
          is_public?: boolean | null
          name: string
          original_filename?: string | null
          schema_version?: string
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          version?: string
        }
        Update: {
          compatibility_flags?: Json | null
          content?: Json
          created_at?: string | null
          created_by?: string
          description?: string | null
          file_size?: number | null
          id?: string
          is_public?: boolean | null
          name?: string
          original_filename?: string | null
          schema_version?: string
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          version?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_game_role: {
        Args: { user_id: string; game_id: string }
        Returns: string
      }
      is_active_game_member: {
        Args: { p_user_id: string; p_game_id: string }
        Returns: boolean
      }
      is_game_gm: {
        Args: { p_user_id: string; p_game_id: string }
        Returns: boolean
      }
      is_game_master: {
        Args: { game_id: string; user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  production: {
    Tables: {
      [_ in never]: never
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
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          discord_id: string | null
          id: string
          preferences: Json | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          discord_id?: string | null
          id: string
          preferences?: Json | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          discord_id?: string | null
          id?: string
          preferences?: Json | null
          updated_at?: string | null
          username?: string | null
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
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
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  development: {
    Enums: {},
  },
  production: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

