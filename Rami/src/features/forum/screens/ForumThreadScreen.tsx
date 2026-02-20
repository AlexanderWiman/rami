/**
 * Forum Thread Screen — displays a single thread with its content blocks.
 * Supports text, images, and embedded YouTube videos.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import { EmbeddedVideo } from '../../../components/EmbeddedVideo';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '../../../theme/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import { GlassCard } from '../../../components/GlassCard';
import { ZoomableImageModal } from '../../../components/ZoomableImageModal';
import { getThread } from '../api';
import type { ThreadWithContent, ThreadContent } from '../types';
import { ColoredTextBlock } from '../components/ColoredTextBlock';
import { spacing, radius } from '../../../theme/spacing';
import { fontSize, fontWeight, fontFamily } from '../../../theme/typography';
import { LOCALE_BY_LANGUAGE } from '../../../constants/i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_WIDTH = SCREEN_WIDTH - spacing.lg * 2 - spacing.lg * 2;

// i18n
const threadStrings = {
  en: {
    back: '← Back',
    loadError: 'Failed to load post',
    notFound: 'Post not found',
    watchOnYouTube: 'Watch on YouTube',
    playVideo: 'Play video',
    openFile: 'Open file',
  },
  ar: {
    back: '← رجوع',
    loadError: 'فشل في تحميل المنشور',
    notFound: 'المنشور غير موجود',
    watchOnYouTube: 'شاهد على يوتيوب',
    playVideo: 'تشغيل الفيديو',
    openFile: 'فتح الملف',
  },
  tr: {
    back: '← Geri',
    loadError: 'Gönderi yüklenemedi',
    notFound: 'Gönderi bulunamadı',
    watchOnYouTube: "YouTube'da izle",
    playVideo: 'Videoyu oynat',
    openFile: 'Dosyayı aç',
  },
  fr: { back: '← Retour', loadError: 'Échec du chargement', notFound: 'Publication introuvable', watchOnYouTube: 'Voir sur YouTube', playVideo: 'Lire la vidéo', openFile: 'Ouvrir le fichier' },
  es: { back: '← Atrás', loadError: 'Error al cargar', notFound: 'Publicación no encontrada', watchOnYouTube: 'Ver en YouTube', playVideo: 'Reproducir video', openFile: 'Abrir archivo' },
  sv: { back: '← Tillbaka', loadError: 'Kunde inte ladda', notFound: 'Inlägg hittades inte', watchOnYouTube: 'Titta på YouTube', playVideo: 'Spela video', openFile: 'Öppna fil' },
  de: { back: '← Zurück', loadError: 'Laden fehlgeschlagen', notFound: 'Beitrag nicht gefunden', watchOnYouTube: 'Auf YouTube ansehen', playVideo: 'Video abspielen', openFile: 'Datei öffnen' },
};

// Extract YouTube video ID from various URL formats
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // Just the ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function parseHighlights(raw: unknown): TextHighlight[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as TextHighlight[];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function ForumThreadScreen() {
  const { colors, style: themeStyle } = useTheme();
  const isRoyal = themeStyle === 'royal';
  const { language } = useLanguage();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const threadId = parseInt(params.id || '0', 10);

  const [data, setData] = useState<ThreadWithContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageViewerUri, setImageViewerUri] = useState<string | null>(null);

  const strings = threadStrings[language] || threadStrings.en;

  const loadThread = useCallback(async () => {
    if (!threadId) {
      setError(strings.notFound);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const threadData = await getThread(threadId);
      setData(threadData);
    } catch (err) {
      setError(strings.loadError);
    } finally {
      setLoading(false);
    }
  }, [threadId, strings.loadError, strings.notFound]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(LOCALE_BY_LANGUAGE[language], {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openYouTube = (url: string) => {
    const videoId = extractYouTubeId(url);
    if (videoId) {
      Linking.openURL(`https://www.youtube.com/watch?v=${videoId}`);
    } else {
      Linking.openURL(url);
    }
  };

  const openExternalUrl = async (url: string, fallbackMessage: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert('Cannot open', fallbackMessage);
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Cannot open', fallbackMessage);
    }
  };

  const getFileName = (url: string) => {
    try {
      const cleanUrl = url.split('?')[0];
      const parts = cleanUrl.split('/');
      return decodeURIComponent(parts[parts.length - 1]);
    } catch {
      return 'file';
    }
  };

  const renderContentMeta = (content: ThreadContent) => {
    const author = content.created_by_username || data?.thread.created_by_username;
    const timestamp = content.created_at ? formatDateTime(content.created_at) : undefined;
    if (!author && !timestamp) return null;
    return (
      <View style={styles.contentMetaRow}>
        {!!author && (
          <Text style={[styles.contentMetaText, { color: isRoyal ? 'rgba(255,255,255,0.6)' : colors.textMuted }]}>
            {author}
          </Text>
        )}
        {!!timestamp && (
          <Text style={[styles.contentMetaText, { color: isRoyal ? 'rgba(255,255,255,0.5)' : colors.textMuted }]}>
            {timestamp}
          </Text>
        )}
      </View>
    );
  };

  const renderContent = (content: ThreadContent, index: number) => {
    switch (content.content_type) {
      case 'text':
        return (
          <Animated.View key={content.id} entering={FadeIn.delay(index * 60).duration(300)}>
            {renderContentMeta(content)}
            <ColoredTextBlock
              text={content.content}
              highlights={parseHighlights(content.text_highlights)}
              textStyle={[
                styles.textContent,
                { color: isRoyal ? 'rgba(255,255,255,0.9)' : colors.text },
              ]}
            />
          </Animated.View>
        );

      case 'image':
        return (
          <Animated.View key={content.id} entering={FadeIn.delay(index * 60).duration(300)}>
            {renderContentMeta(content)}
            <TouchableOpacity activeOpacity={0.8} onPress={() => setImageViewerUri(content.content)}>
              <Image
                source={{ uri: content.content }}
                style={styles.imageContent}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </Animated.View>
        );

      case 'video':
        const videoId = extractYouTubeId(content.content);
        const thumbnailUrl = videoId
          ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
          : null;

        return (
          <Animated.View key={content.id} entering={FadeIn.delay(index * 60).duration(300)}>
            {renderContentMeta(content)}
            {videoId ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => openYouTube(content.content)}
                style={styles.videoContainer}
              >
                {thumbnailUrl ? (
                  <Image
                    source={{ uri: thumbnailUrl }}
                    style={styles.videoThumbnail}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.videoPlaceholder,
                      { backgroundColor: isRoyal ? 'rgba(10, 25, 18, 0.5)' : colors.surfaceGlass },
                    ]}
                  />
                )}
                <View style={styles.playButtonOverlay}>
                  <View
                    style={[
                      styles.playButton,
                      { backgroundColor: isRoyal ? 'rgba(230, 194, 122, 0.9)' : colors.highlight },
                    ]}
                  >
                    <Text style={styles.playIcon}>▶</Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.watchText,
                    { color: isRoyal ? '#E6C27A' : colors.highlight },
                  ]}
                >
                  {strings.watchOnYouTube}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.videoContainer}>
                <EmbeddedVideo uri={content.content} style={styles.videoPlayer} />
              </View>
            )}
          </Animated.View>
        );

      case 'file':
        return (
          <Animated.View key={content.id} entering={FadeIn.delay(index * 60).duration(300)}>
            {renderContentMeta(content)}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.fileCard,
                { borderColor: isRoyal ? 'rgba(230, 194, 122, 0.35)' : colors.border },
              ]}
              onPress={() => openExternalUrl(content.content, strings.openFile)}
            >
              <Text
                style={[
                  styles.fileName,
                  { color: isRoyal ? 'rgba(255,255,255,0.9)' : colors.text },
                ]}
                numberOfLines={1}
              >
                {getFileName(content.content)}
              </Text>
              <Text style={[styles.fileAction, { color: isRoyal ? '#E6C27A' : colors.highlight }]}>
                {strings.openFile}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={isRoyal ? '#E6C27A' : colors.highlight} />
        </View>
      </ScreenWrapper>
    );
  }

  if (error || !data) {
    return (
      <ScreenWrapper>
        <TouchableOpacity onPress={() => router.back()} style={styles.backWrap}>
          <Text style={[styles.backText, { color: isRoyal ? '#E6C27A' : colors.highlight }]}>{strings.back}</Text>
        </TouchableOpacity>
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error || strings.notFound}
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <TouchableOpacity onPress={() => router.back()} style={styles.backWrap}>
        <Text style={[styles.backText, { color: isRoyal ? '#E6C27A' : colors.highlight }]}>{strings.back}</Text>
      </TouchableOpacity>
      <ZoomableImageModal
        visible={!!imageViewerUri}
        uri={imageViewerUri}
        onClose={() => setImageViewerUri(null)}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xxl + 48 }]}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard padding="lg" rounded="lg" style={styles.headerCard}>
          <Text
            style={[
              styles.threadTitle,
              { color: isRoyal ? 'rgba(255,255,255,0.95)' : colors.text },
            ]}
          >
            {data.thread.title}
          </Text>
          <View style={styles.metaRow}>
            <Text
              style={[
                styles.metaText,
                { color: isRoyal ? 'rgba(255,255,255,0.6)' : colors.textMuted },
              ]}
            >
              {data.thread.created_by_username}
            </Text>
            <Text
              style={[
                styles.metaText,
                { color: isRoyal ? 'rgba(255,255,255,0.5)' : colors.textMuted },
              ]}
            >
              {formatDateTime(data.thread.created_at)}
            </Text>
          </View>
        </GlassCard>

        <View
          style={[
            styles.contentCardPlain,
            {
              backgroundColor: isRoyal ? 'rgba(10, 25, 18, 0.72)' : colors.surfaceGlass,
              borderColor: isRoyal ? 'rgba(230, 194, 122, 0.28)' : colors.border,
            },
          ]}
        >
          <View style={styles.contentCardInner}>
            {data.content.map((content, index) => renderContent(content, index))}
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  backText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingTop: spacing.sm },
  headerCard: { marginBottom: spacing.md },
  contentCardPlain: {
    marginBottom: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  contentCardInner: { padding: spacing.lg },
  threadTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.heading,
    lineHeight: 28,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: { fontSize: fontSize.xs },
  contentMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  contentMetaText: { fontSize: fontSize.xs },
  textContent: {
    fontSize: fontSize.md,
    lineHeight: 24,
    fontFamily: fontFamily.body,
    marginBottom: spacing.md,
  },
  imageContent: {
    width: IMAGE_WIDTH,
    height: IMAGE_WIDTH * 0.6,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  videoContainer: {
    marginBottom: spacing.md,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  videoThumbnail: {
    width: IMAGE_WIDTH,
    height: IMAGE_WIDTH * 0.5625, // 16:9
    borderRadius: radius.md,
  },
  videoPlayer: {
    width: IMAGE_WIDTH,
    height: IMAGE_WIDTH * 0.5625, // 16:9
    borderRadius: radius.md,
    backgroundColor: '#000',
  },
  videoPlaceholder: {
    width: IMAGE_WIDTH,
    height: IMAGE_WIDTH * 0.5625,
    borderRadius: radius.md,
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    color: '#fff',
    fontSize: 24,
    marginLeft: 4,
  },
  watchText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  fileCard: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
  },
  fileName: { fontSize: fontSize.sm, marginBottom: spacing.xs },
  fileAction: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  errorText: { fontSize: fontSize.md },
});
