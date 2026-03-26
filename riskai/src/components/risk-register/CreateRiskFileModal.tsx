"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { saveFile, loadFiles, markFileImported } from "@/lib/uploadedRiskRegisterStore";
import { parseExcel, sheetToDocumentText } from "@/lib/riskImportExcel";
import type { Risk, RiskDraft } from "@/domain/risk/risk.schema";
import { RiskDraftSchema, RiskSchema } from "@/domain/risk/risk.schema";
import { draftsToRisks } from "@/domain/risk/risk.mapper";
import { useRiskRegister } from "@/store/risk-register.store";
import { Callout } from "@visualify/design-system";

function isDraftLike(item: unknown): item is RiskDraft {
  if (!item || typeof item !== "object") return false;
  const o = item as Record<string, unknown>;
  return (
    typeof o.probability === "number" &&
    typeof o.consequence === "number" &&
    o.inherentRating === undefined
  );
}

function isRiskLike(item: unknown): item is Risk {
  if (!item || typeof item !== "object") return false;
  const o = item as Record<string, unknown>;
  return o.inherentRating != null && typeof o.inherentRating === "object";
}

function normalizeRisks(raw: unknown): Risk[] {
  const list = Array.isArray(raw) ? raw : [];
  const result: Risk[] = [];
  for (const item of list) {
    if (isRiskLike(item)) {
      const parsed = RiskSchema.safeParse(item);
      if (parsed.success) result.push(parsed.data);
    } else if (isDraftLike(item)) {
      const parsed = RiskDraftSchema.safeParse(item);
      if (parsed.success) result.push(draftsToRisks([parsed.data])[0]);
    }
  }
  return result;
}

function hasMeaningfulTitle(risk: Risk): boolean {
  const t = risk.title && String(risk.title).trim();
  return !!t && t.length > 0;
}

