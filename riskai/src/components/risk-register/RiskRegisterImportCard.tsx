"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Risk, RiskDraft } from "@/domain/risk/risk.schema";
import { RiskDraftSchema, RiskSchema } from "@/domain/risk/risk.schema";
import { draftsToRisks } from "@/domain/risk/risk.mapper";
import { useRiskRegister } from "@/store/risk-register.store";
import {
  loadFiles,
  deleteFile,
  markFileImported,
  type StoredFileMeta,
} from "@/lib/uploadedRiskRegisterStore";
import { parseExcel, sheetToDocumentText, type ParseExcelResult } from "@/lib/riskImportExcel";
import { Button, Callout } from "@visualify/design-system";

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

function formatUploadedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function RiskRegisterImportCard() {
  const { appendRisks } = useRiskRegister();
  const [storedFiles, setStoredFiles] = useState<StoredFileMeta[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParseExcelResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [completeExpanded, setCompleteExpanded] = useState(false);
  const selectedFileIdRef = useRef(selectedFileId);
  useEffect(() => {
    selectedFileIdRef.current = selectedFileId;
  }, [selectedFileId]);

  const loadStored = useCallback(async () => {
    setParseError(null);
    try {
      const files = await loadFiles();
      setStoredFiles(files);
      const currentSelected = selectedFileIdRef.current;
      if (files.length > 0 && !currentSelected) {
        setSelectedFileId(files[0].id);
      }
      if (files.length === 0) {
        setSelectedFileId(null);
        setParsed(null);
      }
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Failed to load stored files");
      setParsed(null);
    }
  }, []);

  useEffect(() => {
    loadStored();
  }, [loadStored]);

  // When selected file changes, parse it
  useEffect(() => {
    if (!selectedFileId || storedFiles.length === 0) {
      setParsed(null);
      return;
    }
    const file = storedFiles.find((f) => f.id === selectedFileId);
    if (!file) {
      setParsed(null);
      return;
    }
    setParseError(null);
    parseExcel(file.blob)
      .then((result) => {
        if (result.rows.length === 0 && result.headers.length === 0) {
          setParseError("Sheet is empty.");
          setParsed(null);
        } else {
          setParsed(result);
        }
      })
      .catch((err) => {
        setParseError(err instanceof Error ? err.message : "Failed to parse file.");
        setParsed(null);
      });
  }, [selectedFileId, storedFiles]);

  const handleRemoveFile = async (id: string) => {
    setParseError(null);
    setImportMessage(null);
    setImportStatus("idle");
    try {
      await deleteFile(id);
      const files = await loadFiles();
      setStoredFiles(files);
      if (selectedFileId === id) {
        setSelectedFileId(files[0]?.id ?? null);
        setParsed(null);
      }
    } catch {
      setParseError("Failed to remove file from storage.");
    }
  };

  const handleGenerateRisks = async () => {
    if (!selectedFileId || !parsed || parsed.rows.length === 0) {
      setImportStatus("error");
      setImportMessage("Select a file and ensure it has data, then try again.");
      return;
    }
    setImportStatus("loading");
    setImportMessage(null);
    try {
      const documentText = sheetToDocumentText(parsed);
      const res = await fetch("/api/risks/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentText }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof data?.error === "string" ? data.error : "AI extraction failed";
        setImportMessage(msg);
        setImportStatus("error");
        return;
      }
      let list = normalizeRisks(data?.risks);
      list = list.filter(hasMeaningfulTitle);
      list = deduplicateByTitle(list);
      appendRisks(list);
      await markFileImported(selectedFileId);
      await loadStored();
      setImportStatus("success");
      setImportMessage(`Imported ${list.length} risks.`);
    } catch (e) {
      setImportMessage(e instanceof Error ? e.message : "Network or unexpected error");
      setImportStatus("error");
    }
  };

  const hasData = parsed && parsed.rows.length > 0;
  const selectedFile = storedFiles.find((f) => f.id === selectedFileId);
  const allImported = storedFiles.length > 0 && storedFiles.every((f) => f.importedAt);

  if (storedFiles.length === 0) return null;

  if (allImported && !completeExpanded) {
    return (
      <div
        className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--ds-status-success-border)] bg-[var(--ds-status-success-subtle-bg)] px-4 py-2.5"
        style={{ marginBottom: 16 }}
      >
        <span className="text-sm font-medium text-[var(--ds-text-primary)]">
          Generate Risks from existing risk register
        </span>
        <span
          className="inline-flex items-center rounded bg-[var(--ds-status-success-bg)] px-2 py-0.5 text-xs font-medium text-[var(--ds-status-success-fg)]"
          title="All uploaded files have been imported to the register"
        >
          ✓ Complete
        </span>
        <button
          type="button"
          onClick={() => setCompleteExpanded(true)}
          className="ml-auto px-2 py-1 text-xs rounded border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] text-[var(--ds-text-secondary)] hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text-primary)] dark:hover:text-[var(--ds-text-secondary)] flex items-center gap-1"
          aria-expanded="false"
        >
          Show details
          <span className="inline-block w-3 h-3" aria-hidden>▼</span>
        </button>
      </div>
    );
  }

  const isCompleteView = allImported && completeExpanded;

  return (
    <div
      className={`rounded-lg border p-4 mb-4 ${
        isCompleteView
          ? "border-[var(--ds-status-success-border)] bg-[color-mix(in_oklab,var(--ds-status-success)_10%,var(--ds-surface-default))]"
          : "border-[var(--ds-border)] bg-[var(--ds-surface-elevated)]"
      }`}
      style={{ marginBottom: 16 }}
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h2 className="text-lg font-semibold text-[var(--ds-text-primary)]">
          Generate Risks from existing risk register
        </h2>
        {isCompleteView && (
          <>
            <span
              className="inline-flex items-center rounded bg-[var(--ds-status-success-bg)] px-2 py-0.5 text-xs font-medium text-[var(--ds-status-success-fg)]"
              title="All uploaded files have been imported to the register"
            >
              ✓ Complete
            </span>
            <button
              type="button"
              onClick={() => setCompleteExpanded(false)}
              className="ml-auto px-2 py-1 text-xs rounded border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] text-[var(--ds-text-secondary)] hover:bg-[var(--ds-surface-hover)] flex items-center gap-1"
              aria-expanded="true"
            >
              Collapse
              <span className="inline-block w-3 h-3" aria-hidden>▲</span>
            </button>
          </>
        )}
      </div>
      {!isCompleteView && (
        <p className="text-sm text-[var(--ds-text-secondary)] mb-3">
          Select an uploaded file and generate risks with AI.
        </p>
      )}

      <div
        className={`space-y-3 ${isCompleteView ? "opacity-60 pointer-events-none select-none" : ""}`}
      >
        <ul className="space-y-2 text-sm">
            {storedFiles.map((f) => (
              <li
                key={f.id}
                className={`flex flex-wrap items-center gap-2 py-2 px-3 rounded-md border ${
                  selectedFileId === f.id
                    ? "border-[var(--ds-status-info-border)] bg-[var(--ds-status-info-bg)]"
                    : "border-[var(--ds-border)] bg-[color-mix(in_oklab,var(--ds-surface-muted)_50%,transparent)] dark:bg-[color-mix(in_oklab,var(--ds-surface-muted)_50%,transparent)]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedFileId(f.id)}
                  className="text-left flex-1 min-w-0 font-medium text-[var(--ds-text-primary)] truncate"
                >
                  {f.name}
                </button>
                <span className="text-[var(--ds-text-muted)] shrink-0">
                  {formatUploadedAt(f.uploadedAt)}
                </span>
                {f.importedAt ? (
                  <span
                    className="inline-flex shrink-0 items-center rounded bg-[var(--ds-status-success-bg)] px-2 py-0.5 text-xs font-medium text-[var(--ds-status-success-fg)]"
                    title={`Translated to risks: ${formatUploadedAt(f.importedAt)}`}
                  >
                    Translated to risks
                  </span>
                ) : null}
                {!isCompleteView && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFile(f.id)}
                    className="shrink-0 !text-[var(--ds-status-danger-fg)] hover:!bg-[color-mix(in_oklab,var(--ds-status-danger)_12%,transparent)]"
                  >
                    Remove
                  </Button>
                )}
              </li>
            ))}
          </ul>

        {parseError && (
          <Callout status="danger" role="alert" className="text-[length:var(--ds-text-sm)]">
            {parseError}
          </Callout>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleGenerateRisks}
            disabled={!hasData || importStatus === "loading" || isCompleteView}
            className="px-4 py-2 text-sm font-medium rounded-md border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-hover)] disabled:opacity-50 disabled:pointer-events-none"
          >
            Generate Risks with AI
            {selectedFile ? ` (from ${selectedFile.name})` : ""}
          </button>
          {importStatus === "loading" && (
            <div className="inline-flex items-center gap-2 py-1" aria-busy="true" aria-live="polite">
              <div className="h-3 w-24 animate-pulse rounded bg-[var(--ds-surface-muted)]" />
              <span className="sr-only">Generating risks</span>
            </div>
          )}
          {importStatus === "success" && importMessage && (
            <Callout status="success" role="status" className="!m-0 inline-block text-[length:var(--ds-text-sm)]">
              {importMessage}
            </Callout>
          )}
          {importStatus === "error" && importMessage && (
            <Callout status="danger" role="alert" className="!m-0 inline-block text-[length:var(--ds-text-sm)]">
              {importMessage}
            </Callout>
          )}
        </div>
      </div>
    </div>
  );
}
