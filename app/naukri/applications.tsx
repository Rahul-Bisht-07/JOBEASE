import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getApiUrl } from '../../lib/api';
import { useTheme } from '../../lib/ThemeContext';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  applied: { label: 'Applied', color: '#10B981', icon: 'checkmark-circle' },
  pending: { label: 'Pending', color: '#F59E0B', icon: 'time-outline' },
  already_applied: { label: 'Already Applied', color: '#6366F1', icon: 'checkmark-done-circle' },
  external: { label: 'External Form', color: '#94A3B8', icon: 'open-outline' },
  captcha: { label: 'CAPTCHA Blocked', color: '#EF4444', icon: 'shield-outline' },
  failed: { label: 'Failed', color: '#EF4444', icon: 'close-circle' },
};

export default function ApplicationsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchApplications = useCallback(async () => {
    const token = await AsyncStorage.getItem('authToken');
    if (!token) return;
    try {
      const resp = await fetch(getApiUrl('/api/naukri/applications'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (data.success) setApplications(data.data);
    } catch (e) {
      console.error('Applications fetch error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchApplications(); }, [fetchApplications]));

  const filters = ['all', 'applied', 'pending', 'failed'];

  const filtered = useMemo(() =>
    activeFilter === 'all'
      ? applications
      : applications.filter(a => a.status === activeFilter),
    [applications, activeFilter],
  );

  const stats = useMemo(() => ({
    total: applications.length,
    applied: applications.filter(a => a.status === 'applied' || a.status === 'already_applied').length,
    pending: applications.filter(a => a.status === 'pending').length,
    failed: applications.filter(a => a.status === 'failed' || a.status === 'captcha').length,
  }), [applications]);

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 20, paddingBottom: 40 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
    backBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: isDark ? '#1E293B' : colors.chipBackground,
      justifyContent: 'center', alignItems: 'center',
    },
    title: { fontSize: 24, fontWeight: '700', color: colors.text },
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    statCard: {
      flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 12, alignItems: 'center',
      borderWidth: isDark ? 0 : 1, borderColor: colors.border,
    },
    statNum: { fontSize: 22, fontWeight: '700', color: colors.primary },
    statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
    filterRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    filterPill: {
      paddingHorizontal: 14, paddingVertical: 7,
      borderRadius: 20, backgroundColor: isDark ? '#1E293B' : colors.chipBackground,
      borderWidth: 1, borderColor: colors.border,
    },
    filterPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterText: { fontSize: 13, color: colors.text, fontWeight: '600' },
    filterTextActive: { color: colors.white },
    card: {
      backgroundColor: colors.card, borderRadius: 18, padding: 16, marginBottom: 12,
      borderWidth: isDark ? 0 : 1, borderColor: colors.border,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 },
    statusBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
    },
    statusText: { fontSize: 11, fontWeight: '700' },
    cardCompany: { fontSize: 13, color: colors.textLight, marginBottom: 4 },
    cardMeta: { fontSize: 12, color: colors.textMuted },
    failReason: { fontSize: 12, color: colors.error, marginTop: 6, fontStyle: 'italic' },
    emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 12 },
    emptyText: { color: colors.textLight, fontSize: 15 },
  }), [colors, isDark]);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.title}>My Applications</Text>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { num: stats.total, label: 'Total' },
            { num: stats.applied, label: 'Applied' },
            { num: stats.pending, label: 'Pending' },
            { num: stats.failed, label: 'Failed' },
          ].map((stat, i) => (
            <View key={i} style={s.statCard}>
              <Text style={s.statNum}>{stat.num}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={s.filterRow}>
            {filters.map(f => (
              <TouchableOpacity
                key={f}
                style={[s.filterPill, activeFilter === f && s.filterPillActive]}
                onPress={() => setActiveFilter(f)}
              >
                <Text style={[s.filterText, activeFilter === f && s.filterTextActive]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
            <Text style={s.emptyText}>No applications yet</Text>
          </View>
        ) : (
          filtered.map(app => {
            const cfg = STATUS_CONFIG[app.status] || { label: app.status, color: colors.textMuted, icon: 'ellipse-outline' };
            return (
              <View key={app._id} style={s.card}>
                <View style={s.cardTop}>
                  <Text style={s.cardTitle} numberOfLines={2}>{app.jobTitle}</Text>
                  <View style={[s.statusBadge, { backgroundColor: cfg.color + '22' }]}>
                    <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
                    <Text style={[s.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>
                <Text style={s.cardCompany}>{app.company}</Text>
                <Text style={s.cardMeta}>
                  {app.appliedAt
                    ? `Applied ${new Date(app.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                    : `Queued ${new Date(app.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                </Text>
                {app.failReason && <Text style={s.failReason}>⚠ {app.failReason}</Text>}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
