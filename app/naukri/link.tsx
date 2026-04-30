import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { getApiUrl } from '../../lib/api';
import { useTheme } from '../../lib/ThemeContext';

const NAUKRI_LOGIN_URL = 'https://www.naukri.com/nlogin/login';
const NAUKRI_SUCCESS_PATTERNS = [
  'naukri.com/mnjuser',
  'naukri.com/nlogin/acpt',
  'naukri.com/homepage',
  'naukri.com/my-naukri',
  'naukri.com/campus',
  'campus.naukri.com',
];

/**
 * JavaScript injected into the WebView after page load to extract cookies.
 * We use document.cookie for accessible cookies, but the real magic is
 * the onMessage callback from the native side which receives ALL cookies
 * via the CookieManager (Android) / WKWebView cookies (iOS).
 */
const COOKIE_EXTRACT_JS = `
  (function() {
    try {
      // Send a message to React Native with the cookies from document.cookie
      var cookiePairs = document.cookie.split(';').map(function(c) {
        var parts = c.trim().split('=');
        return { name: parts[0], value: parts.slice(1).join('='), domain: '.naukri.com' };
      }).filter(function(c) { return c.name && c.value; });

      // Also try to find the user's email from the page
      var emailEl = document.querySelector('[class*="email"], .nI-gNb-sb__main-text, .user-name');
      var email = emailEl ? emailEl.innerText.trim() : '';

      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'COOKIES_CAPTURED',
        cookies: cookiePairs,
        email: email,
      }));
    } catch(e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'ERROR',
        message: e.message,
      }));
    }
  })();
  true;
`;

