/**
 * New Request Screen
 * Voice flow:  idle → listening → processing → navigate to ReviewSubmit
 * Native: expo-speech-recognition (Google STT, free, instant) — needs dev build.
 * Web:    Web Speech API (Chrome/Edge) — free, no key.
 */
import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar,
  TextInput, ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import speechService from '../services/speechService';
import { extractMaterial } from '../services/materialExtractor';

function buildRequestFromExtracted(extracted, ts) {
  return {
    id: String(ts),
    timestamp: 'Just now',
    items: [{
      id: `${ts}_1`,
      name: extracted.name,
      quantity: extracted.quantity,
      spec: extracted.spec,
    }],
    needed: '',
    delivery: '',
    contact: '',
    urgency: '',
    warning: '',
  };
}

export default function NewRequestScreen({ navigation, route }) {
  const { project, clearedForReRecord } = route.params ?? {};
  const [status, setStatus] = useState('idle'); // idle | listening | processing
  const [liveTranscript, setLiveTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [typeText, setTypeText] = useState('');
  const [showBanner, setShowBanner] = useState(!!clearedForReRecord);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!showBanner) return;
    const t = setTimeout(() => setShowBanner(false), 4000);
    return () => clearTimeout(t);
  }, [showBanner]);

  useEffect(() => {
    if (status === 'listening') {
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [status]);

  function startListening() {
    setLiveTranscript('');
    setFinalTranscript('');

    speechService.start({
      onInterim: (text) => setLiveTranscript(text),
      onFinal: (text) => { setFinalTranscript(text); setLiveTranscript(text); },
      onEnd: async (fullText) => {
        if (!fullText.trim()) { setStatus('idle'); return; }
        setStatus('processing'); // ensure processing screen shows (covers intent path)
        setFinalTranscript(fullText);
        const extracted = await extractMaterial(fullText);
        navigation.navigate('ReviewSubmit', {
          project,
          request: buildRequestFromExtracted(extracted, Date.now()),
        });
        setStatus('idle');
      },
      onError: (msg) => {
        setStatus('idle');
        if (msg === 'NEEDS_DEV_BUILD') {
          Alert.alert(
            'One-time setup needed',
            'To enable free voice recognition on your phone, run this command once on your PC:\n\nnpx expo run:android\n\nThis builds the app with Google\'s built-in speech engine.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Voice Error', msg, [{ text: 'OK' }]);
        }
      },
    });

    setStatus('listening');
  }

  function stopListening() {
    setStatus('processing');
    speechService.stop();
  }

  function cancelListening() {
    speechService.abort();
    setStatus('idle');
    setLiveTranscript('');
    setFinalTranscript('');
  }

  async function handleTypeSubmit() {
    if (!typeText.trim()) return;
    setStatus('processing');
    const extracted = await extractMaterial(typeText.trim());
    navigation.navigate('ReviewSubmit', {
      project,
      request: buildRequestFromExtracted(extracted, Date.now()),
    });
    setStatus('idle');
  }

  function formatTime(secs) {
    return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  }

  // ── LISTENING ──────────────────────────────────────────────────────────────
  if (status === 'listening') {
    return (
      <SafeAreaView style={styles.safeRec}>
        <StatusBar barStyle="light-content" backgroundColor="#991B1B" />
        <View style={styles.recHeader}>
          <Text style={styles.recProject}>{project?.name}</Text>
          <View style={styles.recBadge}>
            <View style={styles.recDot} />
            <Text style={styles.recLabel}>REC</Text>
          </View>
        </View>
        <View style={styles.recTitleBar}>
          <Text style={styles.recTitle}>Recording...</Text>
        </View>

        <ScrollView contentContainerStyle={styles.recBody}>
          <Text style={styles.timer}>{formatTime(seconds)}</Text>

          <View style={styles.waveform}>
            {[14, 28, 18, 36, 22, 32, 16, 26, 12].map((h, i) => (
              <View key={i} style={[styles.waveBar, { height: h + (seconds % 3) * 3 }]} />
            ))}
          </View>

          <View style={styles.transcriptBox}>
            <Text style={styles.transcriptLabel}>LIVE TRANSCRIPT</Text>
            <Text style={styles.transcriptText}>
              {liveTranscript || 'Listening... speak your request'}
            </Text>
          </View>

          <TouchableOpacity style={styles.stopBtn} onPress={stopListening}>
            <View style={styles.stopIcon} />
          </TouchableOpacity>
          <Text style={styles.tapToStop}>Tap to stop</Text>

          <TouchableOpacity onPress={cancelListening}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── PROCESSING ─────────────────────────────────────────────────────────────
  if (status === 'processing') {
    return (
      <SafeAreaView style={styles.safeProcessing}>
        <StatusBar barStyle="light-content" backgroundColor="#1B3A8C" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>New material request</Text>
          <View style={styles.projectRow}>
            <View style={styles.greenDot} />
            <Text style={styles.projectSub}>{project?.name}</Text>
          </View>
        </View>
        <View style={styles.processingBody}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.processingTitle}>Extracting materials...</Text>
          {!!finalTranscript && (
            <Text style={styles.processingTranscript}>"{finalTranscript}"</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ── IDLE ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1B3A8C" />

      {showBanner && (
        <View style={styles.clearedBanner}>
          <Text style={styles.clearedIcon}>↺</Text>
          <Text style={styles.clearedText}>
            Previous request cleared — ready to re-record
          </Text>
        </View>
      )}

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('SelectProject')}>
          <Text style={styles.backText}>← Projects</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New material request</Text>
        <View style={styles.projectRow}>
          <View style={styles.greenDot} />
          <Text style={styles.projectSub}>
            {project?.name} · {project?.location}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.micCard}>
            <TouchableOpacity style={styles.micBtn} onPress={startListening} activeOpacity={0.8}>
              <Text style={styles.micEmoji}>🎤</Text>
            </TouchableOpacity>
            <Text style={styles.micLabel}>Tap and speak your request</Text>
            <Text style={styles.micExample}>
              "I need 4 bags of type-S mortar and 10 sheets of plywood,{'\n'}
              Friday morning, north entrance"
            </Text>
            {Platform.OS !== 'web' && (
              <View style={styles.nativeBadge}>
                <Text style={styles.nativeBadgeText}>
                  🎤 Using device microphone · Whisper AI transcription
                </Text>
              </View>
            )}
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or type instead</Text>
            <View style={styles.dividerLine} />
          </View>

          <TextInput
            style={styles.typeInput}
            placeholder="Describe materials, quantities, delivery details..."
            placeholderTextColor="#9CA3AF"
            value={typeText}
            onChangeText={setTypeText}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          {typeText.trim().length > 0 && (
            <TouchableOpacity style={styles.continueBtn} onPress={handleTypeSubmit}>
              <Text style={styles.continueBtnText}>Continue →</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footerBar}>
        <Text style={styles.footerText}>
          🌐 Recording in English ·{' '}
          <Text style={styles.footerLink}>Change in profile</Text>
        </Text>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F4F6' },
  safeRec: { flex: 1, backgroundColor: '#DBEAFE' },
  safeProcessing: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    backgroundColor: '#1B3A8C',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 22,
  },
  backText: { color: '#93C5FD', fontSize: 14, marginBottom: 8 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  projectRow: { flexDirection: 'row', alignItems: 'center' },
  greenDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#22C55E', marginRight: 6,
  },
  projectSub: { color: '#93C5FD', fontSize: 13 },
  body: { padding: 16, paddingTop: 24 },
  micCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 28,
    alignItems: 'center',
    marginBottom: 20,
  },
  micBtn: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 5,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  micEmoji: { fontSize: 36 },
  micLabel: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 },
  micExample: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  nativeBadge: {
    marginTop: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  nativeBadgeText: { color: '#1D4ED8', fontSize: 11, textAlign: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: 12, color: '#9CA3AF', fontSize: 12 },
  typeInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    color: '#111827',
    minHeight: 84,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  continueBtn: {
    marginTop: 12,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  continueBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  footerBar: {
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: { color: '#9CA3AF', fontSize: 12 },
  footerLink: { color: '#2563EB' },
  clearedBanner: {
    backgroundColor: '#FFF7ED',
    borderBottomWidth: 1,
    borderBottomColor: '#FED7AA',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
  },
  clearedIcon: { fontSize: 14, color: '#F97316', marginRight: 8 },
  clearedText: { color: '#92400E', fontSize: 13, flex: 1 },
  // Processing screen
  processingBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  processingTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  processingTranscript: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Recording screen
  recHeader: {
    backgroundColor: '#991B1B',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  recProject: { color: '#fff', fontSize: 15, fontWeight: '600' },
  recBadge: { flexDirection: 'row', alignItems: 'center' },
  recDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#FCA5A5', marginRight: 6,
  },
  recLabel: { color: '#FCA5A5', fontSize: 13, fontWeight: '700' },
  recTitleBar: { backgroundColor: '#DBEAFE', paddingHorizontal: 16, paddingBottom: 16 },
  recTitle: { color: '#1E3A8A', fontSize: 24, fontWeight: '700' },
  recBody: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 30,
    gap: 22,
  },
  timer: { fontSize: 46, fontWeight: '700', color: '#1D4ED8', letterSpacing: 2 },
  waveform: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  waveBar: { width: 5, backgroundColor: '#3B82F6', borderRadius: 3 },
  transcriptBox: {
    backgroundColor: 'rgba(255,255,255,0.70)',
    borderRadius: 10,
    padding: 14,
    width: '100%',
    minHeight: 90,
  },
  transcriptLabel: {
    color: '#1D4ED8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  transcriptText: { color: '#1E3A8A', fontSize: 14, lineHeight: 22 },
  stopBtn: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center',
  },
  stopIcon: { width: 22, height: 22, backgroundColor: '#fff', borderRadius: 4 },
  tapToStop: { color: '#1D4ED8', fontSize: 13 },
  cancelText: { color: '#1D4ED8', fontSize: 14, textDecorationLine: 'underline' },
});
