import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { apiFetch } from '../../lib/api';

type ExtractionMode = 'text-heavy' | 'technical';

const SUPPORTED_TYPES = [
  'application/pdf',
  'application/epub+zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

export default function UploadScreen() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [mode, setMode] = useState<ExtractionMode>('text-heavy');
  const [uploading, setUploading] = useState(false);
  const [statusText, setStatusText] = useState('');

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: SUPPORTED_TYPES,
    });

    if (!result.canceled && result.assets?.[0]) {
      setSelectedFile(result.assets[0]);
      setStatusText('');
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) {
      Alert.alert('No file selected', 'Choose a file before uploading.');
      return;
    }

    setUploading(true);
    setStatusText('Uploading your book...');

    try {
      const formData = new FormData();
      formData.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || 'application/octet-stream',
      } as any);
      formData.append('extraction_mode', mode);

      const response = await apiFetch('/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Upload failed.');
      }

      setStatusText('Upload complete. Processing started.');
      setSelectedFile(null);
      router.replace('/(tabs)');
    } catch (uploadError) {
      setStatusText(uploadError instanceof Error ? uploadError.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const formattedSize = selectedFile?.size
    ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
    : 'Unknown size';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Upload a new book</Text>
        <Text style={styles.subtitle}>
          Supported formats: PDF, EPUB, DOCX, and TXT.
        </Text>

        <Pressable onPress={pickFile} style={({ pressed }) => [styles.selectButton, pressed && styles.pressed]}>
          <Text style={styles.selectButtonText}>Choose File</Text>
        </Pressable>

        {selectedFile ? (
          <View style={styles.fileCard}>
            <Text style={styles.fileName}>{selectedFile.name}</Text>
            <Text style={styles.fileMeta}>{formattedSize}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>Extraction mode</Text>
        <View style={styles.modeRow}>
          <Pressable
            onPress={() => setMode('text-heavy')}
            style={[styles.modeButton, mode === 'text-heavy' && styles.modeButtonActive]}
          >
            <Text style={[styles.modeTitle, mode === 'text-heavy' && styles.modeTitleActive]}>
              Text-heavy
            </Text>
            <Text style={[styles.modeDescription, mode === 'text-heavy' && styles.modeDescriptionActive]}>
              Great for novels, essays, and standard documents.
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setMode('technical')}
            style={[styles.modeButton, mode === 'technical' && styles.modeButtonActive]}
          >
            <Text style={[styles.modeTitle, mode === 'technical' && styles.modeTitleActive]}>
              Technical (code/tables)
            </Text>
            <Text style={[styles.modeDescription, mode === 'technical' && styles.modeDescriptionActive]}>
              Better for textbooks, tables, and code snippets.
            </Text>
          </Pressable>
        </View>

        <Pressable
          disabled={uploading}
          onPress={uploadFile}
          style={({ pressed }) => [
            styles.uploadButton,
            pressed && styles.pressed,
            uploading && styles.uploadButtonDisabled,
          ]}
        >
          {uploading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.uploadButtonText}>Upload & Process</Text>
          )}
        </Pressable>

        {statusText ? <Text style={styles.statusText}>{statusText}</Text> : null}
      </View>
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
    padding: 20,
  },
  title: {
    color: '#0F172A',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  selectButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 16,
  },
  selectButtonText: {
    color: '#4338CA',
    fontSize: 16,
    fontWeight: '700',
  },
  fileCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 16,
    marginBottom: 24,
  },
  fileName: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  fileMeta: {
    color: '#64748B',
    fontSize: 14,
  },
  sectionLabel: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  modeRow: {
    gap: 12,
    marginBottom: 24,
  },
  modeButton: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  modeButtonActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  modeTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  modeTitleActive: {
    color: '#312E81',
  },
  modeDescription: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
  },
  modeDescriptionActive: {
    color: '#4338CA',
  },
  uploadButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    paddingVertical: 16,
  },
  uploadButtonDisabled: {
    opacity: 0.7,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  statusText: {
    color: '#475569',
    fontSize: 14,
    marginTop: 16,
  },
  pressed: {
    opacity: 0.9,
  },
});