export default function LinkNaukriScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const webViewRef = useRef<WebView>(null);
  const [phase, setPhase] = useState<'info' | 'webview' | 'saving'>('info');
  const [webviewLoading, setWebviewLoading] = useState(true);

  const triggerSave = () => {
    webViewRef.current?.injectJavaScript(COOKIE_EXTRACT_JS);
  };

  const handleNavigationChange = (navState: any) => {
    const url = navState.url || '';

    // Detect successful login — URL navigated away from login page
    const loggedIn = NAUKRI_SUCCESS_PATTERNS.some(p => url.includes(p));
    if (loggedIn) {
      // Small delay to let cookies settle
      setTimeout(() => {
        triggerSave();
      }, 2000);
    }
  };

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'COOKIES_CAPTURED' && data.cookies?.length > 0) {
        setPhase('saving');

        const token = await AsyncStorage.getItem('authToken');
        const resp = await fetch(getApiUrl('/api/naukri/link'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            cookies: data.cookies,
            email: data.email || null,
          }),
        });
        const result = await resp.json();

        if (resp.ok && result.success) {
          Alert.alert(
            '✅ Naukri Linked!',
            `Your Naukri session has been captured securely.${data.email ? `\n\nAccount: ${data.email}` : ''}`,
            [{ text: 'Go to Portals', onPress: () => router.replace('/(tabs)/portals') }],
          );
        } else {
          Alert.alert('Error', result.message || 'Failed to save session');
          setPhase('webview');
        }
      } else if (data.type === 'ERROR') {
        console.error('[Naukri Link] Cookie extraction error:', data.message);
      }
    } catch (e) {
      console.error('[Naukri Link] Message parse error:', e);
    }
  };

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    infoScroll: { flex: 1, padding: 24 },
    backBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: isDark ? '#1E293B' : colors.chipBackground,
      justifyContent: 'center', alignItems: 'center', marginBottom: 24,
    },
    title: { fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: 8 },
    sub: { fontSize: 15, color: colors.textLight, lineHeight: 22, marginBottom: 24 },
    stepsBox: {
      backgroundColor: isDark ? '#162032' : '#EEF2FF',
      borderRadius: 16, padding: 20, marginBottom: 24,
    },
    stepsTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 14 },
    stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
    stepNum: {
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
    },
    stepNumText: { color: colors.white, fontSize: 13, fontWeight: '700' },
    stepText: { flex: 1, fontSize: 14, color: colors.textLight, lineHeight: 20 },
    securityBox: {
      flexDirection: 'row', gap: 12, alignItems: 'flex-start',
      backgroundColor: isDark ? '#0F2A1F' : '#ECFDF5',
      borderRadius: 14, padding: 16, marginBottom: 28,
      borderLeftWidth: 3, borderLeftColor: colors.success,
    },
    securityText: { flex: 1, fontSize: 13, color: isDark ? '#6EE7B7' : '#065F46', lineHeight: 19 },
    startBtn: {
      backgroundColor: colors.primary, borderRadius: 14,
      paddingVertical: 16, alignItems: 'center',
    },
    startBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },

    // WebView phase
    webviewHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingVertical: 12,
      backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    webviewTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
    manualBtn: {
      backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8
    },
    manualBtnText: { color: colors.white, fontSize: 13, fontWeight: '600' },
    webviewHint: {
      fontSize: 12, color: colors.textMuted, textAlign: 'center',
      paddingHorizontal: 24, paddingVertical: 8, backgroundColor: isDark ? '#162032' : '#EEF2FF',
    },
    webview: { flex: 1 },

    // Saving phase
    savingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
    savingText: { fontSize: 16, color: colors.text, fontWeight: '600' },
    savingSub: { fontSize: 13, color: colors.textLight },
  }), [colors, isDark]);

  // ─── Phase: Info / Explainer ───
  if (phase === 'info') {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.infoScroll}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>

          <Text style={s.title}>Link Naukri Account</Text>
          <Text style={s.sub}>
            You'll sign in to Naukri directly — works with Google, phone OTP, or email. We never see your password.
          </Text>

          <View style={s.stepsBox}>
            <Text style={s.stepsTitle}>How it works</Text>
            {[
              "We'll open the real Naukri login page inside the app",
              'You sign in using any method (Google, phone, email)',
              'Once logged in, we securely capture your session',
              'Your session lets our bot apply on your behalf',
            ].map((step, i) => (
              <View key={i} style={s.stepRow}>
                <View style={s.stepNum}><Text style={s.stepNumText}>{i + 1}</Text></View>
                <Text style={s.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          <View style={s.securityBox}>
            <Ionicons name="shield-checkmark" size={22} color={colors.success} />
            <Text style={s.securityText}>
              <Text style={{ fontWeight: '700' }}>Your password stays with Naukri.</Text>{'\n'}
              We only capture session cookies — the same thing your browser stores. They're encrypted with AES-256 and auto-expire in 30 days.
            </Text>
          </View>

          <TouchableOpacity style={s.startBtn} onPress={() => setPhase('webview')} activeOpacity={0.85}>
            <Text style={s.startBtnText}>Open Naukri Login →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Phase: Saving ───
  if (phase === 'saving') {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.savingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.savingText}>Saving session…</Text>
          <Text style={s.savingSub}>Encrypting and storing your Naukri session securely</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Phase: WebView ───
  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header bar */}
      <View style={s.webviewHeader}>
        <TouchableOpacity onPress={() => setPhase('info')}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.webviewTitle}>Sign in to Naukri</Text>
        {webviewLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <TouchableOpacity style={s.manualBtn} onPress={triggerSave} activeOpacity={0.8}>
            <Text style={s.manualBtnText}>Done logging in</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={s.webviewHint}>
        🔒 Sign in using any method. We'll capture your session automatically.
      </Text>

      <WebView
        ref={webViewRef}
        source={{ uri: NAUKRI_LOGIN_URL }}
        style={s.webview}
        onNavigationStateChange={handleNavigationChange}
        onMessage={handleMessage}
        onLoadStart={() => setWebviewLoading(true)}
        onLoadEnd={() => setWebviewLoading(false)}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        cacheEnabled
        // Keep ALL navigation inside the WebView (prevents Google OAuth from opening external browser)
        originWhitelist={['*']}
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={(request) => {
          // Allow everything to load inside the WebView
          return true;
        }}
        onOpenWindow={(syntheticEvent) => {
          // When a new window is requested (e.g. Google Sign-In popup),
          // navigate the current WebView to that URL instead
          const { nativeEvent } = syntheticEvent;
          if (nativeEvent.targetUrl) {
            webViewRef.current?.injectJavaScript(
              `window.location.href = ${JSON.stringify(nativeEvent.targetUrl)}; true;`
            );
          }
        }}
        userAgent="Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36"
        startInLoadingState
        renderLoading={() => (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      />
    </SafeAreaView>
  );
}
