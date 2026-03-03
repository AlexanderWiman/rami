/**
 * Admin Thread Editor — create or edit a thread with content blocks.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../../../theme/ThemeContext';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import { BackBar } from '../../../components/BackBar';
import { GlassCard } from '../../../components/GlassCard';
import { useAdmin } from '../AdminContext';
import { getThread, createThread, updateThread, uploadFile } from '../../forum/api';
import type { ThreadContent } from '../../forum/types';
import { ColoredTextPreview } from '../../forum/components/ColoredTextBlock';
import { spacing, radius } from '../../../theme/spacing';
import { fontSize, fontWeight, fontFamily } from '../../../theme/typography';

interface ContentBlock {
  id: string;
  type: 'text' | 'image' | 'video' | 'file';
  content: string;
}

export function AdminThreadEditorScreen() {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; category?: 'community' | 'sources' }>();
  const isEditing = params.id && params.id !== 'new';
  const threadId = isEditing ? parseInt(params.id!, 10) : null;
  const category = params.category === 'sources' ? 'sources' : 'community';
  const { isAuthenticated } = useAdmin();

  const [title, setTitle] = useState('');
  const [pinned, setPinned] = useState(false);
  const [blocks, setBlocks] = useState<ContentBlock[]>([
    { id: '1', type: 'text', content: '' },
  ]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [textSelection, setTextSelection] = useState<Record<string, { start: number; end: number }>>({});
  const [editingTextBlockId, setEditingTextBlockId] = useState<string | null>(null);

  const PRESET_COLORS = ['#1a472a', '#E6C27A', '#2563EB', '#7C3AED', '#DC2626', '#059669', '#D97706', '#4F46E5'];

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/admin');
    }
  }, [isAuthenticated, router]);

  // Load existing thread data
  useEffect(() => {
    if (threadId) {
      loadThread();
    }
  }, [threadId]);

  const loadThread = async () => {
    try {
      const data = await getThread(threadId!);
      setTitle(data.thread.title);
      setPinned(data.thread.pinned);
      setBlocks(
        data.content.map((c: ThreadContent) => ({
          id: String(c.id),
          type: c.content_type,
          content: c.content,
        }))
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to load thread');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const addBlock = (type: 'text' | 'image' | 'video' | 'file') => {
    setBlocks((prev) => [
      ...prev,
      { id: Date.now().toString(), type, content: '' },
    ]);
  };

  const updateBlock = (id: string, content: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, content } : b))
    );
  };

  const applyColorToSelection = (blockId: string, color: string) => {
    const sel = textSelection[blockId];
    const block = blocks.find((b) => b.id === blockId);
    if (!sel || !block || sel.end <= sel.start) return;
    const { start, end } = sel;
    const before = block.content.slice(0, start);
    const selected = block.content.slice(start, end);
    const after = block.content.slice(end);
    updateBlock(blockId, `${before}[#${color.slice(1)}]${selected}[/]${after}`);
    setTextSelection((prev) => ({ ...prev, [blockId]: { start: 0, end: 0 } }));
  };

  const removeBlock = (id: string) => {
    if (blocks.length <= 1) {
      Alert.alert('Error', 'Thread must have at least one content block');
      return;
    }
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (
        (direction === 'up' && index === 0) ||
        (direction === 'down' && index === prev.length - 1)
      ) {
        return prev;
      }
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      const newBlocks = [...prev];
      [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
      return newBlocks;
    });
  };

  const handleUpload = async (blockId: string, file: { uri: string; name: string; type: string }, errorMessage: string) => {
    setUploading(true);
    try {
      const { url } = await uploadFile(file);
      updateBlock(blockId, url);
    } catch (err) {
      Alert.alert('Error', errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const pickImage = async (blockId: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const name = asset.fileName ?? asset.uri.split('/').pop() ?? 'image.jpg';
      const type = asset.mimeType ?? 'image/jpeg';
      await handleUpload(blockId, { uri: asset.uri, name, type }, 'Failed to upload image');
    }
  };

  const pickVideo = async (blockId: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const name = asset.fileName ?? asset.uri.split('/').pop() ?? 'video.mp4';
      const type = asset.mimeType ?? 'video/mp4';
      await handleUpload(blockId, { uri: asset.uri, name, type }, 'Failed to upload video');
    }
  };

  const pickFile = async (blockId: string) => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const name = asset.name ?? asset.uri.split('/').pop() ?? 'file';
      const type = asset.mimeType ?? 'application/octet-stream';
      await handleUpload(blockId, { uri: asset.uri, name, type }, 'Failed to upload file');
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    const validBlocks = blocks.filter((b) => b.content.trim());
    if (validBlocks.length === 0) {
      Alert.alert('Error', 'Please add at least one content block');
      return;
    }

    setSaving(true);
    try {
      const content = validBlocks.map((b, i) => ({
        content_type: b.type,
        content: b.content,
        sort_order: i,
      }));

      if (threadId) {
        await updateThread(threadId, { title: title.trim(), content, pinned });
      } else {
        await createThread(title.trim(), content, pinned, category);
      }

      router.back();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save thread');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: isRoyal ? 'rgba(10, 25, 18, 0.72)' : colors.surfaceGlass,
      color: isRoyal ? 'rgba(255,255,255,0.95)' : colors.text,
      borderColor: isRoyal ? 'rgba(230, 194, 122, 0.28)' : colors.border,
    },
  ];

  const renderBlock = (block: ContentBlock, index: number) => (
    <GlassCard key={block.id} padding="md" rounded="lg" style={styles.blockCard}>
      <View style={styles.blockHeader}>
        <Text style={[styles.blockType, { color: isRoyal ? '#E6C27A' : colors.highlight }]}>
          {block.type.toUpperCase()}
        </Text>
        <View style={styles.blockActions}>
          {block.type === 'text' && editingTextBlockId === block.id ? (
            <TouchableOpacity
              onPress={() => setEditingTextBlockId(null)}
              style={[styles.doneEditBtn, { borderColor: isRoyal ? 'rgba(230,194,122,0.5)' : colors.border }]}
            >
              <Text style={[styles.doneEditText, { color: isRoyal ? '#E6C27A' : colors.highlight }]}>Klar</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity onPress={() => moveBlock(block.id, 'up')}>
                <Text style={[styles.moveBtn, { color: colors.textMuted }]}>↑</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => moveBlock(block.id, 'down')}>
                <Text style={[styles.moveBtn, { color: colors.textMuted }]}>↓</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeBlock(block.id)}>
                <Text style={[styles.removeBtn, { color: colors.error }]}>×</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {block.type === 'text' && (
        <View style={styles.textBlockContainer}>
          {editingTextBlockId === block.id ? (
            <>
              <TextInput
                style={[inputStyle, styles.textArea]}
                placeholder="Enter text content..."
                placeholderTextColor={isRoyal ? 'rgba(255,255,255,0.5)' : colors.textMuted}
                value={block.content}
                onChangeText={(text) => updateBlock(block.id, text)}
                onSelectionChange={(e) => {
                  const { start, end } = e.nativeEvent.selection;
                  setTextSelection((prev) => ({ ...prev, [block.id]: { start, end } }));
                }}
                multiline
                numberOfLines={4}
                autoFocus
              />
              <View style={styles.colorToolbar}>
                <Text style={[styles.colorToolbarHint, { color: isRoyal ? 'rgba(255,255,255,0.5)' : colors.textMuted }]}>
                  {textSelection[block.id]?.end > textSelection[block.id]?.start ? 'Välj färg:' : 'Markera text, välj färg:'}
                </Text>
                <View style={styles.colorRow}>
                  {PRESET_COLORS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => applyColorToSelection(block.id, c)}
                      disabled={!(textSelection[block.id]?.end > textSelection[block.id]?.start)}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: c },
                        !(textSelection[block.id]?.end > textSelection[block.id]?.start) && styles.colorSwatchDisabled,
                      ]}
                    />
                  ))}
                </View>
              </View>
            </>
          ) : (
            <TouchableOpacity
              onPress={() => setEditingTextBlockId(block.id)}
              style={[styles.previewTouchable, { backgroundColor: isRoyal ? 'rgba(10,25,18,0.4)' : colors.surfaceGlass }]}
              activeOpacity={0.8}
            >
              {block.content ? (
                <ColoredTextPreview
                  text={block.content}
                  textStyle={[styles.previewText, { color: isRoyal ? 'rgba(255,255,255,0.9)' : colors.text }]}
                  baseColor={isRoyal ? 'rgba(255,255,255,0.9)' : colors.text}
                />
              ) : (
                <Text style={[styles.previewPlaceholder, { color: isRoyal ? 'rgba(255,255,255,0.4)' : colors.textMuted }]}>
                  Tryck för att redigera...
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {block.type === 'image' && (
        <View>
          {block.content ? (
            <View>
              <Image source={{ uri: block.content }} style={styles.previewImage} resizeMode="cover" />
              <TouchableOpacity
                style={[styles.changeImageBtn, { borderColor: colors.border }]}
                onPress={() => pickImage(block.id)}
              >
                <Text style={[styles.changeImageText, { color: colors.textSecondary }]}>
                  Change Image
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.uploadBtn, { borderColor: colors.border }]}
              onPress={() => pickImage(block.id)}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color={isRoyal ? '#E6C27A' : colors.highlight} />
              ) : (
                <Text style={[styles.uploadText, { color: colors.textSecondary }]}>
                  Tap to upload image
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {block.type === 'video' && (
        <View>
          <TextInput
            style={inputStyle}
            placeholder="YouTube URL or uploaded video URL"
            placeholderTextColor={isRoyal ? 'rgba(255,255,255,0.5)' : colors.textMuted}
            value={block.content}
            onChangeText={(text) => updateBlock(block.id, text)}
            autoCapitalize="none"
            keyboardType="url"
          />
          <TouchableOpacity
            style={[styles.uploadBtn, { borderColor: colors.border, marginTop: spacing.sm, height: 56 }]}
            onPress={() => pickVideo(block.id)}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color={isRoyal ? '#E6C27A' : colors.highlight} />
            ) : (
              <Text style={[styles.uploadText, { color: colors.textSecondary }]}>
                Upload video
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {block.type === 'file' && (
        <View>
          {block.content ? (
            <View>
              <Text style={[styles.fileLabel, { color: isRoyal ? 'rgba(255,255,255,0.9)' : colors.textSecondary }]}>
                File attached
              </Text>
              <Text style={[styles.fileUrl, { color: colors.textMuted }]} numberOfLines={1}>
                {block.content}
              </Text>
              <TouchableOpacity
                style={[styles.changeImageBtn, { borderColor: colors.border }]}
                onPress={() => pickFile(block.id)}
              >
                <Text style={[styles.changeImageText, { color: colors.textSecondary }]}>
                  Change file
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.uploadBtn, { borderColor: colors.border }]}
              onPress={() => pickFile(block.id)}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color={isRoyal ? '#E6C27A' : colors.highlight} />
              ) : (
                <Text style={[styles.uploadText, { color: colors.textSecondary }]}>
                  Tap to upload file
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </GlassCard>
  );

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={isRoyal ? '#E6C27A' : colors.highlight} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <BackBar />
          <Text style={[styles.title, { color: colors.text }]}>
            {isEditing ? 'Edit Thread' : 'New Thread'}
          </Text>
        </View>

        {/* Title Input */}
        <TextInput
          style={inputStyle}
          placeholder="Thread title"
          placeholderTextColor={isRoyal ? 'rgba(255,255,255,0.5)' : colors.textMuted}
          value={title}
          onChangeText={setTitle}
        />

        {/* Pinned Toggle */}
        <View style={styles.toggleRow}>
          <Text style={[styles.toggleLabel, { color: isRoyal ? 'rgba(255,255,255,0.9)' : colors.text }]}>
            Pin to top
          </Text>
          <Switch
            value={pinned}
            onValueChange={setPinned}
            trackColor={{ false: colors.border, true: isRoyal ? '#E6C27A' : colors.highlight }}
          />
        </View>

        {/* Content Blocks */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Content</Text>
        {blocks.map(renderBlock)}

        {/* Add Block Buttons */}
        <View style={styles.addBlockRow}>
          <TouchableOpacity
            style={[styles.addBtn, { borderColor: colors.border }]}
            onPress={() => addBlock('text')}
          >
            <Text style={[styles.addBtnText, { color: colors.textSecondary }]}>+ Text</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addBtn, { borderColor: colors.border }]}
            onPress={() => addBlock('image')}
          >
            <Text style={[styles.addBtnText, { color: colors.textSecondary }]}>+ Image</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addBtn, { borderColor: colors.border }]}
            onPress={() => addBlock('video')}
          >
            <Text style={[styles.addBtnText, { color: colors.textSecondary }]}>+ Video</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addBtn, { borderColor: colors.border }]}
            onPress={() => addBlock('file')}
          >
            <Text style={[styles.addBtnText, { color: colors.textSecondary }]}>+ File</Text>
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveBtn,
            { backgroundColor: isRoyal ? '#E6C27A' : colors.highlight },
            saving && styles.saveBtnDisabled,
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>{isEditing ? 'Save Changes' : 'Create Thread'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: spacing.lg },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.heading,
  },
  input: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: fontSize.md,
    marginBottom: spacing.md,
  },
  textBlockContainer: {
    overflow: 'hidden',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  colorToolbar: {
    marginTop: 8,
    overflow: 'hidden',
  },
  colorToolbarHint: {
    fontSize: 12,
    marginBottom: 6,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  colorSwatchDisabled: {
    opacity: 0.4,
  },
  doneEditBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  doneEditText: {
    fontSize: 14,
    fontWeight: '600',
  },
  previewTouchable: {
    padding: 12,
    borderRadius: 8,
    minHeight: 80,
  },
  previewText: {
    fontSize: fontSize.md,
    lineHeight: 24,
  },
  previewPlaceholder: {
    fontSize: fontSize.md,
    fontStyle: 'italic',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  toggleLabel: { fontSize: fontSize.md },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  blockCard: { marginBottom: spacing.md, overflow: 'hidden' },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  blockType: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  blockActions: { flexDirection: 'row', gap: spacing.md },
  moveBtn: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  removeBtn: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  uploadBtn: {
    height: 120,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadText: { fontSize: fontSize.sm },
  previewImage: {
    height: 150,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  fileLabel: { fontSize: fontSize.sm, marginBottom: spacing.xs },
  fileUrl: { fontSize: fontSize.xs, marginBottom: spacing.sm },
  changeImageBtn: {
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  changeImageText: { fontSize: fontSize.xs },
  addBlockRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  addBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  addBtnText: { fontSize: fontSize.sm },
  saveBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
