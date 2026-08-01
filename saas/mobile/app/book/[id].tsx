import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { askQuestion, getBook } from '../../lib/api';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

export default function BookChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [bookTitle, setBookTitle] = useState('Book Chat');
  const [bookStatus, setBookStatus] = useState('processing');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadBook = async () => {
      if (!id) {
        setLoading(false);
        setError('Book not found.');
        return;
      }

      try {
        const book = await getBook(String(id));
        if (!isMounted) {
          return;
        }

        setBookTitle(book.title || 'Book Chat');
        setBookStatus(String(book.status || 'processing'));
      } catch (bookError) {
        if (isMounted) {
          setError(bookError instanceof Error ? bookError.message : 'Unable to load book.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadBook();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const sendQuestion = async () => {
    const question = input.trim();
    if (!question || sending || !id) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: question,
    };

    setMessages((current) => [...current, userMessage]);
    setInput('');
    setSending(true);
    setError('');

    try {
      const response = await askQuestion(String(id), question);
      const answer = response.answer || response.response || response.message || 'No answer returned.';

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: answer,
        },
      ]);
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : 'Unable to get a response.');
    } finally {
      setSending(false);
    }
  };

  const placeholder = useMemo(() => {
    if (bookStatus.toLowerCase() !== 'ready') {
      return 'This book is still processing.';
    }

    return 'Ask anything about this book...';
  }, [bookStatus]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <Stack.Screen options={{ headerShown: true, title: bookTitle, headerBackTitle: 'Back' }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        style={styles.container}
      >
        {bookStatus.toLowerCase() !== 'ready' ? (
          <View style={styles.noticeBanner}>
            <Text style={styles.noticeText}>This book is still processing. Chat may not be available yet.</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <FlatList
          ref={listRef}
          contentContainerStyle={messages.length === 0 ? styles.emptyMessages : styles.messagesContent}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              style={[
                styles.messageBubble,
                item.role === 'user' ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              <Text style={item.role === 'user' ? styles.userMessageText : styles.assistantMessageText}>
                {item.text}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Start the conversation</Text>
              <Text style={styles.emptySubtitle}>Ask for summaries, explanations, or specific passages.</Text>
            </View>
          }
        />

        <View style={styles.inputRow}>
          <TextInput
            editable={bookStatus.toLowerCase() === 'ready' && !sending}
            onChangeText={setInput}
            placeholder={placeholder}
            placeholderTextColor="#94A3B8"
            style={styles.input}
            value={input}
          />
          <Pressable
            disabled={bookStatus.toLowerCase() !== 'ready' || sending || !input.trim()}
            onPress={sendQuestion}
            style={({ pressed }) => [
              styles.sendButton,
              (bookStatus.toLowerCase() !== 'ready' || sending || !input.trim()) && styles.sendButtonDisabled,
              pressed && input.trim() && !sending && bookStatus.toLowerCase() === 'ready' && styles.sendPressed,
            ]}
          >
            {sending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
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
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  noticeBanner: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  noticeText: {
    color: '#92400E',
    fontSize: 14,
  },
  error: {
    color: '#DC2626',
    fontSize: 14,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
  },
  emptyMessages: {
    flexGrow: 1,
    padding: 16,
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
    marginBottom: 10,
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 15,
    textAlign: 'center',
  },
  messageBubble: {
    borderRadius: 18,
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#4F46E5',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E7EB',
  },
  userMessageText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
  },
  assistantMessageText: {
    color: '#111827',
    fontSize: 15,
    lineHeight: 22,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0F172A',
    fontSize: 15,
    backgroundColor: '#F8FAFC',
  },
  sendButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
    borderRadius: 16,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  sendPressed: {
    opacity: 0.88,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
