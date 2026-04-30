/**
 * Add Item Screen
 * Voice flow:  idle → listening → processing → extracted
 * Uses real Web Speech API (Chrome/Edge) + Claude AI / regex extraction.
 */
import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar,
  TextInput, ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import speechService from '../services/speechService';
import { extractMaterial } from '../services/materialExtractor';

// status: 'idle' | 'listening' | 'processing' | 'extracted'

export default function AddItemScreen({ navigation, route }) {
  const { project, request } = route.params;

  const [status, setStatus] = useState('idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [extracted, setExtracted] = useState(null);
  const [typeText, setTypeText] = useState('');
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);

  // Timer while listening
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
    setExtracted(null);

    speechService.start({
      onInterim: (text) => setLiveTranscript(text),
      onFinal: (text) => { setFinalTranscript(text); setLiveTranscript(text); },
      onEnd: async (fullText) => {
        if (!fullText.trim()) { setStatus('idle'); return; }
        setStatus('processing'); // ensure processing screen shows (covers intent path)
        setFinalTranscript(fullText);
        const result = await extractMaterial(fullText);
        setExtracted(result);
        setStatus('extracted');
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

  async function handleTypeProcess() {
    if (!typeText.trim()) return;
    setStatus('processing');
    const result = await extractMaterial(typeText.trim());
    setExtracted(result);
    setTypeText('');
    setStatus('extracted');
  }

  function handleAddToList() {
    if (!extracted) return;
    const newItem = {
      id: Date.now().toString(),
      name: extracted.name,
      quantity: extracted.quantity,
      spec: extracted.spec,
    };
    navigation.navigate('ReviewSubmit', { project, request, newItem });
  }

  function handleRespeak() {
    setExtracted(null);
    setLiveTranscript('');
    setFinalTranscript('');
    setStatus('idle');
  }

  function formatTime(secs) {
    return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  }

  // ── LISTENING SCREEN ───────────────────────────────────────────────────────
  if (status === 'listening') {
    return (
      <SafeAreaView style={styles.safeRec}>
        <StatusBar barStyle="light-content" backgroundColor="#991B1B" />
        <View style={styles.recHeader}>
          <Text style={styles.recProject}>{project.name}</Text>
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
              {liveTranscript || 'Listening... speak now'}
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

  // ── PROCESSING SCREEN ──────────────────────────────────────────────────────
  if (status === 'processing') {
    return (
      <SafeAreaView style={styles.safeProcessing}>
        <StatusBar barStyle="light-content" backgroundColor="#1B3A8C" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add another item</Text>
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

  // ── MAIN SCREEN (idle + extracted) ─────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1B3A8C" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back to review</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add another item</Text>
        <Text style={styles.headerSub}>
          {project.name} · {request.items.length} item{request.items.length !== 1 ? 's' : ''} so far
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>

          {/* Already added */}
          <View style={styles.alreadyCard}>
            <Text style={styles.alreadyLabel}>ALREADY ADDED</Text>
            {request.items.map((item, idx) => (
              <Text key={item.id} style={styles.alreadyItem}>
                {idx + 1}. {item.name}{item.quantity ? ` · ${item.quantity}` : ''}
              </Text>
            ))}
          </View>

          {/* Mic section */}
          {status !== 'extracted' && (
            <>
              <View style={styles.micCard}>
                <TouchableOpacity
                  style={styles.micBtn}
                  onPress={startListening}
                  activeOpacity={0.8}
                >
                  <Text style={styles.micEmoji}>🎤</Text>
                </TouchableOpacity>
                <Text style={styles.micLabel}>Tap and speak the new item</Text>
                <Text style={styles.micExample}>
                  "5 bags of hydraulic cement, 94 lb bags"
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

              <View style={styles.typeRow}>
                <TextInput
                  style={styles.typeInput}
                  placeholder="Material name, quantity, unit..."
                  placeholderTextColor="#9CA3AF"
                  value={typeText}
                  onChangeText={setTypeText}
                  onSubmitEditing={handleTypeProcess}
                  returnKeyType="done"
                />
                {typeText.trim().length > 0 && (
                  <TouchableOpacity style={styles.typeGoBtn} onPress={handleTypeProcess}>
                    <Text style={styles.typeGoBtnText}>→</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          {/* AI Extracted preview */}
          {status === 'extracted' && extracted && (
            <View style={styles.extractedCard}>
              <View style={styles.extractedHeader}>
                <Text style={styles.extractedLabel}>AI EXTRACTED — CONFIRM BEFORE ADDING</Text>
                <View style={styles.aiPill}>
                  <Text style={styles.aiPillText}>✦ AI</Text>
                </View>
              </View>

              {/* Source transcript */}
              <View style={styles.transcriptPill}>
                <Text style={styles.transcriptPillLabel}>HEARD</Text>
                <Text style={styles.transcriptPillText} numberOfLines={2}>
                  "{finalTranscript || typeText}"
                </Text>
              </View>

              {[
                { label: 'Material', field: 'name' },
                { label: 'Quantity', field: 'quantity' },
                { label: 'Spec', field: 'spec' },
              ].map(({ label, field }) => (
                <View key={field} style={styles.extractedRow}>
                  <Text style={styles.extractedFieldLabel}>{label}</Text>
                  <View style={styles.extractedInputWrap}>
                    <TextInput
                      style={styles.extractedInput}
                      value={extracted[field]}
                      onChangeText={v =>
                        setExtracted(prev => ({ ...prev, [field]: v }))
                      }
                      placeholder="—"
                      placeholderTextColor="#9CA3AF"
                    />
                    <Text style={styles.editIcon}>✏️</Text>
                  </View>
                </View>
              ))}

              <View style={styles.extractedActions}>
                <TouchableOpacity style={styles.respeakBtn} onPress={handleRespeak}>
                  <Text style={styles.respeakText}>Re-speak</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addToListBtn} onPress={handleAddToList}>
                  <Text style={styles.addToListText}>Add to list</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F4F6' },
  safeRec: { flex: 1, backgroundColor: '#7F1D1D' },
  safeProcessing: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    backgroundColor: '#1B3A8C',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
  },
  backText: { color: '#93C5FD', fontSize: 14, marginBottom: 8 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  headerSub: { color: '#93C5FD', fontSize: 13 },
  content: { padding: 16, paddingBottom: 40 },
  alreadyCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  alreadyLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  alreadyItem: { fontSize: 13, color: '#374151', marginBottom: 3 },
  micCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 26,
    alignItems: 'center',
    marginBottom: 20,
  },
  micBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    elevation: 5,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  micEmoji: { fontSize: 32 },
  micLabel: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 6 },
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
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: 12, color: '#9CA3AF', fontSize: 12 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typeInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 13,
    fontSize: 14,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typeGoBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    width: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeGoBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  // Extracted card
  extractedCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  extractedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  extractedLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1.1,
  },
  aiPill: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  aiPillText: { color: '#2563EB', fontSize: 11, fontWeight: '700' },
  transcriptPill: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  transcriptPillLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 3,
  },
  transcriptPillText: { fontSize: 12, color: '#6B7280', fontStyle: 'italic' },
  extractedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  extractedFieldLabel: { fontSize: 13, color: '#6B7280', width: 72 },
  extractedInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  extractedInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    textAlign: 'right',
    paddingVertical: 2,
  },
  editIcon: { fontSize: 13, marginLeft: 6 },
  extractedActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  respeakBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  respeakText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  addToListBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  addToListText: { fontSize: 14, fontWeight: '700', color: '#fff' },
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
  recTitleBar: { backgroundColor: '#7F1D1D', paddingHorizontal: 16, paddingBottom: 16 },
  recTitle: { color: '#fff', fontSize: 24, fontWeight: '700' },
  recBody: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 30,
    gap: 22,
  },
  timer: { fontSize: 46, fontWeight: '700', color: '#EF4444', letterSpacing: 2 },
  waveform: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  waveBar: { width: 5, backgroundColor: '#EF4444', borderRadius: 3 },
  transcriptBox: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    padding: 14,
    width: '100%',
    minHeight: 80,
  },
  transcriptLabel: {
    color: '#FCA5A5',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  transcriptText: { color: '#fff', fontSize: 14, lineHeight: 22 },
  stopBtn: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center',
  },
  stopIcon: { width: 22, height: 22, backgroundColor: '#fff', borderRadius: 4 },
  tapToStop: { color: '#FCA5A5', fontSize: 13 },
  cancelText: { color: '#FCA5A5', fontSize: 14, textDecorationLine: 'underline' },
});
