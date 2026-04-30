import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { useApp } from '../context/AppContext';

export default function DraftsScreen({ navigation, route }) {
  const { project } = route.params;
  const { getDrafts, removeDraft } = useApp();
  const drafts = getDrafts(project.id);

  function handleResume(draft) {
    navigation.navigate('ReviewSubmit', { project, request: draft });
  }

  function handleDiscard(draftId) {
    const remainingCount = drafts.length - 1;
    removeDraft(project.id, draftId);
    if (remainingCount === 0) {
      navigation.navigate('SelectProject');
    }
  }

  function handleStartNew() {
    navigation.navigate('NewRequest', { project });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('SelectProject')} style={styles.backBtn}>
          <Text style={styles.backText}>← Projects</Text>
        </TouchableOpacity>
        <Text style={styles.projectName}>{project.name}</Text>
        <Text style={styles.projectMeta}>
          {project.location} · {drafts.length} saved draft{drafts.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {drafts.map((draft, index) => (
          <View key={draft.id} style={[styles.draftCard, index === 0 && styles.draftCardHighlight]}>
            <View style={styles.draftCardHeader}>
              <View style={styles.draftDateRow}>
                <Text style={styles.calIcon}>📅</Text>
                <Text style={styles.draftDate}>{draft.timestamp}</Text>
              </View>
              <View style={styles.itemCountBadge}>
                <Text style={styles.itemCountText}>
                  {draft.items.length} item{draft.items.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            {draft.items.map(item => (
              <Text key={item.id} style={styles.draftItem}>
                {item.name} · {item.quantity}
              </Text>
            ))}

            {draft.warning ? (
              <Text style={styles.draftWarning}>{draft.warning}</Text>
            ) : null}

            <View style={styles.draftActions}>
              <TouchableOpacity
                style={styles.discardBtn}
                onPress={() => handleDiscard(draft.id)}
              >
                <Text style={styles.discardText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.resumeBtn}
                onPress={() => handleResume(draft)}
              >
                <Text style={styles.resumeText}>Resume</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.newRequestBtn} onPress={handleStartNew}>
          <Text style={styles.newRequestText}>⊕  Start a new request instead</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: { marginBottom: 8 },
  backText: { color: '#2563EB', fontSize: 14 },
  projectName: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 2 },
  projectMeta: { fontSize: 13, color: '#6B7280' },
  content: { padding: 16 },
  draftCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  draftCardHighlight: {
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
  },
  draftCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  draftDateRow: { flexDirection: 'row', alignItems: 'center' },
  calIcon: { fontSize: 13, marginRight: 6 },
  draftDate: { fontSize: 13, fontWeight: '600', color: '#374151' },
  itemCountBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  itemCountText: { fontSize: 11, fontWeight: '600', color: '#92400E' },
  draftItem: { fontSize: 13, color: '#374151', marginBottom: 3 },
  draftWarning: { fontSize: 12, color: '#F97316', marginTop: 6, marginBottom: 2 },
  draftActions: { flexDirection: 'row', marginTop: 14, gap: 10 },
  discardBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  discardText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  resumeBtn: {
    flex: 1,
    backgroundColor: '#1B3A8C',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  resumeText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  newRequestBtn: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: '#fff',
  },
  newRequestText: { color: '#2563EB', fontSize: 14, fontWeight: '600' },
});
