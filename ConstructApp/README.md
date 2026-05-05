# ConstructApp

A voice-first mobile app for construction site material requests. Field workers speak or type a request; Claude AI parses it into a structured material order that can be reviewed, edited, and submitted.

Built with **Expo SDK 54** · **React Native 0.81.5** · **React 19**

---

## Features

- **Voice input** — tap the microphone, speak naturally ("4 bags of type-S mortar, Friday morning")
- **AI extraction** — Claude Haiku parses voice transcripts into name / quantity / spec fields
- **Regex fallback** — works offline if no API key is configured
- **Review & edit** — inline editing of every extracted field before submission
- **Drafts** — unfinished requests are auto-saved and resumable
- **Multi-item requests** — add extra items by voice or text after the initial recording
- **Android Enterprise compatible** — signed release APK, targets SDK 34+

---

## Project Structure

```
ConstructApp/
├── screens/
│   ├── SelectProjectScreen.js   # Home — project tile grid
│   ├── NewRequestScreen.js      # Voice/text recording + AI extraction
│   ├── AddItemScreen.js         # Add extra items to a request
│   ├── ReviewSubmitScreen.js    # Review, edit, and submit
│   └── DraftsScreen.js         # Saved draft requests
├── hooks/
│   └── useVoiceRecorder.js      # Shared voice recording logic (timer, STT, status)
├── services/
│   ├── speechService.js         # Cross-platform STT (Web Speech / expo-speech-recognition / Android Intent)
│   └── materialExtractor.js     # Claude AI extraction with regex fallback
├── context/
│   └── AppContext.js            # Draft state management
├── assets/                      # App icons and splash screen
├── app.json                     # Expo configuration
├── eas.json                     # EAS build profiles
└── .github/workflows/build.yml  # CI — signed release APK
```

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20+ |
| npm | 10+ |
| Expo CLI | `npm install -g expo-cli` |
| EAS CLI | `npm install -g eas-cli` |

---

## Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/anuradha-perituza/ConstructApp.git
cd ConstructApp

# 2. Install dependencies
npm ci

# 3. Copy environment template and fill in your keys
cp .env.example .env

# 4. Add your API keys to app.json (or let CI inject them)
#    See "API Keys" section below

# 5. Start the development server
npx expo start
```

### Run on a device or emulator

```bash
npx expo start --android   # Android emulator or device
npx expo start --ios       # iOS simulator (macOS only)
npx expo start --web       # Browser (Web Speech API)
```

### Build a dev APK (enables background speech recognition)

```bash
npx expo run:android
```

> This generates a local debug build with `expo-speech-recognition` fully wired. Required for real-time background STT on Android.

---

## API Keys

API keys are **never committed**. They are injected at build time from GitHub Secrets or set locally in `app.json`.

### Local development

Edit `app.json` and replace the placeholders:

```json
"extra": {
  "anthropicApiKey": "sk-ant-...",
  "openaiApiKey":    "sk-..."
}
```

> The app works without keys — it falls back to local regex extraction.

### CI / Production

Keys are injected by GitHub Actions from repository secrets. See [Build & Release](#build--release).

---

## Speech Recognition

The app automatically picks the best available engine:

| Environment | Engine | Notes |
|---|---|---|
| Web (Chrome/Edge) | Web Speech API | Free, real-time, no key |
| Android dev build | `expo-speech-recognition` | Free Google STT, background, real-time |
| Android Expo Go | Android Speech Intent | Free, opens Google dialog |
| iOS Expo Go | Not supported | Use text input |

---

## Build & Release

Pushing to `main` triggers GitHub Actions and produces a **signed release APK**.

### Required GitHub Secrets

| Secret | Description |
|---|---|
| `KEYSTORE_BASE64` | Base64-encoded release keystore (`base64 -w 0 release.jks`) |
| `KEYSTORE_PASSWORD` | Keystore password |
| `KEY_ALIAS` | Key alias inside the keystore |
| `KEY_PASSWORD` | Key password |
| `ANTHROPIC_API_KEY` | Claude API key |
| `OPENAI_API_KEY` | OpenAI API key |

### Generate a release keystore (one-time)

```bash
keytool -genkey -v \
  -keystore release.jks \
  -alias constructapp \
  -keyalg RSA -keysize 2048 \
  -validity 10000
```

### EAS Build (cloud alternative)

```bash
eas login
eas build --platform android --profile preview   # APK
eas build --platform android --profile production # AAB for Play Store
```

---

## Android Enterprise

The release APK meets Android Enterprise requirements:

- Signed with V2/V3 APK Signature Scheme
- `android:debuggable="false"` in release build
- Targets Android 14 (API 34)
- Declares only required permissions (`RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`)

---

## Environment Variables Reference

See [.env.example](.env.example) for the full list. Keys are read via `expo-constants` from `app.json extra`.

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | Expo SDK 54 / React Native 0.81.5 |
| Navigation | @react-navigation/native-stack |
| Speech STT | expo-speech-recognition, expo-intent-launcher |
| AI extraction | Anthropic Claude API (claude-haiku-4-5) |
| Secure storage | expo-secure-store |
| Build / CI | GitHub Actions + EAS Build |

---

## Known Limitations

- Project list is currently hardcoded — API integration planned
- User identity is a placeholder — auth system planned
- "Change project" and language settings are not yet implemented
- Anthropic API is called directly from the client — a server-side proxy is recommended for production

---

## License

Private — © 2026 Perituza Software Solutions, LLC. All rights reserved.
