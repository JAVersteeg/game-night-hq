import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import type { RestoreResult } from '@/features/auth/hooks/useAccountLink';
import {
  messageForAccountError,
  useLinkAccount,
  useRestoreAccount,
} from '@/features/auth/hooks/useAccountLink';
import type { AccountProvider } from '@/features/auth/linking/providers';
import { isAppleAvailable, isGoogleConfigured } from '@/features/auth/linking/providers';

/** Matches the `rounded-2xl` / `min-h-11` geometry of our own Button, which sits right below it. */
const APPLE_BUTTON_HEIGHT = 48;
const APPLE_BUTTON_CORNER_RADIUS = 16;

interface AccountProviderActionsProps {
  /** `link` attaches a provider to the current user; `restore` signs in as the linked user. */
  mode: 'link' | 'restore';
  onSuccess?: (result: RestoreResult | null) => void;
  /** Run before a restore starts; resolving false aborts it. Used for the data-loss warning. */
  confirm?: () => Promise<boolean>;
}

/** Apple's sheet is iOS-only, so on Android this resolves false and only Google is offered. */
function useAppleAvailable(): boolean {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    void isAppleAvailable().then((result) => {
      if (!isCancelled) setAvailable(result);
    });
    return () => {
      isCancelled = true;
    };
  }, []);

  return available;
}

/**
 * The two provider buttons, sharing one mutation and one error line. Both entry points — the
 * profile screen and the restore sheet in onboarding — render exactly this, so linking and
 * restoring can never drift apart in wording or behaviour.
 */
export function AccountProviderActions({ mode, onSuccess, confirm }: AccountProviderActionsProps) {
  const appleAvailable = useAppleAvailable();
  const link = useLinkAccount();
  const restore = useRestoreAccount();
  const [message, setMessage] = useState<string | null>(null);
  const [pendingProvider, setPendingProvider] = useState<AccountProvider | null>(null);

  const isPending = pendingProvider !== null;

  async function run(provider: AccountProvider) {
    if (isPending) return;
    setMessage(null);

    if (mode === 'restore' && confirm && !(await confirm())) return;

    setPendingProvider(provider);
    try {
      if (mode === 'link') {
        await link.mutateAsync(provider);
        onSuccess?.(null);
      } else {
        const result = await restore.mutateAsync(provider);
        onSuccess?.(result);
      }
    } catch (error) {
      // A dismissed system sheet maps to null: nothing happened, so nothing is said.
      setMessage(messageForAccountError(error, mode));
    } finally {
      setPendingProvider(null);
    }
  }

  const appleLabel = mode === 'link' ? 'Koppelen met Apple' : 'Doorgaan met Apple';
  const googleLabel = mode === 'link' ? 'Koppelen met Google' : 'Doorgaan met Google';

  return (
    <View className="gap-3">
      {appleAvailable ? (
        // Apple's own button is required by their guidelines; ours would not pass review. It cannot
        // show a spinner, so while a sign-in runs the whole row is dimmed and inert instead.
        <View
          pointerEvents={isPending ? 'none' : 'auto'}
          className={isPending ? 'opacity-50' : undefined}
          accessibilityLabel={appleLabel}
        >
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              mode === 'link'
                ? AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
                : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
            }
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={APPLE_BUTTON_CORNER_RADIUS}
            style={{ height: APPLE_BUTTON_HEIGHT }}
            onPress={() => void run('apple')}
          />
        </View>
      ) : null}

      {isGoogleConfigured ? (
        <Button
          label={googleLabel}
          variant={appleAvailable ? 'ghost' : 'primary'}
          onPress={() => void run('google')}
          isLoading={pendingProvider === 'google'}
          disabled={isPending}
          testID={`account-${mode}-google`}
        />
      ) : null}

      {message ? <Text className="text-sm text-danger">{message}</Text> : null}
    </View>
  );
}
