"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MorningBriefVoiceProps = {
  /** Spoken brief — not shown in the UI; later from AI or server data. */
  text: string;
  className?: string;
};

function mergeClass(...parts: (string | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

function speechSynthesisAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function PlayIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <rect x={6} y={5} width={4} height={14} rx={1} />
      <rect x={14} y={5} width={4} height={14} rx={1} />
    </svg>
  );
}

export function MorningBriefVoice({ text, className }: MorningBriefVoiceProps) {
  const [mounted, setMounted] = useState(false);
  const [supported, setSupported] = useState(false);
  const [playing, setPlaying] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setMounted(true);
    setSupported(speechSynthesisAvailable());
  }, []);

  const stop = useCallback(() => {
    if (!speechSynthesisAvailable()) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setPlaying(false);
  }, []);

  useEffect(() => {
    return () => {
      if (speechSynthesisAvailable()) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const play = useCallback(() => {
    const trimmed = text.trim();
    if (!speechSynthesisAvailable() || !trimmed) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(trimmed);
    const lang =
      typeof navigator !== "undefined" && navigator.language
        ? navigator.language
        : "en-GB";
    utterance.lang = lang;
    utterance.onend = () => {
      utteranceRef.current = null;
      setPlaying(false);
    };
    utterance.onerror = () => {
      utteranceRef.current = null;
      setPlaying(false);
    };

    utteranceRef.current = utterance;
    setPlaying(true);
    window.speechSynthesis.speak(utterance);
  }, [text]);

  const onControlClick = () => {
    if (playing) {
      stop();
    } else {
      play();
    }
  };

  if (!mounted) {
    return (
      <span
        className={mergeClass("os-today-hero__listen os-today-hero__listen--placeholder", className)}
        aria-hidden
      >
        <span className="os-today-hero__listen-icon">
          <PlayIcon />
        </span>
      </span>
    );
  }

  if (!supported) {
    return null;
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return (
    <button
      type="button"
      className={mergeClass(
        "os-today-hero__listen",
        playing ? "os-today-hero__listen--active" : undefined,
        className,
      )}
      onClick={onControlClick}
      aria-pressed={playing}
      aria-label={
        playing
          ? "Pause morning brief"
          : "Play morning brief. Audio won't start automatically."
      }
    >
      <span className="os-today-hero__listen-icon">
        {playing ? <PauseIcon /> : <PlayIcon />}
      </span>
    </button>
  );
}
