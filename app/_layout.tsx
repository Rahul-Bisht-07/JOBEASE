import {
    TenorSans_400Regular,
    useFonts,
} from '@expo-google-fonts/tenor-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Text as RNText } from 'react-native';
import { ThemeProvider } from '../lib/ThemeContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    TenorSans_400Regular,
  });
  const [textConfigured, setTextConfigured] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (fontsLoaded && !textConfigured) {
      const textComponent = RNText as typeof RNText & { defaultProps?: any };
      textComponent.defaultProps = textComponent.defaultProps || {};
      const existingStyle = textComponent.defaultProps.style;
      const mergedStyle = Array.isArray(existingStyle)
        ? [...existingStyle, { fontFamily: 'TenorSans_400Regular' }]
        : [existingStyle, { fontFamily: 'TenorSans_400Regular' }].filter(Boolean);
      textComponent.defaultProps.style =
        mergedStyle.length > 0 ? mergedStyle : { fontFamily: 'TenorSans_400Regular' };
      setTextConfigured(true);
    }
  }, [fontsLoaded, textConfigured]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </ThemeProvider>
  );
}
