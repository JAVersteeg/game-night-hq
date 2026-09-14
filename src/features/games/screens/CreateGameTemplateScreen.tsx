import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card, ListRow } from '@/components/Card';
import { ChoiceRow } from '@/components/ChoiceRow';
import { CoverThumbnail } from '@/components/CoverThumbnail';
import { SectionLabel } from '@/components/SectionLabel';
import { TextField } from '@/components/TextField';
import { coverImageForKey } from '@/features/games/covers';
import type {
  NewGameTemplateField,
  ScoringDirection,
} from '@/features/games/hooks/useGameTemplates';
import {
  scoringDirectionLabel,
  useCreateGameTemplate,
} from '@/features/games/hooks/useGameTemplates';
import { GAME_TEMPLATE_PRESETS, type GameTemplatePreset } from '@/features/games/presets';
import type { AppStackParamList } from '@/navigation/types';

const MAX_NAME_LENGTH = 60;
const MAX_FIELD_LABEL_LENGTH = 60;
const MAX_NAME_SUGGESTIONS = 5;

const DEFAULT_FIELD: NewGameTemplateField = { key: 'punten', label: 'Punten', sign: 1 };

interface DraftField extends NewGameTemplateField {
  id: string;
}

let draftFieldSeq = 0;
function nextDraftFieldId(): string {
  draftFieldSeq += 1;
  return `draft-${draftFieldSeq}`;
}

/** Strips accents and case so a preset name and whatever's typed compare equal ("Café" ~ "cafe"). */
function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Derives a field's storage key from its label ("Strafkaarten" → "strafkaarten"), falling back to
 * a positional key if the label has no lettable characters (e.g. only emoji or punctuation) or
 * collides with an earlier field's key.
 */
function keyFromLabel(label: string, index: number, existingKeys: readonly string[]): string {
  const slug = normalizeForSearch(label)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);

  const base = /^[a-z]/.test(slug) ? slug : `veld_${index + 1}`;
  if (!existingKeys.includes(base)) return base;

  let suffix = 2;
  while (existingKeys.includes(`${base}_${suffix}`)) suffix += 1;
  return `${base}_${suffix}`;
}

interface TemplatesModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (preset: GameTemplatePreset) => void;
}

/** A bottom sheet of premade score formats. Picking one replaces the whole draft, so it's on the
 * caller to decide whether that's safe (nothing typed yet, or the user explicitly asked for it). */
