# ConstructApp — Claude Code Instructions

Expo React Native app for construction site material requests, built for **Perituza Software Solutions, LLC**.

## Project Structure

```
ConstructApp/
├── screens/
│   ├── SelectProjectScreen.js   # Home — project tile grid
│   ├── NewRequestScreen.js      # Voice recording + material request flow
│   ├── AddItemScreen.js         # Manual item entry
│   ├── ReviewSubmitScreen.js    # Review & submit request
│   └── DraftsScreen.js         # Saved draft requests
├── components/
│   ├── VoiceKeySetupModal.js    # API key setup modal
│   └── WebViewSpeech.js        # WebView-based speech fallback
├── services/
│   ├── speechService.js         # Microphone / speech recognition logic
│   └── materialExtractor.js     # AI material parsing (Anthropic + OpenAI)
├── assets/                      # Icons, splash screen images
├── app.json                     # Expo config — never commit real API keys here
├── eas.json                     # EAS build profiles
└── .github/workflows/build.yml  # GitHub Actions — signed release APK
```

## Tech Stack

- **Expo SDK** 54 / React Native 0.81.5 / React 19
- **Navigation** — @react-navigation/native-stack
- **Speech** — expo-speech-recognition + expo-av
- **AI** — Anthropic API (Claude) + OpenAI (Whisper)
- **Storage** — expo-secure-store, expo-file-system
- **Build** — GitHub Actions → signed release APK (Android Enterprise compatible)

## Commands

```bash
# Start dev server
npx expo start

# Run on Android device/emulator
npx expo start --android

# Generate native Android project (before local Gradle build)
npx expo prebuild --platform android --clean

# Install dependencies (use ci for reproducible builds)
npm ci
```

## Build & Release

- Pushing to `main` triggers GitHub Actions and produces a **signed release APK**
- Build profile: `preview` in `eas.json` → `assembleRelease`
- APK is uploaded as a GitHub Actions artifact (retained 30 days)
- Android package name: `com.constructapp.materialrequest`

### Required GitHub Secrets

| Secret | Purpose |
|---|---|
| `KEYSTORE_BASE64` | Base64-encoded release keystore |
| `KEYSTORE_PASSWORD` | Keystore password |
| `KEY_ALIAS` | Key alias inside keystore |
| `KEY_PASSWORD` | Key password |
| `ANTHROPIC_API_KEY` | Claude API key |
| `OPENAI_API_KEY` | OpenAI / Whisper API key |

## Design Conventions

- **Primary color** `#1B3A8C` — header blue
- **Accent / danger** `#EF4444` — stop button only (recording screen)
- **Recording screen background** `#DBEAFE` — light blue
- **Footer text** — `©2026 Perituza Software Solutions, LLC. | Privacy` (always visible, bottom of SelectProjectScreen)
- No emojis in UI unless already present

## Key Rules

- **Never commit real API keys** — `app.json` must keep placeholder values; keys are injected at build time via GitHub Secrets
- API keys in `app.json` `extra` field are placeholders: `YOUR_ANTHROPIC_API_KEY_HERE`, `YOUR_OPENAI_API_KEY_HERE`
- Do not change the Android package name (`com.constructapp.materialrequest`) — it is tied to the release keystore
- Always use `npm ci` (not `npm install`) in CI for reproducible installs
- Release APK must be signed — unsigned builds are not accepted by the EMM/MDM system
