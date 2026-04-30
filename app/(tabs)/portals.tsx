import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getApiUrl } from '../../lib/api';
import { useTheme } from '../../lib/ThemeContext';

interface NaukriStatus {
  isLinked: boolean;
  expired: boolean;
  email: string | null;
  linkedAt: string | null;
  expiresAt: string | null;
  dailyApplyLimit: number;
}

export default function PortalsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [naukriStatus, setNaukriStatus] = useState<NaukriStatus | null>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    const token = await AsyncStorage.getItem('authToken');
    if (!token) return;
    try {
      const [statusResp, appsResp] = await Promise.all([
        fetch(getApiUrl('/api/naukri/status'), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(getApiUrl('/api/naukri/applications'), { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const statusData = await statusResp.json();
      const appsData = await appsResp.json();

      if (statusData.success) setNaukriStatus(statusData);
      if (appsData.success) {
        const pending = appsData.data.filter((a: any) => a.status === 'pending').length;
        setQueueCount(pending);
      }
    } catch (e) {
      console.error('Portal status fetch error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchStatus(); }, [fetchStatus]));

  const handleUnlink = () => {
    Alert.alert(
      'Unlink Naukri',
      'Are you sure? Your session will be deleted and auto-apply will stop working.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            const token = await AsyncStorage.getItem('authToken');
            await fetch(getApiUrl('/api/naukri/unlink'), {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            fetchStatus();
          },
        },
      ],
    );
  };

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 20, paddingBottom: 100 },
    title: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 6 },
    sub: { fontSize: 15, color: colors.textLight, marginBottom: 32, lineHeight: 22 },
    portalCard: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 22,
      marginBottom: 20,
      borderWidth: isDark ? 0 : 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: isDark ? 0 : 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: isDark ? 0 : 3,
    },
    portalHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
    naukriLogoBox: {
      width: 52, height: 52, borderRadius: 14,
      backgroundColor: '#4A90D9',
      justifyContent: 'center', alignItems: 'center',
    },
    naukriLogoText: { color: '#fff', fontSize: 18, fontWeight: '900' },
    portalName: { fontSize: 20, fontWeight: '700', color: colors.text },
    portalTagline: { fontSize: 13, color: colors.textLight, marginTop: 2 },
    linkedBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: 'rgba(16,185,129,0.12)',
      paddingHorizontal: 12, paddingVertical: 5,
      borderRadius: 12, alignSelf: 'flex-start', marginBottom: 18,
    },
    linkedBadgeText: { color: colors.success, fontSize: 13, fontWeight: '700' },
    linkedMeta: { fontSize: 13, color: colors.textLight, marginBottom: 20 },
    actionBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: colors.primary,
      borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18,
      marginBottom: 10,
    },
    actionBtnText: { color: colors.white, fontSize: 15, fontWeight: '600', flex: 1 },
    secondaryBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: isDark ? '#293548' : colors.chipBackground,
      borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18,
      marginBottom: 10,
    },
    secondaryBtnText: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
    dangerBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      borderWidth: 1, borderColor: colors.error,
      borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18,
      marginTop: 6,
    },
    dangerBtnText: { color: colors.error, fontSize: 15, fontWeight: '600', flex: 1 },
    queueBadge: {
      backgroundColor: colors.primary, borderRadius: 10,
      paddingHorizontal: 8, paddingVertical: 2, minWidth: 22, alignItems: 'center',
    },
    queueBadgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
    linkBtn: {
      backgroundColor: colors.primary,
      borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    },
    linkBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
    infoBox: {
      backgroundColor: isDark ? '#162032' : '#EEF2FF',
      borderRadius: 14, padding: 16, marginTop: 4,
    },
    infoTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 8 },
    infoItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
    infoText: { fontSize: 13, color: colors.textLight, flex: 1, lineHeight: 19 },
    comingSoonCard: {
      backgroundColor: colors.card, borderRadius: 24, padding: 22,
      borderWidth: isDark ? 0 : 1, borderColor: colors.border,
      opacity: 0.5, alignItems: 'center',
    },
    comingSoonText: { fontSize: 14, color: colors.textMuted, marginTop: 8 },
  }), [colors, isDark]);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Job Portals</Text>
        <Text style={s.sub}>Link your accounts to auto-apply and scrape jobs from leading Indian job boards.</Text>

        {/* ── Naukri Card ── */}
        <View style={s.portalCard}>
          <View style={s.portalHeader}>
            <View style={s.naukriLogoBox}>
              <Text style={s.naukriLogoText}>N</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.portalName}>Naukri.com</Text>
              <Text style={s.portalTagline}>India's #1 Job Portal</Text>
            </View>
          </View>

          {loading ? (
            <Text style={{ color: colors.textMuted }}>Loading…</Text>
          ) : naukriStatus?.isLinked ? (
            <>
              {/* Linked state */}
              <View style={s.linkedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={s.linkedBadgeText}>Active Session</Text>
              </View>
              <Text style={s.linkedMeta}>
                {naukriStatus.email || 'Naukri Account'}{'  •  '}
                {naukriStatus.linkedAt
                  ? `Linked ${new Date(naukriStatus.linkedAt).toLocaleDateString('en-IN')}`
                  : ''}
                {'\n'}
                {naukriStatus.expiresAt
                  ? `Session expires ${new Date(naukriStatus.expiresAt).toLocaleDateString('en-IN')}`
                  : ''}
                {'  •  '}Limit: {naukriStatus.dailyApplyLimit}/day
              </Text>

              <TouchableOpacity style={s.actionBtn} onPress={() => router.push('/naukri/queue')}>
                <Ionicons name="flash" size={20} color={colors.white} />
                <Text style={s.actionBtnText}>Apply Queue</Text>
                {queueCount > 0 && (
                  <View style={s.queueBadge}>
                    <Text style={s.queueBadgeText}>{queueCount}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={s.secondaryBtn} onPress={() => router.push('/naukri/applications')}>
                <Ionicons name="document-text-outline" size={20} color={colors.text} />
                <Text style={s.secondaryBtnText}>My Applications</Text>
              </TouchableOpacity>

              <TouchableOpacity style={s.secondaryBtn} onPress={() => router.push('/naukri/browse')}>
                <Ionicons name="globe-outline" size={20} color={colors.text} />
                <Text style={s.secondaryBtnText}>Browse Naukri Jobs</Text>
              </TouchableOpacity>

              <TouchableOpacity style={s.dangerBtn} onPress={handleUnlink}>
                <Ionicons name="unlink-outline" size={20} color={colors.error} />
                <Text style={s.dangerBtnText}>Unlink Account</Text>
              </TouchableOpacity>
            </>
          ) : naukriStatus?.expired ? (
            <>
              {/* Session expired state */}
              <View style={[s.linkedBadge, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                <Ionicons name="alert-circle" size={14} color={colors.error} />
                <Text style={[s.linkedBadgeText, { color: colors.error }]}>Session Expired</Text>
              </View>
              <Text style={s.linkedMeta}>
                Your Naukri session has expired. Please sign in again to continue using auto-apply.
              </Text>

              <TouchableOpacity
                style={[s.linkBtn, { marginTop: 8 }]}
                onPress={() => router.push('/naukri/link')}
              >
                <Text style={s.linkBtnText}>Re-link Naukri Account →</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[s.secondaryBtn, { marginTop: 8 }]} onPress={() => router.push('/naukri/applications')}>
                <Ionicons name="document-text-outline" size={20} color={colors.text} />
                <Text style={s.secondaryBtnText}>View Past Applications</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Not linked state */}
              <View style={s.infoBox}>
                <Text style={s.infoTitle}>What you get after linking</Text>
                {[
                  'Sign in via Google, phone, or email — we never see your password',
                  'Jobs scraped daily from Naukri directly into your feed',
                  'Smart queue: pick jobs → auto-apply in one tap',
                  'Application history tracked inside Jobease',
                ].map((item, i) => (
                  <View key={i} style={s.infoItem}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={s.infoText}>{item}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[s.linkBtn, { marginTop: 18 }]}
                onPress={() => router.push('/naukri/link')}
              >
                <Text style={s.linkBtnText}>Link Naukri Account →</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── Future portals placeholder ── */}
        <View style={s.comingSoonCard}>
          <Ionicons name="briefcase-outline" size={32} color={colors.textMuted} />
          <Text style={{ color: colors.text, fontWeight: '700', marginTop: 8 }}>Internshala</Text>
          <Text style={s.comingSoonText}>Coming soon</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