function deduplicateByTitle(risks: Risk[]): Risk[] {
  const seen = new Set<string>();
  return risks.filter((r) => {
    const key = String(r.title).trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const btnPrimary =
  "px-4 py-2 rounded-md bg-[var(--ds-text-primary)] text-[var(--ds-text-inverse)] text-sm font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--ds-border)] shrink-0 dark:bg-[var(--ds-surface-elevated)] dark:text-[var(--ds-text-primary)] dark:hover:bg-[var(--ds-surface-hover)]";
const btnSecondary =
  "px-4 py-2 rounded-md border border-[var(--ds-border)] bg-[var(--ds-surface-default)] text-[var(--ds-text-primary)] text-sm font-medium hover:bg-[var(--ds-surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-border)] shrink-0";

export function CreateRiskFileModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { appendRisks } = useRiskRegister();
  const [fileDragOver, setFileDragOver] = useState(false);
  const [fileUploadStatus, setFileUploadStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [fileUploadMessage, setFileUploadMessage] = useState<string | null>(null);
  const [lastSavedFileId, setLastSavedFileId] = useState<string | null>(null);
  const [lastSavedFileName, setLastSavedFileName] = useState<string | null>(null);
  const [generateStatus, setGenerateStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSave = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setFileUploadStatus("error");
      setFileUploadMessage("Only .xlsx files are allowed.");
      return;
    }
    setFileUploadStatus("loading");
    setFileUploadMessage(null);
    setGenerateMessage(null);
    try {
      const id = await saveFile(file);
      setLastSavedFileId(id);
      setLastSavedFileName(file.name);
      setFileUploadStatus("success");
    } catch (e) {
      setFileUploadStatus("error");
      setFileUploadMessage(e instanceof Error ? e.message : "Failed to save file.");
    }
  }, []);

  const onFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setFileDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFileSave(file);
    },
    [handleFileSave]
  );

  const onFileDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFileDragOver(true);
  }, []);

  const onFileDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFileDragOver(false);
  }, []);

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (file) handleFileSave(file);
    },
    [handleFileSave]
  );

  const handleGenerateRisk = useCallback(async () => {
    if (!lastSavedFileId) {
      setGenerateStatus("error");
      setGenerateMessage("Upload a file first, then click Generate Risk.");
      return;
    }
    setGenerateStatus("loading");
    setGenerateMessage(null);
    try {
      const files = await loadFiles();
      const file = files.find((f) => f.id === lastSavedFileId);
      if (!file) {
        setGenerateStatus("error");
        setGenerateMessage("File not found. Upload it again.");
        return;
      }
      const parsed = await parseExcel(file.blob);
      if (parsed.rows.length === 0 && parsed.headers.length === 0) {
        setGenerateStatus("error");
        setGenerateMessage("Sheet is empty.");
        return;
      }
      const documentText = sheetToDocumentText(parsed);
      const res = await fetch("/api/risks/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentText }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof data?.error === "string" ? data.error : "AI extraction failed";
        setGenerateMessage(msg);
        setGenerateStatus("error");
        return;
      }
      let list = normalizeRisks(data?.risks);
      list = list.filter(hasMeaningfulTitle);
      list = deduplicateByTitle(list);
      appendRisks(list);
      await markFileImported(lastSavedFileId);
      setGenerateStatus("success");
      setGenerateMessage(`Imported ${list.length} risks.`);
    } catch (e) {
      setGenerateMessage(e instanceof Error ? e.message : "Network or unexpected error");
      setGenerateStatus("error");
    }
  }, [lastSavedFileId, appendRisks]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const overlay = (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--ds-overlay)] p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-risk-file-dialog-title"
      onClick={handleBackdropClick}
    >
      <div
        style={{ width: "90vw", maxWidth: 480, maxHeight: "90vh" }}
        className="shrink-0 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] shadow-xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 shrink-0 border-b border-[var(--ds-border)] px-4 sm:px-6 py-3">
          <h2 id="create-risk-file-dialog-title" className="text-lg font-semibold text-[var(--ds-text-primary)]">
            Create Risk with AI File Uploader
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md border border-transparent text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-border)]"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={onFileInputChange}
            className="hidden"
            aria-label="Upload Excel file"
          />
          <div
            onDragOver={onFileDragOver}
            onDragLeave={onFileDragLeave}
            onDrop={onFileDrop}
            className={`border-2 border-dashed rounded-md p-6 text-center text-sm transition-colors min-h-[120px] flex flex-col justify-center ${
              fileDragOver
                ? "border-[var(--ds-status-info-border)] bg-[var(--ds-status-info-bg)]"
                : "border-[var(--ds-border)] bg-[color-mix(in_oklab,var(--ds-surface-muted)_50%,transparent)] dark:bg-[color-mix(in_oklab,var(--ds-surface-muted)_30%,transparent)] hover:border-[var(--ds-border)]"
            }`}
          >
            {lastSavedFileId && lastSavedFileName ? (
              <>
                <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-[var(--ds-surface-muted)] text-[var(--ds-text-secondary)]">
                  XLSX
                </span>
                <p className="text-[var(--ds-text-primary)] font-medium mt-2 truncate" title={lastSavedFileName}>
                  {lastSavedFileName}
                </p>
                <p className="text-[var(--ds-text-muted)] text-xs mt-1">
                  Drop another file to replace
                </p>
              </>
            ) : (
              <>
                <p className="text-[var(--ds-text-secondary)] mb-2">
                  {fileDragOver ? "Drop file here…" : "Drag and drop .xlsx here, or"}
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={fileUploadStatus === "loading"}
                  className="px-3 py-1.5 text-sm font-medium rounded-md border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-hover)] disabled:opacity-50"
                >
                  Choose file
                </button>
              </>
            )}
          </div>
          {fileUploadStatus === "loading" && (
            <div className="flex items-center gap-2 py-1" aria-busy="true">
              <div className="h-3 w-24 animate-pulse rounded bg-[var(--ds-surface-muted)]" />
              <span className="sr-only">Saving file</span>
            </div>
          )}
          {fileUploadStatus === "error" && fileUploadMessage && (
            <Callout status="danger" role="alert" className="text-[length:var(--ds-text-sm)]">
              {fileUploadMessage}
            </Callout>
          )}
          <button
            type="button"
            onClick={handleGenerateRisk}
            disabled={!lastSavedFileId || generateStatus === "loading"}
            className={`${btnPrimary} w-full`}
          >
            Generate Risk
          </button>
          {generateStatus === "loading" && (
            <div className="flex items-center gap-2 py-1" aria-busy="true">
              <div className="h-3 w-32 animate-pulse rounded bg-[var(--ds-surface-muted)]" />
              <span className="sr-only">Extracting risks</span>
            </div>
          )}
          {generateStatus === "success" && generateMessage && (
            <Callout status="success" role="status" className="text-[length:var(--ds-text-sm)]">
              {generateMessage}
            </Callout>
          )}
          {generateStatus === "error" && generateMessage && (
            <Callout status="danger" role="alert" className="text-[length:var(--ds-text-sm)]">
              {generateMessage}
            </Callout>
          )}
        </div>
        <div className="flex justify-end gap-2 shrink-0 px-4 sm:px-6 py-4 border-t border-[var(--ds-border)]">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
