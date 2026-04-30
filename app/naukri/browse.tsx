import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { getApiUrl } from '../../lib/api';
import { useTheme } from '../../lib/ThemeContext';

const NAUKRI_HOME = 'https://www.naukri.com';

/**
 * JS injected into every page to detect job detail pages and
 * show a floating "Add to Queue" button.
 */
const INJECT_QUEUE_BUTTON_JS = `
(function() {
  // Remove any previously injected button (in case of re-injection)
  var existing = document.getElementById('jobease-queue-btn');
  if (existing) existing.remove();

  // Detect if this is a job detail page
  var url = window.location.href;
  var isJobPage = url.includes('/job-listings-') || 
                  url.includes('/job/') || 
                  url.match(/naukri\\.com\\/.*-\\d+/) ||
                  document.querySelector('.jd-header-title, .job-details, .jd-content, .styles_jd-header-title');

  if (!isJobPage) return;

  // Extract job info from the page
  var titleEl = document.querySelector('.jd-header-title, h1.styles_jd-header-title__rZwM1, h1[class*="title"], .job-title');
  var companyEl = document.querySelector('.jd-header-comp-name a, a.styles_jd-header-comp-name, .company-name a, [class*="comp-name"] a');

  var jobTitle = titleEl ? titleEl.innerText.trim() : 'Unknown Job';
  var company = companyEl ? companyEl.innerText.trim() : 'Unknown Company';
  var jobUrl = window.location.href.split('?')[0];

  // Create floating button container
  var container = document.createElement('div');
  container.id = 'jobease-queue-btn';
  container.style.cssText = 'position:fixed; bottom:80px; right:16px; z-index:99999; display:flex; flex-direction:column; gap:8px; align-items:flex-end;';

  // Queue button
  var btn = document.createElement('div');
  btn.style.cssText = 'background:#4A90D9; color:white; padding:14px 20px; border-radius:50px; font-size:15px; font-weight:700; box-shadow:0 4px 20px rgba(0,0,0,0.3); display:flex; align-items:center; gap:8px; cursor:pointer; font-family:sans-serif; user-select:none; -webkit-tap-highlight-color:transparent;';
  btn.innerHTML = '⚡ Add to Queue';
  btn.onclick = function() {
    btn.innerHTML = '⏳ Adding...';
    btn.style.opacity = '0.7';
    btn.style.pointerEvents = 'none';
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'ADD_TO_QUEUE',
      jobTitle: jobTitle,
      company: company,
      jobUrl: jobUrl,
    }));
  };

  // Info chip showing detected job
  var chip = document.createElement('div');
  chip.style.cssText = 'background:rgba(0,0,0,0.85); color:#CBD5E1; padding:8px 14px; border-radius:12px; font-size:12px; max-width:220px; font-family:sans-serif; line-height:1.3;';
  chip.innerHTML = '<span style="color:#4A90D9;font-weight:700;">Jobease</span> detected:<br><span style="color:white;">' + jobTitle.substring(0, 40) + '</span>';

  container.appendChild(chip);
  container.appendChild(btn);
  document.body.appendChild(container);
})();
true;
`;

/**
 * JS to mark the button as "Added" after successful queue addition
 */
const MARK_ADDED_JS = `
(function() {
  var btn = document.querySelector('#jobease-queue-btn > div:last-child');
  if (btn) {
    btn.innerHTML = '✅ Added to Queue';
    btn.style.background = '#065F46';
    btn.style.opacity = '1';
  }
})();
true;
`;

export default function BrowseNaukriScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState(NAUKRI_HOME);
  const [canGoBack, setCanGoBack] = useState(false);

  const handleNavigationChange = (navState: any) => {
    setCurrentUrl(navState.url || '');
    setCanGoBack(navState.canGoBack);

    // Inject the queue button on every page load
    setTimeout(() => {
      webViewRef.current?.injectJavaScript(INJECT_QUEUE_BUTTON_JS);
    }, 1500);
  };

  const handleMessage = useCallback(async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'ADD_TO_QUEUE') {
        const token = await AsyncStorage.getItem('authToken');
        if (!token) {
          Alert.alert('Error', 'Please login to Jobease first');
          return;
        }

        const resp = await fetch(getApiUrl('/api/naukri/queue'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            jobs: [{
              jobTitle: data.jobTitle,
              company: data.company,
              jobUrl: data.jobUrl,
            }],
          }),
        });

        const result = await resp.json();
        if (resp.ok && result.success) {
          // Mark button as added inside WebView
          webViewRef.current?.injectJavaScript(MARK_ADDED_JS);
          // No alert — the button visually changes to green "Added" 
        } else {
          Alert.alert('Queue Error', result.message || 'Could not add to queue');
          // Reset button
          webViewRef.current?.injectJavaScript(INJECT_QUEUE_BUTTON_JS);
        }
      }
    } catch (e) {
      console.error('[Naukri Browse] Message error:', e);
    }
  }, []);

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    toolbar: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 12, paddingVertical: 10,
      backgroundColor: colors.card,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    navBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: isDark ? '#293548' : colors.chipBackground,
      justifyContent: 'center', alignItems: 'center',
    },
    navBtnDisabled: { opacity: 0.3 },
    urlBar: {
      flex: 1, backgroundColor: isDark ? '#1E293B' : colors.backgroundDark,
      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    },
    urlText: { fontSize: 12, color: colors.textMuted, numberOfLines: 1 },
    queueBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: colors.primary, borderRadius: 18,
      paddingHorizontal: 12, paddingVertical: 8,
    },
    queueBadgeText: { color: colors.white, fontSize: 12, fontWeight: '700' },
    webview: { flex: 1 },
  }), [colors, isDark]);

  // Truncate URL for display
  const displayUrl = currentUrl.replace('https://www.', '').replace('https://', '').substring(0, 40);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Toolbar */}
      <View style={s.toolbar}>
        <TouchableOpacity style={s.navBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={18} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.navBtn, !canGoBack && s.navBtnDisabled]}
          onPress={() => webViewRef.current?.goBack()}
          disabled={!canGoBack}
        >
          <Ionicons name="arrow-back" size={16} color={colors.text} />
        </TouchableOpacity>

        <View style={s.urlBar}>
          <Text style={s.urlText} numberOfLines={1}>🔒 {displayUrl}</Text>
        </View>

        <TouchableOpacity style={s.queueBadge} onPress={() => router.push('/naukri/queue')}>
          <Ionicons name="flash" size={14} color={colors.white} />
          <Text style={s.queueBadgeText}>Queue</Text>
        </TouchableOpacity>

        {loading && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      {/* Naukri WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: NAUKRI_HOME }}
        style={s.webview}
        onNavigationStateChange={handleNavigationChange}
        onMessage={handleMessage}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => {
          setLoading(false);
          // Inject button after page loads
          setTimeout(() => {
            webViewRef.current?.injectJavaScript(INJECT_QUEUE_BUTTON_JS);
          }, 1500);
        }}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        cacheEnabled
        originWhitelist={['*']}
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={() => true}
        onOpenWindow={(syntheticEvent) => {
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
