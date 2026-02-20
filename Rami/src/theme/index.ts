export {
  palette,
  lightColors,
  darkColors,
  royalLightColors,
  royalDarkColors,
  themeColorsByStyle,
  type ColorScheme,
  type ThemeColors,
  type ThemeStyle,
} from './colors';
export { fontFamily, fontSize, fontWeight, lineHeight } from './typography';
export { spacing, radius } from './spacing';

import type { ColorScheme, ThemeColors, ThemeStyle } from './colors';
import { themeColorsByStyle } from './colors';

export function getThemeColors(scheme: ColorScheme, style: ThemeStyle): ThemeColors {
  return themeColorsByStyle[style]?.[scheme] ?? themeColorsByStyle.classic[scheme];
}
