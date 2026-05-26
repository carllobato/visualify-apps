/**
 * Minimal labels for Open-Meteo WMO weather codes.
 * @see https://open-meteo.com/en/docs#weathervariables
 */
export function describeOpenMeteoWeatherCode(code: number): string {
  if (code === 0) return "Clear";
  if (code === 1) return "Clear";
  if (code === 2 || code === 3) return "Cloudy";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Rain";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain";
  if (code >= 85 && code <= 86) return "Snow";
  if (code >= 95 && code <= 99) return "Storm";
  return "Cloudy";
}
