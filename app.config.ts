import type { ExpoConfig } from 'expo/config';

import appJson from './app.json';

/**
 * `app.json` stays the static base; this file only adds the part that depends on the environment.
 *
 * The Google sign-in config plugin needs the iOS client id's reversed URL scheme, and that id
 * already lives in `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` for the SDK — deriving the scheme from it
 * beats checking a second copy of the same value into git. With the variable unset the plugin is
 * left out entirely rather than failing the build (it throws on a missing scheme), which mirrors
 * the runtime: the Google button hides itself when the client ids are missing.
 */
const IOS_CLIENT_ID_SUFFIX = '.apps.googleusercontent.com';

function googleSignInPlugin(): [string, { iosUrlScheme: string }] | null {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (!iosClientId?.endsWith(IOS_CLIENT_ID_SUFFIX)) return null;

  const iosUrlScheme = `com.googleusercontent.apps.${iosClientId.slice(
    0,
    -IOS_CLIENT_ID_SUFFIX.length,
  )}`;
  return ['@react-native-google-signin/google-signin', { iosUrlScheme }];
}

const base = appJson.expo as unknown as ExpoConfig;
const googlePlugin = googleSignInPlugin();

export default (): ExpoConfig => ({
  ...base,
  plugins: [...(base.plugins ?? []), ...(googlePlugin ? [googlePlugin] : [])],
});
