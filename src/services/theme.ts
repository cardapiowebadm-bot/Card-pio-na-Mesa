export function getThemeShades(hexColor: string) {
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;

  const mix = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number, weight: number) => {
    const rMix = Math.round(r1 * (1 - weight) + r2 * weight);
    const gMix = Math.round(g1 * (1 - weight) + g2 * weight);
    const bMix = Math.round(b1 * (1 - weight) + b2 * weight);
    return `rgb(${rMix}, ${gMix}, ${bMix})`;
  };

  return {
    50: mix(r, g, b, 255, 255, 255, 0.95),
    100: mix(r, g, b, 255, 255, 255, 0.85),
    500: mix(r, g, b, 255, 255, 255, 0.15),
    600: `rgb(${r}, ${g}, ${b})`,
    700: mix(r, g, b, 0, 0, 0, 0.15),
    900: mix(r, g, b, 0, 0, 0, 0.6),
  };
}
