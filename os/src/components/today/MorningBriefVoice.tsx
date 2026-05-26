"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MorningBriefVoiceProps = {
  /** Spoken brief — not shown in the UI; later from AI or server data. */
  text: string;
  className?: string;
};

const BRIEF_AUDIO_PATH = "/api/os/brief-audio";

type PlaybackStatus = "idle" | "preparing" | "playing" | "error";

function mergeClass(...parts: (string | undefined)[]) {
  return parts.filter(Boolean).join(" ");
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

function statusLabel(status: PlaybackStatus): string {
  switch (status) {
    case "preparing":
      return "Preparing…";
    case "playing":
      return "Stop";
    case "error":
      return "Unable to play";
    default:
      return "Listen";
  }
}

export function MorningBriefVoice({ text, className }: MorningBriefVoiceProps) {
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<PlaybackStatus>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const stopPlayback = useCallback(() => {
    fetchAbortRef.current?.abort();
    fetchAbortRef.current = null;

    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    }

    revokeObjectUrl();
    setStatus("idle");
  }, [revokeObjectUrl]);

  useEffect(() => {
    setMounted(true);
    return () => {
      fetchAbortRef.current?.abort();
      fetchAbortRef.current = null;

      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.src = "";
        audioRef.current = null;
      }

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const playFromServer = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    stopPlayback();
    setStatus("preparing");

    const controller = new AbortController();
    fetchAbortRef.current = controller;

    try {
      const response = await fetch(BRIEF_AUDIO_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
        signal: controller.signal,
        credentials: "same-origin",
      });

      if (!response.ok) {
        setStatus("error");
        return;
      }

      const blob = await response.blob();
      if (!blob.size) {
        setStatus("error");
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      objectUrlRef.current = objectUrl;

      const audio = new Audio(objectUrl);
      audioRef.current = audio;

      audio.onended = () => {
        stopPlayback();
      };
      audio.onerror = () => {
        revokeObjectUrl();
        audioRef.current = null;
        setStatus("error");
      };

      await audio.play();
      setStatus("playing");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      setStatus("error");
    } finally {
      if (fetchAbortRef.current === controller) {
        fetchAbortRef.current = null;
      }
    }
  }, [text, stopPlayback, revokeObjectUrl]);

  const onControlClick = () => {
    if (status === "preparing") return;

    if (status === "playing") {
      stopPlayback();
      return;
    }

    void playFromServer();
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

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const label = statusLabel(status);
  const ariaLabel =
    status === "playing"
      ? "Stop morning brief"
      : status === "preparing"
        ? "Preparing morning brief audio"
        : status === "error"
          ? "Unable to play morning brief, tap to retry"
          : "Listen to morning brief. Audio won't start automatically.";

  return (
    <button
      type="button"
      className={mergeClass(
        "os-today-hero__listen",
        status === "playing" || status === "preparing" ? "os-today-hero__listen--active" : undefined,
        status === "error" ? "os-today-hero__listen--error" : undefined,
        className,
      )}
      onClick={onControlClick}
      disabled={status === "preparing"}
      aria-pressed={status === "playing"}
      aria-busy={status === "preparing"}
      aria-label={ariaLabel}
      title={label}
    >
      <span className="os-today-hero__listen-icon">
        {status === "playing" ? <PauseIcon /> : <PlayIcon />}
      </span>
      <span className="sr-only">{label}</span>
    </button>
  );
}
