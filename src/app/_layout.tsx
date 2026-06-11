import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

import { useAuthSync } from '@/hooks/useAuthSync';
import OfflineBanner from '@/components/OfflineBanner';
import ErrorBoundary from '@/components/ErrorBoundary';

import { requestNotificationPermissions } from '@/services/notificationService';

export default function RootLayout() {
  const { isAuthenticated, isInitialized } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  // Sync Firebase Auth with Zustand
  useAuthSync();

  // Set mounted state and request notifications natively
  useEffect(() => {
    setIsMounted(true);
    requestNotificationPermissions();
  }, []);

  useEffect(() => {
    // Only run routing logic when the root layout is mounted and the store is hydrated
    if (!isMounted || !isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // If not authenticated and trying to access private routes, redirect to login
      router.replace('/login');
    } else if (isAuthenticated && inAuthGroup) {
      // If authenticated and trying to access auth routes (login/register), redirect to main app
      router.replace('/');
    }
  }, [isAuthenticated, segments, isMounted, isInitialized]);

  return (
    <ErrorBoundary>
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ErrorBoundary>
  );
}
