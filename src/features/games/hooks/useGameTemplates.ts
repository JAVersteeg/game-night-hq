import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { groupKeys } from '@/features/groups/hooks/useGroups';
import { supabase } from '@/lib/supabase';
import type { Enums, Tables } from '@/types/database';

export type GameTemplateField = Tables<'game_template_fields'>;
export type BonusRule = Tables<'bonus_rules'>;
export type ScoringDirection = Enums<'scoring_direction'>;

export interface GameTemplate extends Tables<'game_templates'> {
  game_template_fields: GameTemplateField[];
}

export interface GameTemplateWithBonusRules extends GameTemplate {
  bonus_rules: BonusRule[];
}

export interface NewGameTemplateField {
  key: string;
  label: string;
  sign: 1 | -1;
  /** At most one participant may hold this field per session; `default` doubles as the fixed
   *  point value awarded to whoever holds it (see game_template_fields.exclusive). */
  exclusive?: boolean;
  default?: number;
}

export const gameKeys = {
  /** Prefix for every game-scoped query — lists, details and the stats derived from them. */
  all: ['games'] as const,
  list: (groupId: string) => ['games', 'list', groupId] as const,
  detail: (templateId: string) => ['games', 'detail', templateId] as const,
};

export function scoringDirectionLabel(direction: ScoringDirection): string {
  switch (direction) {
    case 'highest_total_wins':
      return 'Hoogste totaal wint';
    case 'lowest_total_wins':
      return 'Laagste totaal wint';
    case 'ranked':
      return 'Ranglijst';
  }
}

/**
 * Fields come back nested and ordered by `position` — the same order the template's author built
 * them in, which is also the order the (not yet built) live entry form must render them.
 */
export function useGameTemplates(groupId: string) {
  return useQuery({
    queryKey: gameKeys.list(groupId),
    queryFn: async (): Promise<GameTemplate[]> => {
      const { data, error } = await supabase
        .from('game_templates')
        .select('*, game_template_fields(*)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .order('position', { referencedTable: 'game_template_fields', ascending: true });

      if (error) throw error;
      return data;
    },
  });
}

/** The single template a live session needs: its fields (for the entry form) and bonus rules (for
 *  the scoring calc), both ordered so they read the same everywhere. */
export function useGameTemplate(templateId: string) {
  return useQuery({
    queryKey: gameKeys.detail(templateId),
    enabled: templateId.length > 0,
    queryFn: async (): Promise<GameTemplateWithBonusRules> => {
      const { data, error } = await supabase
        .from('game_templates')
        .select('*, game_template_fields(*), bonus_rules(*)')
        .eq('id', templateId)
        .order('position', { referencedTable: 'game_template_fields', ascending: true })
        .single();

      if (error) throw error;
      return data;
    },
  });
}

/**
 * Goes through create_game_template rather than three separate inserts: RLS lets a member write
 * game_templates, game_template_fields and bonus_rules directly, but only the RPC's single
 * transaction stops a template from being left fieldless if a later insert in the batch failed.
 */
export function useCreateGameTemplate(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      scoringDirection: ScoringDirection;
      fields: NewGameTemplateField[];
      coverKey?: string | null;
      rounds?: boolean;
      roundCount?: number | null;
    }) => {
      const { data, error } = await supabase.rpc('create_game_template', {
        p_group_id: groupId,
        p_name: input.name.trim(),
        p_scoring_direction: input.scoringDirection,
        p_fields: input.fields.map((field, index) => ({
          key: field.key,
          label: field.label,
          sign: field.sign,
          exclusive: field.exclusive ?? false,
          default_value: field.default ?? 0,
          position: index,
        })),
        // Omitted rather than passed as null: the RPC's own default is null, and the generated
        // Args type doesn't accept one.
        p_cover_key: input.coverKey ?? undefined,
        p_rounds: input.rounds ?? false,
        p_round_count: input.roundCount ?? undefined,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: gameKeys.list(groupId) });
      void queryClient.invalidateQueries({ queryKey: groupKeys.dashboard(groupId) });
    },
  });
}
