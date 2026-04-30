/**
 * In-app voice transcription key setup.
 * Supports two providers:
 *   - HuggingFace  (free account, no credit card)
 *   - OpenAI       (paid, best quality ~$0.006/min)
 * Keys are stored in expo-secure-store — no restart needed.
 */
import { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Linking, Platform, ActivityIndicator,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const HF_STORE_KEY  = 'voice_hf_token';
export const OAI_STORE_KEY = 'voice_oai_key';

/** Read whichever key is saved. Returns { provider, key } or null. */
export async function getSavedVoiceKey() {
  try {
    const hf  = await SecureStore.getItemAsync(HF_STORE_KEY);
    if (hf)  return { provider: 'hf',  key: hf };
    const oai = await SecureStore.getItemAsync(OAI_STORE_KEY);
    if (oai) return { provider: 'oai', key: oai };
  } catch {}
  return null;
}

export default function VoiceKeySetupModal({ visible, onDismiss, onSaved }) {
  const [provider, setProvider] = useState('hf');
  const [keyText,  setKeyText]  = useState('');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  function switchProvider(p) {
    setProvider(p);
    setKeyText('');
    setError('');
  }

  async function handleSave() {
    const k = keyText.trim();
    if (!k) { setError('Please paste your key above.'); return; }

    if (provider === 'hf' && !k.startsWith('hf_')) {
      setError('HuggingFace tokens start with "hf_"  — check you copied the full token.');
      return;
    }
    if (provider === 'oai' && !k.startsWith('sk-')) {
      setError('OpenAI keys start with "sk-"  — check you copied the full key.');
      return;
    }

    setSaving(true);
    try {
      const storeKey = provider === 'hf' ? HF_STORE_KEY : OAI_STORE_KEY;
      await SecureStore.setItemAsync(storeKey, k);
      setKeyText('');
      setError('');
      onSaved(provider);
    } catch (e) {
      setError('Could not save key. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheet}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.handle} />
            <Text style={styles.title}>Set up Voice Transcription</Text>
            <Text style={styles.subtitle}>
              Your voice is recorded on device. Choose a service to convert it to text.
            </Text>

            {/* Provider toggle */}
            <View style={styles.toggle}>
              <TouchableOpacity
                style={[styles.toggleBtn, provider === 'hf' && styles.toggleBtnActive]}
                onPress={() => switchProvider('hf')}
              >
                <Text style={styles.toggleIcon}>🤗</Text>
                <Text style={[styles.toggleName, provider === 'hf' && styles.toggleNameActive]}>
                  HuggingFace
                </Text>
                <View style={styles.freeBadge}>
                  <Text style={styles.freeBadgeText}>FREE</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toggleBtn, provider === 'oai' && styles.toggleBtnActive]}
                onPress={() => switchProvider('oai')}
              >
                <Text style={styles.toggleIcon}>⚡</Text>
                <Text style={[styles.toggleName, provider === 'oai' && styles.toggleNameActive]}>
                  OpenAI
                </Text>
                <View style={styles.paidBadge}>
                  <Text style={styles.paidBadgeText}>$0.006/min</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Instructions */}
            {provider === 'hf' ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoHeading}>Get a FREE HuggingFace token (2 min)</Text>
                <View style={styles.stepRow}>
                  <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
                  <Text style={styles.stepText}>Sign up free at huggingface.co/join</Text>
                </View>
                <View style={styles.stepRow}>
                  <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
                  <Text style={styles.stepText}>
                    Click your avatar → Settings → Access Tokens
                  </Text>
                </View>
                <View style={styles.stepRow}>
                  <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
                  <Text style={styles.stepText}>
                    Create token → copy the <Text style={styles.mono}>hf_...</Text> value
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.linkBtn}
                  onPress={() => Linking.openURL('https://huggingface.co/join')}
                >
                  <Text style={styles.linkBtnText}>Open huggingface.co →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.infoCard}>
                <Text style={styles.infoHeading}>Get an OpenAI API key</Text>
                <View style={styles.stepRow}>
                  <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
                  <Text style={styles.stepText}>Go to platform.openai.com → Sign in</Text>
                </View>
                <View style={styles.stepRow}>
                  <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
                  <Text style={styles.stepText}>API Keys → Create new secret key</Text>
                </View>
                <View style={styles.stepRow}>
                  <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
                  <Text style={styles.stepText}>
                    Copy the <Text style={styles.mono}>sk-...</Text> key and add $5 credit
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.linkBtn}
                  onPress={() => Linking.openURL('https://platform.openai.com/api-keys')}
                >
                  <Text style={styles.linkBtnText}>Open platform.openai.com →</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Key input */}
            <Text style={styles.inputLabel}>
              Paste your {provider === 'hf' ? 'HuggingFace token' : 'OpenAI key'} here:
            </Text>
            <TextInput
              style={styles.input}
              value={keyText}
              onChangeText={(t) => { setKeyText(t); setError(''); }}
              placeholder={provider === 'hf' ? 'hf_xxxxxxxxxxxxxxxx' : 'sk-proj-xxxxxxxx'}
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠ {error}</Text>
              </View>
            )}

            {/* Save button */}
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnOff]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save & Enable Voice</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipBtn} onPress={onDismiss}>
              <Text style={styles.skipText}>Skip — use text input instead</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginTop: 10, marginBottom: 4,
  },
  content: { padding: 22, paddingBottom: 44 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 20 },
  toggle: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  toggleBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  toggleBtnActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  toggleIcon: { fontSize: 22 },
  toggleName: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  toggleNameActive: { color: '#2563EB' },
  freeBadge: {
    backgroundColor: '#D1FAE5', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  freeBadgeText: { color: '#065F46', fontSize: 11, fontWeight: '700' },
  paidBadge: {
    backgroundColor: '#F3F4F6', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  paidBadgeText: { color: '#6B7280', fontSize: 11, fontWeight: '600' },
  infoCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoHeading: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 10 },
  stepNum: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 18 },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#1D4ED8' },
  linkBtn: { marginTop: 8, alignSelf: 'flex-start' },
  linkBtnText: { color: '#2563EB', fontSize: 13, fontWeight: '600' },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: { color: '#B91C1C', fontSize: 13 },
  saveBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  saveBtnOff: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipText: { color: '#9CA3AF', fontSize: 13 },
});
