import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

interface QueueItem {
  _id: string;
  jobTitle: string;
  company: string;
  jobUrl: string;
  status: string;
}

export default function QueueScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  const fetchQueue = useCallback(async () => {
    const token = await AsyncStorage.getItem('authToken');
    if (!token) return;
    try {
      const resp = await fetch(getApiUrl('/api/naukri/applications'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (data.success) {
        setQueue(data.data.filter((a: QueueItem) => a.status === 'pending'));
      }
    } catch (e) {
      console.error('Queue fetch error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchQueue(); }, [fetchQueue]));

  const removeFromQueue = async (id: string) => {
    const token = await AsyncStorage.getItem('authToken');
    await fetch(getApiUrl(`/api/naukri/queue/${id}`), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setQueue(prev => prev.filter(item => item._id !== id));
  };

  const handleApplyAll = async () => {
    if (queue.length === 0) return;
    Alert.alert(
      `Apply to ${queue.length} job${queue.length > 1 ? 's' : ''}?`,
      'Our bot will log in to Naukri and submit applications on your behalf. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply All',
          style: 'default',
          onPress: async () => {
            setApplying(true);
            try {
              const token = await AsyncStorage.getItem('authToken');
              const resp = await fetch(getApiUrl('/api/naukri/apply'), {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
              });
              const data = await resp.json();
              if (data.success) {
                Alert.alert(
                  '🚀 Applying!',
                  `Auto-apply started for ${queue.length} jobs. Check "My Applications" for results in a few minutes.`,
                  [{ text: 'View Applications', onPress: () => router.push('/naukri/applications') }],
                );
                setQueue([]);
              } else {
                Alert.alert('Error', data.message || 'Failed to start auto-apply');
              }
            } catch (e) {
              Alert.alert('Error', 'Network error. Please try again.');
            } finally {
              setApplying(false);
            }
          },
        },
      ],
    );
  };

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 20, paddingBottom: 120 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
    backBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: isDark ? '#1E293B' : colors.chipBackground,
      justifyContent: 'center', alignItems: 'center',
    },
    title: { fontSize: 24, fontWeight: '700', color: colors.text },
    sub: { fontSize: 14, color: colors.textLight, marginBottom: 24, marginLeft: 52 },
    emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 12 },
    emptyText: { color: colors.textLight, fontSize: 15 },
    card: {
      backgroundColor: colors.card, borderRadius: 18, padding: 16,
      flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12,
      borderWidth: isDark ? 0 : 1, borderColor: colors.border,
    },
    iconBox: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: isDark ? '#293548' : colors.chipBackground,
      justifyContent: 'center', alignItems: 'center',
    },
    cardBody: { flex: 1 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 3 },
    cardSub: { fontSize: 13, color: colors.textLight },
    removeBtn: { padding: 6 },
    footer: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: colors.background, padding: 20,
      borderTopWidth: 1, borderTopColor: colors.border,
    },
    applyBtn: {
      backgroundColor: colors.primary, borderRadius: 14,
      paddingVertical: 16, alignItems: 'center',
      flexDirection: 'row', justifyContent: 'center', gap: 8,
    },
    applyBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
    applyBtnDisabled: { opacity: 0.5 },
    warningRow: {
      flexDirection: 'row', gap: 6, alignItems: 'center',
      marginBottom: 10, justifyContent: 'center',
    },
    warningText: { fontSize: 12, color: colors.warning },
  }), [colors, isDark]);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.title}>Apply Queue</Text>
        </View>
        <Text style={s.sub}>{queue.length} job{queue.length !== 1 ? 's' : ''} ready to apply</Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : queue.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="flash-outline" size={48} color={colors.textMuted} />
            <Text style={s.emptyText}>Your queue is empty</Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}>
              Browse Naukri jobs and tap "Add to Queue" to queue them for auto-apply.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/discover')}
              style={{ marginTop: 12, backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }}
            >
              <Text style={{ color: colors.white, fontWeight: '700' }}>Browse Jobs</Text>
            </TouchableOpacity>
          </View>
        ) : (
          queue.map(item => (
            <View key={item._id} style={s.card}>
              <View style={s.iconBox}>
                <Text style={{ fontSize: 20 }}>💼</Text>
              </View>
              <View style={s.cardBody}>
                <Text style={s.cardTitle} numberOfLines={1}>{item.jobTitle}</Text>
                <Text style={s.cardSub} numberOfLines={1}>{item.company}</Text>
              </View>
              <TouchableOpacity style={s.removeBtn} onPress={() => removeFromQueue(item._id)}>
                <Ionicons name="close-circle-outline" size={24} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Sticky footer with apply button */}
      {queue.length > 0 && (
        <View style={s.footer}>
          <View style={s.warningRow}>
            <Ionicons name="warning-outline" size={14} color={colors.warning} />
            <Text style={s.warningText}>Applications are irreversible once submitted on Naukri</Text>
          </View>
          <TouchableOpacity
            style={[s.applyBtn, applying && s.applyBtnDisabled]}
            onPress={handleApplyAll}
            disabled={applying}
            activeOpacity={0.85}
          >
            {applying ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="flash" size={20} color={colors.white} />
                <Text style={s.applyBtnText}>Auto-Apply All ({queue.length})</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
