import { memo, useMemo } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

import { highlightParts } from '@/features/doctors/search';
import { MAX_FONT_SCALE } from '@/theme/typography';
import { useTheme } from '@/theme';

interface Props {
  text: string;
  query: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

/** Renders `text` with every query match highlighted in blue on a tint background. */
export const HighlightText = memo(function HighlightText({
  text,
  query,
  style,
  numberOfLines,
}: Props) {
  const t = useTheme();
  const parts = useMemo(() => highlightParts(text, query), [text, query]);
  return (
    <Text style={style} numberOfLines={numberOfLines} maxFontSizeMultiplier={MAX_FONT_SCALE}>
      {parts.map((p, i) =>
        p.match ? (
          <Text
            key={i}
            style={{
              color: t.colors.primary,
              backgroundColor: t.colors.blueTint,
              fontFamily: t.fonts.semibold,
            }}
          >
            {p.text}
          </Text>
        ) : (
          <Text key={i}>{p.text}</Text>
        ),
      )}
    </Text>
  );
});
