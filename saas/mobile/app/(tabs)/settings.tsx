import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import { clearStoredEmail, clearToken, getStoredEmail } from '../../lib/api';

export default function SettingsScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('you@example.com');

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const loadEmail = async () => {
        const storedEmail = await getStoredEmail();
        if (isMounted && storedEmail) {
          setEmail(storedEmail);
        }
      };

      loadEmail();

      return () => {
        isMounted = false;
      };
    }, [])
  );

  const signOut = async () => {
    await clearToken();
    await clearStoredEmail();
    router.replace('/auth/signin');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Logged-in email</Text>
          <Text style={styles.cardValue}>{email}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Current tier</Text>
          <Text style={styles.cardValue}>Starter</Text>
          <Text style={styles.helperText}>Questions this month: 0 / 100</Text>
        </View>

        <Pressable
          onPress={() => Alert.alert('Upgrade', 'Contact support to upgrade')}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryButtonText}>Upgrade Plan</Text>
        </Pressable>

        <Pressable onPress={signOut} style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  title: {
    color: '#0F172A',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    marginBottom: 16,
  },
  cardLabel: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  cardValue: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  helperText: {
    color: '#475569',
    fontSize: 14,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4F46E5',
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    marginTop: 8,
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '700',
  },
  signOutButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#111827',
    paddingVertical: 15,
  },
  signOutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.88,
  },
});
