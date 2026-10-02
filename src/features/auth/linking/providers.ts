import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

/**
 * The only module that talks to the native sign-in SDKs. Everything above it deals in a
 * `ProviderCredential` — an OIDC id token plus the nonce it was obtained with — which is exactly
 * what both `linkIdentity()` and `signInWithIdToken()` take.
 *
 * Native id tokens rather than the browser OAuth flow: a token handed to us by the system SDK never
 * travels through a redirect URL, so `gamenighthq://` stays what it is today — an unverified custom
 * scheme that carries no credentials and needs no deep-link handler (see AuthContext).
 */
export type AccountProvider = 'apple' | 'google';

/**
 * Kill switch for every account-linking entry point (profile back-up section, onboarding restore
 * link). Off while linking doesn't work end to end; flip to true once it does.
 */
export const ACCOUNT_LINKING_ENABLED = false;

export interface ProviderCredential {
  provider: AccountProvider;
  /** OIDC id token, verified server-side by Supabase against the provider's keys. */
  token: string;
  /** The raw nonce; Supabase hashes it and compares against the token's `nonce` claim. */
  nonce?: string;
}

/** Thrown when the person dismissed the system sheet. Not an error to show — just a no-op. */
export class ProviderCancelled extends Error {
  constructor() {
    super('provider sign-in cancelled');
    this.name = 'ProviderCancelled';
  }
}

/** Thrown when a provider cannot run on this device at all (no Play Services, not configured). */
export class ProviderUnavailable extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderUnavailable';
  }
}

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

/**
 * Without client ids there is nothing to sign in with, so the button is hidden rather than shown
 * and then failing. A build that simply hasn't had the ids added yet keeps working as before.
 */
export const isGoogleConfigured = Boolean(GOOGLE_WEB_CLIENT_ID);

/** Apple's sheet exists on iOS 13+ only; on Android it would need the web redirect flow we avoid. */
export async function isAppleAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync();
}

const NONCE_BYTES = 16;

function randomNonce(): string {
  return Array.from(Crypto.getRandomBytes(NONCE_BYTES))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function hasCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === code;
}

/**
 * Apple puts whatever nonce it is handed into the id token verbatim, so the request carries the
 * *hash* and Supabase gets the raw value to hash and compare. Sending the raw nonce to Apple would
 * publish it in the token and defeat the point.
 */
async function getAppleCredential(): Promise<ProviderCredential> {
  const rawNonce = randomNonce();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!credential.identityToken) {
      throw new Error('Apple sign-in returned no identity token');
    }

    // `credential.fullName` is deliberately ignored: the display name is this app's own field,
    // asked once during onboarding, and a link should never quietly rename someone.
    return { provider: 'apple', token: credential.identityToken, nonce: rawNonce };
  } catch (error) {
    if (hasCode(error, 'ERR_REQUEST_CANCELED')) throw new ProviderCancelled();
    throw error;
  }
}

let isGoogleConfiguredOnce = false;

function configureGoogleOnce(): void {
  if (isGoogleConfiguredOnce) return;
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new ProviderUnavailable('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set');
  }

  // The web client id is what the id token is issued *for* on every platform — it is the audience
  // Supabase checks — while the iOS client id identifies the app to the local SDK.
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
  });
  isGoogleConfiguredOnce = true;
}

/**
 * No nonce here: this SDK's sign-in has no way to set one, so the token carries no `nonce` claim
 * and Supabase has nothing to check. The token is still bound to our client id and verified against
 * Google's keys server-side.
 */
async function getGoogleCredential(): Promise<ProviderCredential> {
  configureGoogleOnce();

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Drop the SDK's cached choice first, so the account picker always appears. Restoring on a
    // shared or hand-me-down device otherwise silently reuses whoever signed in last.
    await GoogleSignin.signOut();

    const response = await GoogleSignin.signIn();
    if (response.type === 'cancelled') throw new ProviderCancelled();

    const token = response.data.idToken;
    if (!token) throw new Error('Google sign-in returned no id token');

    return { provider: 'google', token };
  } catch (error) {
    if (error instanceof ProviderCancelled) throw error;
    if (hasCode(error, statusCodes.SIGN_IN_CANCELLED)) throw new ProviderCancelled();
    if (hasCode(error, statusCodes.PLAY_SERVICES_NOT_AVAILABLE)) {
      throw new ProviderUnavailable('Google Play-services zijn niet beschikbaar op dit toestel.');
    }
    throw error;
  }
}

export function getProviderCredential(provider: AccountProvider): Promise<ProviderCredential> {
  return provider === 'apple' ? getAppleCredential() : getGoogleCredential();
}
