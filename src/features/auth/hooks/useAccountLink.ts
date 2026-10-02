import { useMutation } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/context/AuthContext';
import type { AccountProvider, ProviderCredential } from '@/features/auth/linking/providers';
import {
  ProviderCancelled,
  ProviderUnavailable,
  getProviderCredential,
} from '@/features/auth/linking/providers';
import { logError } from '@/lib/logError';
import { supabase } from '@/lib/supabase';

/**
 * Linking attaches an Apple/Google identity to the *existing* anonymous user, so the user id never
 * changes and nothing in the database has to move: groups, sessions, scores and the profile row all
 * keep pointing at the same id. Restoring is the mirror image — signing in with that same identity
 * on a new device hands back the original user.
 */
export interface LinkedIdentity {
  provider: AccountProvider;
  /** Whatever the provider gave us to recognise the account by; Apple's private relay is fine. */
  email: string | null;
}

const PROVIDER_LABELS: Record<AccountProvider, string> = {
  apple: 'Apple',
  google: 'Google',
};

export function providerLabel(provider: AccountProvider): string {
  return PROVIDER_LABELS[provider];
}

/**
 * Read off the session rather than fetched: `user.identities` is part of every session the auth
 * client emits, so this re-renders by itself when a link succeeds or a restore swaps the user.
 */
export function useLinkedIdentity(): LinkedIdentity | null {
  const { session } = useAuth();

  const identity = session?.user.identities?.find(
    (candidate) => candidate.provider === 'apple' || candidate.provider === 'google',
  );
  if (!identity) return null;

  const email = identity.identity_data?.email;
  return {
    provider: identity.provider as AccountProvider,
    email: typeof email === 'string' ? email : null,
  };
}

/** A brand-new user this many ms old was created by the restore itself, not recovered by it. */
const FRESH_ACCOUNT_WINDOW_MS = 60_000;

export interface RestoreResult {
  /**
   * True when the provider account had never been linked here, so Supabase created a new user
   * instead of returning an existing one. Nothing was recovered — worth saying out loud.
   */
  isNewAccount: boolean;
}

export function useLinkAccount() {
  return useMutation({
    mutationFn: async (provider: AccountProvider): Promise<void> => {
      const credential = await getProviderCredential(provider);
      const { error } = await supabase.auth.linkIdentity(credentialForSupabase(credential));
      if (error) throw error;

      // Linking does not reissue the session on its own, and `identities` lives on the session's
      // user — without this the profile screen would keep saying "not linked" until a cold start.
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        void logError('client:useAccountLink', refreshError, { context: 'refresh after link' });
      }
    },
  });
}

export function useRestoreAccount() {
  return useMutation({
    mutationFn: async (provider: AccountProvider): Promise<RestoreResult> => {
      const credential = await getProviderCredential(provider);
      const { data, error } = await supabase.auth.signInWithIdToken(
        credentialForSupabase(credential),
      );
      if (error) throw error;

      // AuthContext clears the React Query cache when the user id changes, so every screen behind
      // this one refetches against the restored identity rather than showing the old user's rows.
      const createdAt = data.user?.created_at ? Date.parse(data.user.created_at) : NaN;
      const isNewAccount =
        Number.isFinite(createdAt) && Date.now() - createdAt < FRESH_ACCOUNT_WINDOW_MS;

      return { isNewAccount };
    },
  });
}

function credentialForSupabase(credential: ProviderCredential) {
  return {
    provider: credential.provider,
    token: credential.token,
    ...(credential.nonce ? { nonce: credential.nonce } : {}),
  };
}

/**
 * One place that turns everything the two flows can throw into Dutch. `null` means "say nothing":
 * a dismissed system sheet is a decision, not a failure.
 */
export function messageForAccountError(error: unknown, mode: 'link' | 'restore'): string | null {
  if (error instanceof ProviderCancelled) return null;
  if (error instanceof ProviderUnavailable) return error.message;

  const code = (error as { code?: string } | null)?.code;
  const status = (error as { status?: number } | null)?.status;

  if (mode === 'link' && (code === 'identity_already_exists' || status === 422)) {
    return 'Dit account hoort al bij een ander profiel. Kies "Account herstellen" om naar dat profiel te gaan.';
  }
  if (code === 'manual_linking_disabled') {
    return 'Koppelen staat uit op de server. Zet "Manual linking" aan in Supabase.';
  }
  if (code === 'provider_disabled' || code === 'validation_failed') {
    return 'Deze aanmeldmethode is nog niet ingesteld op de server.';
  }

  void logError('client:useAccountLink', error, { context: mode });
  return mode === 'link'
    ? 'Koppelen is niet gelukt. Controleer je verbinding en probeer het opnieuw.'
    : 'Herstellen is niet gelukt. Controleer je verbinding en probeer het opnieuw.';
}
