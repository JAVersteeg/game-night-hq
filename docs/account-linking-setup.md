# Account koppelen met Apple/Google — setup

De code is er (`src/features/auth/linking/`, `src/features/auth/hooks/useAccountLink.ts`), maar
koppelen werkt pas als de providers buiten de repo zijn ingesteld. Niets hiervan is uit de repo af
te leiden, vandaar dit bestand.

Zonder deze stappen blijft de app gewoon werken: de Google-knop verbergt zichzelf als de client-id's
ontbreken, en de Apple-knop verschijnt alleen op iOS.

## 1. Google Cloud — OAuth client id's

In [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials,
binnen hetzelfde project drie client id's aanmaken:

| Type | Waarvoor | Invullen |
| --- | --- | --- |
| **Web** | De *audience* van elke id token, op alle platforms. Supabase controleert deze. | — |
| **iOS** | Identificeert de app bij de lokale SDK + de callback-URL-scheme. | Bundle id `com.jversteeg.gamenighthq` |
| **Android** | Zonder deze weigert Google te tekenen op Android. | Package ` ` + SHA-1 uit `eas credentials` |

Let op: voor Android heb je de SHA-1 van élke keystore nodig waarmee je bouwt — de EAS-keystore én
(bij een Play-release) de app-signing-key uit Play Console → Setup → App signing.

## 2. Apple Developer

App ID `com.jversteeg.gamenighthq` → Capabilities → **Sign in with Apple** aanzetten. De
`expo-apple-authentication` plugin in `app.json` zet de entitlement in de build.

## 3. Supabase dashboard → Authentication

- **Providers → Apple**: aan. Client IDs = `com.jversteeg.gamenighthq`.
- **Providers → Google**: aan. Authorized Client IDs = de web-, iOS- én Android-client-id
  (komma-gescheiden). De gratis Google-SDK kan geen eigen nonce meesturen, dus de token bevat geen
  `nonce`-claim en valt er niets te vergelijken. Komt er tóch een nonce-fout terug, zet dan **"Skip
  nonce checks"** aan bij de Google-provider. Apple krijgt wél een nonce (gehasht naar Apple, rauw
  naar Supabase) — daar hoeft niets voor aangezet te worden.
- **Manual linking** moet aan staan (Authentication → Sign In / Providers), anders geeft
  `linkIdentity()` `manual_linking_disabled`.

## 4. Environment variables

Twee nieuwe variabelen, naast de bestaande Supabase-vars:

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=661276532682-xxxxxxxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=661276532682-xxxxxxxx.apps.googleusercontent.com
```

Plak de client-id precies zoals Google hem toont — `.apps.googleusercontent.com` zit er al aan vast.
Staat dat achtervoegsel er twee keer, dan is de id ongeldig en geeft Google op Android een
`DEVELOPER_ERROR` die niets over de oorzaak zegt.

Zetten op twee plekken:

1. `.env` — voor lokaal draaien.
2. `eas.json`, in `build.development.env`, `build.preview.env` én `build.production.env` — EAS leest
   `.env` niet.

De Android-client-id hoort nergens in de app: Google koppelt die aan package + SHA-1, en de token
wordt alsnog voor de web-client-id uitgegeven.

`app.config.ts` leidt de iOS-URL-scheme af uit `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`. Staat die niet
gezet, dan wordt de Google-plugin overgeslagen (hij crasht op een ontbrekende scheme) — de build
slaagt, alleen Google op iOS doet het niet.

## 5. Bouwen

Beide SDK's zijn native, dus Expo Go kan dit niet draaien:

```
eas build --profile development --platform android
eas build --profile development --platform ios
```

## Testen

1. Koppelen: verse install → naam → groep maken → Profiel → "Koppelen met Google". De sectie moet
   omslaan naar "Gekoppeld met Google". In Supabase heeft die user dan twee rijen in
   `auth.identities` (`anonymous` + `google`) met hetzelfde `user_id`.
2. Herstellen: app verwijderen → opnieuw installeren → op het naamscherm "Al eerder gespeeld op een
   ander toestel?" → aanmelden. Groepen, potjes en statistieken staan er weer, inclusief je oude
   naam.
3. Conflict: op een tweede toestel hetzelfde Google-account koppelen aan een andere anonieme user →
   "Dit account hoort al bij een ander profiel".
4. Annuleren: het systeemvenster wegvegen mag niets doen en geen fout tonen.
