import { ActivityIndicator, Modal, Pressable, ScrollView, View } from 'react-native';
import { Text } from '@/components/Text';

import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { SectionLabel } from '@/components/SectionLabel';
import type {
  BonusRule,
  GameTemplateWithBonusRules,
} from '@/features/games/hooks/useGameTemplates';
import { useGameTemplate } from '@/features/games/hooks/useGameTemplates';

/** Dutch decimals, same as everywhere else numbers are read out at the table. */
function dutchNumber(value: number): string {
  return String(value).replace('.', ',');
}

function signedPoints(delta: number): string {
  return `${delta > 0 ? '+' : '−'}${dutchNumber(Math.abs(delta))}`;
}

const OPERATOR_TEXT: Record<BonusRule['operator'], string> = {
  '==': 'precies',
  '>': 'meer dan',
  '<': 'minder dan',
  '>=': 'minstens',
  '<=': 'hoogstens',
};

/** How the game is decided, in a sentence or two — the part of the scoring that isn't a field. */
function winRuleText(template: GameTemplateWithBonusRules): string {
  switch (template.scoring_direction) {
    case 'highest_total_wins':
      return template.teams
        ? 'Elk team vult de velden samen in. Het team met het hoogste totaal wint.'
        : 'Het hoogste totaal wint.';
    case 'lowest_total_wins':
      return template.teams
        ? 'Elk team vult de velden samen in. Het team met het laagste totaal wint.'
        : 'Het laagste totaal wint.';
    case 'ranked':
      return template.rounds
        ? 'Elke ronde sleep je de spelers in de volgorde waarin ze eindigen. Je krijgt zoveel punten als er spelers achter je eindigen, dus de laatste krijgt 0. Het hoogste totaal wint.'
        : 'Je sleept de spelers in de volgorde waarin ze eindigen. Wie als eerste eindigt, wint.';
    case 'team_win':
      return 'Er worden geen punten bijgehouden. Aan het eind wijst de scorebijhouder het winnende team aan.';
  }
}

/** The extra rules that apply on top of the win rule: rounds, a tie-break, teams. */
function extraRuleTexts(template: GameTemplateWithBonusRules): string[] {
  const extras: string[] = [];
  if (template.rounds) {
    extras.push(
      template.round_count
        ? `Wordt gespeeld in rondes (${template.round_count}). De scores van elke ronde worden bij elkaar opgeteld.`
        : 'Wordt gespeeld in rondes, zonder vast aantal. De scores van elke ronde worden bij elkaar opgeteld.',
    );
  }
  return extras;
}

function ScoringContent({ template }: { template: GameTemplateWithBonusRules }) {
  const fields = template.game_template_fields;
  const labelByKey = new Map(fields.map((field) => [field.key, field.label]));
  const extras = extraRuleTexts(template);

  return (
    <View className="gap-5">
      <View className="gap-2">
        <Text className="text-base leading-6 text-ink">{winRuleText(template)}</Text>
        {extras.map((text) => (
          <Text key={text} className="text-base leading-6 text-ink-muted">
            {text}
          </Text>
        ))}
      </View>

      {fields.length > 0 ? (
        <View>
          <SectionLabel>Velden</SectionLabel>
          <View className="mt-2 gap-2">
            {fields.map((field) => (
              <View key={field.id} className="flex-row items-center gap-3">
                <Text className="min-w-0 flex-1 text-base font-semibold text-ink" numberOfLines={2}>
                  {field.label}
                </Text>
                {field.exclusive ? (
                  <Badge tone="accent">
                    Max 1 speler · {dutchNumber(field.default_value)} punten
                  </Badge>
                ) : (
                  <Badge tone={field.sign === 1 ? 'success' : 'danger'}>
                    {field.sign === 1 ? 'Telt op' : 'Telt af'}
                  </Badge>
                )}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {template.bonus_rules.length > 0 ? (
        <View>
          <SectionLabel>Bonus en straf</SectionLabel>
          <View className="mt-2 gap-2">
            {template.bonus_rules.map((rule) => (
              <View key={rule.id} className="flex-row items-center gap-3">
                <Text className="min-w-0 flex-1 text-base text-ink">
                  {labelByKey.get(rule.field_key) ?? rule.field_key} is{' '}
                  {OPERATOR_TEXT[rule.operator]} {dutchNumber(rule.value)}
                </Text>
                <Badge tone={rule.points_delta > 0 ? 'success' : 'danger'}>
                  {signedPoints(rule.points_delta)} punten
                </Badge>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** What a game scores, readable before it starts: the win rule, each field and whether it counts
 *  for or against, and any bonus rules. Only mounted while open, so it fetches the template (with
 *  its bonus rules, which the group's games list doesn't carry) on demand. */
export function ScoringInfoModal({
  templateId,
  gameName,
  onClose,
}: {
  templateId: string;
  gameName: string;
  onClose: () => void;
}) {
  const { data: template, isPending, isError } = useGameTemplate(templateId);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        className="flex-1 items-center justify-center bg-surface-deep/70 px-6 py-12"
        onPress={onClose}
        accessibilityLabel="Sluit"
      >
        <Pressable className="max-h-full w-full max-w-sm gap-4 rounded-3xl border border-line bg-surface p-6">
          <View>
            <Text className="text-xl font-bold text-ink">Puntentelling</Text>
            <Text className="mt-1 text-sm text-ink-muted" numberOfLines={1}>
              {gameName}
            </Text>
          </View>

          {isPending ? (
            <View className="items-center py-6">
              <ActivityIndicator />
            </View>
          ) : isError ? (
            <Text className="text-base text-ink-muted">
              De puntentelling kon niet worden geladen.
            </Text>
          ) : (
            <ScrollView className="shrink" showsVerticalScrollIndicator={false}>
              <ScoringContent template={template} />
            </ScrollView>
          )}

          <Button label="Sluiten" variant="secondary" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
