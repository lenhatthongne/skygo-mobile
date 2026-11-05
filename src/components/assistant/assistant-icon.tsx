import Svg, { Circle, G, Path } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

// A softly rounded airplane (nose up; the group below turns it toward the upper right).
const PLANE = [
  'M32 8C35 8 36 12 36 17L36 46C36 50 34 54 32 56C30 54 28 50 28 46L28 17C28 12 29 8 32 8Z',
  'M36 26L58 40C60 41.2 59.3 43.5 57 43.5L36 38Z',
  'M28 26L6 40C4 41.2 4.7 43.5 7 43.5L28 38Z',
  'M36 47L46 53C47.6 54 47 56 45 56L36 53Z',
  'M28 47L18 53C16.4 54 17 56 19 56L28 53Z',
];

// A four-point sparkle centred on the origin, radius 10: the usual mark of "AI".
const SPARKLE =
  'M0 -10C1.2 -3.6 3.6 -1.2 10 0C3.6 1.2 1.2 3.6 0 10C-1.2 3.6 -3.6 1.2 -10 0C-3.6 -1.2 -1.2 -3.6 0 -10Z';

/**
 * The Trợ lý SkyGo mark: a rounded airplane with yellow AI sparkles on a SkyGo-teal disc. Drawn
 * with SVG so it stays sharp at any size and needs no image asset.
 */
export function AssistantIcon({ size = 40 }: { size?: number }) {
  const theme = useTheme();

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel="Trợ lý SkyGo">
      <Circle cx={32} cy={32} r={32} fill={theme.primary} />
      <G transform="translate(32 33) rotate(45) scale(0.62) translate(-32 -32)">
        {PLANE.map((d) => (
          <Path key={d} d={d} fill="#ffffff" stroke="#ffffff" strokeWidth={2.6} strokeLinejoin="round" />
        ))}
      </G>
      <Path d={SPARKLE} fill={theme.aiSpark} transform="translate(47 17)" />
      <Path d={SPARKLE} fill={theme.aiSpark} transform="translate(53 31) scale(0.45)" />
      <Path d={SPARKLE} fill={theme.aiSpark} transform="translate(39 8) scale(0.38)" />
    </Svg>
  );
}
