/**
 * Cross-platform speech-to-text service.
 *
 * Web (Chrome/Edge):       Web Speech API — free, no key, real-time.
 * Native in Expo Go:       Android speech intent — opens Google's built-in dialog,
 *                          free, no API key, works today (expo-intent-launcher).
 * Native in dev build:     expo-speech-recognition — background real-time Google STT,
 *                          free, no dialog (requires npx expo run:android once).
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Optional: expo-speech-recognition (only in dev builds)
let ExpoSpeechRecognitionModule  = null;
let addSpeechRecognitionListener = null;
try {
  const mod = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule  = mod.ExpoSpeechRecognitionModule;
  addSpeechRecognitionListener = mod.addSpeechRecognitionListener;
} catch {}

// expo-intent-launcher (available in Expo Go)
let IntentLauncher = null;
try { IntentLauncher = require('expo-intent-launcher'); } catch {}

// ── helpers ────────────────────────────────────────────────────────────────────

function hasWebSpeech() {
  return (
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  );
}

function isExpoGo() {
  return Constants.appOwnership === 'expo';
}

// ── service ────────────────────────────────────────────────────────────────────

class SpeechService {
  _webRecog    = null;
  _subs        = [];
  _handlers    = null;
  _accumulated = '';
  _intentActive = false;

  isSupported() {
    return hasWebSpeech() || Platform.OS !== 'web';
  }

  start(handlers = {}) {
    this._handlers    = handlers;
    this._accumulated = '';
    this._intentActive = false;

    if (hasWebSpeech()) {
      this._startWeb();
    } else if (Platform.OS !== 'web') {
      this._startNative();
    } else {
      handlers.onError?.('Voice is not supported in this browser. Please use the text input.');
    }
  }

  stop() {
    if (this._webRecog)       { this._webRecog.stop(); return; }
    if (this._intentActive)   { return; } // intent self-terminates when user finishes
    try { ExpoSpeechRecognitionModule?.stop(); } catch {}
  }

  abort() {
    this._handlers     = null;
    this._intentActive = false;
    this._cleanupSubs();
    if (this._webRecog) {
      this._webRecog.abort();
      this._webRecog = null;
      return;
    }
    try { ExpoSpeechRecognitionModule?.abort(); } catch {}
  }

  _cleanupSubs() {
    this._subs.forEach(s => s.remove());
    this._subs = [];
  }

  // ── Native: pick best available path ─────────────────────────────────────────

  _startNative() {
    const canUseNativeSTT =
      !isExpoGo() &&
      ExpoSpeechRecognitionModule !== null;

    if (canUseNativeSTT) {
      this._startSpeechRecognition();
    } else {
      this._startAndroidIntent();
    }
  }

  // ── Path A: expo-speech-recognition (dev build, background, real-time) ───────

  async _startSpeechRecognition() {
    try {
      const { granted } =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) {
        this._handlers?.onError?.(
          'Microphone permission denied.\n' +
          'Go to Settings → Apps → ConstructApp → Permissions → Microphone.'
        );
        return;
      }

      this._cleanupSubs();

      this._subs.push(
        addSpeechRecognitionListener('result', (event) => {
          const text = event.results?.[0]?.transcript ?? '';
          if (event.isFinal) {
            this._accumulated +=
              (this._accumulated ? ' ' : '') + text.trim();
            this._handlers?.onFinal?.(this._accumulated);
          } else {
            this._handlers?.onInterim?.(
              (this._accumulated ? this._accumulated + ' ' : '') + text
            );
          }
        })
      );

      this._subs.push(
        addSpeechRecognitionListener('error', (event) => {
          this._cleanupSubs();
          if (event.error === 'aborted') return;
          this._handlers?.onError?.(event.message || `Speech error: ${event.error}`);
        })
      );

      this._subs.push(
        addSpeechRecognitionListener('end', () => {
          this._cleanupSubs();
          this._handlers?.onEnd?.(this._accumulated);
        })
      );

      ExpoSpeechRecognitionModule.start({
        lang:           'en-US',
        interimResults: true,
        continuous:     true,
      });

      this._handlers?.onInterim?.('Listening... speak now');

    } catch (err) {
      this._cleanupSubs();
      this._handlers?.onError?.(err.message ?? 'Could not start speech recognition.');
    }
  }

  // ── Path B: Android speech intent (Expo Go, opens Google dialog) ──────────────

  async _startAndroidIntent() {
    if (!IntentLauncher || Platform.OS !== 'android') {
      this._handlers?.onError?.(
        'Voice recognition is not available. Please use the text input.'
      );
      return;
    }

    this._intentActive = true;
    this._handlers?.onInterim?.('Opening Google speech dialog...');

    try {
      const result = await IntentLauncher.startActivityAsync(
        'android.speech.action.RECOGNIZE_SPEECH',
        {
          extra: {
            'android.speech.extra.LANGUAGE_MODEL': 'free_form',
            'android.speech.extra.LANGUAGE':       'en-US',
            'android.speech.extra.MAX_RESULTS':    1,
            'android.speech.extra.PROMPT':
              'Speak your material request',
          },
        }
      );

      this._intentActive = false;

      if (!this._handlers) return; // aborted

      if (result.resultCode === -1) {
        // RESULT_OK — extract the recognised text
        const texts = result.extra?.['android.speech.extra.RESULTS'];
        const text  = Array.isArray(texts) ? texts[0] : (texts ?? '');
        this._handlers?.onEnd?.(text.trim());
      } else {
        // User cancelled the dialog
        this._handlers?.onEnd?.('');
      }
    } catch (err) {
      this._intentActive = false;
      this._handlers?.onError?.(
        err.message ?? 'Speech recognition failed. Please use the text input.'
      );
    }
  }

  // ── Web Speech API (browser) ──────────────────────────────────────────────────

  _startWeb() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recog = new SR();
    recog.continuous      = true;
    recog.interimResults  = true;
    recog.lang            = 'en-US';
    recog.maxAlternatives = 1;
    this._webRecog = recog;

    recog.onresult = (event) => {
      let interim = '';
      let final   = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final   += t;
        else                          interim += t;
      }
      if (final) {
        this._accumulated +=
          (this._accumulated ? ' ' : '') + final.trim();
        this._handlers?.onFinal?.(this._accumulated);
      }
      if (interim) {
        this._handlers?.onInterim?.(
          (this._accumulated ? this._accumulated + ' ' : '') + interim
        );
      }
    };

    recog.onend = () => {
      this._webRecog = null;
      this._handlers?.onEnd?.(this._accumulated);
    };

    recog.onerror = (ev) => {
      const map = {
        'not-allowed': 'Microphone access denied. Allow it in browser settings.',
        'no-speech':   'No speech detected. Speak clearly and try again.',
        'network':     'Network error during speech recognition.',
        'aborted':     null,
      };
      const msg = map[ev.error] ?? `Speech error: ${ev.error}`;
      if (msg) this._handlers?.onError?.(msg);
    };

    recog.start();
  }
}

export default new SpeechService();
