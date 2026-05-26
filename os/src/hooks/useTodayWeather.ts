"use client";

import { useEffect, useRef, useState } from "react";

const GEO_STORAGE_KEY = "os-today-geolocation";
const WEATHER_API_PATH = "/api/os/weather";

type StoredGeo =
  | { status: "coords"; lat: number; lon: number }
  | { status: "denied" };

export type TodayWeatherDisplay = {
  temperature: number;
  description: string;
};

type TodayWeatherState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; weather: TodayWeatherDisplay }
  | { status: "unavailable" };

function readStoredGeo(): StoredGeo | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(GEO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed != null &&
      "status" in parsed &&
      parsed.status === "denied"
    ) {
      return { status: "denied" };
    }
    if (
      typeof parsed === "object" &&
      parsed != null &&
      "status" in parsed &&
      parsed.status === "coords" &&
      "lat" in parsed &&
      "lon" in parsed &&
      typeof parsed.lat === "number" &&
      typeof parsed.lon === "number" &&
      Number.isFinite(parsed.lat) &&
      Number.isFinite(parsed.lon)
    ) {
      return { status: "coords", lat: parsed.lat, lon: parsed.lon };
    }
  } catch {
    /* ignore corrupt storage */
  }
  return null;
}

function writeStoredGeo(value: StoredGeo): void {
  try {
    sessionStorage.setItem(GEO_STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

async function fetchWeather(lat: number, lon: number): Promise<TodayWeatherDisplay | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
  });
  const response = await fetch(`${WEATHER_API_PATH}?${params}`, {
    credentials: "same-origin",
  });
  if (!response.ok) return null;

  const data = (await response.json()) as {
    temperature?: unknown;
    description?: unknown;
  };

  if (typeof data.temperature !== "number" || typeof data.description !== "string") {
    return null;
  }

  return {
    temperature: data.temperature,
    description: data.description,
  };
}

export function useTodayWeather(): TodayWeatherState {
  const [state, setState] = useState<TodayWeatherState>({ status: "idle" });
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;

    const load = async (lat: number, lon: number) => {
      setState({ status: "loading" });
      const weather = await fetchWeather(lat, lon);
      if (cancelled) return;
      if (weather) {
        setState({ status: "ready", weather });
      } else {
        setState({ status: "unavailable" });
      }
    };

    const stored = readStoredGeo();
    if (stored?.status === "denied") {
      setState({ status: "unavailable" });
      return () => {
        cancelled = true;
      };
    }
    if (stored?.status === "coords") {
      void load(stored.lat, stored.lon);
      return () => {
        cancelled = true;
      };
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ status: "unavailable" });
      return () => {
        cancelled = true;
      };
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        const { latitude: lat, longitude: lon } = position.coords;
        writeStoredGeo({ status: "coords", lat, lon });
        void load(lat, lon);
      },
      () => {
        if (cancelled) return;
        writeStoredGeo({ status: "denied" });
        setState({ status: "unavailable" });
      },
      {
        enableHighAccuracy: false,
        timeout: 12_000,
        maximumAge: 30 * 60 * 1000,
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
