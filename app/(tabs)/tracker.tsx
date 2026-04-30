import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/ThemeContext';
import { borderRadius, elevation, spacing, typography } from '../../lib/theme';

const JOB_STATUSES = ['Saved', 'Applied', 'Interviewing', 'Offers', 'Rejected'];

export default function TrackerScreen() {
  const { colors } = useTheme();
  const [activeStatus, setActiveStatus] = useState<string>(JOB_STATUSES[0]);
  const [trackedJobs, setTrackedJobs] = useState<any>({});

  const summary = useMemo(() => {
    return JOB_STATUSES.map(key => ({
      status: key,
      count: trackedJobs[key] ? trackedJobs[key].length : 0,
    }));
  }, [trackedJobs]);

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
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      alignItems: 'center',
      ...elevation.card,
    },
    summaryCount: {
      ...typography.h1,
      color: colors.primary,
    },
    summaryLabel: {
      ...typography.bodySmall,
      color: colors.textLight,
    },
    statusRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    statusPill: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statusPillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    statusText: {
      ...typography.bodySmall,
      color: colors.text,
    },
    statusTextActive: {
      color: colors.white,
      fontWeight: '600',
    },
    listStack: {
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
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    location: {
      ...typography.bodySmall,
      color: colors.textLight,
    },
    salary: {
      ...typography.body,
      color: colors.text,
      fontWeight: '600',
    },
  }), [colors]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Application Tracker</Text>
        <Text style={styles.subtitle}>Monitor progress across every stage.</Text>

        <View style={styles.summaryRow}>
          {summary.map(item => (
            <View key={item.status} style={styles.summaryCard}>
              <Text style={styles.summaryCount}>{item.count}</Text>
              <Text style={styles.summaryLabel}>{item.status}</Text>
            </View>
          ))}
        </View>

        <View style={styles.statusRow}>
          {JOB_STATUSES.map(status => {
            const active = status === activeStatus;
            return (
              <TouchableOpacity
                key={status}
                style={[styles.statusPill, active && styles.statusPillActive]}
                onPress={() => setActiveStatus(status)}
              >
                <Text style={[styles.statusText, active && styles.statusTextActive]}>{status}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.listStack}>
          {(!trackedJobs[activeStatus] || trackedJobs[activeStatus].length === 0) ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: colors.textLight }}>No jobs in this stage yet.</Text>
            </View>
          ) : (
            trackedJobs[activeStatus].map((job: any) => (
              <View key={job.id} style={styles.jobCard}>
                <View style={styles.cardHeader}>
                  <Image source={{ uri: job.logo }} style={styles.logo} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jobTitle}>{job.title}</Text>
                    <Text style={styles.company}>{job.company}</Text>
                  </View>
                  <TouchableOpacity>
                    <Ionicons name="ellipsis-horizontal" size={20} color={colors.textLight} />
                  </TouchableOpacity>
                </View>
                <View style={styles.cardFooter}>
                  <Text style={styles.location}>{job.location}</Text>
                  <Text style={styles.salary}>{job.salary}</Text>
                </View>
              </View>
            )))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
