import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Screen not found.</Text>
        <Link href="/(tabs)" style={styles.link}>
          Go back home
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  title: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
  },
  link: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '700',
  },
});
