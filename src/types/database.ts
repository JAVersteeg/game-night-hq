// Generated from the live schema. Regenerate after any migration with:
//   npx supabase gen types typescript --project-id qdnyzujlaesqncwrqoaj > src/types/database.ts
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      bonus_rules: {
        Row: {
          created_at: string;
          field_key: string;
          id: string;
          operator: Database['public']['Enums']['bonus_operator'];
          points_delta: number;
          template_id: string;
          value: number;
        };
        Insert: {
          created_at?: string;
          field_key: string;
          id?: string;
          operator: Database['public']['Enums']['bonus_operator'];
          points_delta: number;
          template_id: string;
          value: number;
        };
        Update: {
          created_at?: string;
          field_key?: string;
          id?: string;
          operator?: Database['public']['Enums']['bonus_operator'];
          points_delta?: number;
          template_id?: string;
          value?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'bonus_rules_template_id_field_key_fkey';
            columns: ['template_id', 'field_key'];
            isOneToOne: false;
            referencedRelation: 'game_template_fields';
            referencedColumns: ['template_id', 'key'];
          },
          {
            foreignKeyName: 'bonus_rules_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'game_templates';
            referencedColumns: ['id'];
          },
        ];
      };
      game_template_fields: {
        Row: {
          default_value: number;
          exclusive: boolean;
          id: string;
          key: string;
          label: string;
          position: number;
          sign: number;
          template_id: string;
        };
        Insert: {
          default_value?: number;
          exclusive?: boolean;
          id?: string;
          key: string;
          label: string;
          position?: number;
          sign?: number;
          template_id: string;
        };
        Update: {
          default_value?: number;
          exclusive?: boolean;
          id?: string;
          key?: string;
          label?: string;
          position?: number;
          sign?: number;
          template_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'game_template_fields_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'game_templates';
            referencedColumns: ['id'];
          },
        ];
      };
      game_templates: {
        Row: {
          cover_key: string | null;
          created_at: string;
          created_by: string | null;
          group_id: string;
          id: string;
          name: string;
          round_count: number | null;
          rounds: boolean;
          scoring_direction: Database['public']['Enums']['scoring_direction'];
        };
        Insert: {
          cover_key?: string | null;
          created_at?: string;
          created_by?: string | null;
          group_id: string;
          id?: string;
          name: string;
          round_count?: number | null;
          rounds?: boolean;
          scoring_direction: Database['public']['Enums']['scoring_direction'];
        };
        Update: {
          cover_key?: string | null;
          created_at?: string;
          created_by?: string | null;
          group_id?: string;
          id?: string;
          name?: string;
          round_count?: number | null;
          rounds?: boolean;
          scoring_direction?: Database['public']['Enums']['scoring_direction'];
        };
        Relationships: [
          {
            foreignKeyName: 'game_templates_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
        ];
      };
      group_members: {
        Row: {
          color: Database['public']['Enums']['player_color'];
          group_id: string;
          joined_at: string;
          user_id: string;
        };
        Insert: {
          color: Database['public']['Enums']['player_color'];
          group_id: string;
          joined_at?: string;
          user_id: string;
        };
        Update: {
          color?: Database['public']['Enums']['player_color'];
          group_id?: string;
          joined_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'group_members_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'group_members_user_id_profiles_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      groups: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          invite_code: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          invite_code: string;
          name: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          invite_code?: string;
          name?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string;
          id: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name: string;
          id: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
        };
        Relationships: [];
      };
      session_participants: {
        Row: {
          session_id: string;
          user_id: string;
        };
        Insert: {
          session_id: string;
          user_id: string;
        };
        Update: {
          session_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'session_participants_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      session_scores: {
        Row: {
          field_key: string;
          session_id: string;
          updated_at: string;
          user_id: string;
          value: number;
        };
        Insert: {
          field_key: string;
          session_id: string;
          updated_at?: string;
          user_id: string;
          value?: number;
        };
        Update: {
          field_key?: string;
          session_id?: string;
          updated_at?: string;
          user_id?: string;
          value?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'session_scores_session_id_user_id_fkey';
            columns: ['session_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'session_participants';
            referencedColumns: ['session_id', 'user_id'];
          },
        ];
      };
      sessions: {
        Row: {
          completed_at: string | null;
          created_at: string;
          group_id: string;
          id: string;
          last_round_order: string[] | null;
          last_round_values: Json | null;
          played_at: string;
          rounds_played: number;
          scorekeeper_id: string;
          status: Database['public']['Enums']['session_status'];
          template_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          group_id: string;
          id?: string;
          last_round_order?: string[] | null;
          last_round_values?: Json | null;
          played_at?: string;
          rounds_played?: number;
          scorekeeper_id: string;
          status?: Database['public']['Enums']['session_status'];
          template_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          group_id?: string;
          id?: string;
          last_round_order?: string[] | null;
          last_round_values?: Json | null;
          played_at?: string;
          rounds_played?: number;
          scorekeeper_id?: string;
          status?: Database['public']['Enums']['session_status'];
          template_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sessions_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sessions_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'game_templates';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      commit_field_round: {
        Args: { p_session_id: string; p_values: Json };
        Returns: {
          completed_at: string | null;
          created_at: string;
          group_id: string;
          id: string;
          last_round_order: string[] | null;
          last_round_values: Json | null;
          played_at: string;
          rounds_played: number;
          scorekeeper_id: string;
          status: Database['public']['Enums']['session_status'];
          template_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'sessions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      commit_ranked_round: {
        Args: { p_order: string[]; p_session_id: string };
        Returns: {
          completed_at: string | null;
          created_at: string;
          group_id: string;
          id: string;
          last_round_order: string[] | null;
          last_round_values: Json | null;
          played_at: string;
          rounds_played: number;
          scorekeeper_id: string;
          status: Database['public']['Enums']['session_status'];
          template_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'sessions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_game_template: {
        Args: {
          p_bonus_rules?: Json;
          p_cover_key?: string;
          p_fields: Json;
          p_group_id: string;
          p_name: string;
          p_round_count?: number;
          p_rounds?: boolean;
          p_scoring_direction: Database['public']['Enums']['scoring_direction'];
        };
        Returns: {
          cover_key: string | null;
          created_at: string;
          created_by: string | null;
          group_id: string;
          id: string;
          name: string;
          round_count: number | null;
          rounds: boolean;
          scoring_direction: Database['public']['Enums']['scoring_direction'];
        };
        SetofOptions: {
          from: '*';
          to: 'game_templates';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_group: {
        Args: { p_name: string };
        Returns: {
          created_at: string;
          created_by: string | null;
          id: string;
          invite_code: string;
          name: string;
        };
        SetofOptions: {
          from: '*';
          to: 'groups';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_session: {
        Args: {
          p_group_id: string;
          p_participant_ids: string[];
          p_scorekeeper_id: string;
          p_template_id: string;
        };
        Returns: {
          completed_at: string | null;
          created_at: string;
          group_id: string;
          id: string;
          last_round_order: string[] | null;
          last_round_values: Json | null;
          played_at: string;
          rounds_played: number;
          scorekeeper_id: string;
          status: Database['public']['Enums']['session_status'];
          template_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'sessions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      join_group_by_code: {
        Args: { p_code: string };
        Returns: {
          created_at: string;
          created_by: string | null;
          id: string;
          invite_code: string;
          name: string;
        };
        SetofOptions: {
          from: '*';
          to: 'groups';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_member_color: {
        Args: {
          p_color: Database['public']['Enums']['player_color'];
          p_group_id: string;
        };
        Returns: {
          color: Database['public']['Enums']['player_color'];
          group_id: string;
          joined_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'group_members';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      undo_round: { Args: { p_session_id: string }; Returns: Json };
    };
    Enums: {
      bonus_operator: '==' | '>' | '<' | '>=' | '<=';
      player_color:
        | 'red'
        | 'orange'
        | 'yellow'
        | 'green'
        | 'teal'
        | 'blue'
        | 'purple'
        | 'pink'
        | 'brown'
        | 'grey'
        | 'black'
        | 'lime';
      scoring_direction: 'highest_total_wins' | 'lowest_total_wins' | 'ranked';
      session_status: 'in_progress' | 'completed';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      bonus_operator: ['==', '>', '<', '>=', '<='],
      player_color: [
        'red',
        'orange',
        'yellow',
        'green',
        'teal',
        'blue',
        'purple',
        'pink',
        'brown',
        'grey',
        'black',
        'lime',
      ],
      scoring_direction: ['highest_total_wins', 'lowest_total_wins', 'ranked'],
      session_status: ['in_progress', 'completed'],
    },
  },
} as const;
