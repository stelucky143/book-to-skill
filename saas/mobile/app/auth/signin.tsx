import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { login, register, setStoredEmail, setToken } from '../../lib/api';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingAction, setLoadingAction] = useState<'signin' | 'register' | null>(null);
  const [error, setError] = useState('');

  const handleAuth = async (mode: 'signin' | 'register') => {
    if (!email.trim() || !password.trim()) {
      setError('Enter both email and password.');
      return;
    }

    setLoadingAction(mode);
    setError('');

    try {
      const authResponse =
        mode === 'signin'
          ? await login(email.trim(), password)
          : await register(email.trim(), password);

      const accessToken = authResponse?.access_token || (await login(email.trim(), password)).access_token;
      await setToken(accessToken);
      await setStoredEmail(email.trim());
      router.replace('/(tabs)');
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Unable to continue.');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.badge}>BookSkill</Text>
          <Text style={styles.title}>Chat with your books</Text>
          <Text style={styles.subtitle}>
            Upload PDFs and documents, then ask questions in seconds.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#8B8FA3"
            style={styles.input}
            value={email}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor="#8B8FA3"
            secureTextEntry
            style={styles.input}
            value={password}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            disabled={loadingAction !== null}
            onPress={() => handleAuth('signin')}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
              loadingAction !== null && styles.buttonDisabled,
            ]}
          >
            {loadingAction === 'signin' ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </Pressable>

          <Pressable
            disabled={loadingAction !== null}
            onPress={() => handleAuth('register')}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
              loadingAction !== null && styles.buttonDisabled,
            ]}
          >
            {loadingAction === 'register' ? (
              <ActivityIndicator color="#4F46E5" />
            ) : (
              <Text style={styles.secondaryButtonText}>Register</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#111827',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#111827',
  },
  header: {
    marginBottom: 32,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#312E81',
    color: '#C7D2FE',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 10,
  },
  subtitle: {
    color: '#CBD5E1',
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  label: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#111827',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#374151',
    color: '#FFFFFF',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  error: {
    color: '#FCA5A5',
    marginBottom: 16,
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  secondaryButtonText: {
    color: '#C7D2FE',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
