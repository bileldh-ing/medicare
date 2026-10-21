import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme';

export type IllustrationName = 'calendar' | 'search' | 'chat' | 'heart';

/** Soft, original vector illustrations for empty states. */
export function Illustration({ name, size = 140 }: { name: IllustrationName; size?: number }) {
  const { colors } = useTheme();
  const tint = colors.blueTint;
  const border = colors.blueTintBorder;
  const blue = colors.primary;
  const white = colors.surface;

  return (
    <Svg width={size} height={size} viewBox="0 0 140 140" accessibilityElementsHidden>
      <Circle cx={70} cy={70} r={62} fill={tint} />
      <Circle cx={112} cy={30} r={8} fill={border} />
      <Circle cx={24} cy={104} r={5} fill={border} />
      {name === 'calendar' ? (
        <G>
          <Rect x={34} y={40} width={72} height={64} rx={14} fill={white} />
          <Rect x={34} y={40} width={72} height={20} rx={10} fill={blue} />
          <Rect x={50} y={32} width={6} height={16} rx={3} fill={blue} />
          <Rect x={84} y={32} width={6} height={16} rx={3} fill={blue} />
          {[0, 1, 2].map((r) =>
            [0, 1, 2, 3].map((c) => (
              <Rect
                key={`${r}-${c}`}
                x={44 + c * 14}
                y={68 + r * 11}
                width={8}
                height={6}
                rx={3}
                fill={r === 1 && c === 2 ? blue : border}
              />
            )),
          )}
          <Circle cx={100} cy={98} r={14} fill={colors.success} />
          <Path
            d="M94 98l4 4 8-8"
            stroke="#fff"
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>
      ) : null}
      {name === 'search' ? (
        <G>
          <Circle cx={62} cy={62} r={26} fill={white} stroke={blue} strokeWidth={6} />
          <Path d="M81 81l20 20" stroke={blue} strokeWidth={9} strokeLinecap="round" />
          <Path
            d="M52 56a12 12 0 0 1 12-8"
            stroke={border}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
          />
        </G>
      ) : null}
      {name === 'chat' ? (
        <G>
          <Rect x={28} y={42} width={64} height={42} rx={16} fill={white} />
          <Path d="M42 84l-6 14 18-14z" fill={white} />
          <Rect x={58} y={64} width={56} height={36} rx={14} fill={blue} />
          <Path d="M100 100l8 10-18-10z" fill={blue} />
          <Circle cx={46} cy={63} r={4} fill={border} />
          <Circle cx={60} cy={63} r={4} fill={border} />
          <Circle cx={74} cy={63} r={4} fill={border} />
        </G>
      ) : null}
      {name === 'heart' ? (
        <G>
          <Path
            d="M70 104s-34-20-34-44a18 18 0 0 1 34-8 18 18 0 0 1 34 8c0 24-34 44-34 44z"
            fill={white}
          />
          <Path
            d="M46 72h14l6-12 8 22 6-10h14"
            stroke={blue}
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>
      ) : null}
    </Svg>
  );
}
