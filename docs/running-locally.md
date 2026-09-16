# Running the app locally

## Prerequisites

- Node.js and [pnpm](https://pnpm.io) (`corepack enable` will pick up the pinned version in `package.json`)
- A phone with [Expo Go](https://expo.dev/go) installed, **or** a USB-connected Android/iOS device with
  developer mode enabled for a dev-client build
- Access to the project's Supabase credentials (ask the project owner, or see `eas.json` for the
  values used in EAS builds)

## Setup

1. `pnpm install`
2. Create `.env.local` in the project root with:
   ```
   EXPO_PUBLIC_SUPABASE_URL=<supabase project url>
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<supabase anon/publishable key>
   ```
3. `pnpm start` — this runs `expo start` and prints a QR code plus a Metro URL

## Running on a device

**Expo Go (fastest, no native build needed):**
Scan the QR code from `pnpm start` with the Expo Go app. Works over the same Wi-Fi network as your
computer.

**USB-connected device (dev client, needed once native modules are involved):**
1. Plug the device in via USB and enable USB debugging (Android) or trust the computer (iOS)
2. Build and install the dev client once:
   - Android: `pnpm android` (runs `expo run:android`)
   - iOS: `pnpm ios` (runs `expo run:ios`, requires Xcode and a Mac)
3. After that, `pnpm start` and open the app already installed on the device — it connects to Metro
   automatically

## Notes

- The app targets a dark `userInterfaceStyle` and is in Dutch for all user-facing copy — this is
  intentional, not a locale bug.
- For building and submitting release builds via EAS, see `docs/deployment.md`.
