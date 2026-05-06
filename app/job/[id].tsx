import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../lib/ThemeContext';
import { getApiUrl } from '../../lib/api';
import { spacing, typography } from '../../lib/theme';

export default function JobDetailsScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const params = useLocalSearchParams();
    const { title, company, location, salary, source, link } = params;

    const [job, setJob] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [naukriLinked, setNaukriLinked] = useState(false);
    const [addedToQueue, setAddedToQueue] = useState(false);
    const [queueLoading, setQueueLoading] = useState(false);

    const isNaukriJob = (source as string)?.toLowerCase() === 'naukri';

    useEffect(() => {
        const fetchJob = async () => {
            if (!link) { setLoading(false); return; }
            try {
                // First try to get from DB (has full details if scraped)
                const resp = await fetch(getApiUrl(`/api/jobs?search=${encodeURIComponent(title as string)}`));
                const data = await resp.json();
                if (data.success && data.data?.length > 0) {
                    const found = data.data.find((j: any) => j.link === link);
                    if (found && found.description) {
                        setJob(found);
                        setLoading(false);
                        return;
                    }
                }
                // Fallback: scrape details live
                const detailResp = await fetch(getApiUrl('/api/jobs/details'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ link }),
                });
                const detailData = await detailResp.json();
                if (detailData.success && detailData.data) {
                    setJob({ title, company, location, salary, source, link, ...detailData.data });
                }
            } catch (e) {
                console.error('Failed to fetch job details', e);
            } finally {
                setLoading(false);
            }
        };
        fetchJob();
    }, [link, title, company, location, salary, source]);

    // Check Naukri link status
    useEffect(() => {
        if (!isNaukriJob) return;
        (async () => {
            const token = await AsyncStorage.getItem('authToken');
            if (!token) return;
            try {
                const resp = await fetch(getApiUrl('/api/naukri/status'), {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await resp.json();
                if (data.success && data.isLinked) setNaukriLinked(true);
            } catch { }
        })();
    }, [isNaukriJob]);

    const handleAddToQueue = useCallback(async () => {
        setQueueLoading(true);
        try {
            const token = await AsyncStorage.getItem('authToken');
            const resp = await fetch(getApiUrl('/api/naukri/queue'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    jobs: [{ jobTitle: title as string, company: company as string, jobUrl: link as string }],
                }),
            });
            const data = await resp.json();
            if (resp.ok && data.success) {
                setAddedToQueue(true);
                Alert.alert('Added!', `"${title}" added to your auto-apply queue.`, [
                    { text: 'View Queue', onPress: () => router.push('/naukri/queue') },
                    { text: 'OK' },
                ]);
            } else {
                Alert.alert('Error', data.message || 'Could not add to queue');
            }
        } catch {
            Alert.alert('Error', 'Network error');
        } finally {
            setQueueLoading(false);
        }
    }, [title, company, link, router]);

    // Detail row component
    const DetailRow = ({ icon, label, value }: { icon: string; label: string; value: string }) => {
        if (!value) return null;
        return (
            <View style={s.detailRow}>
                <Ionicons name={icon as any} size={18} color={colors.primary} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                    <Text style={s.detailLabel}>{label}</Text>
                    <Text style={s.detailValue}>{value}</Text>
                </View>
            </View>
        );
    };

    const s = useMemo(() => StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        header: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: spacing.md, paddingVertical: spacing.md,
            borderBottomWidth: 1, borderBottomColor: colors.border,
        },
        backButton: { padding: spacing.xs },
        headerTitle: { ...typography.h3, color: colors.text },
        content: { padding: spacing.lg, gap: 20, paddingBottom: 120 },
        titleSection: { alignItems: 'center', gap: spacing.sm },
        logoPlaceholder: {
            width: 72, height: 72, borderRadius: 20,
            backgroundColor: isDark ? '#1E293B' : colors.chipBackground,
            justifyContent: 'center', alignItems: 'center',
        },
        realLogo: {
            width: 72, height: 72, borderRadius: 20,
            borderWidth: 1, borderColor: colors.border,
        },
        jobTitle: { ...typography.h2, color: colors.text, textAlign: 'center', fontSize: 20 },
        companyName: { ...typography.body, color: colors.primary, fontWeight: '600' },
        sourceBadge: {
            flexDirection: 'row', alignItems: 'center', gap: 4,
            backgroundColor: 'rgba(74,144,217,0.15)',
            paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginTop: 4,
        },
        sourceBadgeText: { fontSize: 12, fontWeight: '600', color: '#4A90D9' },
        infoGrid: {
            flexDirection: 'row', justifyContent: 'space-around',
            backgroundColor: colors.card, padding: spacing.md, borderRadius: 18,
            borderWidth: isDark ? 0 : 1, borderColor: colors.border,
        },
        infoItem: { alignItems: 'center', gap: 4 },
        infoText: { fontSize: 13, color: colors.text, fontWeight: '500', textAlign: 'center' },
        infoLabel: { fontSize: 11, color: colors.textMuted },
        section: {
            backgroundColor: colors.card, borderRadius: 18, padding: 18,
            borderWidth: isDark ? 0 : 1, borderColor: colors.border,
        },
        sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 12 },
        descriptionText: { fontSize: 14, color: colors.textLight, lineHeight: 22 },
        detailsGrid: { gap: 14 },
        detailRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
        detailLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
        detailValue: { fontSize: 14, color: colors.text, fontWeight: '500' },
        aboutSection: {
            backgroundColor: colors.card, borderRadius: 18, padding: 18,
            borderWidth: isDark ? 0 : 1, borderColor: colors.border,
        },
        aboutText: { fontSize: 14, color: colors.textLight, lineHeight: 22 },
        hqText: { fontSize: 13, color: colors.textMuted, marginTop: 10 },
        buttonsRow: { gap: 12, marginTop: 4 },
        applyButton: {
            backgroundColor: colors.primary, flexDirection: 'row',
            alignItems: 'center', justifyContent: 'center',
            paddingVertical: 15, borderRadius: 14, gap: spacing.sm,
        },
        applyButtonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
        queueButton: {
            backgroundColor: '#4A90D9', flexDirection: 'row',
            alignItems: 'center', justifyContent: 'center',
            paddingVertical: 15, borderRadius: 14, gap: spacing.sm,
        },
        queueButtonDone: { backgroundColor: isDark ? '#1A3A2A' : '#ECFDF5' },
        queueButtonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
        queueButtonTextDone: { color: colors.success },
        linkHint: {
            flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: isDark ? '#162032' : '#EEF2FF',
            borderRadius: 14, padding: 14,
        },
        linkHintText: { flex: 1, fontSize: 13, color: colors.textLight, lineHeight: 18 },
        loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
    }), [colors, isDark]);

    return (
        <SafeAreaView style={s.container}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Job Details</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
                {/* Title Section */}
                <View style={s.titleSection}>
                    {job?.logo ? (
                        <Image source={{ uri: job.logo }} style={s.realLogo} />
                    ) : (
                        <View style={s.logoPlaceholder}>
                            <Text style={{ fontSize: 28 }}>💼</Text>
                        </View>
                    )}
                    <Text style={s.jobTitle}>{title}</Text>
                    <Text style={s.companyName}>{company}</Text>
                    {source && (
                        <View style={s.sourceBadge}>
                            <Ionicons name="globe-outline" size={12} color="#4A90D9" />
                            <Text style={s.sourceBadgeText}>via {source}</Text>
                        </View>
                    )}
                </View>

                {/* Quick Info Grid */}
                <View style={s.infoGrid}>
                    <View style={s.infoItem}>
                        <Ionicons name="location-outline" size={20} color={colors.primary} />
                        <Text style={s.infoText}>{job?.location || location || 'India'}</Text>
                        <Text style={s.infoLabel}>Location</Text>
                    </View>
                    <View style={s.infoItem}>
                        <Ionicons name="cash-outline" size={20} color={colors.primary} />
                        <Text style={s.infoText}>{job?.salary || salary || 'Not disclosed'}</Text>
                        <Text style={s.infoLabel}>Salary</Text>
                    </View>
                    <View style={s.infoItem}>
                        <Ionicons name="briefcase-outline" size={20} color={colors.primary} />
                        <Text style={s.infoText}>{job?.experience || 'Not specified'}</Text>
                        <Text style={s.infoLabel}>Experience</Text>
                    </View>
                </View>

                {/* Job Description */}
                {loading ? (
                    <View style={s.loadingBox}>
                        <ActivityIndicator color={colors.primary} />
                        <Text style={{ color: colors.textMuted, marginTop: 8 }}>Loading details…</Text>
                    </View>
                ) : (
                    <>
                        {(job?.description) && (
                            <View style={s.section}>
                                <Text style={s.sectionTitle}>Job Description</Text>
                                <Text style={s.descriptionText}>{job.description}</Text>
                            </View>
                        )}

                        {/* Job Details Grid */}
                        {(job?.industry || job?.department || job?.role || job?.employmentType || job?.education) && (
                            <View style={s.section}>
                                <Text style={s.sectionTitle}>Job Details</Text>
                                <View style={s.detailsGrid}>
                                    <DetailRow icon="business-outline" label="Industry" value={job.industry} />
                                    <DetailRow icon="grid-outline" label="Department" value={job.department} />
                                    <DetailRow icon="person-outline" label="Role" value={job.role} />
                                    <DetailRow icon="time-outline" label="Employment Type" value={job.employmentType} />
                                    <DetailRow icon="school-outline" label="Education" value={job.education} />
                                </View>
                            </View>
                        )}

                        {/* About Company */}
                        {job?.companyAbout && (
                            <View style={s.aboutSection}>
                                <Text style={s.sectionTitle}>About {company}</Text>
                                <Text style={s.aboutText}>{job.companyAbout}</Text>
                                {job.companyHq && (
                                    <Text style={s.hqText}>📍 HQ: {job.companyHq}</Text>
                                )}
                            </View>
                        )}
                    </>
                )}

                {/* Action Buttons */}
                <View style={s.buttonsRow}>
                    <TouchableOpacity
                        style={s.applyButton}
                        onPress={() => { if (link) Linking.openURL(link as string); }}
                    >
                        <Text style={s.applyButtonText}>Apply Now</Text>
                        <Ionicons name="open-outline" size={20} color={colors.white} />
                    </TouchableOpacity>

                    {isNaukriJob && naukriLinked && (
                        <TouchableOpacity
                            style={[s.queueButton, addedToQueue && s.queueButtonDone]}
                            onPress={addedToQueue ? undefined : handleAddToQueue}
                            disabled={queueLoading || addedToQueue}
                            activeOpacity={0.85}
                        >
                            <Ionicons
                                name={addedToQueue ? 'checkmark-circle' : 'flash'}
                                size={20}
                                color={addedToQueue ? colors.success : colors.white}
                            />
                            <Text style={[s.queueButtonText, addedToQueue && s.queueButtonTextDone]}>
                                {queueLoading ? 'Adding…' : addedToQueue ? 'Added to Queue' : '⚡ Add to Auto-Apply Queue'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {isNaukriJob && !naukriLinked && (
                        <TouchableOpacity style={s.linkHint} onPress={() => router.push('/naukri/link')}>
                            <Ionicons name="flash-outline" size={18} color={colors.primary} />
                            <Text style={s.linkHintText}>
                                <Text style={{ fontWeight: '700', color: colors.primary }}>Link Naukri</Text> to auto-apply to this job
                            </Text>
                            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
