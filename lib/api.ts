import { Platform } from 'react-native';
import Constants from 'expo-constants';

const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

const platformDefaults: Record<string, string> = {
  ios: 'http://localhost:3000',
  android: 'http://10.0.2.2:3000',
  default: 'http://127.0.0.1:3000',
};

const inferFromHost = () => {
  const hostUri = Constants?.expoConfig?.hostUri;
  if (!hostUri) return undefined;

  const [host] = hostUri.split(':');
  if (!host) return undefined;

  if (host === 'localhost' || host === '127.0.0.1') {
    return Platform.select(platformDefaults) as string;
  }

  return `http://${host}:3000`;
};

const resolvedBaseUrl = envUrl || inferFromHost() || (Platform.select(platformDefaults) as string);

if (__DEV__) {
  console.log('[API] Base URL:', resolvedBaseUrl);
  if (!envUrl) {
    console.warn('[API] EXPO_PUBLIC_API_URL not set. Using inferred base URL.');
  }
}

export const API_BASE_URL = resolvedBaseUrl;

export const getApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export const withJson = (options: RequestInit = {}): RequestInit => ({
  ...options,
  headers: {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  },
});

