import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import { Book, listBooks } from '../../lib/api';

const STATUS_COLORS: Record<string, string> = {
  processing: '#D97706',
  ready: '#059669',
  failed: '#DC2626',
};

export default function MyBooksScreen() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadBooks = useCallback(async (silent = false) => {
    if (!silent) {
      setError('');
    }

    if (!silent && books.length === 0) {
      setLoading(true);
    }

    try {
      const data = await listBooks();
      setBooks(data || []);
    } catch (loadError) {
      if (!silent) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load books.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [books.length]);

  useFocusEffect(
    useCallback(() => {
      loadBooks();
    }, [loadBooks])
  );

  const hasProcessingBooks = useMemo(
    () => books.some((book) => String(book.status).toLowerCase() === 'processing'),
    [books]
  );

  useEffect(() => {
    if (!hasProcessingBooks) {
      return;
    }

    const interval = setInterval(() => {
      loadBooks(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [hasProcessingBooks, loadBooks]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadBooks();
  }, [loadBooks]);

  const renderItem = ({ item }: { item: Book }) => {
    const status = String(item.status || 'processing').toLowerCase();
    const statusColor = STATUS_COLORS[status] || '#64748B';
    const createdAt = item.created_at
      ? new Date(item.created_at).toLocaleDateString()
      : 'Unknown date';
    const chatLabel =
      status === 'ready' ? 'Chat' : status === 'failed' ? 'Unavailable' : 'Processing...';

    return (
      <View style={styles.card}>
        <View style={styles.cardTopRow}>
          <Text numberOfLines={2} style={styles.bookTitle}>
            {item.title}
          </Text>
          <View style={styles.formatBadge}>
            <Text style={styles.formatText}>{(item.format || 'FILE').toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
          <Text style={styles.dateText}>Added {createdAt}</Text>
        </View>

        <Pressable
          disabled={status !== 'ready'}
          onPress={() => router.push(`/book/${item.id}`)}
          style={({ pressed }) => [
            styles.chatButton,
            status !== 'ready' && styles.chatButtonDisabled,
            pressed && status === 'ready' && styles.chatButtonPressed,
          ]}
        >
          <Text style={styles.chatButtonText}>{chatLabel}</Text>
        </Pressable>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        contentContainerStyle={books.length === 0 ? styles.emptyList : styles.listContent}
        data={books}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No books yet. Upload your first book!</Text>
            <Text style={styles.emptySubtitle}>Your processed books will appear here.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyList: {
    flexGrow: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10,
  },
  bookTitle: {
    flex: 1,
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '700',
  },
  formatBadge: {
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  formatText: {
    color: '#4338CA',
    fontSize: 12,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  dateText: {
    color: '#64748B',
    fontSize: 13,
  },
  chatButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
  },
  chatButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  chatButtonPressed: {
    opacity: 0.88,
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 15,
    textAlign: 'center',
  },
  error: {
    color: '#DC2626',
    fontSize: 14,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
});
