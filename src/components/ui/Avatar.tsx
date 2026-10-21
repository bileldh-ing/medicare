import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { fonts } from '@/theme/typography';

interface Props {
  name: string;
  /** `require()` module id or a remote/local uri. */
  source?: number | string | null;
  size?: number;
  /** Corner radius; defaults to a circle. */
  radius?: number;
  gradient?: [string, string];
  blurhash?: string | null;
  style?: StyleProp<ViewStyle>;
  borderColor?: string;
}

export function initialsOf(name: string): string {
  const parts = name
    .replace(/^Dr\.?\s+/i, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

const DEFAULT_GRADIENT: [string, string] = ['#4C7AD5', '#8FB0F0'];

/**
 * Photo avatar with a gradient-initials fallback. Falls back when there is no
 * source OR the image fails to load, so a broken image is never shown.
 */
export const Avatar = memo(function Avatar({
  name,
  source,
  size = 48,
  radius,
  gradient = DEFAULT_GRADIENT,
  blurhash,
  style,
  borderColor,
}: Props) {
  const [failed, setFailed] = useState(false);
  const r = radius ?? size / 2;
  const showImage = !!source && !failed;
  const imageSource = typeof source === 'string' ? { uri: source } : source;

  return (
    <View
      style={[
        { width: size, height: size, borderRadius: r, overflow: 'hidden' },
        borderColor ? { borderWidth: 2, borderColor } : null,
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={`${name} photo`}
    >
      {showImage ? (
        <Image
          source={imageSource}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          placeholder={blurhash ? { blurhash } : undefined}
          transition={200}
          recyclingKey={name}
          onError={() => setFailed(true)}
        />
      ) : (
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fill}
        >
          <Text
            allowFontScaling={false}
            style={[styles.initials, { fontSize: Math.max(12, size * 0.36) }]}
          >
            {initialsOf(name)}
          </Text>
        </LinearGradient>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#fff', fontFamily: fonts.semibold, letterSpacing: 0.5 },
});
