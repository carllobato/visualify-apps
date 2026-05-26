export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { describeOpenMeteoWeatherCode } from "@/lib/weather/open-meteo-label";

const OPEN_METEO_FORECAST = "https://api.open-meteo.com/v1/forecast";
const FETCH_TIMEOUT_MS = 8_000;

type OpenMeteoCurrentResponse = {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
  };
};

function parseCoordinate(
  value: string | null,
  min: number,
  max: number,
): number | null {
  if (value == null || value.trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseCoordinate(searchParams.get("lat"), -90, 90);
  const lon = parseCoordinate(searchParams.get("lon"), -180, 180);

  if (lat == null || lon == null) {
    return NextResponse.json(
      { error: "Valid lat and lon query parameters are required" },
      { status: 400 },
    );
  }

  const url = new URL(OPEN_METEO_FORECAST);
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("current", "temperature_2m,weather_code");
  url.searchParams.set("temperature_unit", "celsius");
  url.searchParams.set("timezone", "auto");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Weather provider unavailable" }, { status: 502 });
    }

    const data = (await response.json()) as OpenMeteoCurrentResponse;
    const temperature = data.current?.temperature_2m;
    const weatherCode = data.current?.weather_code;

    if (typeof temperature !== "number" || typeof weatherCode !== "number") {
      return NextResponse.json({ error: "Weather data incomplete" }, { status: 502 });
    }

    return NextResponse.json({
      temperature: Math.round(temperature),
      weatherCode,
      description: describeOpenMeteoWeatherCode(weatherCode),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Weather fetch failed";
    console.error("[os/weather]", message);
    return NextResponse.json({ error: "Unable to load weather" }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
