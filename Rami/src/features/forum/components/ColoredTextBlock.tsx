/**
 * ColoredTextBlock — renders text with optional colored spans from markup.
 * Markup: [#hex]text[/] e.g. [#E6C27A]highlighted[/]
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { TextHighlight } from '../types';

type ColoredTextBlockProps = {
  text: string;
  /** Legacy: highlights from API (if backend stores them). Parsed markup takes precedence. */
  highlights?: TextHighlight[];
  textStyle: object;
  isAdmin?: boolean;
  threadId?: number;
  contentId?: number;
  onHighlightsSaved?: (highlights: TextHighlight[]) => void;
  saveHighlights?: (threadId: number, contentId: number, highlights: TextHighlight[]) => Promise<void>;
  highlightLabel?: string;
  chooseColorLabel?: string;
  doneLabel?: string;
};

const MARKUP_REGEX = /\[#([0-9A-Fa-f]{6})\]([\s\S]*?)\[\/\]/g;

/** Parse markup [#hex]text[/] and return segments. */
function parseMarkup(text: string): Array<{ text: string; color?: string }> {
  const segments: Array<{ text: string; color?: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const re = new RegExp(MARKUP_REGEX.source, 'g');
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) });
    }
    segments.push({ text: match[2], color: `#${match[1]}` });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ text }];
}

/** Renders text with colored spans from markup and/or highlights. */
function renderColoredText(
  text: string,
  highlights: TextHighlight[],
  baseColor: string,
  textStyle: object
) {
  const markupSegments = parseMarkup(text);
  const hasMarkup = markupSegments.some((s) => s.color);

  if (hasMarkup) {
    return (
      <Text style={textStyle}>
        {markupSegments.map((seg, i) => (
          <Text key={i} style={seg.color ? { color: seg.color } : { color: baseColor }}>
            {seg.text}
          </Text>
        ))}
      </Text>
    );
  }

  if (!highlights || highlights.length === 0) {
    return <Text style={[textStyle, { color: baseColor }]}>{text}</Text>;
  }

  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  const segments: Array<{ start: number; end: number; color?: string }> = [];
  let pos = 0;

  for (const h of sorted) {
    if (h.start > pos) {
      segments.push({ start: pos, end: Math.min(h.start, text.length) });
    }
    segments.push({ start: h.start, end: Math.min(h.end, text.length), color: h.color });
    pos = Math.max(pos, h.end);
  }
  if (pos < text.length) {
    segments.push({ start: pos, end: text.length });
  }

  return (
    <Text style={textStyle}>
      {segments.map((seg, i) => {
        const slice = text.slice(seg.start, seg.end);
        if (!slice) return null;
        return (
          <Text key={i} style={seg.color ? { color: seg.color } : { color: baseColor }}>
            {slice}
          </Text>
        );
      })}
    </Text>
  );
}

/** Renders text with markup parsed (for preview in editor). */
export function ColoredTextPreview({
  text,
  textStyle,
  baseColor = 'rgba(255,255,255,0.9)',
}: {
  text: string;
  textStyle: object;
  baseColor?: string;
}) {
  const markupSegments = parseMarkup(text);
  const hasMarkup = markupSegments.some((s) => s.color);
  if (!hasMarkup) {
    return <Text style={[textStyle, { color: baseColor }]}>{text}</Text>;
  }
  return (
    <Text style={textStyle}>
      {markupSegments.map((seg, i) => (
        <Text key={i} style={seg.color ? { color: seg.color } : { color: baseColor }}>
          {seg.text}
        </Text>
      ))}
    </Text>
  );
}

export function ColoredTextBlock({
  text,
  highlights = [],
  textStyle,
  isAdmin = false,
}: ColoredTextBlockProps) {
  const baseColor = (textStyle as { color?: string }).color ?? 'rgba(255,255,255,0.9)';

  return <View>{renderColoredText(text, highlights, baseColor, textStyle)}</View>;
}
