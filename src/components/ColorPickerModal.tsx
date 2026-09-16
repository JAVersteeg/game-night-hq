import { Modal, Pressable, ActivityIndicator, View } from 'react-native';
import { Text } from '@/components/Text';

import { Button } from '@/components/Button';
import { PLAYER_COLORS, type PlayerColor } from '@/lib/playerColors';

interface ColorSwatchProps {
  color: (typeof PLAYER_COLORS)[number];
  selected: boolean;
  taken: boolean;
  onSelect: () => void;
}

function ColorSwatch({ color, selected, taken, onSelect }: ColorSwatchProps) {
  return (
    <Pressable
      onPress={taken ? undefined : onSelect}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: taken }}
      testID={`color-swatch-${color.key}`}
      className="w-1/4 items-center gap-1.5 py-2"
    >
      <View
        className={`h-12 w-12 items-center justify-center rounded-full border-2 ${
          selected ? 'border-ink' : 'border-line-strong'
        }`}
        style={{ backgroundColor: color.swatch, opacity: taken ? 0.35 : 1 }}
      >
        {selected ? (
          <Text className="text-base font-bold" style={{ color: color.fg }}>
            ✓
          </Text>
        ) : null}
      </View>
      <Text
        className={`text-xs font-medium ${taken ? 'text-ink-faint' : 'text-ink-muted'}`}
        numberOfLines={1}
      >
        {taken ? 'Bezet' : color.label}
      </Text>
    </Pressable>
  );
}

interface ColorPickerModalProps {
  visible: boolean;
  title?: string;
  description?: string;
  currentColor: PlayerColor;
  takenColors: ReadonlySet<PlayerColor>;
  isPending: boolean;
  errorMessage: string | null;
  onSelect: (color: PlayerColor) => void;
  onClose: () => void;
}

export function ColorPickerModal({
  visible,
  title = 'Kies je kleur',
  description = 'Elke kleur kan maar door één speler in de groep gebruikt worden.',
  currentColor,
  takenColors,
  isPending,
  errorMessage,
  onSelect,
  onClose,
}: ColorPickerModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        className="flex-1 items-center justify-center bg-surface-deep/70 px-6"
        onPress={onClose}
        accessibilityLabel="Sluit"
      >
        <Pressable className="w-full max-w-sm gap-4 rounded-3xl border border-line bg-surface p-6">
          <View>
            <Text className="text-xl font-bold text-ink">{title}</Text>
            <Text className="mt-1 text-sm text-ink-muted">{description}</Text>
          </View>

          <View className="flex-row flex-wrap">
            {PLAYER_COLORS.map((color) => (
              <ColorSwatch
                key={color.key}
                color={color}
                selected={color.key === currentColor}
                taken={color.key !== currentColor && takenColors.has(color.key)}
                onSelect={() => onSelect(color.key)}
              />
            ))}
          </View>

          {errorMessage ? (
            <Text className="text-center text-sm text-danger">{errorMessage}</Text>
          ) : null}
          {isPending ? (
            <View className="items-center">
              <ActivityIndicator />
            </View>
          ) : null}

          <Button label="Sluiten" variant="secondary" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
