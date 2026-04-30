import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getApiUrl, withJson } from '../lib/api';
import { useTheme } from '../lib/ThemeContext';
import { borderRadius, spacing, typography } from '../lib/theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ token?: string; email?: string; otp?: string }>();
  const token = useMemo(() => params.token?.toString() ?? '', [params.token]);
  const email = useMemo(() => params.email?.toString() ?? '', [params.email]);
  const otp = useMemo(() => params.otp?.toString() ?? '', [params.otp]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  const validateForm = () => {
    const nextErrors: { password?: string; confirmPassword?: string } = {};

    if (!password) {
      nextErrors.password = 'Password is required';
    } else if (password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Confirm your password';
    } else if (password && password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!token && !(email && otp)) {
      Alert.alert('Missing information', 'Open this page via the OTP flow or email link.');
      return;
    }

    if (!validateForm()) return;

    setLoading(true);
    setSuccessMessage('');
    try {
      const url = token ? '/api/auth/reset-password' : '/api/auth/reset-password-otp';
      const payload = token ? { token, password } : { email, otp, password };
      const response = await fetch(getApiUrl(url), withJson({ method: 'POST', body: JSON.stringify(payload) }));

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessMessage('Password updated! You can now sign in with your new password.');
        setPassword('');
        setConfirmPassword('');
        setTimeout(() => router.replace('/(auth)/login'), 1200);
      } else {
        Alert.alert('Unable to reset password', data.message || 'Please try again.');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      Alert.alert('Network error', 'Please ensure the backend server is running and reachable.');
    } finally {
      setLoading(false);
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    keyboardView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
      paddingBottom: spacing.xl,
    },
    header: {
      marginBottom: spacing.xl,
    },
    title: {
      ...typography.h1,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    subtitle: {
      ...typography.body,
      color: colors.textLight,
      lineHeight: 24,
    },
    form: {
      flex: 1,
    },
    inputContainer: {
      marginBottom: spacing.lg,
    },
    label: {
      ...typography.bodySmall,
      color: colors.text,
      fontWeight: '600',
      marginBottom: spacing.sm,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.backgroundDark,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      height: 56,
    },
    inputIcon: {
      marginRight: spacing.sm,
    },
    input: {
      flex: 1,
      ...typography.body,
      color: colors.text,
      padding: 0,
    },
    inputError: {
      borderColor: colors.error,
      borderWidth: 2,
    },
    errorText: {
      ...typography.caption,
      color: colors.error,
      marginTop: spacing.xs,
      marginLeft: spacing.sm,
    },
    successCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      padding: spacing.md,
      borderRadius: borderRadius.md,
      marginBottom: spacing.lg,
    },
    statusIcon: {
      marginRight: spacing.sm,
    },
    successText: {
      ...typography.body,
      color: colors.success,
      flex: 1,
    },
    submitButton: {
      borderRadius: borderRadius.md,
      overflow: 'hidden',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonGradient: {
      paddingVertical: spacing.md + 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitButtonText: {
      ...typography.h3,
      color: colors.white,
      fontWeight: '700',
    },
    backLink: {
      marginTop: spacing.lg,
      alignItems: 'center',
    },
    backLinkText: {
      ...typography.body,
      color: colors.primary,
      fontWeight: '600',
    },
  }), [colors]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Set a new password</Text>
            <Text style={styles.subtitle}>
              Choose a strong password you haven't used before. Your code or link expires after 10 minutes.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>New Password</Text>
              <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={colors.textLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your new password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                />
              </View>
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputError]}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={colors.textLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter your password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={(value) => {
                    setConfirmPassword(value);
                    if (errors.confirmPassword) {
                      setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                    }
                  }}
                />
              </View>
              {errors.confirmPassword ? (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              ) : null}
            </View>

            {successMessage ? (
              <View style={styles.successCard}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} style={styles.statusIcon} />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <LinearGradient
                  colors={['#6366F1', '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitButtonGradient}
                >
                  <Text style={styles.submitButtonText}>Update Password</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.backLink} onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.backLinkText}>Return to sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
