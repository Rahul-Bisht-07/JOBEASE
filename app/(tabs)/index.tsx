import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { getApiUrl } from '../../lib/api';
import { useTheme } from '../../lib/ThemeContext';

const { width: SCREEN_W } = Dimensions.get('window');

/* ───────── Accurate SVG circular‑progress ring ───────── */
const CircularProgress = ({
  score,
  size = 100,
  strokeWidth = 8,
  trackColor,
  progressColor,
  textColor,
  subColor,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  trackColor: string;
  progressColor: string;
  textColor: string;
  subColor: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, score));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          stroke={trackColor}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={progressColor}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 28, fontWeight: '700', color: textColor }}>
          {Math.round(clampedScore)}
        </Text>
        <Text style={{ fontSize: 12, color: subColor, marginTop: -2 }}>/100</Text>
      </View>
    </View>
  );
};

const PILL_COLORS = ['#6366F1', '#10B981', '#F97316', '#EC4899', '#8B5CF6', '#14B8A6'];

export default function HomeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);

  /* ── data fetching ── */
  const fetchJobs = useCallback(async () => {
    try {
      const resp = await fetch(getApiUrl('/api/jobs'));
      const data = await resp.json();
      if (resp.ok && data.success) setJobs(data.data);
    } catch (e) {
      console.error('Job fetch error', e);
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    const token = await AsyncStorage.getItem('authToken');
    if (!token) { router.replace('/(auth)/welcome'); return; }
    try {
      const resp = await fetch(getApiUrl('/api/users/me'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (resp.ok && data.success) setUser(data.user);
    } catch (e) {
      console.error('Profile fetch error', e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      fetchJobs();
    }, [fetchProfile, fetchJobs]),
  );

  const resumeScore = useMemo(() => user?.resumeScore?.overall ?? 0, [user]);
  const userName = user?.name ? user.name.split(' ')[0] : 'there';

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const featuredJobs = useMemo(() => {
    if (jobs.length >= 2) return jobs.slice(0, 4);
    return [
      { title: 'Senior Software Engineer', company: 'Stripe', source: 'LinkedIn', location: 'San Francisco / Remote' },
      { title: 'Growth Marketing Manager', company: 'Linear', source: 'Indeed', location: 'Remote' },
    ];
  }, [jobs]);

  const moreJobs = useMemo(() => {
    if (jobs.length > 4) return jobs.slice(4);
    return [
      { title: 'Product Manager', company: 'Discord', source: 'LinkedIn' },
      { title: 'Senior UI Engineer', company: 'Notion', source: 'Indeed' },
      { title: 'Brand Designer', company: 'Figma', source: 'Dribbble' },
    ];
  }, [jobs]);

  const topMatch = useMemo(() => {
    if (jobs.length > 0) return { title: jobs[0].title, company: jobs[0].company };
    return { title: 'Lead Product\nDesigner', company: 'Stripe • Remote' };
  }, [jobs]);

  /* ── theme-aware styles ── */
  const s = useMemo(() => {
    const greenAccent = colors.success;
    const greenBg = isDark ? 'rgba(52,211,153,0.12)' : 'rgba(16,185,129,0.10)';
    const pillBg = isDark ? '#293548' : colors.chipBackground;
    const pillText = isDark ? '#CBD5E1' : colors.textLight;
    const avatarBg = isDark ? '#CBD5E1' : colors.primary;
    const avatarIcon = isDark ? colors.background : colors.white;

    return StyleSheet.create({
      container: { flex: 1, backgroundColor: colors.background },
      scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120 },

      /* top bar */
      topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
      topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
      avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: avatarBg, justifyContent: 'center', alignItems: 'center' },
      avatarIcon: { color: avatarIcon },
      brand: { fontSize: 22, fontWeight: '700', fontStyle: 'italic', color: colors.text },

      /* greeting */
      greeting: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 10 },
      subGreeting: { fontSize: 15, color: colors.textLight, lineHeight: 22, marginBottom: 28 },

      /* dashboard row */
      dashRow: { flexDirection: 'row', gap: 14, marginBottom: 36 },

      /* ATS card */
      atsCard: {
        flex: 0.45, backgroundColor: colors.card, borderRadius: 24, padding: 16,
        alignItems: 'center', justifyContent: 'space-between',
        ...(isDark ? {} : { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 }),
      },
      cardLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1.5, alignSelf: 'flex-start', marginBottom: 12 },
      updateBtn: { backgroundColor: isDark ? '#293548' : colors.chipBackground, width: '100%', paddingVertical: 12, borderRadius: 16, alignItems: 'center', marginTop: 14 },
      updateBtnText: { color: isDark ? '#CBD5E1' : colors.primary, fontSize: 13, fontWeight: '600' },

      /* Top Match card */
      matchCard: {
        flex: 0.55, backgroundColor: colors.card, borderRadius: 24, padding: 20,
        justifyContent: 'space-between',
        ...(isDark ? {} : { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 }),
      },
      matchTitle: { fontSize: 22, fontWeight: '700', color: colors.text, lineHeight: 28, marginBottom: 6 },
      matchSub: { fontSize: 13, color: colors.textLight },
      matchBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },

      /* green pill */
      greenPill: { backgroundColor: greenBg, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
      greenPillText: { color: greenAccent, fontSize: 12, fontWeight: '700' },

      /* section header */
      sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
      sectionTitle: { fontSize: 19, fontWeight: '600', color: colors.text },
      viewAll: { fontSize: 14, fontWeight: '600', color: colors.primaryLight },

      /* featured cards */
      featuredScroll: { paddingRight: 20 },
      featuredCard: {
        width: SCREEN_W * 0.65, backgroundColor: colors.card, borderRadius: 28, padding: 22, marginRight: 14,
        ...(isDark ? {} : { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 }),
      },
      featuredTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
      featuredLogo: { width: 48, height: 48, borderRadius: 24, backgroundColor: isDark ? colors.white : colors.chipBackground, justifyContent: 'center', alignItems: 'center' },
      featuredTitle: { fontSize: 20, fontWeight: '700', color: colors.text, lineHeight: 26, marginBottom: 8 },
      featuredSub: { fontSize: 13, color: colors.textLight, marginBottom: 18 },
      pillRow: { flexDirection: 'row', gap: 8 },
      darkPill: { backgroundColor: pillBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
      darkPillText: { color: pillText, fontSize: 12 },

      /* more jobs list */
      moreList: { gap: 14 },
      listCard: {
        backgroundColor: colors.card, borderRadius: 20, padding: 16,
        flexDirection: 'row', alignItems: 'center', gap: 14,
        ...(isDark ? {} : { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 }),
      },
      listIcon: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
      listInitial: { color: colors.white, fontSize: 22, fontWeight: '700' },
      listBody: { flex: 1 },
      listTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
      listSub: { fontSize: 13, color: colors.textLight },
      listRight: { alignItems: 'flex-end', gap: 6 },
      listTime: { fontSize: 11, color: colors.textMuted },
    });
  }, [colors, isDark]);

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textLight }}>Connecting…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* ─── Top bar ─── */}
        <View style={s.topBar}>
          <View style={s.topBarLeft}>
            <View style={s.avatar}>
              <Ionicons name="person" size={20} color={isDark ? colors.background : colors.white} />
            </View>
            <Text style={s.brand}>Jobease</Text>
          </View>
          <TouchableOpacity>
            <Ionicons name="notifications" size={22} color={colors.primaryLight} />
          </TouchableOpacity>
        </View>

        {/* ─── Greeting ─── */}
        <Text style={s.greeting}>{greeting}, {userName}</Text>
        <Text style={s.subGreeting}>
          Your AI-Powered Career Companion: Stay ahead with smart job matches tailored to your preferences.
        </Text>

        {/* ─── Dashboard row ─── */}
        <View style={s.dashRow}>
          <View style={s.atsCard}>
            <Text style={s.cardLabel}>ATS STRENGTH</Text>
            <CircularProgress
              score={resumeScore}
              size={100}
              strokeWidth={8}
              trackColor={isDark ? '#1E293B' : colors.border}
              progressColor={colors.success}
              textColor={colors.text}
              subColor={colors.textMuted}
            />
            <TouchableOpacity style={s.updateBtn} onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.8}>
              <Text style={s.updateBtnText}>Update Resume</Text>
            </TouchableOpacity>
          </View>

          <View style={s.matchCard}>
            <View>
              <Text style={s.cardLabel}>TOP MATCH</Text>
              <Text style={s.matchTitle}>{topMatch.title}</Text>
              <Text style={s.matchSub}>{topMatch.company}</Text>
            </View>
            <View style={s.matchBottom}>
              <View style={s.greenPill}>
                <Text style={s.greenPillText}>98% Match</Text>
              </View>
              <Ionicons name="star" size={18} color={colors.primaryLight} />
            </View>
          </View>
        </View>

        {/* ─── Featured Opportunities ─── */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Featured Opportunities</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/discover')}>
            <Text style={s.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.featuredScroll}>
          {featuredJobs.map((job, i) => (
            <TouchableOpacity
              key={i}
              style={s.featuredCard}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: '/job/[id]',
                  params: { id: i, title: job.title, company: job.company, link: job.link, source: job.source, salary: 'Competitive', location: job.location || 'Remote' },
                })
              }
            >
              <View style={s.featuredTopRow}>
                <View style={s.featuredLogo}>
                  <Ionicons name={i % 2 === 0 ? 'code-slash' : 'trending-up'} size={22} color={isDark ? colors.background : colors.primary} />
                </View>
                <Ionicons name="bookmark-outline" size={20} color={colors.textLight} />
              </View>
              <Text style={s.featuredTitle} numberOfLines={2}>{job.title}</Text>
              <Text style={s.featuredSub} numberOfLines={1}>{job.company} • {job.location || 'Remote'}</Text>
              <View style={s.pillRow}>
                <View style={s.darkPill}><Text style={s.darkPillText}>$150k - $240k</Text></View>
                <View style={s.darkPill}><Text style={s.darkPillText}>Full-time</Text></View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ─── More Jobs for You ─── */}
        <View style={[s.sectionRow, { marginTop: 32 }]}>
          <Text style={s.sectionTitle}>More Jobs for You</Text>
        </View>

        <View style={s.moreList}>
          {moreJobs.map((job, i) => {
            const initial = (job.company || 'C').charAt(0).toUpperCase();
            const bg = PILL_COLORS[i % PILL_COLORS.length];
            const matchPct = 92 - i * 3;
            return (
              <TouchableOpacity
                key={i}
                style={s.listCard}
                activeOpacity={0.8}
                onPress={() =>
                  router.push({
                    pathname: '/job/[id]',
                    params: { id: i + 10, title: job.title, company: job.company, link: job.link, source: job.source, salary: 'Competitive', location: 'Remote' },
                  })
                }
              >
                <View style={[s.listIcon, { backgroundColor: bg }]}>
                  <Text style={s.listInitial}>{initial}</Text>
                </View>
                <View style={s.listBody}>
                  <Text style={s.listTitle} numberOfLines={1}>{job.title}</Text>
                  <Text style={s.listSub} numberOfLines={1}>{job.company} • via {job.source || 'Web'}</Text>
                </View>
                <View style={s.listRight}>
                  <View style={s.greenPill}>
                    <Text style={s.greenPillText}>{matchPct}% Match</Text>
                  </View>
                  <Text style={s.listTime}>{(i + 1) * 2}h ago</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
