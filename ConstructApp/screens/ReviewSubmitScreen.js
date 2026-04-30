import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
  StatusBar, TextInput, Modal,
} from 'react-native';
import { useApp } from '../context/AppContext';

export default function ReviewSubmitScreen({ navigation, route }) {
  const { project, request: initialRequest } = route.params;
  const { addDraft } = useApp();
  const [request, setRequest] = useState(initialRequest);
  const [aiMode, setAiMode] = useState('voice');
  const [aiReply, setAiReply] = useState('');
  const [showReRecordModal, setShowReRecordModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [editingId, setEditingId] = useState(null);   // id of item being edited
  const [editDraft, setEditDraft] = useState({});      // { name, quantity, spec }

  // Receive new item added from AddItemScreen
  useEffect(() => {
    const newItem = route.params?.newItem;
    if (newItem) {
      setRequest(prev => ({ ...prev, items: [...prev.items, newItem] }));
      navigation.setParams({ newItem: null });
    }
  }, [route.params?.newItem]);

  function updateField(field, value) {
    setRequest(prev => ({ ...prev, [field]: value }));
  }

  function startEditItem(item) {
    setEditingId(item.id);
    setEditDraft({ name: item.name, quantity: item.quantity, spec: item.spec });
  }

  function saveEditItem(id) {
    setRequest(prev => ({
      ...prev,
      items: prev.items.map(it =>
        it.id === id ? { ...it, ...editDraft } : it
      ),
    }));
    setEditingId(null);
    setEditDraft({});
  }

  function cancelEditItem() {
    setEditingId(null);
    setEditDraft({});
  }

  function deleteItem(id) {
    setRequest(prev => ({ ...prev, items: prev.items.filter(it => it.id !== id) }));
    if (editingId === id) setEditingId(null);
  }

  function handleAddItem() {
    navigation.navigate('AddItem', { project, request });
  }

  function confirmReRecord() {
    addDraft(project.id, {
      ...request,
      id: 'd' + Date.now(),
      timestamp: 'Just now',
      warning: request.urgency ? '' : 'Urgency not set',
    });
    setShowReRecordModal(false);
    navigation.navigate('NewRequest', { project, clearedForReRecord: true });
  }

  function handleSubmit() {
    setSubmitted(true);
    setTimeout(() => navigation.navigate('SelectProject'), 2200);
  }

  function handleAiReply() {
    if (!aiReply.trim()) return;
    const lower = aiReply.toLowerCase();
    if (lower.includes('urgent') || lower.includes('high')) {
      updateField('urgency', 'Urgent');
    } else {
      updateField('urgency', 'Normal');
    }
    setAiReply('');
  }

  if (submitted) {
    return (
      <SafeAreaView style={styles.successScreen}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Request Submitted!</Text>
        <Text style={styles.successSub}>
          {request.items.length} item{request.items.length !== 1 ? 's' : ''} sent for {project.name}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1B3A8C" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowReRecordModal(true)}>
          <Text style={styles.backText}>← Re-record</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review & submit</Text>
        <View style={styles.projectRow}>
          <View style={styles.greenDot} />
          <Text style={styles.projectSub}>{project.name} · {project.location}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* PROJECT */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>PROJECT</Text>
          <View style={styles.projectField}>
            <Text style={styles.projectFieldValue}>{project.name}</Text>
            <TouchableOpacity style={styles.changeBtn}>
              <Text style={styles.changeBtnText}>Change</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* MATERIALS */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionLabel}>MATERIALS</Text>
            <TouchableOpacity style={styles.addItemBtn} onPress={handleAddItem}>
              <Text style={styles.addItemText}>⊕  Add item</Text>
            </TouchableOpacity>
          </View>
          {request.items.map((item, idx) => {
            const isEditing = editingId === item.id;
            return (
              <View
                key={item.id}
                style={[
                  styles.materialRow,
                  idx === 0 && styles.materialRowFirst,
                  isEditing && styles.materialRowEditing,
                ]}
              >
                {isEditing ? (
                  /* ── EDIT MODE ── */
                  <View style={styles.editBlock}>
                    <View style={styles.editFieldRow}>
                      <Text style={styles.editFieldLabel}>Name</Text>
                      <TextInput
                        style={styles.editFieldInput}
                        value={editDraft.name}
                        onChangeText={v => setEditDraft(p => ({ ...p, name: v }))}
                        placeholder="Material name"
                        placeholderTextColor="#9CA3AF"
                        autoFocus
                      />
                    </View>
                    <View style={styles.editFieldRow}>
                      <Text style={styles.editFieldLabel}>Qty</Text>
                      <TextInput
                        style={styles.editFieldInput}
                        value={editDraft.quantity}
                        onChangeText={v => setEditDraft(p => ({ ...p, quantity: v }))}
                        placeholder="e.g. 4 bags"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    <View style={styles.editFieldRow}>
                      <Text style={styles.editFieldLabel}>Spec</Text>
                      <TextInput
                        style={styles.editFieldInput}
                        value={editDraft.spec}
                        onChangeText={v => setEditDraft(p => ({ ...p, spec: v }))}
                        placeholder="e.g. 80 lb each"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    <View style={styles.editActions}>
                      <TouchableOpacity
                        style={styles.editDeleteBtn}
                        onPress={() => deleteItem(item.id)}
                      >
                        <Text style={styles.editDeleteText}>🗑 Remove</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.editCancelBtn}
                        onPress={cancelEditItem}
                      >
                        <Text style={styles.editCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.editSaveBtn}
                        onPress={() => saveEditItem(item.id)}
                      >
                        <Text style={styles.editSaveText}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  /* ── VIEW MODE ── */
                  <>
                    <View style={styles.materialInfo}>
                      <Text style={styles.materialName}>{item.name}</Text>
                      <Text style={styles.materialSpec}>
                        {[item.quantity, item.spec].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.editIconBtn}
                      onPress={() => startEditItem(item)}
                    >
                      <Text style={styles.editIcon}>✏️</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            );
          })}
        </View>

        {/* NEEDED / DELIVERY */}
        <View style={[styles.card, styles.rowCard]}>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>NEEDED</Text>
            <TextInput
              style={styles.fieldInput}
              value={request.needed}
              onChangeText={v => updateField('needed', v)}
              placeholder="—"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={styles.fieldDivider} />
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>DELIVERY</Text>
            <TextInput
              style={styles.fieldInput}
              value={request.delivery}
              onChangeText={v => updateField('delivery', v)}
              placeholder="—"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* CONTACT / URGENCY */}
        <View style={[styles.card, styles.rowCard]}>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>CONTACT</Text>
            <TextInput
              style={styles.fieldInput}
              value={request.contact}
              onChangeText={v => updateField('contact', v)}
              placeholder="—"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={styles.fieldDivider} />
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>URGENCY</Text>
            {request.urgency ? (
              <TextInput
                style={styles.fieldInput}
                value={request.urgency}
                onChangeText={v => updateField('urgency', v)}
              />
            ) : (
              <TouchableOpacity onPress={() => updateField('urgency', 'Normal')}>
                <View style={styles.urgencyNotSet}>
                  <Text style={styles.urgencyIcon}>△</Text>
                  <Text style={styles.urgencyText}>Not set</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* AI ASSISTANT */}
        <View style={styles.aiPanel}>
          <View style={styles.rowBetween}>
            <Text style={styles.aiLabel}>AI assistant</Text>
            <View style={styles.aiToggleWrap}>
              {['voice', 'type'].map(mode => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.aiToggleBtn, aiMode === mode && styles.aiToggleBtnActive]}
                  onPress={() => setAiMode(mode)}
                >
                  <Text style={[styles.aiToggleText, aiMode === mode && styles.aiToggleTextActive]}>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Text style={styles.aiQuestion}>
            Urgency wasn't mentioned — is this normal or urgent?
          </Text>
          <View style={styles.aiInputRow}>
            <View style={styles.aiAvatar}>
              <Text style={styles.aiAvatarText}>A</Text>
            </View>
            {aiMode === 'type' ? (
              <TextInput
                style={styles.aiTextInput}
                placeholder='E.g. "Normal" or "Urgent"'
                placeholderTextColor="#9CA3AF"
                value={aiReply}
                onChangeText={setAiReply}
                onSubmitEditing={handleAiReply}
                returnKeyType="done"
              />
            ) : (
              <TouchableOpacity style={{ flex: 1 }} onPress={() => setAiMode('type')}>
                <Text style={styles.aiPlaceholder}>Tap to reply by voice...</Text>
              </TouchableOpacity>
            )}
          </View>
          {aiMode === 'type' && aiReply.trim().length > 0 && (
            <TouchableOpacity style={styles.aiSendBtn} onPress={handleAiReply}>
              <Text style={styles.aiSendText}>Set urgency →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ACTIONS */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.reRecordBtn}
            onPress={() => setShowReRecordModal(true)}
          >
            <Text style={styles.reRecordText}>Re-record</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitText}>Submit</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.reRecordNote}>Re-record will erase all extracted data</Text>
      </ScrollView>

      {/* Re-record Modal */}
      <Modal visible={showReRecordModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetIconWrap}>
              <Text style={styles.sheetIcon}>△</Text>
            </View>
            <Text style={styles.sheetTitle}>Erase and re-record?</Text>
            <Text style={styles.sheetDesc}>
              This will clear all {request.items.length} item{request.items.length !== 1 ? 's' : ''} and delivery details.
            </Text>
            <View style={styles.autosaveBadge}>
              <Text style={styles.autosaveText}>📅  Current request auto-saved as draft</Text>
            </View>
            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={styles.keepBtn}
                onPress={() => setShowReRecordModal(false)}
              >
                <Text style={styles.keepText}>Keep reviewing</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.yesBtn} onPress={confirmReRecord}>
                <Text style={styles.yesText}>Yes, re-record</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F4F6' },
  successScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
  },
  successIcon: { fontSize: 56, marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8 },
  successSub: { fontSize: 14, color: '#6B7280' },
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
  content: { padding: 16, paddingBottom: 36 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  rowCard: { flexDirection: 'row', alignItems: 'flex-start' },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  projectField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  projectFieldValue: { fontSize: 16, fontWeight: '600', color: '#111827' },
  changeBtn: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  changeBtnText: { fontSize: 12, color: '#374151' },
  addItemBtn: {},
  addItemText: { color: '#2563EB', fontSize: 13, fontWeight: '600' },
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  materialRowFirst: { borderTopWidth: 0 },
  materialRowEditing: {
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
    borderTopWidth: 0,
    marginTop: 4,
  },
  // Inline edit block
  editBlock: { flex: 1, paddingVertical: 4 },
  editFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  editFieldLabel: {
    width: 40,
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  editFieldInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  editDeleteBtn: {
    marginRight: 'auto',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  editDeleteText: { color: '#EF4444', fontSize: 12, fontWeight: '600' },
  editCancelBtn: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  editCancelText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  editSaveBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 7,
  },
  editSaveText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  materialInfo: { flex: 1 },
  materialName: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  materialSpec: { fontSize: 12, color: '#6B7280' },
  editIconBtn: { padding: 4 },
  editIcon: { fontSize: 14 },
  halfField: { flex: 1 },
  fieldDivider: { width: 1, backgroundColor: '#F3F4F6', marginHorizontal: 12, alignSelf: 'stretch' },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 6,
  },
  fieldInput: {
    fontSize: 14,
    color: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 4,
  },
  urgencyNotSet: { flexDirection: 'row', alignItems: 'center', paddingTop: 4 },
  urgencyIcon: { color: '#EF4444', fontSize: 14, marginRight: 4 },
  urgencyText: { color: '#EF4444', fontSize: 14, fontWeight: '500' },
  aiPanel: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  aiLabel: { fontSize: 13, fontWeight: '600', color: '#1D4ED8' },
  aiToggleWrap: {
    flexDirection: 'row',
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
    padding: 2,
  },
  aiToggleBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 },
  aiToggleBtnActive: { backgroundColor: '#2563EB' },
  aiToggleText: { fontSize: 12, fontWeight: '600', color: '#2563EB' },
  aiToggleTextActive: { color: '#fff' },
  aiQuestion: { fontSize: 13, color: '#374151', marginBottom: 10, lineHeight: 18 },
  aiInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  aiAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAvatarText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  aiTextInput: { flex: 1, fontSize: 13, color: '#111827' },
  aiPlaceholder: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' },
  aiSendBtn: { marginTop: 8, alignSelf: 'flex-end' },
  aiSendText: { color: '#2563EB', fontSize: 13, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  reRecordBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  reRecordText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },
  submitBtn: {
    flex: 2,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  reRecordNote: { textAlign: 'center', color: '#9CA3AF', fontSize: 11 },
  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 44,
  },
  sheetIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetIcon: { fontSize: 22, color: '#F59E0B' },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 8 },
  sheetDesc: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 16 },
  autosaveBadge: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  autosaveText: { color: '#166534', fontSize: 12, fontWeight: '500' },
  sheetActions: { flexDirection: 'row', gap: 12 },
  keepBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  keepText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  yesBtn: {
    flex: 1,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  yesText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
