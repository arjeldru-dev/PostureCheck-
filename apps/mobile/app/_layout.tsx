import '../global.css';
import React, { useEffect } from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  const content = (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#1A2332' },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {Platform.OS === 'web' ? (
        <View style={styles.webOuter}>
          <View style={styles.phoneFrame}>{content}</View>
        </View>
      ) : (
        content
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  webOuter: {
    flex: 1,
    backgroundColor: '#0A0F17',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh' as any,
    width: '100%',
  },
  phoneFrame: {
    width: '100%',
    maxWidth: 440,
    flex: 1,
    minHeight: '100vh' as any,
    backgroundColor: '#1A2332',
    overflow: 'hidden',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#243447',
    boxShadow:
      '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(76, 175, 80, 0.15)',
  } as any,
});

