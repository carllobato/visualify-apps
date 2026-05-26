"use client";

import { useTodayWeather } from "@/hooks/useTodayWeather";

export function TodayWeatherChip() {
  const weatherState = useTodayWeather();

  if (weatherState.status !== "ready") {
    return null;
  }

  const { temperature, description } = weatherState.weather;

  return (
    <span className="os-today-hero__weather" aria-label={`Current weather: ${temperature} degrees, ${description}`}>
      {temperature}° · {description}
    </span>
  );
}
