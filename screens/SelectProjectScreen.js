import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { useApp } from '../context/AppContext';

const PROJECTS = [
  { id: '1', name: 'Bridgeland', location: 'Cypress, TX', status: 'Active' },
  { id: '2', name: 'Astros Village', location: 'Midtown, Houston', status: 'Active' },
  { id: '3', name: 'Buffalo Bayou Lofts', location: 'EaDo, Houston', status: 'Active' },
  { id: '4', name: 'Hermann Park Res.', location: 'Museum District', status: 'Active' },
  { id: '5', name: 'Galleria Tower Phase 2', location: 'Uptown', status: 'On hold' },
];

function ProjectTile({ project, draftCount, onPress }) {
  const isActive = project.status === 'Active';
  return (
    <TouchableOpacity style={styles.tile} onPress={() => onPress(project)} activeOpacity={0.75}>
      {draftCount > 0 && (
        <View style={styles.draftBadge}>
          <Text style={styles.draftBadgeText}>
            {draftCount} {draftCount === 1 ? 'draft' : 'drafts'}
          </Text>
        </View>
      )}
      <Text style={styles.tileIcon}>⊞</Text>
      <Text style={styles.tileName}>{project.name}</Text>
      <Text style={styles.tileLocation}>{project.location}</Text>
      <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusHold]}>
        <Text style={[styles.statusText, isActive ? styles.statusActiveText : styles.statusHoldText]}>
          {project.status}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function SelectProjectScreen({ navigation }) {
  const { getDraftCount } = useApp();

  const draftProjectCount = PROJECTS.filter(p => getDraftCount(p.id) > 0).length;

  function handlePress(project) {
    if (getDraftCount(project.id) > 0) {
      navigation.navigate('Drafts', { project });
    } else {
      navigation.navigate('NewRequest', { project });
    }
  }

  const rows = [];
  for (let i = 0; i < PROJECTS.length; i += 2) {
    rows.push(PROJECTS.slice(i, i + 2));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1B3A8C" />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>JR</Text>
          </View>
          <Text style={styles.userName}>Jose Rodriguez</Text>
        </View>
        <Text style={styles.headerTitle}>Select project</Text>
        <Text style={styles.headerSub}>
          {draftProjectCount > 0
            ? `${draftProjectCount} project${draftProjectCount > 1 ? 's' : ''} have saved drafts`
            : 'Tap to start a material request'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {rows.map((row, idx) => (
          <View key={idx} style={styles.gridRow}>
            {row.map(project => (
              <View key={project.id} style={row.length === 1 ? styles.tileFull : styles.tileHalf}>
                <ProjectTile
                  project={project}
                  draftCount={getDraftCount(project.id)}
                  onPress={handlePress}
                />
              </View>
            ))}
            {row.length === 1 && <View style={styles.tileHalf} />}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>©2026 Perituza Software Solutions, LLC. | Privacy</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    backgroundColor: '#1B3A8C',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 22,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  userName: { color: '#fff', fontSize: 13, fontWeight: '500' },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 4 },
  headerSub: { color: '#93C5FD', fontSize: 13 },
  grid: { padding: 12, paddingBottom: 24 },
  gridRow: { flexDirection: 'row', marginBottom: 10 },
  tileHalf: { flex: 1, paddingHorizontal: 4 },
  tileFull: { flex: 2, paddingHorizontal: 4 },
  tile: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    minHeight: 110,
    position: 'relative',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  draftBadge: {
    position: 'absolute',
    top: -1,
    right: -1,
    backgroundColor: '#F97316',
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 1,
  },
  draftBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  tileIcon: { fontSize: 20, color: '#2563EB', marginBottom: 6 },
  tileName: { fontSize: 13, fontWeight: '700', color: '#1E3A8A', marginBottom: 2, lineHeight: 18 },
  tileLocation: { fontSize: 11, color: '#6B7280', marginBottom: 10 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusActive: { backgroundColor: '#2563EB' },
  statusHold: { backgroundColor: '#E5E7EB' },
  statusText: { fontSize: 10, fontWeight: '600' },
  statusActiveText: { color: '#fff' },
  statusHoldText: { color: '#6B7280' },
  footer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  footerText: { color: '#6B7280', fontSize: 12 },
});
