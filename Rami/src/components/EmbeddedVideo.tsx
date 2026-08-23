/**
 * Embedded video player using expo-video (replaces deprecated expo-av Video).
 */
import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

interface EmbeddedVideoProps {
  uri: string;
  style?: ViewStyle;
}

export function EmbeddedVideo({ uri, style }: EmbeddedVideoProps) {
  const player = useVideoPlayer(uri, () => {
    // Don't autoplay – user taps native controls to play
  });

  return (
    <View style={[styles.container, style]}>
      <VideoView
        player={player}
        style={styles.video}
        nativeControls
        contentFit="contain"
        fullscreenOptions={{ enable: true }}
        allowsPictureInPicture
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
});
