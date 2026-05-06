import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getApiUrl } from '../../lib/api';
import { useTheme } from '../../lib/ThemeContext';

/* ── Status grouping ─────────────────────────────────────── */
const STATUS_TABS = ['Applied', 'Saved', 'Failed'] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const TAB_META: Record<StatusTab, { icon: string; emptyMsg: string }> = {
  Applied: { icon: 'checkmark-circle', emptyMsg: 'No applications yet. Start applying from the Portals tab!' },
  Saved: { icon: 'bookmark', emptyMsg: 'No saved (pending) jobs. Queue jobs from the Discover tab!' },
  Failed: { icon: 'close-circle', emptyMsg: 'No failed applications — great job! 🎉' },
};

function categorize(status: string): StatusTab {
  switch (status) {
    case 'applied':
    case 'already_applied':
      return 'Applied';
    case 'pending':
      return 'Saved';
    case 'failed':
    case 'captcha':
    case 'external':
      return 'Failed';
    default:
      return 'Saved';
  }
}

function statusBadge(status: string) {
  switch (status) {
    case 'applied': return { label: 'Applied', color: '#10B981' };
    case 'already_applied': return { label: 'Already Applied', color: '#6366F1' };
    case 'pending': return { label: 'Pending', color: '#F59E0B' };
    case 'captcha': return { label: 'CAPTCHA', color: '#EF4444' };
    case 'external': return { label: 'External', color: '#94A3B8' };
    case 'failed': return { label: 'Failed', color: '#EF4444' };
    default: return { label: status, color: '#94A3B8' };
  }
}

/* ── Component ───────────────────────────────────────────── */
export default function TrackerScreen() {
  const { colors, isDark } = useTheme();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<StatusTab>('Applied');

  const fetchApps = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;
      const resp = await fetch(getApiUrl('/api/naukri/applications'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (data.success) setApps(data.data);
    } catch (e) {
      console.error('[Tracker] fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchApps(); }, [fetchApps]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchApps(true);
  }, [fetchApps]);

  /* ── Derived data ─────────────────────────────────── */
  const grouped = useMemo(() => {
    const map: Record<StatusTab, any[]> = { Applied: [], Saved: [], Failed: [] };
    for (const app of apps) {
      map[categorize(app.status)].push(app);
    }
    return map;
  }, [apps]);

  const counts = useMemo(() => ({
    Applied: grouped.Applied.length,
    Saved: grouped.Saved.length,
    Failed: grouped.Failed.length,
  }), [grouped]);

  const filtered = grouped[activeTab];

  /* ── Styles (reactive to theme) ──────────────────── */
  const s = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      padding: 20,
      paddingBottom: 40,
    },

    /* Header */
    pageTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textLight,
      marginTop: 4,
      marginBottom: 20,
    },

    /* Summary cards */
    summaryRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 22,
    },
    summaryCard: {
      flex: 1,
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 10,
      alignItems: 'center',
      borderWidth: isDark ? 0 : 1,
      borderColor: colors.border,
    },
    summaryCardActive: {
      borderWidth: 2,
      borderColor: colors.primary,
    },
    summaryCount: {
      fontSize: 26,
      fontWeight: '800',
    },
    summaryLabel: {
      fontSize: 12,
      fontWeight: '600',
      marginTop: 4,
      color: colors.textLight,
    },

    /* Tab pills */
    tabRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 20,
    },
    tabPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: isDark ? '#1E293B' : colors.chipBackground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabPillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    tabText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    tabTextActive: {
      color: colors.white,
    },

    /* Job cards */
    card: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      marginBottom: 12,
      borderWidth: isDark ? 0 : 1,
      borderColor: colors.border,
    },
    cardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 6,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
      marginRight: 8,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    cardCompany: {
      fontSize: 13,
      color: colors.textLight,
      marginBottom: 4,
    },
    cardMeta: {
      fontSize: 12,
      color: colors.textMuted,
    },
    failReason: {
      fontSize: 12,
      color: colors.error,
      marginTop: 6,
      fontStyle: 'italic',
    },
    openLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 10,
      alignSelf: 'flex-start',
    },
    openLinkText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },

    /* Empty state */
    emptyBox: {
      alignItems: 'center',
      paddingVertical: 60,
      gap: 12,
    },
    emptyText: {
      color: colors.textLight,
      fontSize: 15,
      textAlign: 'center',
      paddingHorizontal: 20,
    },
  }), [colors, isDark]);

  /* ── Render ──────────────────────────────────────── */
  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Text style={s.pageTitle}>Application Tracker</Text>
        <Text style={s.subtitle}>Monitor your job applications</Text>

        {/* ── Summary Cards ── */}
        <View style={s.summaryRow}>
          {STATUS_TABS.map(tab => {
            const active = tab === activeTab;
            const tabColors: Record<StatusTab, string> = {
              Applied: '#10B981',
              Saved: '#F59E0B',
              Failed: '#EF4444',
            };
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  s.summaryCard,
                  { backgroundColor: isDark ? '#1E293B' : tabColors[tab] + '12' },
                  active && s.summaryCardActive,
                ]}
                activeOpacity={0.7}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[s.summaryCount, { color: tabColors[tab] }]}>{counts[tab]}</Text>
                <Text style={s.summaryLabel}>{tab}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Tab Pills ── */}
        <View style={s.tabRow}>
          {STATUS_TABS.map(tab => {
            const active = tab === activeTab;
            return (
              <TouchableOpacity
                key={tab}
                style={[s.tabPill, active && s.tabPillActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={TAB_META[tab].icon as any}
                  size={14}
                  color={active ? colors.white : colors.textLight}
                />
                <Text style={[s.tabText, active && s.tabTextActive]}>
                  {tab} ({counts[tab]})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Content ── */}
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name={TAB_META[activeTab].icon as any} size={48} color={colors.textMuted} />
            <Text style={s.emptyText}>{TAB_META[activeTab].emptyMsg}</Text>
          </View>
        ) : (
          filtered.map((app: any) => {
            const badge = statusBadge(app.status);
            return (
              <View key={app._id} style={s.card}>
                <View style={s.cardTop}>
                  <Text style={s.cardTitle} numberOfLines={2}>{app.jobTitle}</Text>
                  <View style={[s.badge, { backgroundColor: badge.color + '22' }]}>
                    <Ionicons name={TAB_META[activeTab].icon as any} size={12} color={badge.color} />
                    <Text style={[s.badgeText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                </View>
                <Text style={s.cardCompany}>{app.company}</Text>
                <Text style={s.cardMeta}>
                  {app.appliedAt
                    ? `Applied ${new Date(app.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                    : `Queued ${new Date(app.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                </Text>
                {app.failReason && <Text style={s.failReason}>⚠ {app.failReason}</Text>}
                {app.jobUrl && (
                  <TouchableOpacity style={s.openLink} onPress={() => Linking.openURL(app.jobUrl)}>
                    <Ionicons name="open-outline" size={14} color={colors.primary} />
                    <Text style={s.openLinkText}>View Job</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
