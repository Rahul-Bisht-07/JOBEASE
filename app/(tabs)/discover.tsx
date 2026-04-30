import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/ThemeContext';
import { borderRadius, elevation, spacing, typography } from '../../lib/theme';
import { getApiUrl } from '../../lib/api';

const FILTERS = ['Remote', 'Full-time', 'Onsite', 'Design', 'Engineering'];

export default function DiscoverScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>(['Remote']);
  const [jobs, setJobs] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      const resp = await fetch(getApiUrl('/api/jobs'));
      const data = await resp.json();
      if (resp.ok && data.success) {
        setJobs(data.data);
      }
    } catch (e) {
      console.error('Job fetch error', e);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleLiveSearch = async () => {
    if (!query.trim()) return;

    setSearchLoading(true);
    try {
      const resp = await fetch(getApiUrl('/api/jobs/search'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term: query })
      });
      const data = await resp.json();

      if (resp.ok && data.success) {
        setJobs(prev => {
          const newJobLinks = new Set(data.data.map((j: any) => j.link));
          const filteredPrev = prev.filter(j => !newJobLinks.has(j.link));
          return [...data.data, ...filteredPrev];
        });
      }
    } catch (e) {
      console.error('Live search error', e);
    } finally {
      setSearchLoading(false);
    }
  };

  const toggleFilter = (filter: string) => {
    setActiveFilters(prev =>
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const jobString = `${job.title} ${job.company} ${job.source}`.toLowerCase();
      const matchesQuery = jobString.includes(query.toLowerCase());

      const matchesFilter = activeFilters.length === 0 || activeFilters.every(f => {
        if (f === 'Remote') return true;
        return jobString.includes(f.toLowerCase());
      });

      return matchesQuery && matchesFilter;
    });
  }, [query, activeFilters, jobs]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundSoft,
    },
    scrollContent: {
      padding: spacing.lg,
      gap: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    pageTitle: {
      ...typography.h1,
      color: colors.text,
    },
    subtitle: {
      ...typography.body,
      color: colors.textLight,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
      ...elevation.card,
    },
    input: {
      flex: 1,
      ...typography.body,
      color: colors.text,
    },
    chipRow: {
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    filterChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.background,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterText: {
      ...typography.bodySmall,
      color: colors.text,
    },
    filterTextActive: {
      color: colors.white,
      fontWeight: '600',
    },
    jobStack: {
      gap: spacing.md,
    },
    jobCard: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      gap: spacing.sm,
      ...elevation.card,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    logo: {
      width: 48,
      height: 48,
      borderRadius: borderRadius.md,
      backgroundColor: colors.backgroundDark,
    },
    jobTitle: {
      ...typography.h3,
      color: colors.text,
    },
    company: {
      ...typography.bodySmall,
      color: colors.textLight,
    },
    matchBubble: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.backgroundDark,
      justifyContent: 'center',
      alignItems: 'center',
    },
    matchLabel: {
      ...typography.h3,
      color: colors.primary,
      fontWeight: '700',
    },
    matchCaption: {
      ...typography.caption,
      color: colors.textMuted,
    },
    location: {
      ...typography.bodySmall,
      color: colors.textLight,
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    salary: {
      ...typography.body,
      color: colors.text,
      fontWeight: '600',
    },
    statusTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
    },
    statusText: {
      ...typography.caption,
      color: colors.white,
      fontWeight: '600',
    },
  }), [colors]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Discover Roles</Text>
        <Text style={styles.subtitle}>Refine your matches with filters tailored for you.</Text>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.textLight} />
          <TextInput
            placeholder="Search by role (e.g. Python)..."
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleLiveSearch}
            returnKeyType="search"
          />
          {query ? (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              {searchLoading && <Text style={{ fontSize: 10, color: colors.primary }}>Scan...</Text>}
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.textLight} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {FILTERS.map(filter => {
            const active = activeFilters.includes(filter);
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => toggleFilter(filter)}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{filter}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.jobStack}>
          {filteredJobs.length === 0 && (
            <Text style={{ textAlign: 'center', color: colors.textLight, marginTop: 20 }}>
              No jobs found matching your criteria.
            </Text>
          )}
          {filteredJobs.map((job, index) => (
            <TouchableOpacity
              key={index}
              style={styles.jobCard}
              activeOpacity={0.7}
              onPress={() => router.push({
                pathname: '/job/[id]',
                params: {
                  id: job._id || index,
                  title: job.title,
                  company: job.company,
                  location: job.location || 'India',
                  salary: job.salary || 'Competitive',
                  source: job.source || 'Naukri',
                  link: job.link,
                },
              })}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.logo, { alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ fontSize: 24 }}>🔍</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
                  <Text style={styles.company} numberOfLines={1}>{job.company}</Text>
                </View>
                <View style={styles.matchBubble}>
                  <Text style={styles.matchLabel}>{Math.floor(Math.random() * 20 + 80)}%</Text>
                  <Text style={styles.matchCaption}>Match</Text>
                </View>
              </View>
              <Text style={styles.location}>{job.source || 'Naukri'}  •  {job.location || 'India'}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.salary}>{job.salary || 'Competitive'}</Text>
                <View style={styles.statusTag}>
                  <Ionicons name="flash" size={14} color={colors.white} />
                  <Text style={styles.statusText}>New</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
