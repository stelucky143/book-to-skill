import { Stack, usePathname, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';

import { getToken } from '../lib/api';

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const syncAuthState = async () => {
      const token = await getToken();
      const isAuthenticated = Boolean(token);
      const inAuthGroup = pathname.startsWith('/auth');

      if (!isMounted) {
        return;
      }

      if (isAuthenticated && (pathname === '/' || inAuthGroup)) {
        router.replace('/(tabs)');
      } else if (!isAuthenticated && !inAuthGroup) {
        router.replace('/auth/signin');
      }

      setIsCheckingAuth(false);
    };

    syncAuthState();

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  if (isCheckingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
});
