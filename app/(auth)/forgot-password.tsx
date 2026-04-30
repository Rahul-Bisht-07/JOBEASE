import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
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
import { getApiUrl, withJson } from '../../lib/api';
import { useTheme } from '../../lib/ThemeContext';
import { borderRadius, spacing, typography } from '../../lib/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string }>({});
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [requestSucceeded, setRequestSucceeded] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);

  const validateForm = () => {
    const newErrors: { email?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendOtp = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setStatusMessage('');
    try {
      const response = await fetch(
        getApiUrl('/api/auth/forgot-password-otp'),
        withJson({
          method: 'POST',
          body: JSON.stringify({ email }),
        }),
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setRequestSucceeded(true);
        setOtpSent(true);
        setStatusMessage(
          data.message ||
            'If an account exists with that email, we have sent an OTP to your inbox.',
        );
      } else {
        setRequestSucceeded(false);
        setStatusMessage(data.message || 'Unable to process your request.');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setRequestSucceeded(false);
      Alert.alert(
        'Error',
        'Network error. Please make sure the backend server is running and the app can reach it.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Enter the 6-digit code you received.');
      return;
    }

    setVerifying(true);
    try {
      const resp = await fetch(
        getApiUrl('/api/auth/verify-reset-otp'),
        withJson({ method: 'POST', body: JSON.stringify({ email, otp }) }),
      );
      const data = await resp.json();
      if (resp.ok && data.success) {
        router.replace({ pathname: '/reset-password', params: { email, otp } });
      } else {
        Alert.alert('OTP verification failed', data.message || 'Please try again.');
      }
    } catch (e) {
      console.error('Verify OTP error:', e);
      Alert.alert('Network error', 'Please ensure the backend is running.');
    } finally {
      setVerifying(false);
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
      paddingTop: spacing.md,
    },
    header: {
      marginTop: spacing.xl,
      marginBottom: spacing.xl,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.backgroundDark,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.lg,
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
    inputError: {
      borderColor: colors.error,
      borderWidth: 2,
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
    errorText: {
      ...typography.caption,
      color: colors.error,
      marginTop: spacing.xs,
      marginLeft: spacing.sm,
    },
    statusCard: {
      flexDirection: 'row',
      padding: spacing.md,
      borderRadius: borderRadius.md,
      marginBottom: spacing.lg,
      alignItems: 'center',
    },
    statusIcon: {
      marginRight: spacing.sm,
    },
    statusText: {
      ...typography.body,
      flex: 1,
    },
    successCard: {
      backgroundColor: 'rgba(16, 185, 129, 0.08)',
    },
    successText: {
      color: colors.success,
    },
    errorCard: {
      backgroundColor: 'rgba(248, 113, 113, 0.12)',
    },
    submitButton: {
      borderRadius: borderRadius.md,
      overflow: 'hidden',
      marginBottom: spacing.md,
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
    backToLogin: {
      alignItems: 'center',
      marginTop: spacing.md,
    },
    backToLoginText: {
      ...typography.body,
      color: colors.primary,
      fontWeight: '600',
    },
  }), [colors]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Forgot Password</Text>
            <Text style={styles.subtitle}>
              Enter the email associated with your account and we'll send you a secure reset link.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={colors.textLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) setErrors({});
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {statusMessage ? (
              <View
                style={[
                  styles.statusCard,
                  requestSucceeded ? styles.successCard : styles.errorCard,
                ]}
              >
                <Ionicons
                  name={requestSucceeded ? 'checkmark-circle' : 'alert-circle'}
                  size={20}
                  color={requestSucceeded ? colors.success : colors.error}
                  style={styles.statusIcon}
                />
                <Text
                  style={[
                    styles.statusText,
                    requestSucceeded ? styles.successText : styles.errorText,
                  ]}
                >
                  {statusMessage}
                </Text>
              </View>
            ) : null}

            {otpSent && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Enter OTP</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="6-digit code"
                    placeholderTextColor={colors.textMuted}
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoCapitalize="none"
                  />
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitButton, (loading || verifying) && styles.submitButtonDisabled]}
              onPress={otpSent ? handleVerifyOtp : handleSendOtp}
              disabled={loading || verifying}
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
                  <Text style={styles.submitButtonText}>
                    {otpSent ? (verifying ? 'Verifying…' : 'Verify OTP') : (requestSucceeded ? 'Send Again' : 'Send OTP')}
                  </Text>
                </LinearGradient>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backToLogin}
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text style={styles.backToLoginText}>Return to sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
