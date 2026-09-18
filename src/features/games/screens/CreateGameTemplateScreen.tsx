import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '@/components/Text';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card, ListRow } from '@/components/Card';
import { ChoiceRow } from '@/components/ChoiceRow';
import { CoverThumbnail } from '@/components/CoverThumbnail';
import { NumberStepper } from '@/components/NumberStepper';
import { SectionLabel } from '@/components/SectionLabel';
import { TextField } from '@/components/TextField';
import { gameColorForKey } from '@/features/games/colors';
import { coverImageForKey } from '@/features/games/covers';
import type {
  NewGameTemplateField,
  ScoringDirection,
} from '@/features/games/hooks/useGameTemplates';
import {
  scoringDirectionLabel,
  useCreateGameTemplate,
} from '@/features/games/hooks/useGameTemplates';
import {
  GAME_LIBRARY,
  GAME_TEMPLATE_PRESETS,
  type GameLibraryEntry,
  type GameTemplatePreset,
} from '@/features/games/presets';
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

/** The one-line description a preset gets wherever it's listed for picking: its scoring, field
 *  count, and — since a preset can now be either — whether it's played in rounds. */
function presetMeta(preset: GameTemplatePreset): string {
  const parts = [scoringDirectionLabel(preset.scoringDirection)];
  if (preset.fields.length > 0) parts.push(`${preset.fields.length} velden`);
  if (preset.rounds) parts.push('rondes');
  return parts.join(' · ');
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
                meta={presetMeta(preset)}
                left={<CoverThumbnail
                    source={coverImageForKey(preset.id)}
                    color={gameColorForKey(preset.id)}
                    size={40}
                  />}
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

function FieldRow({
  field,
  onToggleSign,
  onChangeLabel,
}: {
  field: DraftField;
  onToggleSign: () => void;
  onChangeLabel: (label: string) => void;
}) {
  return (
    <Card className="flex-row items-center gap-3 py-2">
      <TextInput
        value={field.label}
        onChangeText={onChangeLabel}
        maxLength={MAX_FIELD_LABEL_LENGTH}
        className="min-w-0 flex-1 p-0 text-base font-semibold text-ink"
        testID={`field-label-input-${field.id}`}
      />
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
  // Edge-to-edge on Android: the last row would otherwise sit behind the navigation bar.
  const insets = useSafeAreaInsets();
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
  // Rondes toggle applies to any scoring direction: it changes how the live entry form
  // accumulates (repeat each round instead of filling in once), not what the form looks like.
  // `roundCount` is purely informational — 0 means "geen vast aantal", like Dalmuti.
  const [rounds, setRounds] = useState(false);
  const [roundCount, setRoundCount] = useState(0);

  function applyPreset(preset: GameTemplatePreset) {
    setName(preset.name);
    setCoverKey(preset.id);
    setScoringDirection(preset.scoringDirection);
    setFields(preset.fields.map((field) => ({ id: nextDraftFieldId(), ...field })));
    setRounds(preset.rounds ?? false);
    setRoundCount(preset.roundCount ?? 0);
    setIsTemplatesOpen(false);
    setAreNameSuggestionsDismissed(true);
  }

  function handleNameChange(text: string) {
    setName(text);
    setCoverKey(null);
    setAreNameSuggestionsDismissed(false);
  }

  /** A library entry only guarantees a name and cover. If it also has a matching template preset
   *  (same `id`), applying that fills scoring direction and fields too; otherwise the draft's
   *  current scoring direction and fields (whatever the user already set up) are left alone. */
  function applyLibraryEntry(entry: GameLibraryEntry) {
    const preset = GAME_TEMPLATE_PRESETS.find((candidate) => candidate.id === entry.id);
    if (preset) {
      applyPreset(preset);
      return;
    }

    setName(entry.name);
    setCoverKey(entry.id);
    setAreNameSuggestionsDismissed(true);
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

  function renameField(id: string, label: string) {
    setFields(fields.map((field) => (field.id === id ? { ...field, label } : field)));
  }

  // Ranked scores on finish order rather than on entered values, so the field editor drops out and
  // an empty field list is what gets saved — whether or not it's also played in rounds.
  const isFieldless = scoringDirection === 'ranked';
  const trimmedName = name.trim();
  const canSubmit =
    trimmedName.length > 0 && (isFieldless || fields.length > 0) && !createGameTemplate.isPending;

  const nameSuggestions =
    areNameSuggestionsDismissed || trimmedName.length === 0
      ? []
      : GAME_LIBRARY.filter((entry) =>
          normalizeForSearch(entry.name).includes(normalizeForSearch(trimmedName)),
        ).slice(0, MAX_NAME_SUGGESTIONS);

  function handleSubmit() {
    if (!canSubmit) return;
    createGameTemplate.mutate(
      {
        name: trimmedName,
        scoringDirection,
        fields: isFieldless
          ? []
          : fields.map(({ key, label, sign, exclusive, default: defaultValue }) => ({
              key,
              label,
              sign,
              exclusive,
              default: defaultValue,
            })),
        coverKey,
        rounds,
        roundCount: rounds && roundCount > 0 ? roundCount : null,
      },
      { onSuccess: () => navigation.goBack() },
    );
  }

  return (
    <>
      <KeyboardAwareScrollView
        className="flex-1 bg-surface"
        contentContainerClassName="gap-8 px-6 pt-6"
        contentContainerStyle={{ paddingBottom: 48 + insets.bottom }}
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
              {nameSuggestions.map((entry) => {
                const preset = GAME_TEMPLATE_PRESETS.find((candidate) => candidate.id === entry.id);
                return (
                  <ListRow
                    key={entry.id}
                    title={entry.name}
                    meta={preset ? presetMeta(preset) : undefined}
                    left={<CoverThumbnail
                        source={coverImageForKey(entry.id)}
                        color={gameColorForKey(entry.id)}
                        size={40}
                      />}
                    onPress={() => applyLibraryEntry(entry)}
                  />
                );
              })}
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
              selected={scoringDirection === 'ranked'}
              onSelect={() => setScoringDirection('ranked')}
              testID="scoring-direction-ranked"
            />
          </View>
        </View>

        <View>
          <SectionLabel>Rondes</SectionLabel>
          <View className="mt-2 gap-2">
            <ChoiceRow
              title="In rondes gespeeld"
              mode="check"
              selected={rounds}
              onSelect={() => setRounds((current) => !current)}
              testID="scoring-rounds-toggle"
            />
            {rounds ? (
              <NumberStepper
                label="Verwacht aantal rondes (optioneel)"
                value={roundCount}
                onChange={(value) => setRoundCount(Math.max(0, value))}
                testID="scoring-round-count"
              />
            ) : null}
          </View>
        </View>

        {isFieldless ? null : (
          <View>
            <SectionLabel>Velden</SectionLabel>
            <View className="mt-2 gap-2">
              {fields.map((field) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  onToggleSign={() => toggleFieldSign(field.id)}
                  onChangeLabel={(label) => renameField(field.id, label)}
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