function TemplatesModal({ visible, onClose, onSelect }: TemplatesModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        className="flex-1 items-center justify-center bg-surface-deep/85 px-6"
        onPress={onClose}
        accessibilityLabel="Sluit templates"
      >
        <Pressable className="w-full gap-4 rounded-3xl border border-line bg-surface p-6">
          <View>
            <Text className="text-xl font-bold text-ink">Templates</Text>
            <Text className="mt-1 text-sm text-ink-muted">
              Kies een voorbeeld om mee te beginnen. Je kunt alles daarna nog aanpassen.
            </Text>
          </View>
          <View className="gap-2">
            {GAME_TEMPLATE_PRESETS.map((preset) => (
              <ListRow
                key={preset.id}
                title={preset.name}
                meta={`${scoringDirectionLabel(preset.scoringDirection)} · ${preset.fields.length} velden`}
                left={<CoverThumbnail source={coverImageForKey(preset.id)} size={40} />}
                onPress={() => onSelect(preset)}
              />
            ))}
          </View>
          <Button label="Sluiten" variant="ghost" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function FieldRow({ field, onToggleSign }: { field: DraftField; onToggleSign: () => void }) {
  return (
    <Card className="flex-row items-center gap-3">
      <Text className="min-w-0 flex-1 text-base font-semibold text-ink" numberOfLines={1}>
        {field.label}
      </Text>
      {field.exclusive ? (
        <Badge tone="accent">Max 1 speler · {field.default ?? 0} punten</Badge>
      ) : (
        <Pressable onPress={onToggleSign} accessibilityRole="button">
          <Badge tone={field.sign === 1 ? 'success' : 'danger'}>
            {field.sign === 1 ? 'Telt op' : 'Telt af'}
          </Badge>
        </Pressable>
      )}
    </Card>
  );
}

/** Define a game for this group: a name, numeric fields with a sign, and a scoring direction. */
export function CreateGameTemplateScreen() {
  const { groupId } = useRoute<RouteProp<AppStackParamList, 'CreateGameTemplate'>>().params;
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const createGameTemplate = useCreateGameTemplate(groupId);

  const [name, setName] = useState('');
  const [coverKey, setCoverKey] = useState<string | null>(null);
  const [areNameSuggestionsDismissed, setAreNameSuggestionsDismissed] = useState(false);
  const [scoringDirection, setScoringDirection] = useState<ScoringDirection>('highest_total_wins');
  const [fields, setFields] = useState<DraftField[]>([
    { id: nextDraftFieldId(), ...DEFAULT_FIELD },
  ]);
  const [nextFieldLabel, setNextFieldLabel] = useState('');
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);

  function applyPreset(preset: GameTemplatePreset) {
    setName(preset.name);
    setCoverKey(preset.id);
    setScoringDirection(preset.scoringDirection);
    setFields(preset.fields.map((field) => ({ id: nextDraftFieldId(), ...field })));
    setIsTemplatesOpen(false);
    setAreNameSuggestionsDismissed(true);
  }

  function handleNameChange(text: string) {
    setName(text);
    setCoverKey(null);
    setAreNameSuggestionsDismissed(false);
  }

  function addField() {
    const label = nextFieldLabel.trim();
    if (!label) return;
    const key = keyFromLabel(
      label,
      fields.length,
      fields.map((field) => field.key),
    );
    setFields([...fields, { id: nextDraftFieldId(), key, label, sign: 1 }]);
    setNextFieldLabel('');
  }

  function toggleFieldSign(id: string) {
    setFields(
      fields.map((field) =>
        field.id === id ? { ...field, sign: field.sign === 1 ? -1 : 1 } : field,
      ),
    );
  }

  const isRanked = scoringDirection === 'ranked';
  const trimmedName = name.trim();
  const canSubmit =
    trimmedName.length > 0 && (isRanked || fields.length > 0) && !createGameTemplate.isPending;

  const nameSuggestions =
    areNameSuggestionsDismissed || trimmedName.length === 0
      ? []
      : GAME_TEMPLATE_PRESETS.filter((preset) =>
          normalizeForSearch(preset.name).includes(normalizeForSearch(trimmedName)),
        ).slice(0, MAX_NAME_SUGGESTIONS);

  function handleSubmit() {
    if (!canSubmit) return;
    createGameTemplate.mutate(
      {
        name: trimmedName,
        scoringDirection,
        fields: isRanked
          ? []
          : fields.map(({ key, label, sign, exclusive, default: defaultValue }) => ({
              key,
              label,
              sign,
              exclusive,
              default: defaultValue,
            })),
        coverKey,
      },
      { onSuccess: () => navigation.goBack() },
    );
  }

  return (
    <>
      <KeyboardAwareScrollView
        className="flex-1 bg-surface"
        contentContainerClassName="gap-8 px-6 pb-12 pt-6"
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
      >
        <Button
          label="Templates"
          variant="ghost"
          onPress={() => setIsTemplatesOpen(true)}
          testID="open-templates-button"
        />

        <View>
          <TextField
            label="Naam"
            value={name}
            onChangeText={handleNameChange}
            onFocus={() => setAreNameSuggestionsDismissed(false)}
            onBlur={() => setTimeout(() => setAreNameSuggestionsDismissed(true), 150)}
            placeholder="Naam van het spel"
            maxLength={MAX_NAME_LENGTH}
            testID="game-name-input"
          />
          {nameSuggestions.length > 0 ? (
            <View className="mt-2 gap-2">
              {nameSuggestions.map((preset) => (
                <ListRow
                  key={preset.id}
                  title={preset.name}
                  meta={`${scoringDirectionLabel(preset.scoringDirection)} · ${preset.fields.length} velden`}
                  left={<CoverThumbnail source={coverImageForKey(preset.id)} size={40} />}
                  onPress={() => applyPreset(preset)}
                />
              ))}
            </View>
          ) : null}
        </View>

        <View>
          <SectionLabel>Scorerichting</SectionLabel>
          <View className="mt-2 gap-2">
            <ChoiceRow
              title="Hoogste totaal wint"
              selected={scoringDirection === 'highest_total_wins'}
              onSelect={() => setScoringDirection('highest_total_wins')}
            />
            <ChoiceRow
              title="Laagste totaal wint"
              selected={scoringDirection === 'lowest_total_wins'}
              onSelect={() => setScoringDirection('lowest_total_wins')}
            />
            <ChoiceRow
              title="Ranglijst"
              meta="Geen punten — spelers slepen naar hun eindplek"
              selected={isRanked}
              onSelect={() => setScoringDirection('ranked')}
              testID="scoring-direction-ranked"
            />
          </View>
        </View>

        {isRanked ? null : (
          <View>
            <SectionLabel>Velden</SectionLabel>
            <View className="mt-2 gap-2">
              {fields.map((field) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  onToggleSign={() => toggleFieldSign(field.id)}
                />
              ))}
            </View>
            <View className="mt-3 flex-row items-end gap-2">
              <View className="flex-1">
                <TextField
                  value={nextFieldLabel}
                  onChangeText={setNextFieldLabel}
                  placeholder="Bijvoorbeeld: Strafkaarten"
                  maxLength={MAX_FIELD_LABEL_LENGTH}
                  returnKeyType="done"
                  onSubmitEditing={addField}
                  testID="new-field-input"
                />
              </View>
              <Button label="Toevoegen" variant="secondary" onPress={addField} />
            </View>
          </View>
        )}

        {createGameTemplate.isError ? (
          <Text className="text-danger">
            Het spel kon niet worden opgeslagen. Controleer je verbinding en probeer het opnieuw.
          </Text>
        ) : null}

        <Button
          label="Spel opslaan"
          onPress={handleSubmit}
          disabled={!canSubmit}
          isLoading={createGameTemplate.isPending}
          testID="create-game-submit"
        />
      </KeyboardAwareScrollView>

      <TemplatesModal
        visible={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onSelect={applyPreset}
      />
    </>
  );
}
