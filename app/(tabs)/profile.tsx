import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getApiUrl, withJson } from '../../lib/api';
import { useTheme } from '../../lib/ThemeContext';
import { borderRadius, elevation, spacing, typography } from '../../lib/theme';

interface ProfileForm {
  fullName: string;
  phone: string;
  location: string;
  bio: string;
  education10: string;
  education12: string;
  jobTypes: string;
  preferredLocations: string;
  minSalary: string;
  maxSalary: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, toggleTheme, isDark } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [botProfile, setBotProfile] = useState<any>({});
  const [form, setForm] = useState<ProfileForm>({
    fullName: '',
    phone: '',
    location: '',
    bio: '',
    education10: '',
    education12: '',
    jobTypes: '',
    preferredLocations: '',
    minSalary: '',
    maxSalary: '',
  });

  const fetchProfile = useCallback(async () => {
    const token = await AsyncStorage.getItem('authToken');
    if (!token) {
      router.replace('/(auth)/welcome');
      return;
    }
    try {
      const resp = await fetch(getApiUrl('/api/users/me'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        const profile = data.user.profile || {};
        const preferences = data.user.preferences || {};
        const education = profile.education || [];
        const tenth = education.find((entry: any) => entry.degree === '10th Grade');
        const twelfth = education.find((entry: any) => entry.degree === '12th Grade');
        setUser(data.user);
        setForm({
          fullName: data.user.name || '',
          phone: profile.phone || '',
          location: profile.location || '',
          bio: profile.bio || '',
          education10: tenth?.institution || '',
          education12: twelfth?.institution || '',
          jobTypes: (preferences.jobTypes || []).join(', '),
          preferredLocations: (preferences.locations || []).join(', '),
          minSalary: preferences.salaryRange?.min ? String(preferences.salaryRange.min) : '',
          maxSalary: preferences.salaryRange?.max ? String(preferences.salaryRange.max) : '',
        });
        setBotProfile(data.user.botProfile || {});
      }
    } catch (error) {
      console.error('Profile fetch error', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const resumeMetadata = useMemo(() => {
    if (!user?.resume?.url) return null;
    return {
      name: user.resume.originalName || 'Resume.pdf',
      uploadedAt: user.resume.uploadedAt
        ? new Date(user.resume.uploadedAt).toLocaleDateString()
        : 'Recently',
    };
  }, [user]);

  const handleInput = (key: keyof ProfileForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleBotInput = (key: string, value: any) => {
    setBotProfile((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleResumeUpload = async () => {
    setUploading(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) {
        setUploading(false);
        return;
      }

      const asset = result.assets[0];
      const token = await AsyncStorage.getItem('authToken');
      if (!token) throw new Error('Missing auth token');

      const formData = new FormData();
      formData.append('resume', {
        uri: asset.uri,
        name: asset.name || `resume-${Date.now()}`,
        type: asset.mimeType || 'application/pdf',
      } as any);

      const resp = await fetch(getApiUrl('/api/users/resume'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.message || 'Failed to upload resume');
      }
      Alert.alert('Resume Uploaded', 'We refreshed your resume successfully.');
      await fetchProfile();
    } catch (error: any) {
      Alert.alert('Upload failed', error.message || 'Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const token = await AsyncStorage.getItem('authToken');
    if (!token) return;
    setSaving(true);
    try {
      const education = [] as any[];
      if (form.education10) {
        education.push({ degree: '10th Grade', institution: form.education10 });
      }
      if (form.education12) {
        education.push({ degree: '12th Grade', institution: form.education12 });
      }

      const payload = {
        name: form.fullName,
        profile: {
          phone: form.phone,
          location: form.location,
          bio: form.bio,
          education,
        },
        preferences: {
          jobTypes: form.jobTypes.split(',').map(s => s.trim()).filter(Boolean),
          locations: form.preferredLocations.split(',').map(s => s.trim()).filter(Boolean),
          salaryRange: {
            min: form.minSalary ? Number(form.minSalary) : undefined,
            max: form.maxSalary ? Number(form.maxSalary) : undefined,
          },
        },
        botProfile,
      };

      const resp = await fetch(getApiUrl('/api/users/profile'), withJson({
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      }));

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.message || 'Unable to save profile');
      }
      setUser(data.user);
      Alert.alert('Profile updated', 'Your preferences are synced.');
    } catch (error: any) {
      Alert.alert('Update failed', error.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      router.replace('/(auth)/welcome');
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundSoft,
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
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
    card: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      gap: spacing.md,
      ...elevation.card,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cardTitle: {
      ...typography.h3,
      color: colors.text,
    },
    linkButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      backgroundColor: colors.backgroundDark,
    },
    linkButtonText: {
      ...typography.bodySmall,
      color: colors.primary,
      fontWeight: '600',
    },
    bodyText: {
      ...typography.body,
      color: colors.text,
    },
    caption: {
      ...typography.bodySmall,
      color: colors.textMuted,
    },
    sectionTitle: {
      ...typography.h3,
      color: colors.text,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      backgroundColor: colors.background,
      ...typography.body,
      color: colors.text,
    },
    multiline: {
      minHeight: 96,
      textAlignVertical: 'top',
    },
    row: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    half: {
      flex: 1,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.full,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    primaryButtonText: {
      ...typography.body,
      color: colors.white,
      fontWeight: '600',
    },
    themeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    themeLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    themeLabelText: {
      ...typography.body,
      color: colors.text,
      fontWeight: '500',
    },
  }), [colors]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Text style={styles.subtitle}>Loading profile…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Profile & Preferences</Text>
        <Text style={styles.subtitle}>Keep your resume fresh and preferences aligned.</Text>

        {/* Theme Toggle Card */}
        <View style={styles.card}>
          <View style={styles.themeRow}>
            <View style={styles.themeLabel}>
              <Ionicons
                name={isDark ? 'moon' : 'sunny'}
                size={22}
                color={isDark ? '#FBBF24' : '#F59E0B'}
              />
              <Text style={styles.themeLabelText}>
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={isDark ? colors.primary : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Resume Strength</Text>
            <TouchableOpacity style={styles.linkButton} onPress={handleResumeUpload} disabled={uploading}>
              <Text style={styles.linkButtonText}>{uploading ? 'Analyzing…' : 'Upload Resume'}</Text>
            </TouchableOpacity>
          </View>
          {resumeMetadata ? (
            <View>
              <Text style={styles.bodyText}>{resumeMetadata.name}</Text>
              <Text style={styles.caption}>Updated {resumeMetadata.uploadedAt}</Text>
            </View>
          ) : (
            <Text style={styles.caption}>No resume yet. Upload a PDF or DOCX file.</Text>
          )}

          {/* ATS Score Breakdown */}
          {user?.resumeScore?.overall != null && (
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
                <Text style={[typography.h1, { color: user.resumeScore.overall >= 70 ? '#22C55E' : user.resumeScore.overall >= 40 ? '#F59E0B' : '#EF4444', fontWeight: '700' }]}>
                  {user.resumeScore.overall}/100
                </Text>
                <Text style={[typography.body, { color: colors.textMuted }]}>ATS Score</Text>
              </View>

              {user.resumeScore.breakdown && Object.entries(user.resumeScore.breakdown).map(([key, val]: [string, any]) => {
                const pct = val.max > 0 ? (val.score / val.max) * 100 : 0;
                const barColor = pct >= 70 ? '#22C55E' : pct >= 40 ? '#F59E0B' : '#EF4444';
                const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s: string) => s.toUpperCase());
                return (
                  <View key={key} style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={[typography.bodySmall, { color: colors.text }]}>{label}</Text>
                      <Text style={[typography.bodySmall, { color: colors.textMuted }]}>{val.score}/{val.max}</Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3 }}>
                      <View style={{ height: 6, width: `${pct}%`, backgroundColor: barColor, borderRadius: 3 }} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Basic Info</Text>
          <TextInput
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor={colors.textMuted}
            value={form.fullName}
            onChangeText={value => handleInput('fullName', value)}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            value={form.phone}
            onChangeText={value => handleInput('phone', value)}
          />
          <TextInput
            style={styles.input}
            placeholder="Location"
            placeholderTextColor={colors.textMuted}
            value={form.location}
            onChangeText={value => handleInput('location', value)}
          />
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Short bio"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            value={form.bio}
            onChangeText={value => handleInput('bio', value)}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Education Snapshot</Text>
          <TextInput
            style={styles.input}
            placeholder="10th Grade School / Board"
            placeholderTextColor={colors.textMuted}
            value={form.education10}
            onChangeText={value => handleInput('education10', value)}
          />
          <TextInput
            style={styles.input}
            placeholder="12th Grade School / Board"
            placeholderTextColor={colors.textMuted}
            value={form.education12}
            onChangeText={value => handleInput('education12', value)}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <TextInput
            style={styles.input}
            placeholder="Preferred job types (comma separated)"
            placeholderTextColor={colors.textMuted}
            value={form.jobTypes}
            onChangeText={value => handleInput('jobTypes', value)}
          />
          <TextInput
            style={styles.input}
            placeholder="Preferred locations"
            placeholderTextColor={colors.textMuted}
            value={form.preferredLocations}
            onChangeText={value => handleInput('preferredLocations', value)}
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.half]}
              placeholder="Min salary"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={form.minSalary}
              onChangeText={value => handleInput('minSalary', value)}
            />
            <TextInput
              style={[styles.input, styles.half]}
              placeholder="Max salary"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={form.maxSalary}
              onChangeText={value => handleInput('maxSalary', value)}
            />
          </View>
        </View>

        {/* --- AUTO-APPLY BOT PROFILE --- */}
        <View style={[styles.card, { borderColor: colors.primary, borderWidth: 2 }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary, fontWeight: '700' }]}>🤖 Auto-Apply AI Profile</Text>
          <Text style={styles.caption}>Fill this out once. Our Gemini AI will use these details to automatically answer recruiter chatbot questions when applying.</Text>

          <Text style={[styles.bodyText, { marginTop: 10, fontWeight: '700', color: colors.primary }]}>Experience & Skills</Text>
          <Text style={{ fontSize: 13, color: colors.text, marginBottom: 4, marginTop: 8 }}>Total experience (e.g., 5 years)</Text>
          <TextInput style={styles.input} placeholder="e.g., 5" placeholderTextColor={colors.textMuted} value={botProfile.totalExperience || ''} onChangeText={v => handleBotInput('totalExperience', v)} />

          <Text style={{ fontSize: 13, color: colors.text, marginBottom: 4, marginTop: 8 }}>Skills & experience (e.g., React (1 yr), Python (2 yrs), Node (1 yr))</Text>
          <TextInput style={styles.input} placeholder="e.g., React (1 yr), Python (2 yrs)" placeholderTextColor={colors.textMuted} value={botProfile.skillsProficiency || ''} onChangeText={v => handleBotInput('skillsProficiency', v)} />

          <Text style={{ fontSize: 13, color: colors.text, marginBottom: 4, marginTop: 8 }}>Languages you are proficient in</Text>
          <TextInput style={styles.input} placeholder="e.g., English, Hindi" placeholderTextColor={colors.textMuted} value={botProfile.languages || ''} onChangeText={v => handleBotInput('languages', v)} />

          <Text style={{ fontSize: 13, color: colors.text, marginBottom: 4, marginTop: 8 }}>Specific domain experience (e.g., Fintech, Healthcare)</Text>
          <TextInput style={styles.input} placeholder="Enter domains" placeholderTextColor={colors.textMuted} value={botProfile.workedOnDomain || ''} onChangeText={v => handleBotInput('workedOnDomain', v)} />

          <Text style={[styles.bodyText, { marginTop: 16, fontWeight: '700', color: colors.primary }]}>CTC & Salary</Text>
          <Text style={{ fontSize: 13, color: colors.text, marginBottom: 4, marginTop: 8 }}>Current CTC (LPA)</Text>
          <TextInput style={styles.input} placeholder="e.g., 8" placeholderTextColor={colors.textMuted} keyboardType="numeric" value={botProfile.currentCTC || ''} onChangeText={v => handleBotInput('currentCTC', v)} />

          <Text style={{ fontSize: 13, color: colors.text, marginBottom: 4, marginTop: 8 }}>Expected CTC (LPA)</Text>
          <TextInput style={styles.input} placeholder="e.g., 12" placeholderTextColor={colors.textMuted} keyboardType="numeric" value={botProfile.expectedCTC || ''} onChangeText={v => handleBotInput('expectedCTC', v)} />

          <Text style={[styles.bodyText, { marginTop: 16, fontWeight: '700', color: colors.primary }]}>Notice Period & Availability</Text>
          <Text style={{ fontSize: 13, color: colors.text, marginBottom: 4, marginTop: 8 }}>Current notice period</Text>
          <TextInput style={styles.input} placeholder="e.g., 30 days" placeholderTextColor={colors.textMuted} value={botProfile.noticePeriod || ''} onChangeText={v => handleBotInput('noticePeriod', v)} />

          <Text style={{ fontSize: 13, color: colors.text, marginBottom: 4, marginTop: 8 }}>How soon can you join?</Text>
          <TextInput style={styles.input} placeholder="e.g., Immediately" placeholderTextColor={colors.textMuted} value={botProfile.joinInDays || ''} onChangeText={v => handleBotInput('joinInDays', v)} />

          <Text style={[styles.bodyText, { marginTop: 16, fontWeight: '700', color: colors.primary }]}>Location & Work Mode</Text>
          <Text style={{ fontSize: 13, color: colors.text, marginBottom: 4, marginTop: 8 }}>Current Location</Text>
          <TextInput style={styles.input} placeholder="e.g., Bangalore" placeholderTextColor={colors.textMuted} value={botProfile.currentLocation || ''} onChangeText={v => handleBotInput('currentLocation', v)} />

          <Text style={{ fontSize: 13, color: colors.text, marginBottom: 4, marginTop: 8 }}>Willing to relocate to? (Cities or 'Yes/No')</Text>
          <TextInput style={styles.input} placeholder="e.g., Yes" placeholderTextColor={colors.textMuted} value={botProfile.willingToRelocate || ''} onChangeText={v => handleBotInput('willingToRelocate', v)} />

          <Text style={{ fontSize: 13, color: colors.text, marginBottom: 4, marginTop: 8 }}>Preferred work mode</Text>
          <TextInput style={styles.input} placeholder="e.g., Hybrid, WFH, WFO" placeholderTextColor={colors.textMuted} value={botProfile.workModePreferences || ''} onChangeText={v => handleBotInput('workModePreferences', v)} />

          <Text style={[styles.bodyText, { marginTop: 16, fontWeight: '700', color: colors.primary }]}>Education</Text>
          <Text style={{ fontSize: 13, color: colors.text, marginBottom: 4, marginTop: 8 }}>Highest qualification</Text>
          <TextInput style={styles.input} placeholder="e.g., B.Tech in CS" placeholderTextColor={colors.textMuted} value={botProfile.highestQualification || ''} onChangeText={v => handleBotInput('highestQualification', v)} />

          <Text style={{ fontSize: 13, color: colors.text, marginBottom: 4, marginTop: 8 }}>Graduation year</Text>
          <TextInput style={styles.input} placeholder="e.g., 2023" placeholderTextColor={colors.textMuted} keyboardType="numeric" value={botProfile.graduationYear || ''} onChangeText={v => handleBotInput('graduationYear', v)} />

          <Text style={{ fontSize: 13, color: colors.text, marginBottom: 4, marginTop: 8 }}>CGPA or Percentage</Text>
          <TextInput style={styles.input} placeholder="e.g., 8.5" placeholderTextColor={colors.textMuted} keyboardType="numeric" value={botProfile.cgpaPercentage || ''} onChangeText={v => handleBotInput('cgpaPercentage', v)} />

          <Text style={{ fontSize: 13, color: colors.text, marginBottom: 4, marginTop: 8 }}>Are you a fresher or experienced?</Text>
          <TextInput style={styles.input} placeholder="e.g., Fresher" placeholderTextColor={colors.textMuted} value={botProfile.fresherOrExperienced || ''} onChangeText={v => handleBotInput('fresherOrExperienced', v)} />

          <Text style={[styles.bodyText, { marginTop: 16, fontWeight: '700', color: colors.primary }]}>Profile / Intro</Text>
          <Text style={{ fontSize: 13, color: colors.text, marginBottom: 4, marginTop: 8 }}>Profile Headline (> 50 chars)</Text>
          <TextInput style={styles.input} placeholder="Enter your headline" placeholderTextColor={colors.textMuted} value={botProfile.profileHeadline || ''} onChangeText={v => handleBotInput('profileHeadline', v)} />

          <Text style={{ fontSize: 13, color: colors.text, marginBottom: 4, marginTop: 8 }}>Short summary about yourself</Text>
          <TextInput style={[styles.input, styles.multiline]} placeholder="Write a brief summary" placeholderTextColor={colors.textMuted} multiline value={botProfile.summary || ''} onChangeText={v => handleBotInput('summary', v)} />

          <Text style={[styles.bodyText, { marginTop: 16, fontWeight: '700', color: colors.primary }]}>Eligibility & Specifics (Yes/No)</Text>
          <Text style={{ fontSize: 13, color: colors.text, marginBottom: 4, marginTop: 8 }}>Comfortable with night/rotational shifts?</Text>
          <TextInput style={styles.input} placeholder="Yes / No" placeholderTextColor={colors.textMuted} value={botProfile.shiftsOk || ''} onChangeText={v => handleBotInput('shiftsOk', v)} />

          <Text style={{ fontSize: 13, color: colors.text, marginBottom: 4, marginTop: 8 }}>Okay with bond/service agreement?</Text>
          <TextInput style={styles.input} placeholder="Yes / No" placeholderTextColor={colors.textMuted} value={botProfile.bondOk || ''} onChangeText={v => handleBotInput('bondOk', v)} />

          <Text style={{ fontSize: 13, color: colors.text, marginBottom: 4, marginTop: 8 }}>Do you have a laptop/PC and internet?</Text>
          <TextInput style={styles.input} placeholder="Yes / No" placeholderTextColor={colors.textMuted} value={botProfile.hasLaptop || ''} onChangeText={v => handleBotInput('hasLaptop', v)} />

          <Text style={{ fontSize: 13, color: colors.text, marginBottom: 4, marginTop: 8 }}>Do you have a two-wheeler?</Text>
          <TextInput style={styles.input} placeholder="Yes / No" placeholderTextColor={colors.textMuted} value={botProfile.hasVehicle || ''} onChangeText={v => handleBotInput('hasVehicle', v)} />

          <Text style={{ fontSize: 13, color: colors.text, marginBottom: 4, marginTop: 8 }}>Comfortable with field work/travel?</Text>
          <TextInput style={styles.input} placeholder="Yes / No" placeholderTextColor={colors.textMuted} value={botProfile.fieldWorkOk || ''} onChangeText={v => handleBotInput('fieldWorkOk', v)} />

          <Text style={[styles.bodyText, { marginTop: 16, fontWeight: '700', color: colors.primary }]}>Role-specific</Text>
          <Text style={{ fontSize: 13, color: colors.text, marginBottom: 4, marginTop: 8 }}>Experience in Sales/Marketing/Support?</Text>
          <TextInput style={styles.input} placeholder="Yes / No" placeholderTextColor={colors.textMuted} value={botProfile.salesSupportExp || ''} onChangeText={v => handleBotInput('salesSupportExp', v)} />

          <Text style={{ fontSize: 13, color: colors.text, marginBottom: 4, marginTop: 8 }}>Comfortable with target-based roles?</Text>
          <TextInput style={styles.input} placeholder="Yes / No" placeholderTextColor={colors.textMuted} value={botProfile.targetBasedOk || ''} onChangeText={v => handleBotInput('targetBasedOk', v)} />

          <Text style={{ fontSize: 13, color: colors.text, marginBottom: 4, marginTop: 8 }}>Experience with US/UK/International clients?</Text>
          <TextInput style={styles.input} placeholder="Yes / No" placeholderTextColor={colors.textMuted} value={botProfile.intlClientExp || ''} onChangeText={v => handleBotInput('intlClientExp', v)} />

        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleSave} disabled={saving}>
          <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Save Profile'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.error || '#EF4444', marginTop: 10 }]}
          onPress={handleLogout}
        >
          <Text style={styles.primaryButtonText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
